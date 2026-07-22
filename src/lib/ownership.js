import { getDeviceId } from './supabase'

/**
 * 매물 소유자 판정 — 단일 소스 (IDENTITY-MODEL 판정 규칙).
 *
 * 1순위: 계정 소유 — 로그인 사용자 id == listings.user_id.
 *   (migrateDeviceId가 로그인 시 user_id를 채운다. 컬럼 미생성/미이관이면 값이 없어 자동 폴백)
 * 2순위(폴백): 기기 소유 — listing.device_id == 내 기기 ID (비로그인·익명 등록).
 *
 * userId를 넘기지 않으면(기존 호출부) 기기 판정만 — 하위호환. 한 화면의 조회 가드와
 * 렌더 판정은 반드시 같은 인자로 호출해 일치시킨다(불일치 시 소유자 오판).
 * (device_id·user_id 둘 다 없는 옛 익명 매물은 소유자를 특정할 수 없어 항상 false.)
 */
export function isOwnerOf(listing, userId = null) {
  if (userId && listing?.user_id && listing.user_id === userId) return true
  const deviceId = listing?.device_id
  return !!deviceId && deviceId === getDeviceId()
}
