/**
 * 사장님 매출 '이 상황에 맞는 서비스' 카드 — 상황 판정 룰 (ORDER 2026-09-09 파트 A2)
 * AI 호출 없음, 전부 룰·카운팅. supabase 무의존 — 테스트가 Node에서 직접 import한다.
 * 매출 출처(source)는 판정에 쓰지 않고 근거 줄(basis)에만 반영한다.
 *
 * 우선순위: lease_end_near → sales_drop → weekday_gap → null (여러 상황이 겹쳐도 1개만).
 * 날짜는 전부 KST 문자열(YYYY-MM-DD) — weekUtil 외 날짜 계산 금지.
 */
import { kstToday, addDays, daysBetween, weekdayOf } from './weekUtil'

export const SIGNAL_PRIORITY = ['lease_end_near', 'sales_drop', 'weekday_gap']
export const WINDOW_DAYS = 120          // 판정에 쓰는 최근 일수
export const MIN_WEEKS = 8              // sales_drop 게이트: 최근 120일 중 입력 주 8주 이상
export const DROP_THRESHOLD_PCT = -15   // 최근 30일 vs 직전 90일 30일 평균
export const WEEKDAY_GAP_RATIO = 0.6    // 특정 요일 < 주 평균 60%
export const WEEKDAY_GAP_WEEKS = 4      // 4주 연속
export const LEASE_NEAR_DAYS = 90

const sum = arr => arr.reduce((s, v) => s + v, 0)
const avg = arr => (arr.length ? sum(arr) / arr.length : null)
const pctOf = (cur, base) => Math.round((cur / base - 1) * 100)

/** 유효 행만(YYYY-MM-DD·정수 매출), 최근 WINDOW_DAYS 안, 날짜별 1행 */
function windowRows(entries, today) {
  const seen = new Map()
  for (const e of entries ?? []) {
    if (!e?.sale_date || !Number.isFinite(e.revenue)) continue
    const ago = daysBetween(e.sale_date, today)
    if (ago < 0 || ago >= WINDOW_DAYS) continue
    seen.set(e.sale_date, { sale_date: e.sale_date, revenue: e.revenue, ago })
  }
  return [...seen.values()]
}

/** 입력이 있는 주 수 — "오늘부터 7일 묶음" 기준 (달력 주가 아니라 최근성 기준) */
export function inputWeekCount(rows) {
  return new Set(rows.map(r => Math.floor(r.ago / 7))).size
}

/**
 * sales_drop — 최근 30일 vs 직전 90일의 30일 평균, -15% 이하.
 * 결측일이 "하락"으로 오인되지 않도록 양쪽 다 입력일 기준 일평균으로 정규화한 뒤 30일로 환산한다
 * (수기 입력은 며칠씩 비는 게 보통 — 빈 날을 0원으로 세면 가짜 하락이 난다).
 */
export function salesDrop(rows) {
  if (inputWeekCount(rows) < MIN_WEEKS) return null
  const recent = rows.filter(r => r.ago < 30).map(r => r.revenue)
  const prev = rows.filter(r => r.ago >= 30).map(r => r.revenue)
  if (recent.length < 7 || prev.length < 21) return null // 양쪽 표본이 너무 작으면 침묵
  const cur30 = avg(recent) * 30
  const base30 = avg(prev) * 30
  if (!(base30 > 0)) return null
  const pct = pctOf(cur30, base30)
  if (pct > DROP_THRESHOLD_PCT) return null
  return { pct, cur30: Math.round(cur30), base30: Math.round(base30) }
}

/**
 * weekday_gap — 특정 요일이 그 주 평균의 60% 미만인 상태가 최근 4주 연속.
 * 일 단위 데이터가 있을 때만: 각 주에 그 요일 포함 4일 이상 입력이 있어야 한 주로 센다.
 * 여러 요일이 걸리면 비율이 가장 낮은 요일 하나.
 */
