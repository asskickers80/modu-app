/**
 * 기업회원(입점 업체) 조회·정렬 (ORDER 2026-09-09 파트 A4)
 * 기업회원 = listings 행(listing_type='business', status='published') — nearbyBrokers.fetchPartnerBrokers 와 같은 원천.
 * 카테고리는 listings.biz_category(config/salesCardCategories.ts 키), 지역은 address 의 시/구 토큰으로 매칭.
 * 기업회원 축 저장이 아직 없어 지금은 0곳이 정상 — 저장이 붙는 순간 그대로 채워진다.
 * 순수 함수(sortVendors·matchesRegion)는 supabase 무의존 — 테스트가 Node에서 직접 import.
 */
import { distanceKm } from './nearbyBrokers'

const PENDING_KEY = 'modu_vendor_pending' // 지역·카테고리에 업체 0곳 기록 [(region, category, signal, date)]

/** 주소가 사용자 지역(시/도 + 구·군)에 속하는가 — 구가 없으면 시/도만 */
export function matchesRegion(address, { region, regionSub }) {
  const a = String(address ?? '')
  if (!a) return false
  if (regionSub) return a.includes(regionSub)
  if (region) return a.startsWith(region) || a.includes(region)
  return false
}

// 정렬은 결제 등급과 무관 — docs/principles/PRICING.md §1
// 거리(가까운 순, 좌표 없으면 뒤) → 응답률(높은 순, 없으면 뒤). 그 외 키 없음.
export function sortVendors(list, origin = null) {
  const key = v => ({
    d: origin ? distanceKm(origin, v) : null,
    r: Number.isFinite(v.responseRate) ? v.responseRate : null,
  })
  return [...list].map(v => ({ v, k: key(v) })).sort((a, b) => {
    if (a.k.d != null && b.k.d != null && a.k.d !== b.k.d) return a.k.d - b.k.d
    if ((a.k.d == null) !== (b.k.d == null)) return a.k.d == null ? 1 : -1
    if (a.k.r != null && b.k.r != null && a.k.r !== b.k.r) return b.k.r - a.k.r
    if ((a.k.r == null) !== (b.k.r == null)) return a.k.r == null ? 1 : -1
    return 0
  }).map(x => x.v)
}

/**
 * 같은 시/구 안 해당 카테고리 기업회원. 실패·컬럼 부재는 빈 배열.
 * @returns [{ id, name, photo, tagline, tags, phone, address, lat, lng, deviceId, responseRate:null }]
 */
export async function fetchVendorsFor({ category, region, regionSub, origin = null }) {
  try {
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase
      .from('listings')
      .select('id, device_id, shop_name, image_urls, biz_tagline, biz_tags, biz_category, biz_phone, address, latitude, longitude')
      .eq('listing_type', 'business')
      .eq('status', 'published')
      .eq('biz_category', category)
      .limit(50)
    if (error || !Array.isArray(data)) return []
    const list = data
      .filter(r => matchesRegion(r.address, { region, regionSub }))
      .map(r => ({
        id: r.id,
        deviceId: r.device_id ?? null,
        name: r.shop_name ?? '',
        photo: (r.image_urls ?? [])[0] ?? null,
        tagline: r.biz_tagline ?? null,
        tags: Array.isArray(r.biz_tags) ? r.biz_tags : [],
        phone: r.biz_phone ? String(r.biz_phone).trim() : null, // 등록한 번호만 — 없으면 [전화하기] 미렌더
        address: r.address ?? '',
        lat: r.latitude ?? null,
        lng: r.longitude ?? null,
        responseRate: null, // 응답률 집계 원천 없음 — 생기면 채운다(정렬 2차 키)
      }))
    return sortVendors(list, origin)
  } catch (_) {
    return []
  }
}

/** 업체 0곳 — pending 목록에 (지역, 카테고리, signal, 날짜) 기록 (같은 날 같은 조합은 1회) */
export function recordPendingDemand({ region, category, signal, date }) {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
    const dup = list.some(x => x.region === region && x.category === category && x.signal === signal && x.date === date)
    if (!dup) {
      list.push({ region, category, signal, date })
      localStorage.setItem(PENDING_KEY, JSON.stringify(list))
    }
    return !dup
  } catch (_) { return false }
}
