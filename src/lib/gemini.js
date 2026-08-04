import { COMMON_RULES, SELLER_BLOCK_RULES, LANDLORD_BLOCK_RULES } from './adWritingPrinciples'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const PRIMARY_MODEL = 'gemini-2.5-flash'
const FALLBACK_MODEL = 'gemini-2.0-flash'
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

async function askGemini(prompt, model = PRIMARY_MODEL, opts = {}) {
  if (!API_KEY || API_KEY === '여기에_발급받은_키_붙여넣기') {
    throw new Error('API 키가 설정되지 않았어요. .env 파일에 VITE_GEMINI_API_KEY를 입력해주세요.')
  }

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4 },
  }
  // 검색 그라운딩(Google Search) — 상가 설명문 등 근거 기반 생성에만 opts로 켠다 (호출 비용·지연 증가, 헌법상 보고 대상)
  if (opts.grounding) body.tools = [{ google_search: {} }]

  const res = await fetch(`${BASE_URL}/${model}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const status = res.status
    if (status === 401 || status === 403) throw new Error('API 키가 올바르지 않아요. .env 파일을 확인해주세요.')
    if (status === 429) throw new Error('잠시 후 다시 시도해주세요. (요청 한도 초과)')
    if (status >= 500 && model === PRIMARY_MODEL) {
      console.warn(`[Gemini] ${model} 오류 (${status}) — ${FALLBACK_MODEL} 폴백 재시도`)
      return askGemini(prompt, FALLBACK_MODEL, opts)
    }
    // 그라운딩 필드 미지원 등 4xx — 그라운딩 없이 1회 재시도(생성 자체는 살린다)
    if (status === 400 && opts.grounding) {
      console.warn(`[Gemini] 그라운딩 요청 거부 (${status}) — 그라운딩 없이 재시도`)
      return askGemini(prompt, model, { ...opts, grounding: false })
    }
    throw new Error(`Gemini 오류 (${status}): ${err?.error?.message ?? res.statusText}`)
  }

  if (model !== PRIMARY_MODEL) console.log(`[Gemini] 폴백 응답: ${model}`)
  const data = await res.json()
  // 그라운딩 응답은 parts가 복수일 수 있음 — 전부 join (기존 첫 part만 취하던 것 보강)
  const parts = data.candidates?.[0]?.content?.parts ?? []
  return parts.map(p => p.text ?? '').join('') || ''
}

/**
 * 양도자 대시보드 — AI 오늘의 한 마디 생성
 * 실데이터가 있는 필드만 프롬프트에 포함 (undefined/null 필드는 언급하지 않음)
 * @param {{ completeness: number, missingItems?: string[], shopName?: string,
 *           transferType?: string, photoCount?: number, newInquiries?: number,
 *           totalInquiries?: number, views?: number, viewsToday?: number, interests?: number }} situation
 * @returns {Promise<string>}
 */
export async function generateSellerCoaching(situation) {
  const missing = (situation.missingItems ?? []).length > 0
    ? situation.missingItems.join(', ')
    : '없음'

  const lines = [
    `매물 완성도: ${situation.completeness}%`,
    `빠진 항목: ${missing}`,
  ]
  if (situation.shopName) lines.push(`매물: ${situation.shopName}`)
  if (situation.transferType) lines.push(`양도 방식: ${situation.transferType}`)
  if (situation.photoCount != null) lines.push(`등록된 사진: ${situation.photoCount}장`)
  if (situation.newInquiries != null) lines.push(`이번 주 새 문의: ${situation.newInquiries}건`)
  if (situation.totalInquiries != null) lines.push(`총 문의: ${situation.totalInquiries}건`)
  if (situation.views != null) lines.push(`조회수: ${situation.views}회 (오늘 +${situation.viewsToday ?? 0})`)
  if (situation.interests != null) lines.push(`관심 수: ${situation.interests}명`)

  const prompt = `
당신은 소상공인 점포 양도를 돕는 AI 코치입니다.
아래 양도자의 현재 상황을 보고, 지금 가장 도움이 될 코칭 한 마디를 생성하세요.

[현재 상황]
${lines.join('\n')}

[작성 원칙]
- 1~2문장, 60자 이내
- 수치를 1개 이상 언급하되 상황에 맞게
- 따뜻하고 간결한 토스 앱 톤 (존댓말, 쉬운 단어)
- 구체적인 다음 행동을 자연스럽게 유도
- 이모지·특수문자 없이 순수 텍스트만

코칭 문구 (문장만, 다른 설명 없이):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '') // 혹시 따옴표 감싸진 경우 제거
}

