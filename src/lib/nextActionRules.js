/**
 * 사장님 매출 분석 '다음 행동' 카드 — 순수 룰 (ORDER 2026-09-10 파트 B). supabase 무의존.
 * 우선순위: ① 상황 서비스 카드(salesSignalRules.getSalesSignal) ② 시세 카드(price_range) ③ 다음 달 준비(next_month).
 * 한 함수(getNextActionCard)가 1장만 돌려준다. 추정·예측치 금지 — 범위와 실제 값만.
 */
import { getSalesSignal } from './salesSignalRules'
import { NEXT_MONTH } from '../../config/nextMonthChecklists'
import { kstToday, daysBetween } from './weekUtil'
import { fmtMan } from './watchRules'

const num = v => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) && n > 0 ? n : null }

/** 같은 구·같은 업종 매물(진행 + 최근 12개월 거래 완료) → 권리금·월세 범위. 3건 미만 null */
export function priceRange(listings, { industry, gu, now = new Date() } = {}) {
  if (!industry || !gu) return null
  const since = now.getTime() - NEXT_MONTH.PRICE_RANGE_SOLD_MONTHS * 30 * 864e5
  const rows = (listings ?? []).filter(l =>
    l.category_main === industry && String(l.address ?? '').includes(gu) &&
    (l.status === 'published' || l.status === 'negotiating' || (l.status === 'sold' && l.updated_at && new Date(l.updated_at).getTime() >= since)))
  if (rows.length < NEXT_MONTH.PRICE_RANGE_MIN) return null
  const fees = rows.map(l => num(l.transfer_fee)).filter(Boolean)
  const rents = rows.map(l => num(l.monthly_rent)).filter(Boolean)
  if (!fees.length && !rents.length) return null
  return {
    n: rows.length,
    fee: fees.length ? { min: Math.min(...fees), max: Math.max(...fees) } : null,
    rent: rents.length ? { min: Math.min(...rents), max: Math.max(...rents) } : null,
  }
}

/** 다음 1월 1일 / 7월 1일까지 남은 일수 */
export function daysToVatDue(now = new Date()) {
  const today = kstToday(now)
  const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7))
  const next = m < 7 ? `${y}-07-01` : `${y + 1}-01-01`
  const d = daysBetween(today, next)
  return d === 0 && m === 1 ? 0 : d
}

/** 월별 합계 — 최근 N개 완결 월 [{ ym, total, days }] 오래된 순 */
export function monthlyTotals(entries, { months = 4, now = new Date() } = {}) {
  const today = kstToday(now)
  const cur = today.slice(0, 7)
  const out = []
  let y = Number(cur.slice(0, 4)), m = Number(cur.slice(5, 7))
  for (let i = 0; i < months; i++) {
    m -= 1; if (m === 0) { m = 12; y -= 1 }
    const ym = `${y}-${String(m).padStart(2, '0')}`
    const rows = (entries ?? []).filter(e => String(e.sale_date ?? '').startsWith(ym) && Number.isFinite(e.revenue))
    out.unshift({ ym, total: rows.reduce((s, e) => s + e.revenue, 0), days: rows.length })
  }
  return out
}

/** 3개월 연속 상승 — 최근 3개 완결 월이 각각 직전 월보다 높고, 각 달 입력일이 기준 이상 */
export function growthStreak(entries, now = new Date()) {
  const ms = monthlyTotals(entries, { months: NEXT_MONTH.GROWTH_MONTHS + 1, now })
  if (ms.some(x => x.days < NEXT_MONTH.GROWTH_MIN_DAYS_PER_MONTH)) return null
  for (let i = 1; i < ms.length; i++) if (!(ms[i].total > ms[i - 1].total)) return null
  return { months: ms.slice(1).map(x => x.ym) }
}

/** 다음 달 준비 룰 3개 — 우선순위 lease_prep → vat_due → growth */
export function nextMonthRule({ roleData = {}, entries = [], now = new Date() } = {}) {
  const today = kstToday(now)
  const lease = roleData?.lease_end_date
  if (lease) {
    const end = /^\d{4}-\d{2}$/.test(lease) ? `${lease}-01` : lease
    const d = daysBetween(today, end)
    if (d > 90 && d <= NEXT_MONTH.LEASE_PREP_DAYS) return { rule: 'lease_prep', params: { days: d } }
  }
  const dv = daysToVatDue(now)
  if (dv >= 0 && dv <= NEXT_MONTH.VAT_DUE_DAYS) return { rule: 'vat_due', params: { days: dv } }
  const g = growthStreak(entries, now)
  if (g) return { rule: 'growth', params: g }
  return null
}

/**
 * 1장만: 상황 카드 → 시세 카드 → 다음 달 준비 → null
 * @param ctx { entries, roleData, sources, listings, profile:{ industry, gu }, now }
 * @returns { kind:'service', ... } | { kind:'price_range', signal:'price_range', range } | { kind:'next_month', signal:'next_month:<rule>', rule, params } | null
 */
export function getNextActionCard(ctx = {}) {
  const { entries = [], roleData = {}, sources = [], listings = [], profile = {}, now = new Date() } = ctx
  const service = getSalesSignal({ entries, roleData, sources, now })
  if (service) return { kind: 'service', ...service }
  const range = priceRange(listings, { industry: profile.industry, gu: profile.gu, now })
  if (range) return { kind: 'price_range', signal: 'price_range', range, industry: profile.industry, gu: profile.gu }
  const nm = nextMonthRule({ roleData, entries, now })
  if (nm) return { kind: 'next_month', signal: `next_month:${nm.rule}`, rule: nm.rule, params: nm.params }
  return null
}

/** 카드 문안 3줄 — 숫자는 실제 값만. 매출 금액은 쓰지 않는다 */
export function nextActionCopy(card) {
  if (!card) return null
  if (card.kind === 'price_range') {
    const r = card.range
    const parts = [r.fee ? `권리금 ${fmtMan(r.fee.min)}~${fmtMan(r.fee.max)}만` : null, r.rent ? `월세 ${fmtMan(r.rent.min)}~${fmtMan(r.rent.max)}만` : null].filter(Boolean)
    return {
      line1: `같은 구 ${card.industry} 매물 ${r.n}건: ${parts.join(' · ')}`,
      line2: '실제 등록·거래된 값의 범위예요 · 예측값이 아니에요',
      cta: '내 가게도 등록하면?',
      foot: '이 화면을 본 사실은 업체에 전달되지 않아요 · 지역별 건수만 집계돼요',
    }
  }
  if (card.kind === 'next_month') {
    switch (card.rule) {
      case 'lease_prep':
        return { line1: `임대차 만료까지 ${card.params.days}일 · 재계약 조건을 미리 정리해 두세요`, line2: '만료 6개월 전부터 갱신 요구·권리금 회수 기간이 시작돼요', cta: '체크리스트 보기' }
      case 'vat_due':
        return { line1: '부가세 신고가 다가와요', line2: `${card.params.days === 0 ? '오늘' : `${card.params.days}일 뒤`} 신고 기간이 시작돼요 · 세무 업체를 볼 수 있어요`, cta: '세무 업체 보기' }
      case 'growth':
        return { line1: '석 달 연속 매출이 올랐어요 · 근처 임대 매물을 볼 수 있어요', line2: `${card.params.months[0]}부터 ${card.params.months.at(-1)}까지 매달 전달보다 높았어요`, cta: '근처 매물 보기' }
      default: return null
    }
  }
  return null
}
