/**
 * 회원 등급 config — 등급별 한도는 전부 여기서만 정의한다 (화면 하드코딩 금지).
 *
 * 사진 정책:
 * - 하한 없음 — 내부 3장은 '권장'(INTERIOR_RECOMMENDED)으로만 유도 (대표 지시로 필수 폐지:
 *   수정 중 3장 확보가 어려움. 강제 대신 완성도 점수·체크리스트·안내 문구로 유도)
 * - 상한: 무료 5장 / 프리미엄 15장 (내부+외부 합산)
 * - 프리미엄 미출시 상태 — getMemberTier()는 'free' 고정, 출시 시 실제 등급 연동
 * - 프리미엄 출시 전까지 화면에서 프리미엄 언급 금지 (정직 원칙)
 */
export const PHOTO_LIMITS = { free: 5, premium: 15 }

export const INTERIOR_RECOMMENDED = 3

// 특이사항·경쟁력 심화 블록(draft-quality) — "유료 = 더 깊은 AI 생성" 원칙.
// 생성·표시 로직은 완전 구현돼 있고, 멤버십 출시 시 이 플래그만 true로 바꾸면 활성된다.
// false인 동안 사용자에겐 잠금 카드("멤버십에서 제공될 예정 — 준비 중")만 노출. 가격·혜택 약속 금지.
export const DEEP_BLOCKS_ENABLED = false

export function getMemberTier() {
  return 'free' // 프리미엄 출시 시 계정 등급 연동
}

export function getPhotoLimit() {
  return PHOTO_LIMITS[getMemberTier()]
}