/**
 * E1 2단계 — 시세·상권 AI 해석 생성
 * @param {{ priceData, districtData }} market  fetchMarketData() 결과
 * @param {object} listingData  E1Context data
 * @returns {Promise<string>}
 */
export async function generateMarketInsight(market, listingData) {
  const { priceData, districtData } = market
  const priceReal = priceData?.dataSource === 'api' && priceData.transactionCount > 0
  const districtReal = districtData?.dataSource === 'api'
  // 실데이터가 하나도 없으면 해석을 만들지 않는다 — 가짜 숫자 기반 해석 금지(Gemini 호출도 아낌)
  if (!priceReal && !districtReal) return null

  const sections = []
  if (priceReal) {
    const trend = priceData.trend === 'up'
      ? `↑${priceData.trendPct}% 상승 중`
      : priceData.trend === 'down'
      ? `↓${priceData.trendPct}% 하락 중`
      : '보합'
    sections.push([
      '[인근 실거래 데이터 — 국토부 상업업무용 부동산]',
      priceData.avgPricePerM2 != null ? `건물 ㎡당 평균 거래가: ${priceData.avgPricePerM2.toLocaleString()}만원` : null,
      `실거래 가격대: ${priceData.priceRange.min.toLocaleString()}~${priceData.priceRange.max.toLocaleString()}만원`,
      `최근 가격 추이: ${trend}`,
      `최근 3개월 거래: ${priceData.transactionCount}건`,
    ].filter(Boolean).join('\n'))
  }
  if (districtReal) {
    sections.push([
      '[상권 데이터 — 소상공인시장진흥공단 상가업소]',
      `반경 ${districtData.radius}m 상가: ${districtData.totalStores.toLocaleString()}곳`,
      districtData.similarBizCount != null
        ? `동종 업체: ${districtData.similarBizCount}곳${districtData.sampled ? ` (표본 ${districtData.sampleSize}곳 기준)` : ''}`
        : null,
      districtData.topCategories?.length
        ? `주요 업종: ${districtData.topCategories.map(c => `${c.name} ${c.count}곳`).join(', ')}${districtData.sampled ? ' (표본 기준)' : ''}`
        : null,
    ].filter(Boolean).join('\n'))
  }

  const prompt = `
당신은 소상공인 점포 매매 전문 애널리스트입니다.
아래 시세·상권 실데이터를 분석하고, 양도자에게 실질적으로 도움이 되는 2~3문장의 해석을 생성하세요.

[내 매물 조건]
희망 권리금: ${Number(listingData.transferFee) || '미입력'}만원
월세: ${listingData.monthlyRent || '미입력'}만원
면적: ${listingData.area || '미입력'}㎡
주소: ${listingData.address || '미입력'}

${sections.join('\n\n')}

[작성 원칙]
- 위 데이터에 없는 수치(유동인구·공실률 등)는 지어내지 마세요.
- 2~3문장, 80자 이내
- 확인된 수치는 직접 인용하며 단정 톤 사용 ("~입니다", "~에요")
- 추론·평가에는 반드시 "~로 보입니다", "참고로", "~로 추정됩니다" 표현 사용
- 양도자 입장에서 가격 전략에 직접 도움이 되는 관점으로
- 이모지·특수문자 없이 자연스러운 한국어 문장

해석 (문장만, 다른 설명 없이):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

const TRANSFER_LABEL = {
  bare: '바닥권리 (시설·자리만 양도)',
  full: '영업양도 (시설+영업권 일체)',
  undecided: '미정',
}

// 입지(spot) 재료 — 소유주 칩 + 좁은 반경(100m) 실값. 상권(300m)과 층위를 분리한다 (ad-frame).
// 재료가 하나도 없으면 null → 프롬프트에 섹션 자체를 넣지 않고, 블록도 생성되지 않는다(빈 서술 금지).
function buildSpotFacts(data, spot) {
  const chips = [
    data.floor ? `층수: ${data.floor}` : null,
    data.spotFrontage ? `도로 접면: ${data.spotFrontage}` : null,
    data.spotParking ? `주차: ${data.spotParking}` : null,
    data.spotVisibility ? `전면 노출: ${data.spotVisibility}` : null,
  ].filter(Boolean)
  const spotReal = spot?.dataSource === 'api'
    ? [
        `반경 ${spot.radius}m 상가: ${spot.totalStores.toLocaleString()}곳`,
        spot.topCategories?.length
          ? `바로 주변 업종: ${spot.topCategories.slice(0, 3).map(c => `${c.name} ${c.count}곳`).join(', ')}`
          : null,
      ].filter(Boolean)
    : []
  if (!chips.length && !spotReal.length) return null
  return [...chips, ...spotReal].join('\n')
}

/**
 * E1 매물 등록 2단계 — AI 초안 생성
 * @param {object} data  E1Context의 data 객체
 * @param {object|null} district  fetchMarketData().districtData — 소진공 상권 실데이터 (dataSource 'api'일 때만 사용)
 * @param {object|null} franchiseInfo  franchise_brands 확인 정보 { brand_name, franchisor, reg_no, biz_type } — 공정위 등록 기준
 * @returns {Promise<{ description, facility, salesAnalysis, franchise?, highlights, competitiveness }>}
 */
export async function generateListingDraft(data, district = null, franchiseInfo = null, spot = null) {
  const spotFacts = buildSpotFacts(data, spot)
  const hasSales = data.transferType === 'full' && !!data.monthlySales
  const isFranchise = data.isFranchise === true

  // 상권 실데이터 섹션 — 임대인(generateLandlordListingDraft)과 동일 패턴 (소진공 확인 수치만)
  const districtFacts = district?.dataSource === 'api'
    ? [
        `반경 ${district.radius}m 상가: ${district.totalStores.toLocaleString()}곳`,
        district.similarBizCount != null
          ? `동종 업체: ${district.similarBizCount}곳${district.sampled ? ` (표본 ${district.sampleSize}곳 기준)` : ''}`
          : null,
        district.topCategories?.length
          ? `주요 업종 구성: ${district.topCategories.map(c => `${c.name} ${c.count}곳`).join(', ')}${district.sampled ? ` (표본 ${district.sampleSize}곳 기준)` : ''}`
          : null,
      ].filter(Boolean).join('\n')
    : null

  const prompt = `
당신은 소상공인 점포 양도 전문 카피라이터입니다.
아래 매물 정보를 바탕으로 양수자에게 신뢰감을 주는 초안을 작성해 주세요.
작성 전에 이 주소의 동네·상권을 실제로 검색해서 확인된 정보만 근거로 쓰세요.
${districtFacts ? `
[확인된 상권 실데이터 — 소상공인시장진흥공단 상가업소 기준, 확정 사실로 인용 가능]
${districtFacts}
` : ''}
[매물 정보]
상호명: ${data.shopName || '(미입력)'}
주소: ${data.address || '(미입력)'}
업종: ${data.bizType || '(미입력)'}
층수: ${data.floor || '(미입력)'} / 전용면적: ${data.area ? data.area + '㎡' : '(미입력)'}
프랜차이즈 여부: ${isFranchise ? `예 (브랜드: ${data.franchiseBrandName || '확인 필요'})` : '아니오 (독립 점포)'}
보증금: ${data.deposit ? data.deposit + '만원' : '(미입력)'}
월세: ${data.monthlyRent ? data.monthlyRent + '만원' : '(미입력)'}
관리비: ${data.maintenance ? data.maintenance + '만원' : '없음'}
양도방식: ${TRANSFER_LABEL[data.transferType] ?? '(미입력)'}
희망 권리금: ${data.transferFee ? data.transferFee + '만원' : '(미입력)'}
${hasSales ? `월 평균 매출: ${data.monthlySales}만원` : ''}
${(data.facilities ?? []).length ? `보유 시설·집기: ${data.facilities.join(', ')}` : ''}
${data.facilityAge ? `시설 연차: ${data.facilityAge}` : ''}
${spotFacts ? `
[확인된 입지 정보 — 소유주 입력과 반경 100m 실데이터, 확정 사실로 인용 가능]
${spotFacts}
` : ''}${franchiseInfo ? `
[확인된 프랜차이즈 정보 — 공정거래위원회 가맹사업 등록 기준, 확정 사실로 인용 가능]
브랜드: ${franchiseInfo.brand_name}${franchiseInfo.biz_type ? ` (업종: ${franchiseInfo.biz_type})` : ''}
가맹본부: ${franchiseInfo.franchisor ?? '(미상)'}
공정위 등록번호: ${franchiseInfo.reg_no ?? '(미상)'}
` : ''}
${COMMON_RULES}
${districtFacts ? '- [확인된 상권 실데이터]의 수치는 확정 사실로 그대로 인용해도 됩니다 (상가 수·동종 수·업종 구성).' : ''}

[블록별 집필 원칙]
${SELLER_BLOCK_RULES.description}
${SELLER_BLOCK_RULES.facility(!!data.facilityAge, data.facilityAge)}
${SELLER_BLOCK_RULES.salesAnalysis(hasSales)}
${franchiseInfo ? SELLER_BLOCK_RULES.franchise : ''}
${spotFacts ? SELLER_BLOCK_RULES.locationSpot : ''}
- highlights: 이 매물 입력값 중 통상 범위를 벗어나는 사실(예: 24시간 영업권, 신축, 특수 설비)이 있을 때만 그 사실 기반으로. 없으면 null.
- competitiveness: ${districtFacts ? '[확인된 상권 실데이터] 대비 이 매물 조건의 강점을 서술하세요 (예: 동종 대비 임대 조건).' : '입력된 조건 자체에서 확인되는 강점만 서술하세요.'} 근거 없는 비교 우위 주장 금지.

[응답 형식] 마크다운 없이 순수 JSON만 반환하세요:
{
  "description": "...",
  "facility": "...",
  "salesAnalysis": "...",
${spotFacts ? '  "locationSpot": "...",\n' : ''}${franchiseInfo ? '  "franchise": "...",\n' : ''}  "highlights": "... 또는 null",
  "competitiveness": "..."
}
`.trim()

  // 그라운딩: 최초 생성·전체 재생성만 (블록 수정 rewriteDraftBlock은 제외).
  // 4xx 거부 시 askGemini가 그라운딩 없이 1회 재시도 (임대인과 동일 경로).
  const raw = await askGemini(prompt, PRIMARY_MODEL, { grounding: true })

  // 마크다운 코드블록 제거 후 JSON 파싱
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error('[Gemini] 파싱 실패 — 원본 응답:', raw)
    throw new Error('AI 응답을 처리하는 중 오류가 발생했어요. 다시 시도해주세요.')
  }

  try {
    return JSON.parse(match[0])
  } catch {
    console.error('[Gemini] JSON.parse 실패:', match[0])
    throw new Error('AI 응답 형식 오류. 다시 시도해주세요.')
  }
}

// ═══════════════════════════════════════════════════════════
// 임대인 (Teal #1e6b6b)
// ═══════════════════════════════════════════════════════════

/**
 * 임대인 대시보드 — AI 오늘의 한 마디
 * @param {{ vacantCount:number, vacantDays:number, rentedCount:number,
 *           newInquiries:number, totalInquiries:number, views:number }} situation
 * @returns {Promise<string>}
 */
export async function generateLandlordCoaching(situation) {
  const prompt = `
당신은 상가 임대 전문 AI 코치입니다.
아래 임대인의 현재 자산 상황을 보고, 지금 가장 도움이 될 코칭 한 마디를 생성하세요.

[현재 상황]
공실 자산: ${situation.vacantCount}개 (평균 공실 기간 ${situation.vacantDays}일)
임대 중: ${situation.rentedCount}개
새 문의 (이번 주): ${situation.newInquiries}건
총 문의: ${situation.totalInquiries}건
조회수: ${situation.views}회

[작성 원칙]
- 1~2문장, 60자 이내
- 수치를 1개 이상 언급하되 상황에 맞게
- 따뜻하고 간결한 토스 앱 톤 (존댓말, 쉬운 단어)
- 구체적인 다음 행동을 자연스럽게 유도
- 이모지·특수문자 없이 순수 텍스트만

코칭 문구 (문장만, 다른 설명 없이):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

/**
 * E1p 2단계 — 임대인 상가 AI 초안 생성
 * @param {object} data  E1pContext 데이터
 * @param {object|null} district  fetchMarketData().districtData — 소진공 상권 실데이터 (dataSource 'api'일 때만 사용)
 * @returns {Promise<{ description:string, rentMarket:string|null, saleMarket:string|null, bizRecommendation:string }>}
 */
export async function generateLandlordListingDraft(data, district = null, spot = null) {
  const spotFacts = buildSpotFacts(data, spot)
  const isRent = data.listingType === 'rent' || data.listingType === 'both'
  const isSale = data.listingType === 'sale' || data.listingType === 'both'
  const preferredBiz = (data.recommendedBiz || []).join(', ')

  // 상권 실데이터 섹션 — 소진공 상가업소 API에서 확인된 수치만 (유동인구·배후세대는 이 데이터에 없음)
  const districtFacts = district?.dataSource === 'api'
    ? [
        `반경 ${district.radius}m 상가: ${district.totalStores.toLocaleString()}곳`,
        district.topCategories?.length
          ? `주요 업종 구성: ${district.topCategories.map(c => `${c.name} ${c.count}곳`).join(', ')}${district.sampled ? ` (표본 ${district.sampleSize}곳 기준)` : ''}`
          : null,
      ].filter(Boolean).join('\n')
    : null

  const prompt = `
당신은 상가 임대·매매 시장을 잘 아는 전문 카피라이터입니다.
아래 상가의 소개 초안을 작성하세요. 작성 전에 이 주소의 동네·상권을 실제로 검색해서
확인된 정보를 근거로 쓰세요 (역·대학·시장 등 주변 시설, 상권 성격, 유동인구 특성, 배후 주거 세대).
${spotFacts ? `
[확인된 입지 정보 — 소유주 입력과 반경 100m 실데이터, 확정 사실로 인용 가능]
${spotFacts}
` : ''}${districtFacts ? `
[확인된 상권 실데이터 — 소상공인시장진흥공단 상가업소 기준, 확정 사실로 사용 가능]
${districtFacts}
` : ''}
[상가 정보]
주소: ${data.address || '(미입력)'}
층수: ${data.floor || '(미입력)'} / 전용면적: ${data.area ? data.area + '㎡' : '(미입력)'}
${isRent ? `보증금: ${data.deposit ? data.deposit + '만원' : '(미입력)'} / 월세: ${data.monthlyRent ? data.monthlyRent + '만원' : '(미입력)'}` : ''}
${isSale ? `매각 희망가: ${data.salePrice ? data.salePrice + '만원' : '(미입력)'}` : ''}
${isRent && isSale ? '(임대·매매 모두 가능)' : isRent ? '(임대 전용)' : '(매매 전용)'}
${preferredBiz ? `소유주 선호 업종: ${preferredBiz}` : ''}

[description 작성 — 5~8문장, 아래 요소를 자연스러운 한 편의 글로]
1. 상가의 핵심 사실 (위치·층·면적·조건)
2. 해당 상권의 특성 — 검색으로 확인한 내용만 (예: 어떤 동네인지, 주요 수요층, 주변 시설)
3. 유동인구·배후세대 — 검색으로 확인된 경우에만 언급. 구체 수치는 출처가 확실할 때만, 아니면 정성 서술
4. 이 위치에 적합한 추천 업종과 그 이유 — 상권 특성·소유주 선호를 근거로 본문 안에 포함

${COMMON_RULES}
${districtFacts ? '- [확인된 상권 실데이터]의 수치는 확정 사실로 그대로 인용해도 된다 (상가 수·업종 구성)' : ''}

[블록별 집필 원칙]
${LANDLORD_BLOCK_RULES.description}
${LANDLORD_BLOCK_RULES.facility}
${isRent ? LANDLORD_BLOCK_RULES.rentMarket : ''}
${isSale ? LANDLORD_BLOCK_RULES.saleMarket : ''}
${spotFacts ? LANDLORD_BLOCK_RULES.locationSpot : ''}
- highlights: 이 상가 입력값 중 통상 범위를 벗어나는 사실(예: 신축, 테라스, 코너 자리 확인 시)이 있을 때만. 없으면 null.
- competitiveness: ${districtFacts ? '[확인된 상권 실데이터] 대비 이 상가 조건의 강점 서술.' : '입력된 조건 자체에서 확인되는 강점만.'} 근거 없는 비교 우위 주장 금지.

[응답 형식] 마크다운 없이 순수 JSON만:
{
  "description": "...",
  "rentMarket": ${isRent ? '"..."' : 'null'},
  "saleMarket": ${isSale ? '"..."' : 'null'},
${spotFacts ? '  "locationSpot": "...",\n' : ''}  "highlights": "... 또는 null",
  "competitiveness": "..."
}
`.trim()

  const raw = await askGemini(prompt, PRIMARY_MODEL, { grounding: true })
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI 응답을 처리하는 중 오류가 발생했어요. 다시 시도해주세요.')
  try {
    return JSON.parse(match[0])
  } catch {
    throw new Error('AI 응답 형식 오류. 다시 시도해주세요.')
  }
}

/**
 * 임대인 E1p — 임대 시세·수익률 AI 해석
 * @param {object} data  E1pContext 데이터
 * @returns {Promise<string>}
 */
export async function generateRentalInsight(data) {
  const isRent = data.listingType === 'rent' || data.listingType === 'both'
  const isSale = data.listingType === 'sale' || data.listingType === 'both'

  const prompt = `
당신은 상가 임대차 전문 애널리스트입니다.
아래 정보를 바탕으로 임대인에게 실질적으로 도움이 되는 2문장의 해석을 생성하세요.

[상가 조건]
주소: ${data.address || '미입력'}
면적: ${data.area ? data.area + '㎡' : '미입력'}
${isRent ? `희망 보증금: ${data.deposit || '미입력'}만원 / 월세: ${data.monthlyRent || '미입력'}만원` : ''}
${isSale ? `매각 희망가: ${data.salePrice || '미입력'}만원 / 추정 수익률: ${data.capRate || '미입력'}%` : ''}

[참고 시장 데이터]
서울 소형 상가 평균 월세: 185만원 / 캡레이트 평균: 4.8% / 공실률: 6.2%

[작성 원칙]
- 2문장, 70자 이내
- 임대인 입장에서 가격 전략과 임차인 유치에 직접 도움이 되는 관점
- 확인된 수치는 단정 톤, 추론에는 "~로 보입니다", "참고로" 사용
- 이모지·특수문자 없이 자연스러운 한국어

해석 (문장만):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

// ═══════════════════════════════════════════════════════════
// 창업준비 (Sky Blue #2b8ac9)
// ═══════════════════════════════════════════════════════════

/**
 * 창업준비 피드 — AI 오늘의 인사이트
 * @param {{ startupMode:string, region:string, budget:string|null }} profile
 * @returns {Promise<string>}
 */
export async function generateStartupInsight(profile) {
  const modeText = profile.startupMode === 'franchise' ? '프랜차이즈 창업'
    : profile.startupMode === 'direct' ? '직영 창업'
    : '창업 준비'

  const prompt = `
당신은 창업 준비생을 위한 AI 어드바이저입니다.
아래 창업 준비생 프로필을 보고, 오늘 가장 도움이 되는 인사이트 한 마디를 생성하세요.

[프로필]
창업 유형: ${modeText}
희망 지역: ${profile.region || '서울'}
예산: ${profile.budget ? profile.budget + '만원' : '미설정'}

[작성 원칙]
- 1~2문장, 60자 이내
- 지역·예산·창업 유형을 자연스럽게 연결
- 오늘 실행 가능한 구체적 행동을 유도하는 톤
- 이모지·특수문자 없이 순수 텍스트

인사이트 (문장만):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

// ═══════════════════════════════════════════════════════════
// 운영중 (Forest Green #2d7a4f)
// ═══════════════════════════════════════════════════════════

/**
 * 운영중 대시보드 — AI 오늘의 한 마디
 * @param {{ todaySales:number, yesterdaySales:number, monthTotal:number,
 *           monthAvg:number, todoCount:number, urgentTodo:string|null,
 *           views:number, inquiries:number }} situation
 * @returns {Promise<string>}
 */
export async function generateOperatingCoaching(situation) {
  const salesDiff = situation.todaySales - situation.yesterdaySales
  const salesPct = Math.round((salesDiff / situation.yesterdaySales) * 100)

  const prompt = `
당신은 현재 장사 중인 소상공인을 위한 AI 운영 코치입니다.
아래 오늘의 가게 상황을 보고, 지금 가장 도움이 될 코칭 한 마디를 생성하세요.

[오늘 현황]
오늘 매출: ${situation.todaySales.toLocaleString()}원 (어제 대비 ${salesPct > 0 ? '+' : ''}${salesPct}%)
이번 달 누적: ${Math.round(situation.monthTotal / 10000)}만원
동종 업종 평균: ${Math.round(situation.monthAvg / 10000)}만원
남은 할 일: ${situation.todoCount}개${situation.urgentTodo ? ` (긴급: ${situation.urgentTodo})` : ''}
조회수: ${situation.views} / 문의: ${situation.inquiries}

[작성 원칙]
- 1~2문장, 60자 이내
- 매출 수치를 1개 이상 자연스럽게 언급
- 따뜻하고 실용적인 톤 (존댓말, 쉬운 단어)
- 긴급 할 일이 있으면 자연스럽게 언급
- 이모지·특수문자 없이 순수 텍스트

코칭 문구 (문장만):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

// ═══════════════════════════════════════════════════════════
// 기업회원 (Deep Purple #7d4ba3)
// ═══════════════════════════════════════════════════════════

/**
 * 기업회원 대시보드 — AI 오늘의 한 마디
 * @param {{ bizName:string, category:string, exposureViews:number,
 *           exposureChange:number, dmCount:number, conversionRate:number }} situation
 * @returns {Promise<string>}
 */
export async function generateBusinessCoaching(situation) {
  const prompt = `
당신은 소상공인을 대상으로 영업하는 기업회원의 AI 영업 코치입니다.
아래 노출·전환 현황을 보고, 오늘 가장 도움이 될 코칭 한 마디를 생성하세요.

[현황]
업체명: ${situation.bizName}
업종: ${situation.category}
이번 주 노출: ${situation.exposureViews.toLocaleString()}회 (${situation.exposureChange > 0 ? '+' : ''}${situation.exposureChange}% 전주 대비)
DM 문의: ${situation.dmCount}건
전환율: ${situation.conversionRate}%

[작성 원칙]
- 1~2문장, 60자 이내
- 노출·전환 수치 중 하나 이상 언급
- 기업 영업 관점에서 실용적인 제안
- 이모지·특수문자 없이 순수 텍스트

코칭 문구 (문장만):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

/**
 * 기업회원 — AI 노출 성과 해석
 * @param {{ views:number, viewsChange:number, dmCount:number,
 *           conversionRate:number, category:string }} stats
 * @returns {Promise<string>}
 */
export async function generateBusinessPerformanceInsight(stats) {
  const prompt = `
당신은 B2B 마케팅 성과 분석 AI입니다.
아래 노출 성과 데이터를 분석하여 기업회원에게 실질적인 개선 제안을 2문장으로 생성하세요.

[성과 데이터]
업종: ${stats.category}
이번 주 노출: ${stats.views.toLocaleString()}회 (${stats.viewsChange > 0 ? '↑' : '↓'}${Math.abs(stats.viewsChange)}% 전주 대비)
DM 문의: ${stats.dmCount}건
전환율: ${stats.conversionRate}%

[작성 원칙]
- 2문장, 70자 이내
- 노출과 전환율 관계를 분석하여 구체적 개선 방향 제안
- "트리거 보강" 또는 "응답 속도 개선" 같은 실용적 제안 포함
- 이모지·특수문자 없이 자연스러운 한국어

성과 해석 (문장만):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

/**
 * E1b 2단계 — AI 매칭 트리거 생성 (5개)
 * @param {{ bizName:string, category:string, subCategory:string, region:string }} bizInfo
 * @returns {Promise<string[]>}
 */
export async function generateBusinessTriggers(bizInfo) {
  const prompt = `
당신은 소상공인 B2B 매칭 전략 AI입니다.
아래 업체 정보를 바탕으로, 소상공인이 "이 상황이다" 싶을 때 이 업체를 찾게 될 트리거 상황 5개를 생성하세요.

[업체 정보]
업체명: ${bizInfo.bizName}
업종: ${bizInfo.category} > ${bizInfo.subCategory}
영업 지역: ${bizInfo.region}

[작성 원칙]
- 소상공인이 공감할 구체적 상황 ("~할 때", "~가 걱정될 때" 형태)
- 각 트리거는 15~30자
- 업종 특성을 반영하여 기존 뱅크와 다른 신선한 표현
- 이모지·특수문자 없이 순수 텍스트

[응답 형식] 마크다운 없이 순수 JSON 배열만:
["트리거1", "트리거2", "트리거3", "트리거4", "트리거5"]
`.trim()

  const raw = await askGemini(prompt)
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    return JSON.parse(match[0])
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════
// 그냥구경 (Gray #8a8a8e)
// ═══════════════════════════════════════════════════════════

/**
 * 그냥구경 피드 — AI 오늘의 트렌드 한 줄
 * 비회원 대상이므로 개인화 없이 오늘의 소상공인 트렌드를 생성
 * @returns {Promise<string>}
 */
export async function generateBrowsingCopy() {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  const prompt = `
당신은 소상공인 창업·양도 정보 플랫폼의 AI 에디터입니다.
오늘(${today}) 점포 양도·임대·창업 시장에서 비회원이 처음 피드를 볼 때 읽고 싶어할 만한 트렌드 한 줄을 생성하세요.

[작성 원칙]
- 1문장, 50자 이내
- 구체적인 숫자나 트렌드 방향 포함 (예: "이번 주 서울 권리금 평균 7% 하락")
- 읽는 사람이 가입·탐색하고 싶어지는 흥미로운 정보
- 이모지·특수문자 없이 순수 텍스트
- 오늘 날짜를 자연스럽게 반영

트렌드 문구 (문장만):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

// ═══════════════════════════════════════════════════════════
// 운영중 AI 운영 진단 (Forest Green #2d7a4f)
// ═══════════════════════════════════════════════════════════

/**
 * 운영중 대시보드 — AI 운영 진단 (주간 분석)
 * @param {{ todaySales:number, monthTotal:number, monthAvg:number,
 *           todoCount:number, views:number, inquiries:number,
 *           bizLabel:string }} data
 * @returns {Promise<string>}
 */
export async function generateOperatingDiagnosis(data) {
  const salesVsAvg = data.monthAvg > 0
    ? Math.round(((data.monthTotal - data.monthAvg) / data.monthAvg) * 100)
    : 0

  const prompt = `
당신은 소상공인 가게 운영 AI 분석가입니다.
아래 운영 데이터를 분석하여 현재 가게의 운영 상태를 2~3문장으로 진단하세요.

[운영 데이터]
업종: ${data.bizLabel || '일반 소매업'}
이번 달 누적 매출: ${Math.round(data.monthTotal / 10000)}만원
동종 평균 대비: ${salesVsAvg > 0 ? '+' : ''}${salesVsAvg}%
오늘 매출: ${Math.round(data.todaySales / 10000)}만원
남은 할 일: ${data.todoCount}개
이번 달 조회수: ${data.views}회 / 업체 문의: ${data.inquiries}건

[작성 원칙]
- 2~3문장, 80자 이내
- 긍정적 부분과 개선 포인트 균형 있게
- 수치 기반으로 구체적 진단 (추정에는 "~로 보입니다" 사용)
- 이번 달 남은 기간을 활용한 실용적 제안 포함
- 이모지·특수문자 없이 자연스러운 한국어

운영 진단 (문장만):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

// ═══════════════════════════════════════════════════════════
// 창업준비 AI 창업 진단 (Sky Blue #2b8ac9)
// ═══════════════════════════════════════════════════════════

/**
 * 창업준비 피드 — AI 창업 준비도 진단
 * @param {{ startupMode:string, region:string, budget:string|null,
 *           progressPct:number }} profile
 * @returns {Promise<string>}
 */
export async function generateStartupDiagnosis(profile) {
  const modeText = profile.startupMode === 'franchise' ? '프랜차이즈 창업'
    : profile.startupMode === 'direct' ? '직영 창업'
    : '창업 준비'

  const prompt = `
당신은 창업 준비생을 위한 AI 창업 진단 전문가입니다.
아래 창업 준비 현황을 보고, 지금 준비 상태에 대한 진단을 2문장으로 생성하세요.

[현황]
창업 유형: ${modeText}
희망 지역: ${profile.region || '서울'}
예산: ${profile.budget ? profile.budget + '만원' : '미설정'}
준비 진행도: ${profile.progressPct || 30}%

[작성 원칙]
- 2문장, 70자 이내
- 현재 준비 단계에서 가장 중요한 다음 행동 1가지 제시
- 지역·예산·창업 유형 특성을 반영
- "~해보세요", "~를 먼저 확인해보세요" 처럼 실행 가능한 어조
- 이모지·특수문자 없이 순수 텍스트

창업 준비 진단 (문장만):
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

/**
 * 커뮤니티 AI 오늘의 자영업 인사이트
 * @returns {Promise<string>}
 */
export async function generateCommunityInsight() {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  const prompt = `
당신은 한국 자영업자 커뮤니티 AI 에디터입니다.
오늘(${today}) 자영업자들이 가장 알아야 할 실용적인 인사이트를 2-3문장으로 작성하세요.

[작성 원칙]
- 권리금·임대료·창업비용·세금·배달수수료 등 실제 자영업 이슈 반영
- 수치나 팁이 포함되면 더 좋음 (예: "6월 배달앱 수수료 평균 11%...")
- 공감하기 쉬운 어조, 뉴스레터 느낌
- 80자 이내, 이모지 없음

오늘의 자영업 인사이트:
`.trim()

  const raw = await askGemini(prompt)
  return raw.trim().replace(/^"|"$/g, '')
}

/**
 * 소개글 블록 단위 "모두에게 수정 요청" — 해당 블록만 요청 반영 재작성.
 * 그라운딩 없음(판정): 블록 수정은 문체·구성 변경이 목적이라 새 사실 검색이 불필요 —
 * 기존 본문의 사실만 재구성하도록 제한해 날조를 막고, 호출 비용·지연을 아낀다.
 * @returns {Promise<string>} 새 본문 텍스트
 */
export async function rewriteDraftBlock({ blockTitle, currentText, request }) {
  const prompt = `
당신은 상가·점포 소개글을 다듬는 전문 편집자입니다.
아래 [현재 글]을 [수정 요청]에 맞게 다시 써주세요.

[항목] ${blockTitle}
[현재 글]
${currentText}

[수정 요청]
${request}

[원칙 — 반드시 지킬 것]
- 현재 글에 있는 사실만 사용한다. 새로운 수치·시설·지명·주장을 추가하지 않는다
- 요청이 "빼달라"면 해당 내용을 제거하고 자연스럽게 잇는다
- 톤은 기존 글과 동일하게(존댓말), 이모지·특수문자 없이
- 결과는 다시 쓴 본문 텍스트만 — 설명·머리말 없이
`.trim()
  const out = await askGemini(prompt)
  return out.trim()
}
