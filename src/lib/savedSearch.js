/**
 * 저장한 조건 — '이 조건 그대로 새 매물 알림' (ORDER 2026-09-21 파트 B3).
 * 찜 알림과 별개 종류이나 하루 발송 상한은 함께 센다(config/watch.ts WATCH.DAILY_*).
 * 새 매물이 0건인 날은 보내지 않는다(빈 알림 금지). 표가 아직 없으면 조용히 실패한다.
 */
import { supabase, getDeviceId } from './supabase'
import { logEvent } from './eventLog'
import { RELAX, RELAX_COPY } from '../../config/searchRelax'
import { matchesFilters } from './searchFilters'

const SESSION_KEY = 'modu_pending_saved_search'   // 로그인 왕복 생존(앱 전환에서 sessionStorage 는 죽는다)

async function currentUser() {
  try { const { data: { session } } = await supabase.auth.getSession(); return session?.user ?? null } catch (_) { return null }
}

/** 조건 요약 한글 한 줄 — 화면·알림·시트가 같은 문장을 쓴다 */
export function describeFilters(f = {}) {
  const parts = []
  if (f.area && f.area !== '전체 지역') parts.push(f.area)
  if (f.industry?.sub) parts.push(f.industry.sub)
  else if (f.industry?.main) parts.push(f.industry.main)
  if (f.type && f.type !== '전체') parts.push(f.type)
  if (f.transferFee != null) parts.push(`권리금 ${Number(f.transferFee).toLocaleString('ko-KR')} 이하`)
  if (f.monthlyRent != null) parts.push(`월세 ${Number(f.monthlyRent).toLocaleString('ko-KR')} 이하`)
  if (f.deposit != null) parts.push(`보증금 ${Number(f.deposit).toLocaleString('ko-KR')} 이하`)
  if (f.floor && f.floor !== '전층') parts.push(f.floor)
  if (f.query?.trim()) parts.push(`'${f.query.trim()}'`)
  return parts.join(' · ') || '전체 매물'
}

export const regionOf = f => (f?.area && f.area !== '전체 지역' ? f.area : null)
export const industryOf = f => f?.industry?.main ?? null

export async function fetchSavedSearches() {
  const user = await currentUser()
  if (!user) return []
  try {
    const { data } = await supabase.from('saved_searches').select('*')
      .eq('user_id', user.id).is('deleted_at', null).order('created_at', { ascending: false })
    return data ?? []
  } catch (_) { return [] }
}

/** @returns { ok, reason?: 'login'|'max'|'error' } */
export async function saveSearch(filters) {
  const user = await currentUser()
  if (!user) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(filters)) } catch (_) {}
    return { ok: false, reason: 'login' }
  }
  const mine = await fetchSavedSearches()
  if (mine.length >= RELAX.MAX_SAVED_SEARCHES) return { ok: false, reason: 'max' }
  try {
    const { error } = await supabase.from('saved_searches').insert({
      user_id: user.id, device_id: getDeviceId(), filters,
      region_code: regionOf(filters), industry_code: industryOf(filters),
    })
    if (error) return { ok: false, reason: 'error' }
    logEvent('saved_search_created', { filter_count: Object.keys(filters ?? {}).length })
    return { ok: true }
  } catch (_) { return { ok: false, reason: 'error' } }
}

/** 로그인 왕복 뒤 이어서 저장 */
export async function consumePendingSavedSearch() {
  let pending = null
  try { pending = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch (_) { pending = null }
  if (!pending) return null
  try { localStorage.removeItem(SESSION_KEY) } catch (_) {}
  return saveSearch(pending)
}
export const hasPendingSavedSearch = () => { try { return !!localStorage.getItem(SESSION_KEY) } catch (_) { return false } }

export async function pauseSavedSearch(id, paused) {
  try { await supabase.from('saved_searches').update({ paused_at: paused ? new Date().toISOString() : null }).eq('id', id); return true } catch (_) { return false }
}
export async function deleteSavedSearch(id) {
  try {
    await supabase.from('saved_searches').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    logEvent('saved_search_deleted', {})
    return true
  } catch (_) { return false }
}

/** 등록 화면 신호 줄 — 이번 달 이 지역·업종 저장 알림 수. 임계값 미만이면 null(줄 자체를 뺀다) */
export async function fetchDemandSignalLine(region, industry) {
  if (!region) return null
  try {
    const month = new Date(); month.setDate(1)
    const q = supabase.from('search_demand_facts').select('count')
      .eq('kind', 'saved_search').eq('region_code', region).gte('month', month.toISOString().slice(0, 10))
    const { data } = industry ? await q.eq('industry_code', industry) : await q
    const n = (data ?? []).reduce((a, r) => a + (r.count ?? 0), 0)
    if (n < RELAX.MIN_DEMAND_SHOW) return null
    return RELAX_COPY.demandLine.replace('{industry}', industry ?? '이 업종').replace('{n}', String(n))
  } catch (_) { return null }
}

/** 배치 재료 — 저장 조건에 새로 걸린 매물 수 (0이면 보내지 않는다) */
export const newMatchCount = (search, listings = []) =>
  (listings ?? []).filter(l => matchesFilters(l, search?.filters ?? {})).length
