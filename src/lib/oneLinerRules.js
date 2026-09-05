/**
 * "이번 주 한 줄" 신호 룰 (ORDER-weekly-one-liner-v1) — supabase 무의존 순수 함수.
 * 크론(api/compute-one-liners)이 소비하고 테스트가 직접 import한다.
 *
 * 원칙: 신호 선별 전부 룰, 문장은 고정 템플릿(AI 호출 0회).
 * 신호는 위에서부터 검사해 **처음 걸리는 1개만** 채택. 없으면 null → 카드 미표시.
 */
import { kstToday, addDays, daysBetween, weekdayOf, WEEKDAY_LABELS } from './weekUtil'
import { topInquiryTopic } from './inquiryTopics'

const won = (n) => `${Math.round(Number(n) || 0).toLocaleString()}원`

// ── 사장님(운영중) ───────────────────────────────────────────
// 계산 전제: 최근 8주(56일) 중 매출을 입력한 주가 4주 이상일 때만 신호를 만든다.
export const MIN_INPUT_WEEKS = 4
const LOOKBACK_DAYS = 56

function inputWeekCount(entries, today) {
  const weeks = new Set()
  for (const e of entries) {
    const ago = daysBetween(e.sale_date, today)
    if (ago >= 0 && ago < LOOKBACK_DAYS) weeks.add(Math.floor(ago / 7))
  }
  return weeks.size
}

/** 같은 요일 3주 연속 하락 — 가장 최근 3회가 단조 감소인 요일 */
function weekdayDrop3(entries, today) {
  const byDate = new Map(entries.map(e => [e.sale_date, Number(e.revenue) || 0]))
  for (let back = 1; back <= 7; back++) {
    // 지난주 같은 요일부터 3주치(지난주·2주 전·3주 전)
    const d1 = addDays(today, -back)
    const d2 = addDays(d1, -7)
    const d3 = addDays(d2, -7)
    if (![d1, d2, d3].every(d => byDate.has(d))) continue
    const [v1, v2, v3] = [byDate.get(d1), byDate.get(d2), byDate.get(d3)]
    if (v3 > v2 && v2 > v1) {
      return {
        signal_key: 'weekday_drop3',
        headline: `${weekdayOf(d1)}요일 매출이 3주째 내려가고 있어요`,
        evidence: `${won(v3)} → ${won(v1)}`,
        cta_key: 'sales_input',
        cta_payload: { weekday: weekdayOf(d1) },
      }
    }
  }
  return null
}

// 월 비교는 "같은 날짜에 양쪽 다 입력이 있는 날"만 합산한다.
// 단순 누적 비교는 이번 달 미입력일 때문에 없는 하락을 만들어낸다(입력 공백 = 매출 감소 아님).
const MIN_COMMON_DAYS = 5

/** 이번 달 vs 전월 — 공통 입력일 기준 누적 비교 */
function monthCompare(entries, today) {
  const [y, m, dayStr] = today.split('-')
  const day = Number(dayStr)
  const thisPrefix = `${y}-${m}`
  const prevPrefix = new Date(Date.UTC(Number(y), Number(m) - 1, 1) - 864e5) // 전월 말일
    .toISOString().slice(0, 7)
  const pick = (prefix) => new Map(entries
    .filter(e => e.sale_date.startsWith(prefix) && Number(e.sale_date.slice(8, 10)) <= day)
    .map(e => [Number(e.sale_date.slice(8, 10)), Number(e.revenue) || 0]))
  const curMap = pick(thisPrefix), prevMap = pick(prevPrefix)
  const common = [...curMap.keys()].filter(d => prevMap.has(d))
  if (common.length < MIN_COMMON_DAYS) return null
  const cur = common.reduce((s, d) => s + curMap.get(d), 0)
  const prev = common.reduce((s, d) => s + prevMap.get(d), 0)
  if (!prev || !cur) return null
  return { cur, prev, days: common.length, pct: Math.round(((cur - prev) / prev) * 100) }
}

/** 최근 4주 요일 평균 최고/최저 배수 */
function bestDay(entries, today) {
  const buckets = {}
  for (const e of entries) {
    const ago = daysBetween(e.sale_date, today)
    if (ago < 0 || ago >= 28) continue
    const w = weekdayOf(e.sale_date)
    ;(buckets[w] ??= []).push(Number(e.revenue) || 0)
  }
  const avgs = Object.entries(buckets)
    .filter(([, v]) => v.length)
    .map(([w, v]) => [w, v.reduce((s, x) => s + x, 0) / v.length])
  if (avgs.length < 2) return null
  const sorted = [...avgs].sort((a, b) => b[1] - a[1])
  const [bw, bv] = sorted[0], [ww, wv] = sorted[sorted.length - 1]
  if (!wv || bv / wv < 1.5) return null
  return { bw, ww, ratio: Math.round((bv / wv) * 10) / 10 }
}

