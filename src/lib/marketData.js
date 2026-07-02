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

const PUB_KEY = import.meta.env.VITE_PUBLIC_DATA_KEY
const OPENDATA_BASE = '/api/opendata'  // Vite 프록시 경로

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

const DUMMY_DISTRICT = {
  dataSource: 'dummy',
  similarBizCount: 28,
  competitionLevel: 'high',
  footTraffic: { weekday: 8500, weekend: 15000, unit: '명/일 (추정)' },
  vacancyRate: 4.2,
  survivalRate: { oneYear: 72, threeYear: 45 },
  avgRentPerM2: 5.3,
  commercialGrade: 'A',
}

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

// ── 소상공인 상권정보 API ─────────────────────────────────────
// TODO: Kakao/Naver 지오코딩 연동 후 실제 API로 교체
// 좌표(위경도) 확보 전까지 더미 반환
async function fetchDistrictData() {
  // 실제 API 연동 시 이 자리에 코드 추가:
  //   const { lat, lng } = await geocodeAddress(region)
  //   const url = `${OPENDATA_BASE}/B553077/api/open/sdsc2/storeListInRadius?...`
  //   return mapDistrictResponse(await fetch(url).then(r=>r.json()), bizType)

  await new Promise(r => setTimeout(r, 200))
  return { ...DUMMY_DISTRICT }
}

/**
 * 시세·상권 데이터 통합 패치 (외부 공개 함수)
 * @param {{ address: string, bizType: string, area: string }} params
 * @returns {Promise<{ priceData, districtData }>}
 */
export async function fetchMarketData(params) {
  const region = params.address || ''
  const bizType = params.bizType || '카페'

  const [priceData, districtData] = await Promise.all([
    fetchPriceData({ region, bizType }),
    fetchDistrictData({ region, bizType }),
  ])

  return { priceData, districtData }
}
