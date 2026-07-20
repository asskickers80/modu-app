/**
 * 소개글 품질 가드 — 플레이스홀더가 든 글은 저장·공개하지 않는다.
 *
 * 배경: gemini.js의 프롬프트는 빈 값을 '(미입력)'으로 치환한다.
 * 매물 데이터가 비어 있는 채로 생성이 돌면 모델이 "(주소)에 위치한 (업종) 점포"
 * 같은 빈칸 문장을 만들어 그대로 저장·공개됐다 (2026-07-20 실사례 1건).
 * 생성 경로를 고쳐도 이미 만들어진 글은 막지 못하므로, 저장 시점에서 차단한다.
 */

// 괄호 안이 '값 이름'인 경우만 잡는다. 정상 문장의 괄호(예: "(참고용)")는 통과시킨다.
const PLACEHOLDER_WORDS = [
  '주소', '업종', '상호', '상호명', '가게명', '브랜드', '브랜드명',
  '보증금', '월세', '관리비', '권리금', '희망 권리금', '매출', '월 매출', '월 평균 매출',
  '면적', '전용면적', '층수', '해당 층수', '지역', '동네', '양도방식', '미입력',
]
const PLACEHOLDER_RE = new RegExp(`\\((?:${PLACEHOLDER_WORDS.join('|')})\\)`)

/** 문자열 하나에 플레이스홀더가 있는지 */
export function hasPlaceholder(text) {
  return typeof text === 'string' && PLACEHOLDER_RE.test(text)
}

/**
 * 초안·수정문 전체를 훑어 플레이스홀더가 든 블록 키 목록을 돌려준다.
 * 빈 배열이면 저장해도 되는 상태.
 */
export function findPlaceholderBlocks(aiDraft, editedTexts) {
  const bad = new Set()
  for (const [key, value] of Object.entries(aiDraft ?? {})) {
    if (hasPlaceholder(value)) bad.add(key)
  }
  // 사용자가 고친 문장이 있으면 그 문장이 실제로 공개되는 값이다
  for (const [key, value] of Object.entries(editedTexts ?? {})) {
    if (hasPlaceholder(value)) bad.add(key)
    else bad.delete(key)
  }
  return [...bad]
}

/** 블록 키 → 사용자에게 보여줄 이름 */
export const BLOCK_LABEL = {
  description: '매물 설명문',
  facility: '시설 컨디션',
  salesAnalysis: '매출 분석',
  location: '위치·임대 조건',
}
