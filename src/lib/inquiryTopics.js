/**
 * 문의 주제 분류 (ORDER-weekly-one-liner-v1) — 전부 키워드 룰, AI 호출 없음.
 * 표 원본: docs/inquiry-topic-keywords.md (대표 확정본 도착 시 문서·이 상수를 함께 갱신).
 * 위에서부터 검사해 처음 걸리는 주제로 확정. 미매칭은 'etc'.
 */

// cta: E1 수정 진입 단계 (라우트가 파일명과 어긋남에 주의 — /e1/3=사진·증빙)
export const TOPICS = [
  { key: 'transfer_fee', label: '권리금', step: '/e1/1',
    words: ['권리금', '권리', '시설권리', '바닥권리', '프리미엄', '얼마에', '네고', '조정가능'] },
  { key: 'sales', label: '매출', step: '/e1/1',
    words: ['매출', '월매출', '일매출', '순익', '순수익', '마진', '수익', '매상', '장사잘'] },
  { key: 'rent', label: '임대료', step: '/e1/1',
    words: ['월세', '임대료', '보증금', '관리비', '임대차', '계약기간', '재계약', '인상'] },
  { key: 'facility', label: '시설', step: '/e1/3',
    words: ['시설', '집기', '인테리어', '주방', '설비', '에어컨', '냉장고', '기계', '연차', '노후'] },
  { key: 'reason', label: '양도 사유', step: '/e1/2',
    words: ['왜파', '왜내놓', '양도이유', '사유', '이유가', '접는', '정리하시'] },
  { key: 'staff', label: '직원·운영', step: '/e1/2',
    words: ['직원', '알바', '인건비', '근무', '영업시간', '운영시간', '휴무', '혼자'] },
  { key: 'location', label: '위치·상권', step: '/e1/1',
    words: ['위치', '어디', '주소', '상권', '유동', '역세권', '주차', '전면'] },
  // 방문은 매물에 적어둘 정보가 아니라 신호에서 제외된다(아래 topOf 참조)
  { key: 'visit', label: '방문', step: null,
    words: ['방문', '보러', '볼수', '실사', '언제가', '시간되'] },
]

const normalize = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase()

/** 메시지 1건 → 주제 키 (미매칭 'etc') */
export function classifyInquiry(text) {
  const t = normalize(text)
  if (!t) return 'etc'
  for (const topic of TOPICS) {
    if (topic.words.some(w => t.includes(w))) return topic.key
  }
  return 'etc'
}

export const topicOf = (key) => TOPICS.find(t => t.key === key) ?? null

/**
 * 첫 문의 본문 배열 → 최빈 주제.
 * 조건: 분류 가능한 건수(기타 제외) 기준 최빈 비율 ≥ ratioMin.
 * 'etc'·'visit'은 매물에 보완할 정보가 아니므로 채택하지 않는다(빈 안내 금지).
 * @returns { key, label, step, count, total } | null
 */
export function topInquiryTopic(texts, { ratioMin = 0.4 } = {}) {
  const keys = (texts ?? []).map(classifyInquiry).filter(k => k !== 'etc')
  if (!keys.length) return null
  const counts = {}
  for (const k of keys) counts[k] = (counts[k] ?? 0) + 1
  const [key, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (count / keys.length < ratioMin) return null
  const topic = topicOf(key)
  if (!topic?.step) return null // visit 등 — 보완 지점이 없으면 신호로 쓰지 않는다
  return { key, label: topic.label, step: topic.step, count, total: keys.length }
}
