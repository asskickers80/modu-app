/**
 * ② 질문 파이프라인 — 모두가 받아서, 물어보고, 전달하고, 이어준다 (ORDER 2026-09-13 파트 C4).
 * 네 박자: ①양도인에게 질문 도착 → ②답을 받으면 무엇을 할지 먼저 말함 → ③실제로 전달하고 안내 → ④결과 회신.
 * 상태는 inquiry_ledger 한 행이 들고 있다(sent → replied → opened). DM 은 질문자가 [대화 열기]를 눌러야 생긴다.
 * 양도인 답장 원문은 손대지 않는다 — 요약·편집·매물 필드 이관 없음(C4-b).
 */
import { supabase, getDeviceId } from './supabase'
import { logEvent } from './eventLog'
import { ASK_COPY, AXIS_LABEL } from '../../config/listingAsk'
import { addWatch } from './watchlist'
import { getProfile } from './userProfile'
import { displayTitle } from './listingTitle'

const sel = 'id, listing_id, device_id, status, ask_question_text, ask_owner_reply_text, ask_axis, ask_expires_at, ask_replied_at, ask_relayed_at, created_at, conversation_id'

/** 1박자 — 내 매물에 들어온 질문 (양도인 화면) */
export async function fetchOwnerQuestions(listingIds = []) {
  const ids = (listingIds ?? []).filter(Boolean)
  if (!ids.length) return []
  try {
    const { data } = await supabase.from('inquiry_ledger').select(sel)
      .eq('source', 'listing_ask').in('listing_id', ids).order('created_at', { ascending: false }).limit(20)
    return (data ?? []).filter(r => r.status === 'sent' || r.status === 'replied' || r.status === 'opened')
  } catch (_) { return [] }
}

/** 근거 줄 — 실제 값만. 없는 조각은 문장에서 빠진다(PRICING §1-2) */
export async function ownerBasis(listing) {
  const parts = []
  const views = Number(listing?.views ?? 0)
  if (views > 0) parts.push(ASK_COPY.ownerBasisViews.replace('{n}', String(views)))
  try {
    const { data } = await supabase.from('ask_question_events').select('topic_axis, answered').eq('target_id', listing.id).eq('answered', true).limit(50)
    const k = data?.length ?? 0
    if (k > 0) {
      const axes = [...new Set(data.map(r => AXIS_LABEL[r.topic_axis] ?? r.topic_axis))].slice(0, 2).join(' · ')
      parts.push(ASK_COPY.ownerBasisAnswered.replace('{k}', String(k)).replace('{axes}', axes))
    }
  } catch (_) {}
  parts.push(ASK_COPY.ownerBasisTail)
  return parts.join(' · ')
}

/**
 * 2·3박자 — 답장을 받으면 그대로 전달한다. 문장을 고치지 않는다(C4-b).
 * 질문자에게는 알림 + 홈 전달 카드. DM 은 아직 만들지 않는다.
 */
export async function replyToAsk(row, text, listing = null) {
  const reply = String(text ?? '').trim()
  if (!reply) return { ok: false }
  const now = new Date().toISOString()
  try {
    const { error } = await supabase.from('inquiry_ledger')
      .update({ ask_owner_reply_text: reply, status: 'replied', ask_replied_at: now, ask_relayed_at: now })
      .eq('id', row.id)
    if (error) return { ok: false }
    try {
      await supabase.from('notifications').insert({
        device_id: row.device_id, type: 'ask_relay', title: ASK_COPY.relayTitle, body: reply,
        payload: { link: `/e2/${row.listing_id}`, ledger_id: row.id, axis: row.ask_axis, dedupe_key: `ask_relay:${row.id}` },
        sent_at: now,
      })
    } catch (_) {}
    const hours = row.created_at ? (Date.now() - new Date(row.created_at)) / 36e5 : null
    logEvent('ask_owner_replied', { axis: row.ask_axis, hours: hours == null ? null : Math.round(hours) })
    logEvent('ask_relay_shown', { axis: row.ask_axis })
    return { ok: true }
  } catch (_) { return { ok: false } }
}

/** 3박자 — 질문자 홈 전달 카드 */
export async function fetchRelays() {
  try {
    const { data } = await supabase.from('inquiry_ledger').select(sel)
      .eq('source', 'listing_ask').eq('device_id', getDeviceId()).eq('status', 'replied')
      .order('ask_relayed_at', { ascending: false }).limit(5)
    return data ?? []
  } catch (_) { return [] }
}

/** [대화 열기] — 여기서 처음 DM 이 생긴다. 원장은 opened 로 */
export async function openDmFromRelay(row, listing, navigate) {
  try {
    const myId = getDeviceId()
    const { data: existing } = await supabase.from('conversations').select('id').eq('sender_id', myId).eq('listing_id', row.listing_id).maybeSingle()
    let convId = existing?.id ?? null
    if (!convId) {
      const { data, error } = await supabase.from('conversations').insert({
        listing_id: row.listing_id,
        listing_name: listing ? displayTitle(listing) : '매물',
        listing_emoji: '🏠',
        sender_id: myId,
        receiver_id: listing?.device_id ?? null,
        sender_name: getProfile().name ?? '문의자',
        receiver_name: listing?.owner_nickname ?? '양도인',
      }).select('id').single()
      if (error) return { ok: false }
      convId = data.id
    }
    await supabase.from('inquiry_ledger').update({ status: 'opened', conversation_id: convId }).eq('id', row.id)
    try {
      await supabase.from('notifications').insert({
        device_id: listing?.device_id, type: 'ask_result', title: ASK_COPY.ownerOpened,
        payload: { link: `/d4/chat/${convId}`, ledger_id: row.id, dedupe_key: `ask_opened:${row.id}` }, sent_at: new Date().toISOString(),
      })
    } catch (_) {}
    logEvent('ask_relay_open_dm', { axis: row.ask_axis })
    logEvent('ask_owner_result_shown', { result: 'opened' })
    navigate?.(`/d4/chat/${convId}`)
    return { ok: true, conversationId: convId }
  } catch (_) { return { ok: false } }
}

/** [찜해두기] — 대화 없이 관심만 */
export async function saveFromRelay(row, listing) {
  try {
    await addWatch({ type: 'listing', id: row.listing_id, listing })
    logEvent('ask_relay_saved', { axis: row.ask_axis })
    return { ok: true }
  } catch (_) { return { ok: false } }
}
