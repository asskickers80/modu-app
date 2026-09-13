/**
 * 기업회원 갱신 리포트 — 순수 룰 (ORDER 2026-09-13 파트 B1·B2·B3). supabase 무의존.
 * 갱신율·문의 지표 계산과 문안 조립. 정렬·노출에 plan_tier 를 쓰지 않는다(§1-1) — 여기 값은 '표시'용 사실이다.
 */
import { RENEWAL, RENEWAL_COPY, SOURCE_LABEL } from '../../config/vendorRenewal'

export const daysUntil = (at, now = new Date()) => (at ? Math.ceil((new Date(at) - now) / 864e5) : null)
export const windowStart = (now = new Date(), months = RENEWAL.WINDOW_MONTHS) => new Date(new Date(now).setMonth(now.getMonth() - months)).toISOString()

/** 최근 3개월 원장 행 → 지표. 값이 0이어도 숨기지 않는다(정직 원칙) */
export function metrics(rows = []) {
  const received = rows.length
  const replied = rows.filter(r => r.status === 'replied' || r.status === 'opened' || r.status === 'closed').length
  const opened = rows.filter(r => r.status === 'opened' || !!r.conversation_id).length
  const phone = rows.filter(r => r.channel === 'phone').length
  const deals = rows.filter(r => r.status === 'closed').length
  return {
    received, replied, opened, phone, deals,
    replyRate: received ? replied / received : 0,
    openRate: replied ? opened / replied : 0,
  }
}

/** 출처별 내역 — 실제로 있는 출처만 */
export function sourceBreakdown(rows = []) {
  const counts = new Map()
  for (const r of rows) {
    const label = SOURCE_LABEL[r.source] ?? SOURCE_LABEL.other
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n }))
}

export function reportLines(rows = [], { renewsAt = null, now = new Date() } = {}) {
  const m = metrics(rows)
  const lines = [RENEWAL_COPY.line
    .replace('{months}', String(RENEWAL.WINDOW_MONTHS)).replace('{n}', String(m.received))
    .replace('{m}', String(m.replied)).replace('{k}', String(m.opened)).replace('{p}', String(m.phone))]
  const parts = sourceBreakdown(rows)
  if (parts.length) lines.push(RENEWAL_COPY.sourceLine.replace('{parts}', parts.map(p => `${p.label} ${p.n}`).join(' · ')))
  // 성사 줄은 표본 3건 미만이면 숨긴다
  if (m.deals >= RENEWAL.MIN_DEALS_TO_SHOW) lines.push(RENEWAL_COPY.dealLine.replace('{d}', String(m.deals)))
  const d = daysUntil(renewsAt, now)
  return { lines, metrics: m, daysLeft: d, due: d !== null && d <= RENEWAL.REPORT_DAYS_BEFORE && d >= 0 }
}

/** 갱신율 — 해당 월 갱신 도래 유료 입점 중 실제 갱신 비율 */
export function renewalRate(subs = [], month = new Date()) {
  const y = month.getFullYear(), mo = month.getMonth()
  const due = subs.filter(s => s.tier === 'vendor_paid' && s.renews_at && new Date(s.renews_at).getFullYear() === y && new Date(s.renews_at).getMonth() === mo)
  if (!due.length) return null
  const renewed = due.filter(s => !s.canceled_at).length
  return { due: due.length, renewed, rate: renewed / due.length }
}

/** D-7 리포트 발송 대상 — 1회만 (last_report_sent_at 으로 보장) */
export function reportDue(subs = [], now = new Date()) {
  return subs.filter(s => {
    if (s.tier !== 'vendor_paid' || s.canceled_at || !s.renews_at) return false
    const d = daysUntil(s.renews_at, now)
    if (d === null || d > RENEWAL.REPORT_DAYS_BEFORE || d < 0) return false
    return !s.last_report_sent_at || new Date(s.last_report_sent_at) < new Date(new Date(s.renews_at) - RENEWAL.REPORT_DAYS_BEFORE * 864e5)
  })
}

/** D-14 운영 목록 — 문의 0건 또는 응답률 0% */
export function opsWatchList(subs = [], rowsByVendor = {}, now = new Date()) {
  return subs
    .filter(s => s.tier === 'vendor_paid' && !s.canceled_at)
    .map(s => ({ sub: s, days: daysUntil(s.renews_at, now), m: metrics(rowsByVendor[s.vendor_id] ?? []) }))
    .filter(x => x.days !== null && x.days <= RENEWAL.OPS_DAYS_BEFORE && x.days >= 0)
    .filter(x => x.m.received === 0 || x.m.replyRate === 0)
    .sort((a, b) => a.days - b.days)
}
