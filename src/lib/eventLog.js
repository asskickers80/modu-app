/**
 * 이벤트 로깅 인프라 (ORDER-close-flow-peer-stats-v1 항목 1)
 * 신원 모델 그대로 device_id 기준 + user_id 스탬프(로그인 시).
 * 제품 동작에 영향을 주지 않는 부수 기록 — 어떤 실패(테이블 부재 포함)도 삼킨다.
 * events 테이블은 INSERT만 개방(RLS) — 클라이언트가 읽는 경로는 만들지 않는다.
 */
import { supabase, getDeviceId } from './supabase'

async function currentUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  } catch (_) { return null }
}

/** 이벤트 1건 기록 — await 불필요(fire-and-forget), 실패는 침묵 */
export function logEvent(eventName, { listingId = null, ...payload } = {}) {
  try {
    currentUserId().then(userId =>
      supabase.from('events').insert({
        device_id: getDeviceId(),
        user_id: userId,
        listing_id: listingId,
        event_name: eventName,
        payload,
      })
    ).then(() => {}, () => {})
  } catch (_) { /* 로깅은 절대 제품 흐름을 막지 않는다 */ }
}
