// E1 2단계·3단계 공용 블록 빌더
// 블록 = { id, title, tone, icon, canHide, body, note? }
import { DEEP_BLOCKS_ENABLED } from '../../lib/memberTier'

const TRANSFER_LABEL = { bare: '바닥권리', full: '영업양도', undecided: '미정' }

const TREND_TEXT = { up: '상승 추세', down: '하락 추세', flat: '보합' }

/**
 * @param {object} aiDraft      generateListingDraft() 결과
 * @param {object|null} market  fetchMarketData() 결과 { priceData, districtData }
 * @param {string|null} insight generateMarketInsight() 결과 텍스트
 * @param {object} data         E1Context data (address, floor, area, ...)
 * @returns {Array}
 */
export function buildListingBlocks(aiDraft, market, insight, data, opts = { deepBlocks: DEEP_BLOCKS_ENABLED }) {
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
      title: '매물 설명문',
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
      note: '입력 정보 기반 추정값이에요. 실제와 다를 수 있어요.',
    },
  ]

  // 프랜차이즈 블록 — 매물이 프랜차이즈이고 초안에 생성됐을 때만 (독립 점포는 블록 자체 없음)
  if (aiDraft.franchise && data.isFranchise) {
    blocks.push({
      id: 'franchise',
      title: '프랜차이즈',
      tone: 'fact',
      source: 'ai',
      icon: '🏪',
      canHide: true,
      body: aiDraft.franchise,
      note: '공정거래위원회 가맹사업 등록 정보와 확인된 사실 기반이에요.',
    })
  }

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

  // 입지 블록 (ad-frame) — 이 건물·이 자리. 재료 없으면 초안에 없고 블록도 없다(빈 서술 금지)
  if (aiDraft.locationSpot) {
    blocks.push({
      id: 'location_spot',
      title: '입지',
      tone: 'fact',
      source: 'ai',
      icon: '📍',
      canHide: true,
      body: aiDraft.locationSpot,
      note: '층수·접면·주차 등 입력하신 조건과 반경 100m 실데이터 기반이에요.',
    })
  }

  // ── 시세·상권 블록 ────────────────────────────────────────
  if (market) {
    const { priceData, districtData } = market
    const trend = TREND_TEXT[priceData.trend] ?? '보합'
    const isRealData = priceData.dataSource === 'api'
    const districtReal = districtData?.dataSource === 'api'

    // 상권 실데이터(소진공) — 실값일 때만 표시. 유동인구·공실률·생존율은 이 API에 없으므로 표시하지 않는다(가짜 숫자 금지).
    const districtLines = districtReal
      ? [
          `• 반경 ${districtData.radius}m 상가: ${districtData.totalStores.toLocaleString()}곳` +
            (districtData.similarBizCount != null
              ? ` (동종 ${districtData.similarBizCount}곳${districtData.sampled ? `, 표본 ${districtData.sampleSize}곳 기준` : ''})`
              : ''),
          districtData.topCategories?.length
            ? `• 주요 업종: ${districtData.topCategories.slice(0, 3).map(c => `${c.name} ${c.count}곳`).join(' · ')}`
            : null,
        ].filter(Boolean)
      : []

    const marketDataLines = (isRealData
      // 실공공데이터: 건물 매매가 기준 표시
      ? [
          priceData.avgPricePerM2 != null
            ? `• 인근 상가 평균 ㎡당 거래가: ${priceData.avgPricePerM2.toLocaleString()}만원`
            : null,
          `• 실거래 가격대: ${priceData.priceRange.min.toLocaleString()}~${priceData.priceRange.max.toLocaleString()}만원`,
          `• 최근 가격 추이: ${priceData.trend === 'up' ? '↑' : priceData.trend === 'down' ? '↓' : '→'}${priceData.trendPct}% (${trend})`,
          priceData.transactionCount ? `• 최근 3개월 거래 건수: ${priceData.transactionCount}건` : null,
          ...districtLines,
        ].filter(Boolean)
      // 시세 더미 (승인 전 참고용 표기) + 상권은 실값일 때만
      : [
          `• 인근 유사 업종 평균 권리금: ${priceData.avgKeyMoney?.toLocaleString()}만원`,
          `• 권리금 가격대: ${priceData.priceRange.min}~${priceData.priceRange.max}만원`,
          `• 최근 가격 추이: ${priceData.trend === 'up' ? '↑' : priceData.trend === 'down' ? '↓' : '→'}${priceData.trendPct}% (${trend})`,
          `• 평균 월세 (유사 규모): ${priceData.avgMonthlyRent}만원`,
          ...districtLines,
        ]
    ).join('\n')

    blocks.push({
      id: 'market_data',
      title: isRealData ? '인근 상가 실거래가 · 상권' : '인근 시세 · 상권 데이터',
      tone: isRealData ? 'fact' : 'estimate',
      source: isRealData ? 'input' : 'ai',
      icon: '📊',
      canHide: true,
      body: marketDataLines,
      note: isRealData
        ? `국토부 상업용 부동산 실거래가${districtReal ? '·소상공인시장진흥공단 상가정보' : ''} 기반 데이터입니다. 건물 매매가 기준이며, 권리금과는 다를 수 있어요.`
        : `시세는 참고용 추정 데이터입니다. 공공데이터 API 활용신청 승인 후 실거래가로 자동 전환돼요.${districtReal ? ' 상가·업종 수는 소상공인시장진흥공단 실데이터예요.' : ''}`,
    })

    if (insight) {
      blocks.push({
        id: 'market_insight',
        title: '시세 해석',
        tone: 'estimate',
        source: 'ai',
        icon: '🔍',
        canHide: true,
        body: insight,
        note: '시세·상권 데이터 기반 참고 해석이에요. 사실 판단 전 전문가 확인을 권장해요.',
      })
    }
  }

  // 특이사항·경쟁력 — 유료 심화 블록. 생성은 항상 되지만(ai_draft 저장) 표시는 플래그가 게이트.
  // 멤버십 출시 시 memberTier.DEEP_BLOCKS_ENABLED만 true로 바꾸면 활성 (잠금 카드는 화면이 담당).
  if (opts.deepBlocks) {
    if (aiDraft.highlights) {
      blocks.push({
        id: 'highlights', title: '특이사항', tone: 'fact', source: 'ai', icon: '📌', canHide: true,
        body: aiDraft.highlights, note: '입력하신 정보에서 확인된 특이점이에요.',
      })
    }
    if (aiDraft.competitiveness) {
      blocks.push({
        id: 'competitiveness', title: '경쟁력 분석', tone: 'estimate', source: 'ai', icon: '🏆', canHide: true,
        body: aiDraft.competitiveness, note: '상권 실데이터 기반 참고 해석이에요.',
      })
    }
  }

  return blocks
}
