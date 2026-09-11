/**
 * 소개글 생성기 — 부동산원 통계 재료·규칙 (ORDER 2026-09-11 파트 A2(c)). 프롬프트의 통계 부분은 이 파일 한 곳.
 * 규칙: 수치는 그대로 인용 + "한국부동산원 {yyyy}년 {q}분기 기준" 필수 / 비교 형용사·판단 금지 / 값이 null 이면 문장 없음.
 * 응답 검증은 rebStatsRules.verifyDraftStats (입력값과 다른 수치가 나온 문장 제거).
 */
import { rebFacts } from '../rebStatsRules'

export function rebPromptSection(stat) {
  const facts = rebFacts(stat)
  if (!facts) return ''
  return `
[공식 통계 — 한국부동산원 상업용부동산 임대동향, 확정 사실로 인용 가능]
${facts}
규칙: 위 수치는 그대로 쓰고 문장 끝에 반드시 "(한국부동산원 {연도}년 {분기}분기 기준)"을 붙이세요. 높다·낮다·유리하다 같은 비교·판단 표현은 쓰지 마세요. 위에 없는 수치는 만들지 마세요.
`
}
