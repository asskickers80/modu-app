/**
 * 후기 데이터 계층 (ORDER 2026-09-12 파트 A). 판정은 reviewRules(순수).
 * 작성·열람 모두 로그인 회원만(RLS + 앱). 테이블 부재·실패는 빈 결과/정직한 실패 — 기존 흐름을 막지 않는다.
 * 별점·평가 필드 없음.
 */
import { supabase, getDeviceId } from './supabase'
import { getProfile } from './userProfile'
import { logEvent } from './eventLog'
import { REVIEWS, REVIEW_COPY } from '../../config/reviews'
import { axisOf, validateListingChips, validateVendorChips, clampBody, visitedAtFrom, canEdit, visibleReviews, massDeleteAlert, repeatVendorAlert, blindUntil } from './reviewRules'

async function me() {
  try { const { data: { session } } = await supabase.auth.getSession(); return session?.user ?? null } catch (_) { return null }
}
async function notify(userId, type, title, link = null, extra = {}) {
  if (!userId) return
  try { await supabase.from('notifications').insert({ user_id: userId, type, title, body: null, payload: { link, ...extra, dedupe_key: `${type}:${userId}:${Date.now()}` }, sent_at: new Date().toISOString() }) } catch (_) {}
}

/** 로그인 회원만. { rows(노출분), all, mine } — 비로그인은 null(숫자도 없음) */
export async function fetchReviews(targetType, targetId) {
  const user = await me()
  if (!user) return null
  try {
    const { data, error } = await supabase.from('reviews').select('*').eq('target_type', targetType).eq('target_id', targetId).order('created_at', { ascending: false })
    if (error || !Array.isArray(data)) return { rows: [], all: [], mine: null }
    const rows = visibleReviews(data)
    logEvent('review_view', { target_type: targetType, n: rows.length })
    return { rows, all: data, mine: data.find(r => r.author_user_id === user.id) ?? null }
  } catch (_) { return { rows: [], all: [], mine: null } }
}

/** 작성/수정(24시간 내) — 매물: listing_chips 검증, 업체: vendor_chips 검증 */
export async function submitReview({ targetType, targetId, chips, body, existing = null }) {
  const user = await me()
  if (!user) return { ok: false, reason: 'login' }
  const v = targetType === 'listing' ? validateListingChips(chips) : validateVendorChips(chips)
  if (!v.ok) return { ok: false, reason: 'chips', errors: v.errors }
  const profile = getProfile()
  const row = {
    target_type: targetType, target_id: targetId, author_user_id: user.id, author_axis: axisOf(profile.category),
    author_name: (profile.name ?? '회원').slice(0, 20), chips, body: clampBody(body),
    visited_at: targetType === 'listing' ? visitedAtFrom(chips.when) : null, updated_at: new Date().toISOString(),
  }
  try {
    if (existing) {
      if (!canEdit(existing.created_at)) return { ok: false, reason: 'edit_window' }
      const { error } = await supabase.from('reviews').update({ chips, body: row.body, visited_at: row.visited_at, updated_at: row.updated_at }).eq('id', existing.id)
      return { ok: !error }
    }
    const { error } = await supabase.from('reviews').insert(row)
    if (error) return { ok: false, reason: String(error.message).includes('duplicate') ? 'duplicate' : 'error' }
    logEvent('review_write', { target_type: targetType, chips_count: Object.values(chips).flat().filter(Boolean).length, has_body: !!row.body })
    if (targetType === 'vendor') {
      const { data: mine } = await supabase.from('reviews').select('target_id, created_at').eq('author_user_id', user.id).eq('target_type', 'vendor')
      if (repeatVendorAlert(mine ?? [])) logEvent('ops_alert', { kind: 'review_repeat_author', author: user.id })
    }
    return { ok: true }
  } catch (_) { return { ok: false, reason: 'error' } }
}

/** 양도인·소유주 [지우기] — soft delete, 작성자 알림 1줄, 7일 3건 이상이면 운영 알림 */
export async function deleteReviewByOwner(review, by = 'seller') {
  try {
    const { error } = await supabase.from('reviews').update({ deleted_at: new Date().toISOString(), deleted_by: by }).eq('id', review.id)
    if (error) return false
    logEvent('review_delete', { target_type: review.target_type, by })
    await notify(review.author_user_id, 'review_deleted', REVIEW_COPY.deletedNotice, null)
    const { data: del } = await supabase.from('reviews').select('deleted_at').eq('target_type', review.target_type).eq('target_id', review.target_id).not('deleted_at', 'is', null)
    if (massDeleteAlert(del ?? [])) logEvent('ops_alert', { kind: 'review_mass_delete', target: review.target_id })
    return true
  } catch (_) { return false }
}

/** 기업회원 [이의신청] — 즉시 블라인드(BLIND_DAYS), 후기당 1회, 작성자 알림 */
export async function appealReview(review, reasonChip, note = '') {
  const user = await me()
  if (!user) return { ok: false, reason: 'login' }
  try {
    const { error } = await supabase.from('review_appeals').insert({ review_id: review.id, vendor_user_id: user.id, reason_chip: reasonChip, note: clampBody(note) })
    if (error) return { ok: false, reason: String(error.message).includes('duplicate') ? 'duplicate' : 'error' }
    await supabase.from('reviews').update({ blinded_until: blindUntil(), blind_reason: 'vendor_appeal' }).eq('id', review.id)
    logEvent('review_appeal', { reason: reasonChip })
    await notify(review.author_user_id, 'review_appealed', REVIEW_COPY.appealNotice.replace('{days}', String(REVIEWS.BLIND_DAYS)))
    return { ok: true }
  } catch (_) { return { ok: false, reason: 'error' } }
}

/** 운영 판정 — keep: 즉시 복구 / remove: deleted_by=ops. 양쪽 알림 1줄 */
export async function resolveAppeal(appeal, review, resolution, { auto = false } = {}) {
  try {
    await supabase.from('review_appeals').update({ resolved_at: new Date().toISOString(), resolution, resolved_by: auto ? 'auto' : 'ops' }).eq('id', appeal.id)
    if (resolution === 'keep') await supabase.from('reviews').update({ blinded_until: null, blind_reason: null }).eq('id', review.id)
    else await supabase.from('reviews').update({ deleted_at: new Date().toISOString(), deleted_by: 'ops', blinded_until: null }).eq('id', review.id)
    logEvent('review_appeal_resolved', { resolution, auto })
    await notify(review.author_user_id, 'review_appeal_resolved', resolution === 'keep' ? REVIEW_COPY.appealKept : REVIEW_COPY.appealRemoved)
    await notify(appeal.vendor_user_id, 'review_appeal_resolved', resolution === 'keep' ? REVIEW_COPY.appealKeptVendor : REVIEW_COPY.appealRemovedVendor)
    return true
  } catch (_) { return false }
}

/** 운영 화면용 — 미판정 이의신청 + 후기 */
export async function fetchPendingAppeals() {
  try {
    const { data: appeals } = await supabase.from('review_appeals').select('*').is('resolved_at', null).order('created_at', { ascending: true })
    const ids = (appeals ?? []).map(a => a.review_id)
    if (!ids.length) return []
    const { data: reviews } = await supabase.from('reviews').select('*').in('id', ids)
    const rmap = {}; for (const r of reviews ?? []) rmap[r.id] = r
    return (appeals ?? []).map(a => ({ appeal: a, review: rmap[a.review_id] ?? null })).filter(x => x.review)
  } catch (_) { return [] }
}
export { getDeviceId }
