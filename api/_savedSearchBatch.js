/**
 * 저장한 조건 새 매물 알림 — 순수 룰 (ORDER 2026-09-21 파트 B3·C1).
 * 하루 한 번 묶음. 0건인 날은 보내지 않는다(빈 알림 금지). 하루 발송 상한은 찜 알림과 함께 센다.
 * 수요 집계(search_demand_facts)는 원문 필터·user_id 없이 월·지역·업종 단위로만 굳힌다.
 */
import { matchesFilters } from '../src/lib/searchFilters.js'
export { matchesFilters }

/** 저장 조건에 새로 걸린 매물 수 */
export const newMatchCount = (search, listings = []) => (listings ?? []).filter(l => matchesFilters(l, search?.filters ?? {})).length

export const SAVED_SEARCH_COPY = { notif: '저장한 조건에 새 매물 {n}건' }

/** 어제(마지막 발송 이후) 올라온 매물 중 이 조건에 걸린 수 */
export function dueDigests(searches = [], listings = [], now = new Date(), match) {
  const out = []
  for (const s of searches ?? []) {
    if (s.deleted_at || s.paused_at) continue
    const since = s.last_notified_at ? new Date(s.last_notified_at) : new Date(now.getTime() - 864e5)
    const fresh = (listings ?? []).filter(l => new Date(l.published_at ?? l.created_at ?? 0) > since)
    const n = fresh.filter(l => match(l, s.filters ?? {})).length
    if (n > 0) out.push({ search: s, n, title: SAVED_SEARCH_COPY.notif.replace('{n}', String(n)) })
  }
  return out
}

export const monthOf = d => new Date(d).toISOString().slice(0, 7) + '-01'

/**
 * 월·지역·업종 단위 집계 — events(0건 탐색)와 saved_searches 생성분을 굳힌다.
 * 원문 필터·user_id 는 넣지 않는다(스키마에도 없다).
 */
export function aggregateDemand({ emptyEvents = [], savedSearches = [], now = new Date() } = {}) {
  const map = new Map()
  const add = (month, region, industry, kind, n = 1) => {
    if (!region) return                       // 지역이 없는 탐색은 집계하지 않는다
    const k = JSON.stringify([month, region, industry ?? null, kind])
    map.set(k, (map.get(k) ?? 0) + n)
  }
  for (const e of emptyEvents) add(monthOf(e.created_at ?? now), e.region_code ?? e.payload?.region ?? null, e.industry_code ?? e.payload?.industry ?? null, 'empty_result')
  for (const s of savedSearches) add(monthOf(s.created_at ?? now), s.region_code, s.industry_code, 'saved_search')
  return [...map.entries()].map(([k, count]) => {
    const [month, region_code, industry_code, kind] = JSON.parse(k)
    return { month, region_code, industry_code, kind, count }
  })
}
