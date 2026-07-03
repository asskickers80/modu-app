/**
 * 안읽음 표시 (DB 기반)
 *
 * conversations.sender_last_read_at / receiver_last_read_at 에 내 쪽 마지막
 * 열람 시각을 기록한다. 내가 sender인지 receiver인지는 device_id 비교로 판정.
 * 판정: last_message_at 이 내 쪽 last_read_at 보다 뒤면 안읽음 (null이면 안읽음).
 * 내가 보낸 메시지는 전송 완료 직후 markConversationSeen 으로 열람 처리돼 제외된다.
 * (구 localStorage 'modu_last_seen' 방식은 폐기 — 값은 마이그레이션하지 않고 무시)
 */
import { useState, useEffect } from 'react'
import { supabase, getDeviceId } from './supabase'

/** 내 쪽 읽음 컬럼명 — 대화의 sender_id가 나면 sender_*, 아니면 receiver_* */
function myReadColumn(conv, myId) {
  return conv?.sender_id === myId ? 'sender_last_read_at' : 'receiver_last_read_at'
}

/** 대화를 열어봤다고 기록 — 내 쪽 컬럼만 now()로 update. D4Chat 진입·수신·전송 완료 시점에 호출 */
export async function markConversationSeen(conversationId) {
  if (!conversationId) return
  try {
    const myId = getDeviceId()
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, sender_id')
      .eq('id', conversationId)
      .single()
    if (!conv) return
    await supabase
      .from('conversations')
      .update({ [myReadColumn(conv, myId)]: new Date().toISOString() })
      .eq('id', conversationId)
  } catch {
    // 열람 기록은 best-effort — 실패해도 대화 이용엔 지장 없음
  }
}

/** 안읽음 판정 — 마지막 메시지가 내 쪽 마지막 열람보다 뒤면 true (메시지 없으면 false) */
export function isUnread(conv, myId = getDeviceId()) {
  if (!conv?.last_message_at) return false
  const readAt = conv[myReadColumn(conv, myId)]
  return !readAt || new Date(conv.last_message_at) > new Date(readAt)
}

/** 하단 탭 점 배지용 — 내 대화 중 안읽음이 하나라도 있으면 true. Realtime 반영 */
export function useHasUnread() {
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const myId = getDeviceId()
      const { data, error } = await supabase
        .from('conversations')
        .select('id, sender_id, receiver_id, last_message_at, sender_last_read_at, receiver_last_read_at')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
      if (cancelled || error) return
      setHasUnread((data ?? []).some(c => isUnread(c, myId)))
    }

    check()
    const channel = supabase
      .channel(`unread_dot_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        check
      )
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  return hasUnread
}
