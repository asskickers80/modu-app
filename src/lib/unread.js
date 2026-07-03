/**
 * 안읽음 표시 (기기 단위)
 *
 * DB에 읽음 필드가 없어(콘솔 작업 필요) localStorage에 대화별
 * "마지막 열람 시각"을 저장한다 — device_id 체계와 동일한 한계(기기 한정).
 * 판정: conversations.last_message_at 이 마지막 열람보다 뒤면 안읽음.
 * 내가 보낸 메시지는 전송 완료 직후 markConversationSeen 으로 열람 처리돼 제외된다.
 */
import { useState, useEffect } from 'react'
import { supabase, getDeviceId } from './supabase'

const KEY = 'modu_last_seen' // { [conversationId]: ISO 시각 }

export function getLastSeenMap() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

/** 대화를 열어봤다고 기록 — D4Chat 진입·수신·전송 완료 시점에 호출 */
export function markConversationSeen(conversationId) {
  if (!conversationId) return
  const map = getLastSeenMap()
  map[conversationId] = new Date().toISOString()
  try { localStorage.setItem(KEY, JSON.stringify(map)) } catch {}
}

/** 안읽음 판정 — 마지막 메시지가 마지막 열람보다 뒤면 true (메시지 없으면 false) */
export function isUnread(conv, seenMap = getLastSeenMap()) {
  if (!conv?.last_message_at) return false
  const seen = seenMap[conv.id]
  return !seen || new Date(conv.last_message_at) > new Date(seen)
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
        .select('id, last_message_at')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
      if (cancelled || error) return
      const seenMap = getLastSeenMap()
      setHasUnread((data ?? []).some(c => isUnread(c, seenMap)))
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
