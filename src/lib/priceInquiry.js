/**
 * '모두에 시세 물어보기' — 데이터 계층 (ORDER 2026-09-11 파트 C). 판정은 priceInquiryRules(순수).
 * 지시문 E(수요 신호 배정)의 첫 구현: demand_signals → demand_signal_targets(기업회원별 발송·응답·대화) → conversations.
 * 기업회원에게 사용자 이름·연락처는 [대화 열기] 전까지 없다. 원장 원본은 기업회원에게 나가지 않는다(자기 응답 건만).
 * 테이블 부재·실패는 정직한 실패 반환 — 기존 흐름을 막지 않는다.
 */
import { supabase, getDeviceId } from './supabase'
import { getProfile } from './userProfile'
import { logEvent } from './eventLog'
import { recordInquiry } from './inquiryLedger'
import { PRICE_INQUIRY } from '../../config/priceInquiry'
import { DEMAND } from '../../config/demandSignal'
import { isDuplicate, pickTargets, placeHashOf, assigneeTypeOf, guOf } from './priceInquiryRules'

async function currentUserId() {
  try { const { data: { session } } = await supabase.auth.getSession(); return session?.user?.id ?? null } catch (_) { return null }
}

/** 배정 후보 — 카테고리 기업회원 전부(좌표 포함). 법인 기업회원(modu_vendor_id)도 같은 목록에 같은 규칙으로 들어온다 */
async function candidateVendors() {
  const { data } = await supabase.from('listings').select('id, device_id, shop_name, biz_category, latitude, longitude, published_at')
    .eq('listing_type', 'business').eq('status', 'published').in('biz_category', DEMAND.categories).limit(200)
  return Array.isArray(data) ? data : []
}

/**
 * 시세 문의 전송: 30일 중복 확인 → demand_signals 1행 → 배정(전원 동시) → inquiry_ledger 1행(source=price_inquiry).
 * @returns { ok, duplicate, pending, targetCount, signalId }
 */
export async function sendPriceInquiry({ origin, attachment, address = null, coords = null }) {
  try {
    const device = getDeviceId()
    const placeHash = placeHashOf(address)
    const { data: mine } = await supabase.from('demand_signals').select('id, place_hash, status, attachment, created_at').eq('device_id', device).eq('topic_key', 'price_check').order('created_at', { ascending: false }).limit(20)
    if (isDuplicate(mine ?? [], { placeHash, chips: attachment.chips ?? [] })) { logEvent('price_inquiry_dedupe_blocked', { origin }); return { ok: false, duplicate: true } }

    const expiresAt = new Date(Date.now() + DEMAND.expireDays * 864e5).toISOString()
    const vendors = await candidateVendors()
    const { targets, widened, pending } = pickTargets(vendors, coords)
    const row = {
      device_id: device, user_id: await currentUserId(), topic_key: 'price_check', origin, attachment,
      place_hash: placeHash, region_gu: guOf(address), latitude: coords?.lat ?? null, longitude: coords?.lng ?? null,
      status: 'open', target_count: targets.length, pending, expires_at: expiresAt,
    }
    const { data: sig, error } = await supabase.from('demand_signals').insert(row).select('id').single()
    if (error) return { ok: false, duplicate: false }
    if (targets.length) {
      await supabase.from('demand_signal_targets').insert(targets.map(v => ({
        signal_id: sig.id, vendor_id: v.id, vendor_device_id: v.device_id ?? null, assignee_type: assigneeTypeOf(v.id),
      })))
    }
    await recordInquiry({ source: 'price_inquiry', signal: 'price_check', channel: 'app', status: 'sent', region: guOf(address) })
    logEvent('price_inquiry_sent', { origin, chips: attachment.chips ?? [], timing: attachment.timing ?? null, attach_sales_bucket: !!attachment.sales_band })
    logEvent('price_inquiry_dispatch', { vendor_count: targets.length, radius_km: widened ? DEMAND.retryMultiplier : 1, pending })
    return { ok: true, duplicate: false, pending, targetCount: targets.length, signalId: sig.id }
  } catch (_) { return { ok: false, duplicate: false } }
}

/** 내 시세 문의 목록(최신순) + 각 신호의 응답 대상 */
export async function fetchMyPriceInquiries() {
  try {
    const { data: sigs } = await supabase.from('demand_signals').select('*').eq('device_id', getDeviceId()).eq('topic_key', 'price_check').order('created_at', { ascending: false }).limit(10)
    const list = sigs ?? []
    if (!list.length) return []
    const { data: targets } = await supabase.from('demand_signal_targets').select('*').in('signal_id', list.map(s => s.id))
    const { data: vendors } = await supabase.from('listings').select('id, shop_name, device_id, published_at').in('id', [...new Set((targets ?? []).map(t => t.vendor_id))])
    const vmap = {}; for (const v of vendors ?? []) vmap[v.id] = v
    return list.map(s => ({ ...s, targets: (targets ?? []).filter(t => t.signal_id === s.id).map(t => ({ ...t, vendor: vmap[t.vendor_id] ?? null })) }))
  } catch (_) { return [] }
}

