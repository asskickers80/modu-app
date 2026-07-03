const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function askGemini(prompt) {
  if (!API_KEY || API_KEY === '여기에_발급받은_키_붙여넣기') {
    throw new Error('API 키가 설정되지 않았어요. .env 파일에 VITE_GEMINI_API_KEY를 입력해주세요.')
  }

  const res = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const status = res.status
    if (status === 401 || status === 403) throw new Error('API 키가 올바르지 않아요. .env 파일을 확인해주세요.')
    if (status === 429) throw new Error('잠시 후 다시 시도해주세요. (요청 한도 초과)')
    throw new Error(`Gemini 오류 (${status}): ${err?.error?.message ?? res.statusText}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
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
  const trend = priceData.trend === 'up'
    ? `↑${priceData.trendPct}% 상승 중`
    : priceData.trend === 'down'
    ? `↓${priceData.trendPct}% 하락 중`
    : '보합'

  const myFee = Number(listingData.transferFee) || 0
  const avgFee = priceData.avgKeyMoney
  const feeRatio = myFee && avgFee ? (myFee / avgFee).toFixed(2) : null

  const prompt = `
당신은 소상공인 점포 매매 전문 애널리스트입니다.
아래 시세·상권 데이터를 분석하고, 양도자에게 실질적으로 도움이 되는 2~3문장의 해석을 생성하세요.

[내 매물 조건]
희망 권리금: ${myFee || '미입력'}만원
월세: ${listingData.monthlyRent || '미입력'}만원
면적: ${listingData.area || '미입력'}㎡
주소: ${listingData.address || '미입력'}

[인근 시세 데이터]
동종 평균 권리금: ${avgFee}만원${feeRatio ? ` (내 권리금은 평균의 ${feeRatio}배)` : ''}
권리금 가격대: ${priceData.priceRange.min}~${priceData.priceRange.max}만원
최근 가격 추이: ${trend}
평균 월세 (유사 규모): ${priceData.avgMonthlyRent}만원

[상권 데이터]
반경 300m 동종 업체: ${districtData.similarBizCount}개
주말 유동인구: 약 ${districtData.footTraffic.weekend.toLocaleString()}명
상가 공실률: ${districtData.vacancyRate}%
업종 1년 생존율: ${districtData.survivalRate.oneYear}%

[작성 원칙]
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

/**
 * E1 매물 등록 2단계 — AI 초안 생성
 * @param {object} data  E1Context의 data 객체
 * @returns {Promise<{ description: string, facility: string, salesAnalysis: string|null }>}
 */
export async function generateListingDraft(data) {
  const hasSales = data.transferType === 'full' && !!data.monthlySales

  const prompt = `
당신은 소상공인 점포 양도 전문 카피라이터입니다.
아래 매물 정보를 바탕으로 양수자에게 신뢰감을 주는 초안을 작성해 주세요.

[매물 정보]
상호명: ${data.shopName || '(미입력)'}
주소: ${data.address || '(미입력)'}
층수: ${data.floor || '(미입력)'} / 전용면적: ${data.area ? data.area + '㎡' : '(미입력)'}
보증금: ${data.deposit ? data.deposit + '만원' : '(미입력)'}
월세: ${data.monthlyRent ? data.monthlyRent + '만원' : '(미입력)'}
관리비: ${data.maintenance ? data.maintenance + '만원' : '없음'}
양도방식: ${TRANSFER_LABEL[data.transferType] ?? '(미입력)'}
희망 권리금: ${data.transferFee ? data.transferFee + '만원' : '(미입력)'}
${hasSales ? `월 평균 매출: ${data.monthlySales}만원` : ''}

[작성 원칙]
- 확인된 수치(주소·면적·임대조건·권리금 등)는 단정적 톤으로 서술하세요.
- 추정이 포함된 내용에는 반드시 "~로 추정됩니다", "~로 보입니다", "참고로" 같은 표현을 사용하세요.
- 과장·허위 표현 금지. 이모지·특수문자 없이 자연스러운 한국어 문장으로 작성하세요.
- description: 3~5문장, 매물의 핵심 가치 전달 (사실 위주)
- facility: 2~3문장, 시설 상태와 잔존가치 평가 (추정 포함)
${hasSales ? '- salesAnalysis: 2~3문장, 매출 기반 수익성 참고 분석 (추정 포함)' : ''}

[응답 형식] 마크다운 없이 순수 JSON만 반환하세요:
{
  "description": "...",
  "facility": "...",
  "salesAnalysis": ${hasSales ? '"..."' : 'null'}
}
`.trim()

  const raw = await askGemini(prompt)

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
 * @returns {Promise<{ description:string, rentMarket:string|null, saleMarket:string|null, bizRecommendation:string }>}
 */
export async function generateLandlordListingDraft(data) {
  const isRent = data.listingType === 'rent' || data.listingType === 'both'
  const isSale = data.listingType === 'sale' || data.listingType === 'both'

  const prompt = `
당신은 상가 임대·매각 전문 카피라이터입니다.
아래 상가 정보를 바탕으로 임차·매수 희망자에게 신뢰감을 주는 초안을 작성하세요.

[상가 정보]
주소: ${data.address || '(미입력)'}
층수: ${data.floor || '(미입력)'} / 전용면적: ${data.area ? data.area + '㎡' : '(미입력)'}
${isRent ? `보증금: ${data.deposit ? data.deposit + '만원' : '(미입력)'} / 월세: ${data.monthlyRent ? data.monthlyRent + '만원' : '(미입력)'}` : ''}
${isSale ? `매각 희망가: ${data.salePrice ? data.salePrice + '만원' : '(미입력)'}` : ''}
${isRent && isSale ? '(임대·매각 모두 가능)' : isRent ? '(임대 전용)' : '(매각 전용)'}

[작성 원칙]
- 확인된 수치는 단정적 톤으로 서술 ("~입니다", "~에요")
- 추정 내용은 "~로 추정됩니다", "~로 보입니다" 표현 사용
- 과장·허위 표현 금지. 이모지·특수문자 없이 자연스러운 한국어
- description: 3~4문장, 상가의 핵심 가치 전달 (위치·면적·상태 중심, 사실 위주)
${isRent ? '- rentMarket: 2문장, 인근 임대 시세 대비 현재 조건 해석 (추정 포함)' : ''}
${isSale ? '- saleMarket: 2문장, 예상 수익률(캡레이트) 기반 투자 가치 해석 (추정 포함)' : ''}
- bizRecommendation: 2문장, 위치·상권 기반 적합 업종 추천 (추정 포함)

[응답 형식] 마크다운 없이 순수 JSON만:
{
  "description": "...",
  "rentMarket": ${isRent ? '"..."' : 'null'},
  "saleMarket": ${isSale ? '"..."' : 'null'},
  "bizRecommendation": "..."
}
`.trim()

  const raw = await askGemini(prompt)
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
