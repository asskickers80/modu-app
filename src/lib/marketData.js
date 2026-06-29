/**
 * 시세·상권 데이터 패치 모듈
 *
 * 현재 상태: 더미 데이터 반환 (공공데이터 API 키 발급 대기 중)
 *
 * ── 연동 예정 API ─────────────────────────────────────────────
 *  실거래가: 공공데이터포털 → 국토부 상업용 부동산 실거래가 조회
 *    https://apis.data.go.kr/1613000/RTMSDataSvcSBInfo
 *
 *  상권정보: 소상공인시장진흥공단 상권정보 API
 *    https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius
 *
 *  유동인구: 서울시 열린데이터광장
 *    https://data.seoul.go.kr/
 *
 * ── 실제 API 연동 시 교체 방법 ────────────────────────────────
 *  1. fetchPriceData() 내부 더미 return 삭제 후 API fetch 코드 작성
 *  2. fetchDistrictData() 동일
 *  3. API 응답을 아래와 동일한 객체 구조로 변환(매핑)해 return
 *  → 이 파일 외부(E1Step2, gemini.js)는 수정 불필요
 * ─────────────────────────────────────────────────────────────
 */

// ── 국토부 실거래가 (더미) ─────────────────────────────────────
// TODO: API 키 발급 후 이 함수 내부를 실제 fetch 코드로 교체하세요
async function fetchPriceData({ region, bizType }) {
  // 실제 API 지연 시뮬레이션 (나중에 삭제)
  await new Promise(r => setTimeout(r, 250))

  return {
    region: region || '서울 마포구 서교동',
    bizType: bizType || '카페',
    avgKeyMoney: 2800,         // 인근 유사 업종 평균 권리금 (만원)
    priceRange: { min: 1800, max: 4500 }, // 만원
    recentDeals: [            // 최근 4개월 실거래
      { month: '2026-04', price: 2500, areaM2: 28 },
      { month: '2026-03', price: 3000, areaM2: 35 },
      { month: '2026-02', price: 2800, areaM2: 30 },
      { month: '2026-01', price: 2600, areaM2: 32 },
    ],
    trend: 'up',              // 'up' | 'down' | 'flat'
    trendPct: 8,              // 전월 대비 %
    avgMonthlyRent: 175,      // 유사 면적 평균 월세 (만원)
  }
}

// ── 소상공인 상권정보 (더미) ──────────────────────────────────
// TODO: API 키 발급 후 이 함수 내부를 실제 fetch 코드로 교체하세요
async function fetchDistrictData({ region, bizType }) {
  await new Promise(r => setTimeout(r, 250))

  return {
    similarBizCount: 28,      // 반경 300m 동종 업체 수
    competitionLevel: 'high', // 'low' | 'medium' | 'high'
    footTraffic: {
      weekday: 8500,
      weekend: 15000,
      unit: '명/일 (추정)',
    },
    vacancyRate: 4.2,         // 상가 공실률 (%)
    survivalRate: {
      oneYear: 72,            // 업종 1년 생존율 (%)
      threeYear: 45,          // 업종 3년 생존율 (%)
    },
    avgRentPerM2: 5.3,        // ㎡당 평균 월세 (만원)
    commercialGrade: 'A',     // 상권 등급 A/B/C/D
  }
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
