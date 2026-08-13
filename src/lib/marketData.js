/**
 * 시세·상권 데이터 패치 모듈
 *
 * ── 아키텍처 ─────────────────────────────────────────────────
 *  브라우저 → Vite 프록시(/api/opendata) → https://apis.data.go.kr
 *  (프록시가 CORS 헤더 추가 + origin 교체)
 *
 * ── 연동 API ──────────────────────────────────────────────────
 *  실거래가: 국토부 상업업무용 부동산 매매 신고 자료 (RTMSDataSvcSBInfo)
 *    → 공공데이터포털에서 '활용신청' 후 사용 가능
 *
 *  상권정보: 소상공인시장진흥공단 상권정보 서비스 (B553077 sdsc2)
 *    → 좌표(위경도) 필요 — Kakao/Naver 지오코딩 연동 후 교체 예정
 *
 * ── 폴백 흐름 ─────────────────────────────────────────────────
 *  API 성공 → 실데이터 반환 (dataSource: 'api')
 *  API 실패 → 더미 반환   (dataSource: 'dummy')
 *  → 앱은 항상 같은 구조를 받으므로 UI 코드 변경 불필요
 * ─────────────────────────────────────────────────────────────
 */

import { addressToLawdCd, recentMonths } from './areaCode'
import { geocodeAddress } from './geocode'

const PUB_KEY = import.meta.env.VITE_PUBLIC_DATA_KEY
const DISTRICT_KEY = import.meta.env.VITE_DISTRICT_DATA_KEY // 소진공 상가(상권)정보 — 실거래가 키와 별도 승인
const OPENDATA_BASE = '/api/opendata'  // dev: Vite 프록시 / prod: api/opendata/[...path].js 함수

// ── 더미 데이터 ────────────────────────────────────────────────
const DUMMY_PRICE = {
  dataSource: 'dummy',
  avgPricePerM2: null,
  avgKeyMoney: 2800,
  priceRange: { min: 1800, max: 4500 },
  recentDeals: [
    { month: '2026-04', price: 2500, areaM2: 28 },
    { month: '2026-03', price: 3000, areaM2: 35 },
    { month: '2026-02', price: 2800, areaM2: 30 },
    { month: '2026-01', price: 2600, areaM2: 32 },
  ],
  trend: 'up',
  trendPct: 8,
  avgMonthlyRent: 175,
  transactionCount: 0,
}

// 상권 실데이터 없음 표식 — 가짜 상권 수치(유동인구·공실률 더미)는 헌법상 금지라 값 자체를 두지 않는다.
// 소비처(블록 빌더·Gemini 프롬프트)는 dataSource === 'api'일 때만 상권 항목을 사용한다.
const NO_DISTRICT = { dataSource: 'none' }

// ── 실거래가 응답 파싱 헬퍼 (XML DOMParser 기준) ───────────────
function parseItems(doc) {
  const items = doc.querySelectorAll('item')
  if (!items.length) return []
  const get = (el, tag) => el.querySelector(tag)?.textContent?.trim() ?? ''
  return Array.from(items).map(it => {
    const price  = Number(get(it, 'dealAmount').replace(/,/g, ''))
    const areaM2 = Number(get(it, 'buildingAr'))
    const year   = get(it, 'dealYear')
    const month  = get(it, 'dealMonth').padStart(2, '0')
    return { price, areaM2, month: `${year}-${month}` }
  }).filter(d => d.price > 0 && d.areaM2 > 0)
}

// ── 가격 추이 계산 ────────────────────────────────────────────
function calcTrend(deals) {
  if (deals.length < 2) return { trend: 'flat', trendPct: 0 }
  const sorted = [...deals].sort((a, b) => a.month.localeCompare(b.month))
  const recent = sorted.at(-1).price
  const prev = sorted.at(-2).price
  const pct = Math.round(((recent - prev) / prev) * 100)
  return { trend: pct > 2 ? 'up' : pct < -2 ? 'down' : 'flat', trendPct: Math.abs(pct) }
}