/** 최근 7일 중 미입력 일수 */
function missingCount(entries, today) {
  const has = new Set(entries.map(e => e.sale_date))
  let n = 0
  for (let i = 1; i <= 7; i++) if (!has.has(addDays(today, -i))) n++
  return n
}

/**
 * @param entries daily_sales 행 [{ sale_date, revenue }]
 * @param roleData roleData.operating (lease_end_date 등)
 * @returns 신호 1개 | null
 */
export function computeOperatingSignal({ entries = [], roleData = {}, now = new Date() } = {}) {
  const today = kstToday(now)
  const rows = entries.filter(e => e?.sale_date)

  if (inputWeekCount(rows, today) >= MIN_INPUT_WEEKS) {
    // 1) 같은 요일 3주 연속 하락
    const drop = weekdayDrop3(rows, today)
    if (drop) return drop

    const mc = monthCompare(rows, today)
    // 2) 이번 달 -20% 이하
    if (mc && mc.pct <= -20) {
      return {
        signal_key: 'month_drop20',
        headline: `이번 달이 지난달보다 ${Math.abs(mc.pct)}% 적어요`,
        evidence: `같은 ${mc.days}일 기준 지난달 ${won(mc.prev)} → 이번 달 ${won(mc.cur)}`,
        cta_key: 'sales_memo',
        cta_payload: { pct: mc.pct },
      }
    }
    // 3) 이번 달 +20% 이상
    if (mc && mc.pct >= 20) {
      return {
        signal_key: 'month_up20',
        headline: `이번 달이 지난달보다 ${mc.pct}% 많아요`,
        evidence: `같은 ${mc.days}일 기준 지난달 ${won(mc.prev)} → 이번 달 ${won(mc.cur)}`,
        cta_key: 'sales_trend',
        cta_payload: { pct: mc.pct },
      }
    }
    // 4) 요일 편차 1.5배 이상
    const bd = bestDay(rows, today)
    if (bd) {
      return {
        signal_key: 'best_day',
        headline: `${bd.bw}요일이 ${bd.ww}요일보다 ${bd.ratio}배 팔려요`,
        evidence: '최근 4주 평균',
        cta_key: 'sales_trend',
        cta_payload: { best: bd.bw, worst: bd.ww },
      }
    }
  }

  // 5) 최근 7일 미입력 3일 이상 (입력이 부족한 계정에도 열린 신호)
  const missing = missingCount(rows, today)
  if (missing >= 3 && rows.length > 0) {
    return {
      signal_key: 'missing_input',
      headline: `지난주 ${missing}일치 매출이 비어 있어요`,
      evidence: '입력한 주만 비교가 돼요',
      cta_key: 'sales_input',
      cta_payload: { missing },
    }
  }

  // 6) 임대차 만료 90일 이내
  const lease = roleData?.lease_end_date
  if (lease) {
    const end = /^\d{4}-\d{2}$/.test(lease) ? `${lease}-01` : lease
    const d = daysBetween(today, end)
    if (d >= 0 && d <= 90) {
      return {
        signal_key: 'lease_end_90',
        headline: `임대차 만료까지 ${d}일 남았어요`,
        evidence: '갱신 요구는 만료 6개월~1개월 전',
        cta_key: 'transfer_intro',
        cta_payload: { days: d },
      }
    }
  }
  return null
}

// ── 양도인 ───────────────────────────────────────────────────
/**
 * @param inquiries 최근 14일 첫 문의 [{ text }]
 * ※ fav_no_inquiry(찜 후 문의 없음)는 관심 기능 미구현이라 이번 범위 제외 —
 *   기능 도입 시 여기에 신호를 추가한다(스텁: computeSellerSignal의 두 번째 검사 자리).
 * ※ inquiry_unanswered(미답장)·no_inquiry_14(문의 0)는 각각 새 문의 타일·문의 동향 카드
 *   승격 룰과 중복이라 제외(오더 판정).
 */
export function computeSellerSignal({ inquiries = [] } = {}) {
  if (inquiries.length >= 3) {
    const top = topInquiryTopic(inquiries.map(i => i.text))
    if (top) {
      return {
        signal_key: 'inquiry_topic',
        headline: `최근 2주 문의 ${inquiries.length}건, ${top.label} 질문이 제일 많았어요`,
        evidence: `${top.label} 정보를 매물에 적어두면 문의가 줄고 계약이 빨라져요`,
        cta_key: 'edit_listing',
        cta_payload: { topic: top.key, label: top.label, step: top.step },
      }
    }
  }
  // (관심 기능 후 활성) fav_no_inquiry — 찜 N건 이상인데 문의 0건
  return null
}

export { WEEKDAY_LABELS }
