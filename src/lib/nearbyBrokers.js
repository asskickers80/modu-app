/**
 * 내 주변 부동산 — 기업회원 유료 노출의 원형 (ORDER-nearby-brokers-v1)
 *
 * [비전 — 대표 확정] 홈의 "내 주변 부동산" 3자리는 최종적으로 기업회원(부동산·컨설팅)
 * 유료 노출 자리다. 외부 데이터(네이버 지역 검색)는 기업회원이 채워질 때까지의 임시
 * 채움이며, 입점사가 늘수록 자동 대체된다.
 * 원칙: 외부 업소는 "여기 있다"까지만 — 표현·유입·연결은 입점사의 것.
 *
 * 슬롯 생애주기: 입점 0곳 = 전부 외부 / 입점 N곳 = 입점 상단 우선 + 빈 슬롯만 외부 /
 * 입점 3곳 이상 = 외부 완전 종료.
 */
// supabase는 fetchPartnerBrokers 안에서 동적 import — 이 모듈의 순수 함수(슬롯·쿼리·거리)를
// 테스트가 Node에서 직접 import할 수 있게 유지한다 (supabase.js는 Vite 전용 import.meta.env 사용)

// ── 기준 위치 → 검색 쿼리 ────────────────────────────────────
// 주소 앞 시·군·구(+동·읍·면) 토큰만 취해 "○○구 부동산" 형태로.
export function buildBrokerQuery(address) {
  if (!address || !String(address).trim()) return null
  const tokens = String(address).trim().split(/\s+/)
  const head = tokens.slice(0, 2)
  if (tokens[2] && /(동|읍|면|리|가)\d*$/.test(tokens[2])) head.push(tokens[2])
  return `${head.join(' ')} 부동산`
}

// ── 외부 채움: 네이버 지역 검색 (서버 프록시 + 일 1회 캐시) ──
const CACHE_KEY = 'modu_nearby_brokers_cache'
const today = () => new Date().toISOString().slice(0, 10)

/**
 * @returns {Array|null} 외부 업소 목록. null = 키 미도착·실패 (카드 미표시).
 * 캐시: 같은 날 + 같은 쿼리면 재호출하지 않는다 (홈 진입마다 호출 금지 — 비용 원칙).
 */
let inflight = null // 같은 쿼리 동시 호출 공유 — StrictMode 이중 마운트가 캐시 기록 전 2회 쏘는 것 방지

export async function fetchExternalBrokers(query) {
  if (!query) return null
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (cached && cached.day === today() && cached.query === query) return cached.items
  } catch (_) {}
  const key = `${query}|${today()}`
  if (inflight?.key === key) return inflight.promise
  const promise = fetchExternalBrokersLive(query)
  inflight = { key, promise }
  return promise
}

async function fetchExternalBrokersLive(query) {
  try {
    const res = await fetch(`/api/nearby-brokers?query=${encodeURIComponent(query)}`)
    if (!res.ok) return null
    const j = await res.json()
    if (j.disabled || !Array.isArray(j.items)) return null
    const items = j.items.map(it => ({
      name: String(it.title ?? '').replace(/<[^>]+>/g, ''),          // 검색 API는 <b> 강조 태그 포함
      dong: String(it.address || it.roadAddress || '').split(/\s+/).slice(0, 3).join(' '), // 동 단위까지만
      // 지역 검색 좌표는 WGS84 × 1e7 정수 (mapx=경도, mapy=위도)
      lat: it.mapy ? Number(it.mapy) / 1e7 : null,
      lng: it.mapx ? Number(it.mapx) / 1e7 : null,
    })).filter(b => b.name)
    localStorage.setItem(CACHE_KEY, JSON.stringify({ day: today(), query, items }))
    return items
  } catch (_) {
    return null
  }
}

// ── 입점(기업회원) 조회 ──────────────────────────────────────
// listings 재사용(listing_type='business') — 현재 기업회원 저장 축 미가동이라 0건이 정상.
// (예정) 활동지역 매칭: business_region 컬럼 부재로 지역 필터 없이 조회 —
//        컬럼 추가 SQL은 오더 보고에 제시(멈춤 a), 실행 후 .eq('business_region', ...) 연결.
export async function fetchPartnerBrokers() {
  try {
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase
      .from('listings')
      .select('id, shop_name, image_urls, biz_tagline, biz_tags')
      .eq('listing_type', 'business')
      .eq('status', 'published')
      .limit(3)
    if (error || !Array.isArray(data)) return []
    return data.map(r => ({
      id: r.id,
      name: r.shop_name ?? '',
      photo: (r.image_urls ?? [])[0] ?? null,
      tagline: r.biz_tagline ?? null, // 입점사 작성값만 — 우리가 생성·과장하지 않는다
      tags: Array.isArray(r.biz_tags) ? r.biz_tags : [],
    }))
  } catch (_) {
    return []
  }
}

// ── 슬롯 합성: 입점 무조건 상단, 3곳 이상이면 외부 완전 배제 ──
export function composeBrokerSlots(partners = [], externals = []) {
  const p = partners.slice(0, 3).map(x => ({ type: 'partner', ...x }))
  if (p.length >= 3) return p
  const e = (externals ?? []).map(x => ({ type: 'external', ...x }))
  return [...p, ...e].slice(0, 3)
}

// ── 거리(km) — 좌표가 양쪽 다 있을 때만 (없으면 표시 생략, 추정치 금지) ──
export function distanceKm(a, b) {
  if (!a || !b || ![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) return null
  const R = 6371, rad = d => d * Math.PI / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.asin(Math.sqrt(h)) * 10) / 10
}