// ── 국토부 실거래가 API ────────────────────────────────────────
async function fetchPriceData({ region }) {
  if (!PUB_KEY || PUB_KEY === 'your_public_data_key_here') {
    return { ...DUMMY_PRICE }
  }

  const lawdCd = addressToLawdCd(region)
  if (!lawdCd) {
    console.info('[marketData] LAWD_CD 매핑 실패, 더미 사용:', region)
    return { ...DUMMY_PRICE }
  }

  // 최근 3개월 병렬 조회 (최신 월은 신고 지연으로 데이터 없을 수 있음)
  const months = recentMonths(3)
  const enc = encodeURIComponent(PUB_KEY)

  try {
    const requests = months.map(ym =>
      fetch(
        `${OPENDATA_BASE}/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade?serviceKey=${enc}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&numOfRows=50&pageNo=1`
      ).then(r => r.text()).catch(() => null)
    )

    const results = await Promise.all(requests)

    // XML 파싱 + 결과 코드 확인 — '000'이 아니면 API 미승인 상태
    const parsed = results.map(xmlText => {
      if (!xmlText) return null
      try {
        const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
        const code = doc.querySelector('resultCode')?.textContent?.trim()
        return { code, doc }
      } catch { return null }
    })

    const firstValid = parsed.find(r => r?.code === '000')
    if (!firstValid) {
      console.info('[marketData] 실거래가 API 미승인 상태, 더미 사용')
      return { ...DUMMY_PRICE }
    }

    const allDeals = parsed.flatMap(r => {
      if (r?.code !== '000') return []
      return parseItems(r.doc)
    })

    if (allDeals.length === 0) {
      console.info('[marketData] 실거래가 데이터 없음, 더미 사용')
      return { ...DUMMY_PRICE }
    }

    const prices = allDeals.map(d => d.price)
    const avgPerM2 = Math.round(
      allDeals.reduce((s, d) => s + d.price / d.areaM2, 0) / allDeals.length
    )
    const { trend, trendPct } = calcTrend(allDeals)

    return {
      dataSource: 'api',
      avgPricePerM2: avgPerM2,    // 건물 ㎡당 평균 매매가 (만원)
      avgKeyMoney: null,           // 권리금은 공개 데이터 없음
      priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
      recentDeals: allDeals.slice(0, 6),
      trend,
      trendPct,
      avgMonthlyRent: null,        // 실거래가 API에는 임대료 정보 없음
      transactionCount: allDeals.length,
    }
  } catch (e) {
    console.warn('[marketData] 실거래가 API 오류, 더미 폴백:', e)
    return { ...DUMMY_PRICE }
  }
}

// ── 소상공인 상권정보 API (storeListInRadius) ─────────────────
// 반경 내 상가·업종 실데이터. 유동인구·배후세대는 이 API에 없음 — 제공되는 항목만 실값으로 쓴다.
const DISTRICT_RADIUS = 300
// 입지(spot) 반경 — "바로 이 자리 주변"(ad-frame). 상권(300m)과 층위를 분리한다.
const SPOT_RADIUS = 100
const DISTRICT_MAX_ROWS = 1000 // API 페이지 상한 — totalCount가 넘으면 업종 구성·동종 수는 표본 기준