export function weekdayGap(rows) {
  const weeks = Array.from({ length: WEEKDAY_GAP_WEEKS }, (_, k) => rows.filter(r => Math.floor(r.ago / 7) === k))
  if (weeks.some(w => w.length < 4)) return null
  let worst = null
  for (const wd of ['월', '화', '수', '목', '금', '토', '일']) {
    let ok = true, dayVals = [], otherVals = []
    for (const w of weeks) {
      const day = w.find(r => weekdayOf(r.sale_date) === wd)
      if (!day) { ok = false; break }
      const weekAvg = avg(w.map(r => r.revenue))
      if (!(weekAvg > 0) || day.revenue >= weekAvg * WEEKDAY_GAP_RATIO) { ok = false; break }
      dayVals.push(day.revenue)
      otherVals.push(...w.filter(r => r !== day).map(r => r.revenue))
    }
    if (!ok) continue
    const q = Math.round((avg(dayVals) / avg(otherVals)) * 100)
    if (!worst || q < worst.q) worst = { weekday: wd, q }
  }
  return worst
}

/** lease_end_near — roleData.operating.lease_end_date(YYYY-MM 또는 YYYY-MM-DD) 가 90일 이내 */
export function leaseEndNear(roleData, today) {
  const lease = roleData?.lease_end_date
  if (!lease) return null
  const end = /^\d{4}-\d{2}$/.test(lease) ? `${lease}-01` : lease
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return null
  const d = daysBetween(today, end)
  return d >= 0 && d <= LEASE_NEAR_DAYS ? { days: d } : null
}

/**
 * 근거 줄 접두 — 판정과 무관, 출처만 반영.
 * sources: 최근 창의 daily_sales.source 값 목록 (컬럼 부재 시 빈 배열 → "입력하신 매출 기준")
 */
export function basisOf(sources = []) {
  const linked = sources.some(s => s === 'crefia_api' || s === 'mydata')
  const typed = sources.some(s => s === 'manual' || s === 'photo' || s == null)
  if (linked && typed) return '카드매출 + 입력 매출 기준'
  if (linked) return '카드매출 기준'
  return '입력하신 매출 기준'
}

/**
 * @param entries daily_sales 행 [{ sale_date, revenue }]
 * @param roleData roleData.operating (lease_end_date)
 * @param sources 최근 창의 source 값 목록
 * @returns { signal, params, basis } | null (상황 없음·데이터 부족 = 카드 미렌더)
 */
export function getSalesSignal({ entries = [], roleData = {}, sources = [], now = new Date() } = {}) {
  const today = kstToday(now)
  const basis = basisOf(sources)
  const lease = leaseEndNear(roleData, today)
  if (lease) return { signal: 'lease_end_near', params: lease, basis }
  const rows = windowRows(entries, today)
  const drop = salesDrop(rows)
  if (drop) return { signal: 'sales_drop', params: drop, basis }
  const gap = weekdayGap(rows)
  if (gap) return { signal: 'weekday_gap', params: gap, basis }
  return null
}

/** 카드 문안 3줄 고정(사실 / 할 수 있는 것 / 버튼) — 숫자는 실제 계산값만 (A3) */
export function cardCopyOf(result) {
  if (!result) return null
  const { signal, params, basis } = result
  switch (signal) {
    case 'sales_drop':
      return {
        line1: `최근 한 달 매출이 이전 석 달 평균보다 ${Math.abs(params.pct)}% 적어요`,
        line2: `${basis} · 홍보, 메뉴·운영 점검, 양도 상담을 알아볼 수 있어요`,
        cta: '알아보기',
      }
    case 'weekday_gap':
      return {
        line1: `${params.weekday}요일 매출이 다른 날의 ${params.q}% 수준이에요`,
        line2: `${basis} · 그 요일에 손님을 부르는 방법을 알아볼 수 있어요`,
        cta: '알아보기',
      }
    case 'lease_end_near':
      return {
        line1: `임대차 만료까지 ${params.days}일 남았어요`,
        line2: '재계약·이전 상담이나 양도 준비를 알아볼 수 있어요',
        cta: '알아보기',
      }
    default:
      return null
  }
}

/** 30일 1회 노출 규칙 — 마지막 노출/닫기 날짜로 판단 (impressions 행 또는 로컬 기록) */
export function isSuppressed({ shownOn = null, dismissedOn = null }, today) {
  if (dismissedOn && daysBetween(dismissedOn, today) < 30) return true
  // 노출 당일은 새로고침해도 계속 보인다. 다음 날부터 30일간 같은 상황 카드는 다시 안 뜬다.
  if (shownOn && shownOn !== today && daysBetween(shownOn, today) < 30) return true
  return false
}
