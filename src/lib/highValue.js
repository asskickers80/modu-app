/**
 * 고가치 행동 이벤트 (ORDER 2026-09-10 파트 C3) — 문의 전송 / 방문 일정 제안 / 양도인 알림 응답.
 * 세션 대비 비율 집계용 session_id 는 탭 단위(sessionStorage). from = intake|feed|match|search|watch.
 * 방문 일정 제안(visit_propose)은 기능이 아직 없어 정의만 있고 호출부가 없다.
 */
import { logEvent } from './eventLog'

const KEY = 'modu_session_id'
export const HIGH_VALUE_KINDS = ['inquiry', 'visit_propose', 'owner_msg_reply']
export const HIGH_VALUE_FROM = ['intake', 'feed', 'match', 'search', 'watch']

export function sessionId() {
  try {
    let id = sessionStorage.getItem(KEY)
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem(KEY, id)
    }
    return id
  } catch (_) { return 'no-session' }
}

export function logHighValueAction(kind, from = 'search', extra = {}) {
  if (!HIGH_VALUE_KINDS.includes(kind)) return
  logEvent('high_value_action', { session_id: sessionId(), kind, from: HIGH_VALUE_FROM.includes(from) ? from : 'search', ...extra })
}
