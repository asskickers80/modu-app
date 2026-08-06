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

// 일 1회 캐시 — 다중 지역(쿼리별) 저장: { day, entries: { [query]: items } }
function readCache(query) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (c?.day === today() && c.entries && query in c.entries) return c.entries[query]
  } catch (_) {}
  return undefined
}
function writeCache(query, items) {
  let c = null
  try { c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') } catch (_) {}
  if (!c || c.day !== today() || !c.entries) c = { day: today(), entries: {} }
  c.entries[query] = items
  localStorage.setItem(CACHE_KEY, JSON.stringify(c))
}

/**
 * @returns {Array|null} 외부 업소 목록. null = 키 미도착·실패 (카드 미표시).
 * 캐시: 같은 날 + 같은 쿼리면 재호출하지 않는다 (홈 진입마다 호출 금지 — 비용 원칙).
 */
const inflight = new Map() // 쿼리별 동시 호출 공유 — StrictMode 이중 마운트가 캐시 기록 전 2회 쏘는 것 방지

export async function fetchExternalBrokers(query) {
  if (!query) return null
  const cached = readCache(query)
  if (cached !== undefined) return cached
  const key = `${query}|${today()}`
  if (inflight.has(key)) return inflight.get(key)
  const promise = fetchExternalBrokersLive(query)
  inflight.set(key, promise)
  return promise
}

/**
 * 복수 매물(지역) 기반 외부 채움 — 지역별로 검색해 라운드로빈으로 섞는다.
 * 대표 지시(2026-08-03): 매물이 여러 지역이면 각 매물 지역이 최소 1곳씩 반영돼야 한다.
 * bases: [{ address, coords }] (호출부 우선순위 순 — 첫 지역이 남는 슬롯을 더 가져간다).
 * 같은 쿼리로 합쳐지는 매물(같은 구)은 한 지역으로 dedupe. 거리 계산용 coords는 지역별 유지.
 * @returns {Array|null} null = 전 지역 키 미도착/실패 (카드 미렌더)
 */
export async function fetchExternalBrokersForBases(bases) {
  const zones = []
  const seen = new Set()
  for (const b of bases ?? []) {
    const q = buildBrokerQuery(b?.address)
    if (!q || seen.has(q)) continue
    seen.add(q)
    zones.push({ query: q, coords: b?.coords ?? null })
  }
  if (!zones.length) return null
  const lists = await Promise.all(zones.map(z =>
    fetchExternalBrokers(z.query)
      .then(items => items === null ? null : items.map(it => ({ ...it, baseCoords: z.coords })))))
  if (lists.every(l => l === null)) return null
  const out = []
  for (let round = 0, added = true; added && out.length < 9; round++) {
    added = false
    for (const l of lists) {
      if (l && l[round]) { out.push(l[round]); added = true }
    }
  }
  return out
}

async function fetchExternalBrokersLive(query) {
  try {
    const res = await fetch(`/api/nearby-brokers?query=${encodeURIComponent(query)}`)
    if (!res.ok) return null
    const j = await res.json()
    if (j.disabled || !Array.isArray(j.items)) return null
    // 지역 검색은 쿼리 유사 업소(공유오피스 등)도 섞여 온다 — 부동산 카테고리만 통과
    // (실검증: category '부동산>중개업' 형태. 필드 없으면 보수적으로 통과시키지 않는다)
    const items = j.items.filter(it => String(it.category ?? '').includes('부동산')).map(it => ({
      name: String(it.title ?? '').replace(/<[^>]+>/g, ''),          // 검색 API는 <b> 강조 태그 포함
      dong: String(it.address || it.roadAddress || '').split(/\s+/).slice(0, 3).join(' '), // 동 단위까지만
      // 지역 검색 좌표는 WGS84 × 1e7 정수 (mapx=경도, mapy=위도)
      lat: it.mapy ? Number(it.mapy) / 1e7 : null,
      lng: it.mapx ? Number(it.mapx) / 1e7 : null,
    })).filter(b => b.name)
    writeCache(query, items)
    return items
  } catch (_) {
    return null
  }
}

// ── 현 위치 기반 검색 (brokers-entry-only) ───────────────────
// 등록 진입 시점 전용: geolocation → 역지오코딩(법정동) → 지역 쿼리 → 외부 검색.
// 권한 프롬프트는 이 호출 시점에만 뜬다(호출부가 사용자 탭으로만 부른다).
// 캐시: 역지오코딩은 좌표 소수 3자리(≈110m) 키로 일 1회, 외부 검색은 기존 쿼리 캐시 재사용.
const GEO_CACHE_KEY = 'modu_brokers_geo_cache'

export async function fetchBrokersNearMe() {
  if (!('geolocation' in navigator)) return { status: 'error' }
  let pos
  try {
    pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 300000 }))
  } catch (e) {
    // code 1 = PERMISSION_DENIED (이전 차단 포함 — iOS는 재프롬프트 없이 즉시 거부 반환)
    return { status: e?.code === 1 ? 'denied' : 'error' }
  }
  const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
  const geoKey = `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`

  let region = null
  try {
    const c = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || 'null')
    if (c?.day === today() && c.key === geoKey) region = c.region
  } catch (_) {}
  if (!region) {
    try {
      const r = await fetch('/api/geocode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng }),
      })
      region = (await r.json())?.region ?? null
      if (region) localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ day: today(), key: geoKey, region }))
    } catch (_) { return { status: 'error' } }
  }
  if (!region) return { status: 'error' } // 역지오코딩 실패 — 권한 거부와 구분(entry-geo-fix)

  const externals = await fetchExternalBrokers(buildBrokerQuery(region))
  if (externals === null) return { status: 'off' } // 검색 키 미가동 — 조용히 생략 대상
  return { status: 'ok', coords, region, externals }
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
