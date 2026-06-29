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
 * @param {{ completeness: number, missingItems: string[], newInquiries: number,
 *           totalInquiries: number, views: number, viewsToday: number, interests: number }} situation
 * @returns {Promise<string>}
 */
export async function generateSellerCoaching(situation) {
  const missing = situation.missingItems.length > 0
    ? situation.missingItems.join(', ')
    : '없음'

  const prompt = `
당신은 소상공인 점포 양도를 돕는 AI 코치입니다.
아래 양도자의 현재 상황을 보고, 지금 가장 도움이 될 코칭 한 마디를 생성하세요.

[현재 상황]
매물 완성도: ${situation.completeness}%
빠진 항목: ${missing}
이번 주 새 문의: ${situation.newInquiries}건
총 문의: ${situation.totalInquiries}건
조회수: ${situation.views}회 (오늘 +${situation.viewsToday})
관심 수: ${situation.interests}명

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
