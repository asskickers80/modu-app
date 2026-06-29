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
      icon: '✍️',
      canHide: false,
      body: aiDraft.description || '',
      note: null,
    },
    {
      id: 'location',
      title: '위치 · 임대 조건',
      tone: 'fact',
      icon: '📍',
      canHide: false,
      body: locationLines,
      note: '입력하신 사실 정보입니다.',
    },
    {
      id: 'facility',
      title: '시설 컨디션 평가',
      tone: 'estimate',
      icon: '🔧',
      canHide: true,
      body: aiDraft.facility || '',
      note: '입력 정보 기반 AI 추정값이에요. 실제와 다를 수 있어요.',
    },
  ]

  if (aiDraft.salesAnalysis && data.monthlySales) {
    blocks.push({
      id: 'sales',
      title: '매출 분석',
      tone: 'estimate',
      icon: '📈',
      canHide: true,
      body: aiDraft.salesAnalysis,
      note: '공개 여부를 다음 단계에서 선택할 수 있어요.',
    })
  }

  // ── 시세·상권 블록 (공공데이터 API 연동 전 더미) ──────────
  if (market) {
    const { priceData, districtData } = market
    const trend = TREND_TEXT[priceData.trend] ?? '보합'

    const marketDataLines = [
      `• 인근 유사 업종 평균 권리금: ${priceData.avgKeyMoney.toLocaleString()}만원`,
      `• 권리금 가격대: ${priceData.priceRange.min}~${priceData.priceRange.max}만원`,
      `• 최근 가격 추이: ↑${priceData.trendPct}% (${trend})`,
      `• 평균 월세 (유사 규모): ${priceData.avgMonthlyRent}만원`,
      `• 반경 300m 동종 업체: ${districtData.similarBizCount}개 (경쟁도 ${districtData.competitionLevel === 'high' ? '높음' : districtData.competitionLevel === 'medium' ? '보통' : '낮음'})`,
      `• 주말 유동인구: 약 ${districtData.footTraffic.weekend.toLocaleString()}명`,
      `• 상가 공실률: ${districtData.vacancyRate}% / 업종 1년 생존율: ${districtData.survivalRate.oneYear}%`,
    ].join('\n')

    blocks.push({
      id: 'market_data',
      title: '인근 시세 · 상권 데이터',
      tone: 'fact',
      icon: '📊',
      canHide: true,
      body: marketDataLines,
      note: '더미 데이터 — 공공데이터 API 연동 전입니다. src/lib/marketData.js 교체 시 실데이터로 전환돼요.',
    })

    if (insight) {
      blocks.push({
        id: 'market_insight',
        title: 'AI 시세 해석',
        tone: 'estimate',
        icon: '🔍',
        canHide: true,
        body: insight,
        note: '시세·상권 데이터 기반 AI 참고 해석이에요. 사실 판단 전 전문가 확인을 권장해요.',
      })
    }
  }

  return blocks
}
