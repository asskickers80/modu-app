/**
 * 모두에 질문하기 — 예시 문구 다듬기 프롬프트 (ORDER 2026-09-13 A3 2단계·A7).
 * 무료 등급에서도 허용되는 유일한 생성 호출이다: 입력은 매물 공개 정보와 룰이 만든 후보 문장뿐이고,
 * 사용자 자유 입력·연락처·양도인 답장은 절대 들어가지 않는다(A7, 테스트 ⑭가 검사한다).
 */
export const ASK_PROMPT_ALLOWED_KEYS = ['industry', 'gu', 'floor', 'area', 'candidates']

export function buildAskExamplesPrompt({ industry = null, gu = null, floor = null, area = null, candidates = [] } = {}) {
  const facts = [industry && `업종: ${industry}`, gu && `지역: ${gu}`, floor && `층: ${floor}`, area && `전용면적: ${area}㎡`].filter(Boolean).join(' · ')
  const list = candidates.map((c, i) => `${i + 1}. [${c.axis}/${c.branch}] ${c.text}`).join('\n')
  return `점포를 보러 온 사람이 물어볼 만한 질문 문장을 다듬는 일입니다.

[매물 공개 정보]
${facts || '(없음)'}

[후보 문장]
${list}

규칙
- 후보 문장의 뜻을 바꾸지 말고 말투만 자연스럽게 다듬으세요.
- 새 질문을 만들지 마세요. 후보에 없는 내용을 넣지 마세요.
- 상호·상점 이름을 넣지 마세요.
- 권리금·시세·매출·상권 평가·전망을 묻는 문장은 만들지 마세요.
- 각 문장은 25자 이내, 존댓말, 물음표로 끝냅니다.

출력은 JSON 배열만: [{"i":1,"text":"..."}]`
}

/** 응답 → 후보 순번 기반 치환. 규칙 위반(길이·금지어)이면 원래 룰 문장을 유지한다 */
export function applyAskExamplesResponse(candidates = [], raw = '') {
  let parsed = null
  try { parsed = JSON.parse(String(raw).replace(/```json|```/g, '').trim()) } catch (_) { return candidates }
  if (!Array.isArray(parsed)) return candidates
  const byIndex = new Map(parsed.filter(x => Number.isFinite(x?.i)).map(x => [x.i, String(x.text ?? '')]))
  return candidates.map((c, i) => {
    const t = (byIndex.get(i + 1) ?? '').trim()
    const ok = t && t.length <= 25 && t.endsWith('?') && !/권리금|시세|매출|상권|전망|얼마 받|적정/.test(t)
    return ok ? { ...c, text: t } : c
  })
}
