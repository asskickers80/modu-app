/**
 * 한마디 — 데이터 계층 (ORDER 2026-09-12 파트 C). 판정은 vendorTakesRules(순수).
 * 초대(vendor_take_invites) → 링크 페이지(비회원) 응답(vendor_takes) → 업체 승인(position 1~3) → 프로필 칸.
 * 계정·전화·이메일은 받지 않는다. 텍스트 변환 없음(AI 호출 없음).
 */
import { supabase } from './supabase'
import { logEvent } from './eventLog'
import { TAKES } from '../../config/vendorTakes'
import { inviteExpiry, newToken, inviteState, canApprove, validateVoiceSec, clampName, clampBody } from './vendorTakesRules'

const BUCKET = 'Modu Apps'
async function me() { try { const { data: { session } } = await supabase.auth.getSession(); return session?.user ?? null } catch (_) { return null } }

// 계정이 소유자로 확정된 업체만 한마디를 받는다. 익명 기기 매물을 임의 계정에 귀속하지 않는다.
async function takeVendor(vendorId) {
  if (!vendorId) return null
  try {
    const { data, error } = await supabase.from('listings').select('id,user_id,shop_name').eq('id', vendorId).eq('listing_type', 'business').maybeSingle()
    return !error && data?.user_id ? data : null
  } catch (_) { return null }
}
// 초대 FK의 업체와 계정, 응답의 계정이 실제 업체 소유자와 모두 일치해야 한다.
const scopedTakes = (columns, vendorId, ownerId) => supabase.from('vendor_takes').select(`${columns}, vendor_take_invites!inner(vendor_id,vendor_user_id)`).eq('vendor_take_invites.vendor_id', vendorId).eq('vendor_take_invites.vendor_user_id', ownerId).eq('vendor_user_id', ownerId)

/** 업체마다 동시 활성 초대 1건 — 해당 업체의 기존 활성 초대만 닫는다 */
export async function createInvite(vendorId) {
  const user = await me()
  if (!user) return { ok: false, reason: 'login' }
  if (!vendorId) return { ok: false, reason: 'vendor' }
  try {
    const vendor = await takeVendor(vendorId)
    if (!vendor || vendor.user_id !== user.id) return { ok: false, reason: 'vendor' }
    const { error: closeError } = await supabase.from('vendor_take_invites').update({ closed_at: new Date().toISOString() }).eq('vendor_user_id', user.id).eq('vendor_id', vendorId).is('closed_at', null)
    if (closeError) return { ok: false }
    const row = { vendor_user_id: user.id, vendor_id: vendorId, token: newToken(), expires_at: inviteExpiry(), max_responses: TAKES.MAX_RESPONSES }
    const { data, error } = await supabase.from('vendor_take_invites').insert(row).select('*').single()
    if (error) return { ok: false }
    logEvent('take_invite_create', {})
    return { ok: true, invite: data }
  } catch (_) { return { ok: false } }
}
export async function fetchActiveInvite(vendorId) {
  const user = await me(); if (!user || !vendorId) return null
  try {
    const vendor = await takeVendor(vendorId)
    if (!vendor || vendor.user_id !== user.id) return null
    const { data } = await supabase.from('vendor_take_invites').select('*').eq('vendor_user_id', user.id).eq('vendor_id', vendorId).is('closed_at', null).order('created_at', { ascending: false }).limit(1)
    const inv = data?.[0] ?? null
    return inv && inviteState(inv) === 'open' ? inv : null
  } catch (_) { return null }
}
export async function fetchInviteByToken(token) {
  try {
    const { data } = await supabase.from('vendor_take_invites').select('*').eq('token', token).maybeSingle()
    if (!data?.vendor_id) return null
    const vendor = await takeVendor(data.vendor_id)
    if (!vendor || vendor.user_id !== data.vendor_user_id) return null
    const vendorName = vendor.shop_name ?? '업체'
    logEvent('take_invite_open', { token })
    return { ...data, vendorName }
  } catch (_) { return null }
}

/** 음성 업로드 — 30초 상한(초 단위 검증). 실패는 null */
export async function uploadVoice(blob, inviteId, sec) {
  if (!validateVoiceSec(sec)) return null
  try {
    const path = `takes/${inviteId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webm`
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { cacheControl: '3600', contentType: blob.type || 'audio/webm' })
    if (error) return null
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  } catch (_) { return null }
}

