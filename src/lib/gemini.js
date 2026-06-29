const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

/**
 * Gemini에 텍스트 프롬프트를 보내고 응답 텍스트를 반환합니다.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function askGemini(prompt) {
  if (!API_KEY || API_KEY === '여기에_발급받은_키_붙여넣기') {
    throw new Error('Gemini API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 입력해주세요.')
  }

  const res = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini API 오류 (${res.status}): ${err?.error?.message ?? res.statusText}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

/**
 * 모두 앱 전용 — 매물 설명문 AI 초안 생성
 * @param {{ bizType: string, location: string, fee: number, monthly: number, features: string }} info
 * @returns {Promise<string>}
 */
export async function generateListingDraft(info) {
  const prompt = `
당신은 소상공인 점포 양도 전문 카피라이터입니다.
아래 정보를 바탕으로 양수자의 눈길을 끄는 매물 설명문을 한국어로 작성해주세요.
간결하고 사실 중심으로, 3~4문장 이내로 작성하세요.

업종: ${info.bizType}
위치: ${info.location}
권리금: ${info.fee}만원
월세: ${info.monthly}만원
특징: ${info.features}

설명문 (숫자·이모지 없이 자연스러운 문장으로):
`.trim()

  return askGemini(prompt)
}

/**
 * 모두 앱 전용 — AI 권리금 적정가 분석
 * @param {{ bizType: string, location: string, area: number, monthlyRevenue: number }} info
 * @returns {Promise<string>}
 */
export async function analyzeKeyMoney(info) {
  const prompt = `
당신은 소상공인 권리금 전문 분석가입니다.
아래 정보를 바탕으로 권리금 적정 범위를 분석하고, 핵심 근거 2가지를 포함해 간결하게 설명해주세요.

업종: ${info.bizType}
위치: ${info.location}
면적: ${info.area}평
월 평균 매출: ${info.monthlyRevenue}만원

분석 결과 (3문장 이내):
`.trim()

  return askGemini(prompt)
}
