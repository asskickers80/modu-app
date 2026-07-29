import { supabase, getDeviceId } from './supabase'

/**
 * 매물 상태 전환 — E2(양도인)·E2L(임대인) 공유(복제 금지).
 * 소유 조건: device_id 또는 user_id(로그인 계정) — 기존 device_id 단독 조건은
 * 기기 변경 후 로그인한 계정 소유 매물에서 실패하던 불일치가 있어 OR로 확장(IDENTITY-MODEL).
 */
export async function updateListingStatus(listingId, next) {
  const deviceId = getDeviceId()
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id
  let q = supabase.from('listings')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', listingId)
  q = uid ? q.or(`device_id.eq.${deviceId},user_id.eq.${uid}`) : q.eq('device_id', deviceId)
  const { error } = await q
  return { error }
}

/**
 * 소프트 삭제 — status='deleted' (docs/SQL-shell-eliminate.sql CHECK 확장 후 유효).
 * 하드 삭제(DELETE)는 conversations FK 정책 미확정 + RLS DELETE 차단이라 보류 —
 * deleted는 모든 노출 경로(탐색 status 필터·홈 목록·상세)에서 제외되는 영구 비노출 상태.
 */
export function softDeleteListing(listingId) {
  return updateListingStatus(listingId, 'deleted')
}
