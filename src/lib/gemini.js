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