/** 링크 페이지 응답 — 상태 open 일 때만. 응답 수 +1, 상한 도달 시 닫힘 */
export async function submitTake(invite, { displayName, businessType, chip, body = null, voiceUrl = null, voiceSec = null }) {
  const state = inviteState(invite)
  if (state !== 'open') return { ok: false, reason: state }
  if (!invite.vendor_id) return { ok: false, reason: 'closed' }
  if (voiceSec != null && !validateVoiceSec(voiceSec)) return { ok: false, reason: 'voice_too_long' }
  try {
    const vendor = await takeVendor(invite.vendor_id)
    if (!vendor || vendor.user_id !== invite.vendor_user_id) return { ok: false, reason: 'closed' }
    const { data: storedInvite, error: inviteError } = await supabase.from('vendor_take_invites').select('*').eq('id', invite.id).eq('vendor_id', vendor.id).eq('vendor_user_id', vendor.user_id).maybeSingle()
    if (inviteError || !storedInvite) return { ok: false, reason: 'closed' }
    const currentState = inviteState(storedInvite)
    if (currentState !== 'open') return { ok: false, reason: currentState }
    invite = storedInvite
    const { data: pend, error: pendingError } = await scopedTakes('id', invite.vendor_id, vendor.user_id).is('approved_at', null).is('removed_at', null)
    if (pendingError) return { ok: false }
    if ((pend?.length ?? 0) >= TAKES.MAX_PENDING) { await supabase.from('vendor_take_invites').update({ closed_at: new Date().toISOString() }).eq('id', invite.id); return { ok: false, reason: 'closed' } }
    const row = { invite_id: invite.id, vendor_user_id: invite.vendor_user_id, display_name: clampName(displayName), business_type: clampName(businessType), chip, body: clampBody(body), voice_url: voiceUrl, voice_sec: voiceSec }
    const { error } = await supabase.from('vendor_takes').insert(row)
    if (error) return { ok: false }
    const next = (invite.response_count ?? 0) + 1
    await supabase.from('vendor_take_invites').update({ response_count: next, ...(next >= invite.max_responses ? { closed_at: new Date().toISOString() } : {}) }).eq('id', invite.id)
    logEvent('take_submit', { kind: voiceUrl ? 'voice' : 'text' })
    return { ok: true }
  } catch (_) { return { ok: false } }
}

export async function fetchMyTakes(vendorId) {
  const user = await me(); if (!user || !vendorId) return []
  try {
    const vendor = await takeVendor(vendorId)
    if (!vendor || vendor.user_id !== user.id) return []
    const { data } = await scopedTakes('*', vendorId, vendor.user_id).order('created_at', { ascending: true }); return data ?? []
  } catch (_) { return [] }
}
export async function fetchApprovedTakes(vendorId) {
  if (!vendorId) return []
  try {
    const vendor = await takeVendor(vendorId)
    if (!vendor) return []
    const { data } = await scopedTakes('id, display_name, business_type, chip, body, voice_url, position, approved_at, removed_at', vendorId, vendor.user_id).not('approved_at', 'is', null).is('removed_at', null).order('position', { ascending: true }); return data ?? []
  } catch (_) { return [] }
}
export async function approveTake(take, vendorId) {
  try {
    const rows = await fetchMyTakes(vendorId)
    const current = rows.find(row => row.id === take.id && !row.approved_at && !row.removed_at)
    if (!current) return { ok: false, reason: 'vendor' }
    const approvedCount = rows.filter(row => row.approved_at && !row.removed_at).length
    if (!canApprove(approvedCount)) return { ok: false, reason: 'max' }
    const position = approvedCount + 1
    const { error } = await supabase.from('vendor_takes').update({ approved_at: new Date().toISOString(), position, removed_at: null }).eq('id', current.id).eq('invite_id', current.invite_id).eq('vendor_user_id', current.vendor_user_id)
    if (!error) logEvent('take_approve', { position })
    return { ok: !error }
  } catch (_) { return { ok: false } }
}
async function updateOwnedTake(take, vendorId, patch) {
  const current = (await fetchMyTakes(vendorId)).find(row => row.id === take.id)
  if (!current) return false
  const { error } = await supabase.from('vendor_takes').update(patch).eq('id', current.id).eq('invite_id', current.invite_id).eq('vendor_user_id', current.vendor_user_id)
  return !error
}
export async function declineTake(take, vendorId) {
  try { return await updateOwnedTake(take, vendorId, { removed_at: new Date().toISOString() }) } catch (_) { return false }
}
export async function removeTake(take, vendorId) {
  try { const ok = await updateOwnedTake(take, vendorId, { removed_at: new Date().toISOString(), position: null }); if (ok) logEvent('take_remove', {}); return ok } catch (_) { return false }
}
/** 순서 변경 — position 1..n 재부여 */
export async function reorderTakes(orderedIds, vendorId) {
  try {
    const rows = (await fetchMyTakes(vendorId)).filter(row => row.approved_at && !row.removed_at)
    if (orderedIds.length !== rows.length || new Set(orderedIds).size !== rows.length || !orderedIds.every(id => rows.some(row => row.id === id))) return false
    for (let i = 0; i < orderedIds.length; i++) {
      const current = rows.find(row => row.id === orderedIds[i])
      const { error } = await supabase.from('vendor_takes').update({ position: i + 1 }).eq('id', current.id).eq('invite_id', current.invite_id).eq('vendor_user_id', current.vendor_user_id)
      if (error) return false
    }
    return true
  } catch (_) { return false }
}