async function fetchDistrictData({ region, ksicCode, bizLabel, radius = DISTRICT_RADIUS, coords: given = null }) {
  if (!DISTRICT_KEY) return { ...NO_DISTRICT }
  // 지오코딩은 호출부에서 1회만 하고 좌표를 넘겨줄 수 있다 — 반경 2회 조회 시 중복 지오코딩 방지(비용 원칙)
  const coords = given ?? await geocodeAddress(region)
  if (!coords) return { ...NO_DISTRICT }

  try {
    const url = `${OPENDATA_BASE}/B553077/api/open/sdsc2/storeListInRadius` +
      `?serviceKey=${encodeURIComponent(DISTRICT_KEY)}&radius=${radius}` +
      `&cx=${coords.lng}&cy=${coords.lat}&type=json&numOfRows=${DISTRICT_MAX_ROWS}&pageNo=1`
    const j = await fetch(url).then(r => r.json())
    const items = j?.body?.items
    const totalStores = Number(j?.body?.totalCount)
    if (!Array.isArray(items) || !Number.isFinite(totalStores)) {
      console.info('[marketData] 상권 API 응답 형식 불일치 — 상권 데이터 제외')
      return { ...NO_DISTRICT }
    }

    // 업종 구성 — 상권업종 중분류 집계
    const byCat = {}
    for (const it of items) {
      if (it.indsMclsNm) byCat[it.indsMclsNm] = (byCat[it.indsMclsNm] ?? 0) + 1
    }
    const topCategories = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // 동종 수 — KSIC 세세분류 일치(sdsc2 ksicCd는 'I56221' 형태 → 숫자부만 비교).
    // KSIC 없으면(임대인 등) 계산하지 않는다 — 어림 키워드 매칭으로 틀린 수를 만들지 않기 위해.
    let similarBizCount = null
    if (ksicCode) {
      similarBizCount = items.filter(it =>
        (it.ksicCd ?? '').replace(/^[A-Z]/, '') === String(ksicCode)).length
    } else if (bizLabel) {
      const kw = String(bizLabel).split(/[·/\s]/).filter(w => w.length >= 2)
      if (kw.length) {
        similarBizCount = items.filter(it =>
          kw.some(w => (it.indsSclsNm ?? '').includes(w) || (it.indsMclsNm ?? '').includes(w))).length
      }
    }

    return {
      dataSource: 'api',
      radius,
      totalStores,                              // 정확값 (totalCount)
      sampled: totalStores > items.length,      // true면 업종 구성·동종 수는 표본 기준
      sampleSize: items.length,
      topCategories,
      similarBizCount,
    }
  } catch (e) {
    console.warn('[marketData] 상권 API 오류, 상권 데이터 제외:', e)
    return { ...NO_DISTRICT }
  }
}

/**
 * 현 위치 기반 동네 밀집도 (sales-tracking §5) — 기존 fetchDistrictData 재사용(복제 금지).
 * 좌표는 호출부가 geolocation으로 확보(권한은 사용자 탭 시에만 — brokers 정책과 동일).
 * 매출 비교가 아니라 반경 내 상가·동종 수만 — 표본 승격 전 매출 비교 수치 금지(오더 §5).
 */
export async function fetchNearbyDensity(coords, { ksicCode = null, bizLabel = null } = {}) {
  return fetchDistrictData({ region: null, ksicCode, bizLabel, coords })
}

/**
 * 시세·상권 데이터 통합 패치 (외부 공개 함수)
 * @param {{ address: string, bizType?: string, area?: string, ksicCode?: string }} params
 * @param {{ includeDistrict?: boolean, includeSpot?: boolean }} opts
 *   includeDistrict: 상권 실데이터(반경 300m) 포함 여부.
 *   기본 false — 표시 화면(E2 등)에서 열람마다 지오코딩을 부르지 않기 위한 비용 원칙.
 *   등록 초안 생성(E1·E1p)에서만 true로 켠다.
 *   includeSpot: 입지 실데이터(반경 100m) 추가 포함 — 지오코딩은 재사용하므로 늘어나는 건
 *   소진공 호출 1회뿐(ad-frame 판정: 초안 생성 1회당 상권 1 + 입지 1, 열람 시 0).
 * @returns {Promise<{ priceData, districtData, spotData }>}
 */
export async function fetchMarketData(params, { includeDistrict = false, includeSpot = false } = {}) {
  const region = params.address || ''
  const bizType = params.bizType || '카페'

  // 지오코딩 1회 → 두 반경이 공유 (중복 호출 금지)
  const coords = (includeDistrict || includeSpot) ? await geocodeAddress(region) : null

  const [priceData, districtData, spotData] = await Promise.all([
    fetchPriceData({ region, bizType }),
    includeDistrict && coords
      ? fetchDistrictData({ region, coords, ksicCode: params.ksicCode, bizLabel: params.bizType })
      : Promise.resolve({ ...NO_DISTRICT }),
    includeSpot && coords
      ? fetchDistrictData({ region, coords, radius: SPOT_RADIUS, ksicCode: params.ksicCode, bizLabel: params.bizType })
      : Promise.resolve({ ...NO_DISTRICT }),
  ])

  return { priceData, districtData, spotData }
}