/** 만료 처리 — 클라이언트 진입 시 1회(크론 없음). 만료되면 상태 갱신 + 이벤트. 사용자 안내는 호출부 */
export async function expireIfDue(signal, now = new Date()) {
  if (!signal?.expires_at || signal.status !== 'open' || new Date(signal.expires_at) > now) return false
  try {
    await supabase.from('demand_signals').update({ status: 'expired' }).eq('id', signal.id)
    logEvent('price_inquiry_expired', { signal_id: signal.id })
    return true
  } catch (_) { return false }
}

/** [대화 열기] — 이때 처음 대화가 생기고 원장 행이 replied 로. 기업회원 응답문을 첫 메시지로 넣는다 */
export async function openPriceInquiryDm(target, signal, navigate) {
  try {
    const me = getDeviceId()
    const vendor = target.vendor ?? {}
    const { data: conv, error } = await supabase.from('conversations').insert({
      listing_id: target.vendor_id, listing_name: vendor.shop_name ?? '업체', listing_emoji: '🏢',
      sender_id: me, receiver_id: target.vendor_device_id ?? vendor.device_id ?? null,
      sender_name: getProfile().name ?? '문의자', receiver_name: vendor.shop_name ?? '업체',
    }).select('id').single()
    if (error) return { ok: false }
    if (target.response_text) {
      await supabase.from('messages').insert({ conversation_id: conv.id, sender_id: target.vendor_device_id ?? 'vendor', content: target.response_text })
      await supabase.from('conversations').update({ last_message: target.response_text, last_message_at: new Date().toISOString() }).eq('id', conv.id)
    }
    await supabase.from('demand_signal_targets').update({ conversation_id: conv.id }).eq('id', target.id)
    await supabase.from('demand_signals').update({ status: 'answered' }).eq('id', signal.id)
    // 원장: 첫 응답은 기존 sent 행을 replied 로, 추가 업체는 행 추가
    const { data: led } = await supabase.from('inquiry_ledger').select('id, vendor_id').eq('device_id', me).eq('source', 'price_inquiry').eq('signal', 'price_check').order('created_at', { ascending: false }).limit(5)
    const open = (led ?? []).find(l => !l.vendor_id)
    const assignee = assigneeTypeOf(target.vendor_id)
    if (open) await supabase.from('inquiry_ledger').update({ vendor_id: target.vendor_id, status: 'replied', assignee_type: assignee, price_inquiry_id: signal.id, updated_at: new Date().toISOString() }).eq('id', open.id)
    else await recordInquiry({ vendorId: target.vendor_id, conversationId: conv.id, source: 'price_inquiry', signal: 'price_check', channel: 'app', status: 'replied' })
    logEvent('price_inquiry_open_dm', { rank: target.rank ?? null, assignee_type: assignee })
    navigate?.(`/d4/chat/${conv.id}`)
    return { ok: true, conversationId: conv.id }
  } catch (_) { return { ok: false } }
}

export async function declineResponse(target) {
  try { await supabase.from('demand_signal_targets').update({ declined_at: new Date().toISOString() }).eq('id', target.id); logEvent('price_inquiry_declined', {}) } catch (_) {}
}

export async function sendFeedback(signal, result) {
  try {
    const { error } = await supabase.from('price_inquiry_feedback').insert({ signal_id: signal.id, user_id: await currentUserId(), device_id: getDeviceId(), result })
    logEvent('price_inquiry_feedback', { result })
    return !error
  } catch (_) { return false }
}
export async function fetchFeedbackDone(signalIds) {
  try {
    const { data } = await supabase.from('price_inquiry_feedback').select('signal_id').eq('device_id', getDeviceId()).in('signal_id', signalIds)
    return new Set((data ?? []).map(r => r.signal_id))
  } catch (_) { return new Set() }
}

// ── 기업회원 쪽 ───────────────────────────────────────────────
/** 내 업체(들)에 온 시세 문의 — 첨부 요약만(익명), 이름·연락처 없음 */
export async function fetchVendorSignals(vendorIds) {
  const ids = (vendorIds ?? []).filter(Boolean)
  if (!ids.length) return { items: [], answered: 0, opened: 0 }
  try {
    const { data: targets } = await supabase.from('demand_signal_targets').select('*').in('vendor_id', ids).order('sent_at', { ascending: false }).limit(50)
    const list = targets ?? []
    const { data: sigs } = await supabase.from('demand_signals').select('id, attachment, region_gu, status, expires_at, created_at').in('id', [...new Set(list.map(t => t.signal_id))])
    const smap = {}; for (const s of sigs ?? []) smap[s.id] = s
    return {
      items: list.map(t => ({ ...t, signal: smap[t.signal_id] ?? null })),
      answered: list.filter(t => t.responded_at).length,
      opened: list.filter(t => t.conversation_id).length,
    }
  } catch (_) { return { items: [], answered: 0, opened: 0 } }
}

/** [답하기] — 200자 이내 기본 문장. 무료 응답 한도 초과면 안내만(결제 화면 없음) */
export async function respondToSignal(target, text, { monthCount = 0 } = {}) {
  if (monthCount >= DEMAND.freeResponsesPerMonth) return { ok: false, limit: true }
  try {
    const { error } = await supabase.from('demand_signal_targets').update({ responded_at: new Date().toISOString(), response_text: String(text ?? '').slice(0, DEMAND.replyMaxChars) }).eq('id', target.id)
    if (error) return { ok: false }
    logEvent('price_inquiry_response_card', { rank: null })
    return { ok: true }
  } catch (_) { return { ok: false } }
}
