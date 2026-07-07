// E1 2단계·3단계 공용 블록 빌더
// 블록 = { id, title, tone, icon, canHide, body, note? }

const TRANSFER_LABEL = { bare: '바닥권리', full: '영업양도', undecided: '미정' }

const TREND_TEXT = { up: '상승 추세', down: '하락 추세', flat: '보합' }

/**
 * @param {object} aiDraft      generateListingDraft() 결과
 * @param {object|null} market  fetchMarketData() 결과 { priceData, districtData }
 * @param {string|null} insight generateMarketInsight() 결과 텍스트
 * @param {object} data         E1Context data (address, floor, area, ...)
 * @returns {Array}
 */
export function buildListingBlocks(aiDraft, market, insight, data) {
  if (!aiDraft) return []

  const locationLines = [
    `• 주소: ${data.address || '(미입력)'}`,
    (data.floor || data.area)
      ? `• 층수: ${data.floor || '-'} / 전용면적: ${data.area ? data.area + '㎡' : '-'}`
      : null,
    `• 보증금 ${data.deposit || '-'}만원 / 월세 ${data.monthlyRent || '-'}만원${data.maintenance ? ` / 관리비 ${data.maintenance}만원` : ''}`,
    `• 양도방식: ${TRANSFER_LABEL[data.transferType] ?? '-'}`,
    `• 희망 권리금: ${data.transferFee ? data.transferFee + '만원' : '-'}`,
  ].filter(Boolean).join('\n')

  const blocks = [
    {
      id: 'description',
      title: 'AI 매물 설명문',
      tone: 'fact',
      source: 'ai',
      icon: '✍️',
      canHide: true,
      body: aiDraft.description || '',
      note: null,
    },
    {
      id: 'location',
      title: '위치 · 임대 조건',
      tone: 'fact',
      source: 'input',
      icon: '📍',
      canHide: false,
      body: locationLines,
      note: '입력하신 사실 정보입니다.',
    },
    {
      id: 'facility',
      title: '시설 컨디션 평가',
      tone: 'estimate',
      source: 'ai',
      icon: '🔧',
      canHide: true,
      body: aiDraft.facility || '',
      note: '입력 정보 기반 AI 추정값이에요. 실제와 다를 수 있어요.',
    },
  ]

  if (aiDraft.salesAnalysis && data.monthlySales) {
    blocks.push({
      id: 'salesAnalysis',
      title: '매출 분석',
      tone: 'estimate',
      source: 'ai',
      icon: '📈',
      canHide: true,
      body: aiDraft.salesAnalysis,
      note: '매출 정보는 기본적으로 비공개입니다. 공개로 전환할 수 있어요.',
    })
  }

  // ── 시세·상권 블록 ────────────────────────────────────────
  if (market) {
    const { priceData, districtData } = market
    const trend = TREND_TEXT[priceData.trend] ?? '보합'
    const isRealData = priceData.dataSource === 'api'

    const marketDataLines = isRealData
      // 실공공데이터: 건물 매매가 기준 표시
      ? [
          priceData.avgPricePerM2 != null
            ? `• 인근 상가 평균 ㎡당 거래가: ${priceData.avgPricePerM2.toLocaleString()}만원`
            : null,
          `• 실거래 가격대: ${priceData.priceRange.min.toLocaleString()}~${priceData.priceRange.max.toLocaleString()}만원`,
          `• 최근 가격 추이: ${priceData.trend === 'up' ? '↑' : priceData.trend === 'down' ? '↓' : '→'}${priceData.trendPct}% (${trend})`,
          priceData.transactionCount ? `• 최근 3개월 거래 건수: ${priceData.transactionCount}건` : null,
          `• 반경 300m 동종 업체: ${districtData.similarBizCount}개 (경쟁도 ${districtData.competitionLevel === 'high' ? '높음' : districtData.competitionLevel === 'medium' ? '보통' : '낮음'})`,
          `• 주말 유동인구: 약 ${districtData.footTraffic.weekend.toLocaleString()}명`,
          `• 상가 공실률: ${districtData.vacancyRate}% / 업종 1년 생존율: ${districtData.survivalRate.oneYear}%`,
        ].filter(Boolean).join('\n')
      // 더미 데이터
      : [
          `• 인근 유사 업종 평균 권리금: ${priceData.avgKeyMoney?.toLocaleString()}만원`,
          `• 권리금 가격대: ${priceData.priceRange.min}~${priceData.priceRange.max}만원`,
          `• 최근 가격 추이: ${priceData.trend === 'up' ? '↑' : priceData.trend === 'down' ? '↓' : '→'}${priceData.trendPct}% (${trend})`,
          `• 평균 월세 (유사 규모): ${priceData.avgMonthlyRent}만원`,
          `• 반경 300m 동종 업체: ${districtData.similarBizCount}개 (경쟁도 ${districtData.competitionLevel === 'high' ? '높음' : districtData.competitionLevel === 'medium' ? '보통' : '낮음'})`,
          `• 주말 유동인구: 약 ${districtData.footTraffic.weekend.toLocaleString()}명`,
          `• 상가 공실률: ${districtData.vacancyRate}% / 업종 1년 생존율: ${districtData.survivalRate.oneYear}%`,
        ].join('\n')

    blocks.push({
      id: 'market_data',
      title: isRealData ? '인근 상가 실거래가 · 상권' : '인근 시세 · 상권 데이터',
      tone: isRealData ? 'fact' : 'estimate',
      source: isRealData ? 'input' : 'ai',
      icon: '📊',
      canHide: true,
      body: marketDataLines,
      note: isRealData
        ? '국토부 상업용 부동산 실거래가 기반 데이터입니다. 건물 매매가 기준이며, 권리금과는 다를 수 있어요.'
        : '참고용 추정 데이터입니다. 공공데이터 API 활용신청 승인 후 실거래가로 자동 전환돼요.',
    })

    if (insight) {
      blocks.push({
        id: 'market_insight',
        title: 'AI 시세 해석',
        tone: 'estimate',
        source: 'ai',
        icon: '🔍',
        canHide: true,
        body: insight,
        note: '시세·상권 데이터 기반 AI 참고 해석이에요. 사실 판단 전 전문가 확인을 권장해요.',
      })
    }
  }

  return blocks
}
