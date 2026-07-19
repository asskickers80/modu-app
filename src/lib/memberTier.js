/**
 * 회원 등급 config — 등급별 한도는 전부 여기서만 정의한다 (화면 하드코딩 금지).
 *
 * 사진 정책 (2026-07-19 오더):
 * - 하한: 전 회원 동일 — 내부 사진 3장 필수 (INTERIOR_MIN)
 * - 상한: 무료 5장 / 프리미엄 15장 (내부+외부 합산)
 * - 프리미엄 미출시 상태 — getMemberTier()는 'free' 고정, 출시 시 실제 등급 연동
 * - 프리미엄 출시 전까지 화면에서 프리미엄 언급 금지 (정직 원칙)
 */
export const PHOTO_LIMITS = { free: 5, premium: 15 }

export const INTERIOR_MIN = 3

export function getMemberTier() {
  return 'free' // 프리미엄 출시 시 계정 등급 연동
}

export function getPhotoLimit() {
  return PHOTO_LIMITS[getMemberTier()]
}
