import { getDeviceId } from './supabase'

/**
 * 매물 소유자 판정 — 단일 소스.
 *
 * 이 앱의 신원 모델은 기기 ID 기준(로그인하면 계정 기준값으로 동기화)이라
 * "이 매물의 device_id == 내 기기 ID"가 소유 판정이다. E2 소유자 모드와
 * E1 수정 진입 가드가 반드시 같은 판정을 쓰도록 여기 한 곳에 둔다.
 * (device_id 없는 옛 익명 매물은 소유자를 특정할 수 없어 항상 false.)
 */
export function isOwnerOf(listing) {
  const deviceId = listing?.device_id
  return !!deviceId && deviceId === getDeviceId()
}
