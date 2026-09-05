/**
 * 알림 센터 저장 계층 (ORDER-close-flow-peer-stats-v1 항목 3)
 * "모두(플랫폼) 발송" 알림 전용 — 사용자 간 활동(문의·답장)은 메시지 탭 담당(벨 원칙).
 * 신원: 크론 생성분은 user_id 기준 → 로그인 세션의 user_id + 이 기기 device_id를 or로 조회.
 * 테이블/정책 미비 등 실패는 빈 상태 — 벨·목록이 조용히 비어 있을 뿐 기존 기능 무영향.
 */
import { supabase, getDeviceId } from './supabase'

async function currentUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  } catch (_) { return null }
}

function withIdentity(query, userId) {
  const deviceId = getDeviceId()
  return userId
    ? query.or(`device_id.eq.${deviceId},user_id.eq.${userId}`)
    : query.eq('device_id', deviceId)
}

/** 최근 알림 목록 (최신순, 최대 50) — 실패는 빈 배열 */
export async function fetchNotifications() {
  try {
    const uid = await currentUserId()
    const { data, error } = await withIdentity(
      supabase.from('notifications').select('id, type, title, body, payload, read_at, created_at'),
      uid,
    ).order('created_at', { ascending: false }).limit(50)
    if (error || !Array.isArray(data)) return []
    return data
  } catch (_) { return [] }
}

/** 미읽음 존재 여부 — 벨 점 판정. 실패는 false(가짜 점 금지) */
export async function hasUnreadNotifications() {
  try {
    const uid = await currentUserId()
    const { data, error } = await withIdentity(
      supabase.from('notifications').select('id'),
      uid,
    ).is('read_at', null).limit(1)
    return !error && Array.isArray(data) && data.length > 0
  } catch (_) { return false }
}

/** 읽음 처리 — 실패는 침묵(다음 방문에 다시 미읽음으로 보일 뿐) */
export async function markNotificationRead(id) {
  try {
    await supabase.from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
  } catch (_) {}
}
