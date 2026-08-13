/**
 * 매출 분석 룰 (ORDER-sales-tracking-v1) — 전부 자체 계산(룰), Gemini 미호출(비용 원칙).
 *
 * 원칙: 입력량에 따라 열리는 구조 — 데이터가 충분한 분석만 반환하고, 부족한 건 침묵.
 * 가짜 수치·추정 표시 금지. "예상"은 명시 라벨이 붙는 monthly.forecast 하나뿐.
 *
 * entries: [{ sale_date: 'YYYY-MM-DD', revenue, delivery_revenue?, customers? }]
 */

export const GATES = { weekday: 3, weekly: 7, unit: 14, monthly: 30 }

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const dayMs = 24 * 60 * 60 * 1000

const toDate = (s) => new Date(`${s}T00:00:00`)
const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
const sum = (arr) => arr.reduce((s, v) => s + v, 0)

/** 소급 입력 허용 날짜 목록 — 오늘부터 7일 전까지 (오더 §2) */
export function backfillDates(today = new Date()) {
  const out = []
  for (let i = 0; i <= 7; i++) {
    const d = new Date(today.getTime() - i * dayMs)
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: i === 0 ? '오늘' : i === 1 ? '어제' : `${i}일 전`,
      weekday: WEEKDAYS[d.getDay()],
    })
  }
  return out
}

/**
 * @param entries 일 단위 매출 행 배열 (날짜 중복 없음 가정 — DB unique)
 * @param opts.fixedTotal 고정비 합(원) — 설정 시에만 monthly.margin 산출
 * @param opts.today 기준일 (테스트 주입용)
 * @returns { days, weekday?, weekly?, unitPrice?, delivery?, monthly?, nextUnlock? }
 */
export function analyzeSales(entries, { fixedTotal = null, today = new Date() } = {}) {
  const rows = [...(entries ?? [])]
    .filter(e => e && Number.isFinite(e.revenue))
    .sort((a, b) => a.sale_date.localeCompare(b.sale_date))
  const days = rows.length
  const out = { days }
  if (!days) { out.nextUnlock = unlockHint(0); return out }

  const daysAgo = (e) => Math.floor((today.getTime() - toDate(e.sale_date).getTime()) / dayMs)

  // ── 요일 패턴 (3일+) — 요일 2종 이상 쌓였을 때만 최고·최저 비교
  if (days >= GATES.weekday) {
    const byDay = {}
    for (const e of rows) {
      const w = toDate(e.sale_date).getDay()
      ;(byDay[w] ??= []).push(e.revenue)
    }
    const stats = Object.entries(byDay).map(([w, list]) => ({
      weekday: WEEKDAYS[w], avg: Math.round(avg(list)), count: list.length,
    }))
    if (stats.length >= 2) {
      const sorted = [...stats].sort((a, b) => b.avg - a.avg)
      out.weekday = { stats, best: sorted[0], worst: sorted[sorted.length - 1] }
    }
  }

  // ── 지난주 대비 (7일+) — 이번 7일 vs 그 전 7일, 양쪽 다 입력이 있을 때만 일평균 대비
  if (days >= GATES.weekly) {
    const cur = rows.filter(e => daysAgo(e) <= 6)
    const prev = rows.filter(e => { const d = daysAgo(e); return d >= 7 && d <= 13 })
    if (cur.length) {
      const weekly = { curTotal: sum(cur.map(e => e.revenue)), curDays: cur.length }
      if (prev.length) {
        const curAvg = weekly.curTotal / cur.length
        const prevAvg = sum(prev.map(e => e.revenue)) / prev.length
        weekly.deltaPct = Math.round(((curAvg - prevAvg) / prevAvg) * 100)
      }
      out.weekly = weekly
    }
  }

  // ── 객단가 추이 (14일+ & 손님 수 입력 5일+)
  if (days >= GATES.unit) {
    const withCustomers = rows.filter(e => Number.isFinite(e.customers) && e.customers > 0)
    if (withCustomers.length >= 5) {
      const unit = (list) => Math.round(sum(list.map(e => e.revenue)) / sum(list.map(e => e.customers)))
      const recent = withCustomers.filter(e => daysAgo(e) <= 13)
      const older = withCustomers.filter(e => daysAgo(e) > 13)
      if (recent.length) {
        out.unitPrice = { current: unit(recent), sampleDays: recent.length }
        if (older.length >= 3) out.unitPrice.previous = unit(older)
      }
    }
    // 홀/배달 비중 (14일+ & 배달 매출 입력분)
    const withDelivery = rows.filter(e => daysAgo(e) <= 13 && Number.isFinite(e.delivery_revenue))
    if (withDelivery.length >= 3) {
      const total = sum(withDelivery.map(e => e.revenue))
      const delivery = sum(withDelivery.map(e => e.delivery_revenue))
      if (total > 0) out.delivery = { sharePct: Math.round((delivery / total) * 100), sampleDays: withDelivery.length }
    }
  }

  // ── 월 추이 (30일+)
  if (days >= GATES.monthly) {
    const last30 = rows.filter(e => daysAgo(e) <= 29)
    const total = sum(last30.map(e => e.revenue))
    const dailyAvg = Math.round(total / last30.length)
    const monthly = {
      total, inputDays: last30.length, dailyAvg,
      forecast: dailyAvg * 30, // "예상" 명시 라벨과 함께만 표시
    }
    if (Number.isFinite(fixedTotal) && fixedTotal > 0) {
      monthly.fixedTotal = fixedTotal
      monthly.margin = total - fixedTotal // 최근 30일 매출 − 고정비
    }
    out.monthly = monthly
  }

  out.nextUnlock = unlockHint(days)
  return out
}

/** 부족 안내 — "○일 더 기록하면 ○○을 볼 수 있어요" (다음 게이트 하나만) */
function unlockHint(days) {
  if (days < GATES.weekday) return `${GATES.weekday - days}일 더 기록하면 요일 패턴을 볼 수 있어요`
  if (days < GATES.weekly) return `${GATES.weekly - days}일 더 기록하면 지난주 대비 증감을 볼 수 있어요`
  if (days < GATES.unit) return `${GATES.unit - days}일 더 기록하면 객단가·배달 비중을 볼 수 있어요`
  if (days < GATES.monthly) return `${GATES.monthly - days}일 더 기록하면 월 추이와 고정비 여유를 볼 수 있어요`
  return null
}

/**
 * 동네 매출 비교 승격 게이트 (오더 §5 — 판정 근거는 오더 보고).
 * 같은 동네·동종 표본 30곳+ 전까지 매출 비교 문구·수치 일절 금지 — 지금은 밀집도만.
 * 소표본 평균은 왜곡·역식별(개인 매출 유추) 위험이 있어 통계 관행 최소 표본 30을 기준으로 한다.
 */
export const SAMPLE_PROMOTION_THRESHOLD = 30
export function canCompareRevenue(sampleCount) {
  return Number.isFinite(sampleCount) && sampleCount >= SAMPLE_PROMOTION_THRESHOLD
}
