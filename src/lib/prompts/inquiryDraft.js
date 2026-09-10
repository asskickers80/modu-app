/**
 * 기업회원 문의 초안 프롬프트 — 유일한 AI 호출 (ORDER 2026-09-10 파트 B4). 프롬프트는 이 파일 한 곳.
 * 입력: 업종·동(구)·카드 1줄째·카테고리. 매출 금액·개인정보 없음. 입력 1,000토큰 이하 / 출력 300자 이하 / 문의당 1회.
 * 응답에 URL·전화번호·금액이 섞이면 폐기하고 빈칸(validateInquiryDraft).
 */
export const DRAFT_MAX_CHARS = 300
const CATEGORY_KO = { marketing: '마케팅·홍보', consulting: '메뉴·운영 컨설팅', realestate: '부동산(재계약·이전)', tax: '세무' }

export function buildInquiryDraftPrompt({ industry, region, situation, category }) {
  const cat = CATEGORY_KO[category] ?? category ?? '업체'
  return [
    '당신은 소상공인 사장님을 대신해 업체에 보낼 짧은 문의 글을 씁니다.',
    '조건: 한국어 존댓말, 3문장 이내, 300자 이내. 인사 → 상황 → 원하는 것 순서.',
    '금지: 전화번호·URL·금액·이름·주소 상세를 쓰지 마세요. 과장·약속 표현 금지. 따옴표나 제목 없이 본문만.',
    `업종: ${industry ?? '미상'}`,
    `지역: ${region ?? '미상'}`,
    `상황: ${situation ?? '미상'}`,
    `문의할 업체 종류: ${cat}`,
  ].join('\n').slice(0, 3000) // 입력 상한(≈1,000토큰) 방어
}

/** URL·전화번호·금액이 있으면 null(폐기). 300자 초과는 자른다 */
export function validateInquiryDraft(text) {
  const t = String(text ?? '').trim()
  if (!t) return null
  if (/https?:\/\/|www\.|\.(com|kr|net)\b/i.test(t)) return null
  if (/\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(t)) return null
  if (/\d[\d,]*\s*(원|만원|만|억)/.test(t)) return null
  return t.length > DRAFT_MAX_CHARS ? t.slice(0, DRAFT_MAX_CHARS) : t
}
