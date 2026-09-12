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

/** 동시 활성 초대 1건 — 기존 활성 초대는 닫고 새로 만든다 */
export async function createInvite(vendorId = null) {
  const user = await me()
  if (!user) return { ok: false, reason: 'login' }
  try {
    await supabase.from('vendor_take_invites').update({ closed_at: new Date().toISOString() }).eq('vendor_user_id', user.id).is('closed_at', null)
    const row = { vendor_user_id: user.id, vendor_id: vendorId, token: newToken(), expires_at: inviteExpiry(), max_responses: TAKES.MAX_RESPONSES }
    const { data, error } = await supabase.from('vendor_take_invites').insert(row).select('*').single()
    if (error) return { ok: false }
    logEvent('take_invite_create', {})
    return { ok: true, invite: data }
  } catch (_) { return { ok: false } }
}
export async function fetchActiveInvite() {
  const user = await me(); if (!user) return null
  try {
    const { data } = await supabase.from('vendor_take_invites').select('*').eq('vendor_user_id', user.id).is('closed_at', null).order('created_at', { ascending: false }).limit(1)
    const inv = data?.[0] ?? null
    return inv && inviteState(inv) === 'open' ? inv : null
  } catch (_) { return null }
}
export async function fetchInviteByToken(token) {
  try {
    const { data } = await supabase.from('vendor_take_invites').select('*').eq('token', token).maybeSingle()
    if (!data) return null
    let vendorName = '업체'
    if (data.vendor_id) { const { data: v } = await supabase.from('listings').select('shop_name').eq('id', data.vendor_id).maybeSingle(); vendorName = v?.shop_name ?? vendorName }
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
  if (voiceSec != null && !validateVoiceSec(voiceSec)) return { ok: false, reason: 'voice_too_long' }
  try {
    const { data: pend } = await supabase.from('vendor_takes').select('id').eq('vendor_user_id', invite.vendor_user_id).is('approved_at', null).is('removed_at', null)
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

export async function fetchMyTakes() {
  const user = await me(); if (!user) return []
  try { const { data } = await supabase.from('vendor_takes').select('*').eq('vendor_user_id', user.id).order('created_at', { ascending: true }); return data ?? [] } catch (_) { return [] }
}
export async function fetchApprovedTakes(vendorUserId) {
  if (!vendorUserId) return []
  try { const { data } = await supabase.from('vendor_takes').select('id, display_name, business_type, chip, body, voice_url, position, approved_at, removed_at').eq('vendor_user_id', vendorUserId).not('approved_at', 'is', null).is('removed_at', null).order('position', { ascending: true }); return data ?? [] } catch (_) { return [] }
}
export async function approveTake(take, approvedCount) {
  if (!canApprove(approvedCount)) return { ok: false, reason: 'max' }
  try {
    const position = approvedCount + 1
    const { error } = await supabase.from('vendor_takes').update({ approved_at: new Date().toISOString(), position, removed_at: null }).eq('id', take.id)
    if (!error) logEvent('take_approve', { position })
    return { ok: !error }
  } catch (_) { return { ok: false } }
}
export async function declineTake(take) {
  try { await supabase.from('vendor_takes').update({ removed_at: new Date().toISOString() }).eq('id', take.id); return true } catch (_) { return false }
}
export async function removeTake(take) {
  try { await supabase.from('vendor_takes').update({ removed_at: new Date().toISOString(), position: null }).eq('id', take.id); logEvent('take_remove', {}); return true } catch (_) { return false }
}
/** 순서 변경 — position 1..n 재부여 */
export async function reorderTakes(orderedIds) {
  try { for (let i = 0; i < orderedIds.length; i++) await supabase.from('vendor_takes').update({ position: i + 1 }).eq('id', orderedIds[i]); return true } catch (_) { return false }
}
