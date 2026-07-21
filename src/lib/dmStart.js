import { supabase, getDeviceId } from './supabase'
import { getProfile } from './userProfile'

/**
 * 매물 상세(E2·E2L)에서 문의(DM) 대화 시작 공통 로직 — 복제 금지.
 * 이미 이 매물에 대한 내 대화가 있으면 재사용, 없으면 생성 후 대화방으로 이동.
 * listing_type 무관하게 동작(sender=나, receiver=매물 device_id).
 */
export async function startOrOpenConversation({ listing, navigate, emoji = '🏠', receiverFallback = '양도인' }) {
  const myId = getDeviceId()
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('sender_id', myId)
    .eq('listing_id', listing.id)
    .maybeSingle()
  if (existing) { navigate(`/d4/chat/${existing.id}`); return { ok: true } }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      listing_id: listing.id,
      listing_name: listing.shop_name,
      listing_emoji: emoji,
      sender_id: myId,
      receiver_id: listing.device_id,
      sender_name: getProfile().name ?? '문의자',
      receiver_name: listing.owner_nickname ?? receiverFallback,
    })
    .select('id')
    .single()
  if (error) return { ok: false }
  navigate(`/d4/chat/${data.id}`)
  return { ok: true }
}
