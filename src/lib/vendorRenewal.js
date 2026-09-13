/**
 * 기업회원 갱신 리포트 — 데이터 계층 (ORDER 2026-09-13 파트 B2·B3).
 * 원장 원본·사용자 식별 정보는 나가지 않는다 — 집계만 계산해서 돌려준다(§2-b·§2-f).
 */
import { supabase, getDeviceId } from './supabase'
import { logEvent } from './eventLog'
import { reportLines, opsWatchList, renewalRate, windowStart } from './vendorRenewalRules'

/** 내 업체(기업회원) 목록 — 기기 기준 */
export async function fetchMyVendors() {
  try {
    const { data } = await supabase.from('listings').select('id, shop_name, user_id').eq('device_id', getDeviceId()).eq('listing_type', 'business')
    return data ?? []
  } catch (_) { return [] }
}

async function ledgerRows(vendorIds = []) {
  if (!vendorIds.length) return []
  try {
    const { data } = await supabase.from('inquiry_ledger')
      .select('id, vendor_id, source, status, channel, conversation_id, created_at')
      .in('vendor_id', vendorIds).gte('created_at', windowStart())
    return data ?? []
  } catch (_) { return [] }
}

/** 기업회원 홈 카드 재료. 구독 행이 없으면 null (갱신 개념 자체가 없는 상태 — 카드도 없다) */
export async function fetchRenewalReport() {
  const vendors = await fetchMyVendors()
  if (!vendors.length) return null
  const ids = vendors.map(v => v.id)
  let sub = null
  try {
    const { data } = await supabase.from('vendor_subscriptions').select('*').in('vendor_id', ids).order('renews_at', { ascending: true }).limit(1)
    sub = data?.[0] ?? null
  } catch (_) { sub = null }
  if (!sub) return null
  const rows = await ledgerRows(ids)
  return { ...reportLines(rows, { renewsAt: sub.renews_at }), sub }
}

export async function markReportShown(daysBefore) { logEvent('vendor_renewal_report_shown', { days_before: daysBefore }) }

/** 운영 목록 (/dev/vendor-ops) — 갱신 D-14 문의 0건·응답 0% + 수요 신호 pending 지역 */
export async function fetchOpsList() {
  try {
    const { data: subs } = await supabase.from('vendor_subscriptions').select('*')
    const ids = (subs ?? []).map(s => s.vendor_id)
    const rows = await ledgerRows(ids)
    const byVendor = {}
    for (const r of rows) (byVendor[r.vendor_id] ??= []).push(r)
    const { data: names } = ids.length
      ? await supabase.from('listings').select('id, shop_name, address').in('id', ids)
      : { data: [] }
    const nameById = new Map((names ?? []).map(v => [v.id, v]))
    const watch = opsWatchList(subs ?? [], byVendor).map(x => ({ ...x, vendor: nameById.get(x.sub.vendor_id) ?? null }))
    let pending = []
    try {
      const { data } = await supabase.from('demand_signals').select('region_gu, created_at').eq('pending', true).order('created_at', { ascending: false }).limit(200)
      const counts = new Map()
      for (const r of data ?? []) if (r.region_gu) counts.set(r.region_gu, (counts.get(r.region_gu) ?? 0) + 1)
      pending = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([region, n]) => ({ region, n }))
    } catch (_) {}
    return { watch, pending, rate: renewalRate(subs ?? []) }
  } catch (_) { return { watch: [], pending: [], rate: null } }
}
