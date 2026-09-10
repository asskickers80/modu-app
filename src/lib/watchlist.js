/**
 * 찜(관심) 저장·알림 팬아웃 계층 (ORDER 2026-09-10 파트 A)
 * 신원 모델: device_id 기준 + user_id 스탬프. 테이블 부재·실패는 조용히 비활성(스키마 의존 배포).
 * 알림 생성은 변경이 일어나는 기기(양도인 저장·마감, 찜 추가)에서 즉시 만든다 — price/info 는 다음 배치 시각으로 예약,
 * [찜한 분들께 알리기]만 즉시. 하루 상한·종류별 끄기는 만드는 쪽에서 판정한다.
 */
import { supabase, getDeviceId } from './supabase'
import { getProfileRaw } from './userProfile'
import { logEvent } from './eventLog'
import { WATCH, WATCH_KINDS } from '../../config/watch'
import {
  priceDiff, infoDiff, priceNotifCopy, infoNotifCopy, statusNotifCopy, densityNotifCopy, ownerMsgCopy,
  ownerTemplateText, shouldSendDensity, withinDailyCaps, ownerMsgAllowed, ownerPushAllowed, nextBatchTime, isSimilar, dongOf, guOf,
} from './watchRules'
import { kstToday } from './weekUtil'

const PROFILE_KEY = 'modu_user_profile'
const COMMON_HIDE_KEY = 'modu_watch_common_hidden'

async function currentUserId() {
  try { const { data: { session } } = await supabase.auth.getSession(); return session?.user?.id ?? null } catch (_) { return null }
}
const dayStartIso = () => `${kstToday()}T00:00:00+09:00`

// ── 찜 CRUD ──────────────────────────────────────────────────
export async function isWatched(type, id) {
  try {
    const { data } = await supabase.from('watchlist').select('id').eq('device_id', getDeviceId()).eq('target_type', type).eq('target_id', String(id)).limit(1)
    return Array.isArray(data) && data.length > 0
  } catch (_) { return false }
}

/** @returns { ok, ordinal } ordinal = 이 대상의 찜 순번(매물만) */
export async function addWatch({ type, id, listing = null }) {
  try {
    const row = { device_id: getDeviceId(), user_id: await currentUserId(), target_type: type, target_id: String(id) }
    const { error } = await supabase.from('watchlist').insert(row)
    if (error && !String(error.message).includes('duplicate')) return { ok: false, ordinal: null }
    let ordinal = null
    if (type === 'listing') {
      const { count } = await supabase.from('watchlist').select('id', { count: 'exact', head: true }).eq('target_type', 'listing').eq('target_id', String(id))
      ordinal = count ?? null
      if (listing) maybeSendDensity(listing).catch(() => {})
    }
    logEvent('watch_add', { target_type: type, ordinal, listingId: type === 'listing' ? String(id) : null })
    return { ok: true, ordinal }
  } catch (_) { return { ok: false, ordinal: null } }
}

export async function removeWatch(type, id) {
  try {
    await supabase.from('watchlist').delete().eq('device_id', getDeviceId()).eq('target_type', type).eq('target_id', String(id))
    logEvent('watch_remove', { target_type: type })
    return true
  } catch (_) { return false }
}

export async function setWatchMuted(watchId, muted) {
  try { await supabase.from('watchlist').update({ muted_at: muted ? new Date().toISOString() : null }).eq('id', watchId) } catch (_) {}
}

/** 내 찜 전부 [{ id, target_type, target_id, created_at, muted_at }] */
export async function fetchMyWatches() {
  try {
    const { data, error } = await supabase.from('watchlist').select('id, target_type, target_id, created_at, muted_at').eq('device_id', getDeviceId()).order('created_at', { ascending: false })
    return error || !Array.isArray(data) ? [] : data
  } catch (_) { return [] }
}

export async function countWatchers(listingId) {
  try {
    const { count, error } = await supabase.from('watchlist').select('id', { count: 'exact', head: true }).eq('target_type', 'listing').eq('target_id', String(listingId))
    return error ? 0 : (count ?? 0)
  } catch (_) { return 0 }
}

/** 찜한 사람 목록(팬아웃·요약용) — 프로필은 user_id 가 있는 경우만 */
async function fetchWatchers(listingId) {
  const { data } = await supabase.from('watchlist').select('id, device_id, user_id, muted_at, created_at').eq('target_type', 'listing').eq('target_id', String(listingId))
  return Array.isArray(data) ? data : []
}
async function fetchProfilesById(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (!ids.length) return {}
  const { data } = await supabase.from('profiles').select('id, profile_data').in('id', ids)
  const out = {}
  for (const r of data ?? []) out[r.id] = r.profile_data ?? {}
  return out
}

/** A4 관심 n명 + 익명 요약 재료 — { n, profiles:[{category,startupMode,region,region_sub}] } */
export async function fetchWatcherStats(listingId) {
  try {
    const ws = await fetchWatchers(listingId)
    const profiles = await fetchProfilesById(ws.map(w => w.user_id))
    return { n: ws.length, profiles: Object.values(profiles).map(pd => ({ category: pd.category, startupMode: pd.startupMode, region: pd.region, region_sub: pd.region_sub })) }
  } catch (_) { return { n: 0, profiles: [] } }
}

// ── 알림 종류별 끄기 (프로필 flat, 서버 profile_data 동기화) ──
export function getWatchAlertOff() {
  try { return getProfileRaw()?.watchAlertOff ?? {} } catch (_) { return {} }
}
export async function setWatchAlertOff(kind, off) {
  if (!WATCH_KINDS.includes(kind)) return
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') || {}
    const watchAlertOff = { ...(raw.watchAlertOff ?? {}), [kind]: !!off }
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...raw, watchAlertOff }))
    const uid = await currentUserId()
    if (uid) {
      const { data } = await supabase.from('profiles').select('profile_data').eq('id', uid).maybeSingle()
      await supabase.from('profiles').update({ profile_data: { ...(data?.profile_data ?? {}), watchAlertOff } }).eq('id', uid)
    }
  } catch (_) {}
}

// ── 팬아웃 ────────────────────────────────────────────────────
/**
 * 찜한 사람 전원에게 알림 1건씩. 상한(같은 매물 1/일·사용자 3/일)·끄기·소유자 제외 적용.
 * @param immediate false = 다음 배치 시각(05:30 KST) 예약
 * @returns 생성 건수
 */
export async function notifyWatchers({ listing, kind, title, body = null, link = null, immediate = true, extra = {} }) {
  try {
    const watchers = (await fetchWatchers(listing.id)).filter(w => !w.muted_at && w.device_id !== listing.device_id)
    if (!watchers.length) return 0
    const profiles = await fetchProfilesById(watchers.map(w => w.user_id))
    const today = dayStartIso()
    const { data: todays } = await supabase.from('notifications').select('device_id, payload').like('type', 'watch_%').gte('created_at', today)
    const perUser = {}, perListing = {}
    for (const n of todays ?? []) {
      perUser[n.device_id] = (perUser[n.device_id] ?? 0) + 1
      const key = `${n.device_id}|${n.payload?.listing_id}`
      perListing[key] = (perListing[key] ?? 0) + 1
    }
    const now = new Date()
    let created = 0
    for (const w of watchers) {
      if (profiles[w.user_id]?.watchAlertOff?.[kind]) continue
      if (!withinDailyCaps({ sameListingToday: perListing[`${w.device_id}|${listing.id}`] ?? 0, userToday: perUser[w.device_id] ?? 0 })) continue
      const row = {
        device_id: w.device_id, user_id: w.user_id ?? null, type: `watch_${kind}`, title, body,
        payload: { kind, listing_id: listing.id, link, watchlist_id: w.id, dedupe_key: `watch:${kind}:${listing.id}:${w.device_id}:${kstToday(now)}`, ...extra },
        scheduled_at: immediate ? null : nextBatchTime(now),
        sent_at: immediate ? now.toISOString() : null,
      }
      const { data, error } = await supabase.from('notifications').insert(row).select('id').single()
      if (error) continue
      await supabase.from('watch_notifications').insert({ watchlist_id: w.id, kind, notification_id: data?.id ?? null })
      perUser[w.device_id] = (perUser[w.device_id] ?? 0) + 1
      perListing[`${w.device_id}|${listing.id}`] = (perListing[`${w.device_id}|${listing.id}`] ?? 0) + 1
      created++
    }
    if (created) logEvent('watch_notif_sent', { kind, n: created, listingId: listing.id })
    return created
  } catch (_) { return 0 }
}

/** 양도인 저장 직후 — 가격·정보 변경을 배치 대기(예약)로 큐잉. 팔린 매물엔 안 보낸다 */
export async function queueChangeNotifications({ before, after }) {
  if (!before?.id || !after) return { price: 0, info: 0 }
  const merged = { ...before, ...after }
  const p = priceNotifCopy(priceDiff(before, merged))
  const i = infoNotifCopy(infoDiff(before, merged))
  const out = { price: 0, info: 0 }
  if (p) out.price = await notifyWatchers({ listing: merged, kind: 'price', title: p.title, body: p.body, link: `/e2/${before.id}`, immediate: false, extra: { down: p.down } })
  if (i) out.info = await notifyWatchers({ listing: merged, kind: 'info', title: i.title, link: `/e2/${before.id}`, immediate: false })
  return out
}

/** 매물 내려감(거래 완료·보류) — status 알림 + 비슷한 매물 있으면 링크 */
export async function notifyStatusChange(listing, status) {
  try {
    let similarLink = null
    if (listing?.address && listing?.category_main) {
      const { data } = await supabase.from('listings').select('id, status, address, category_main, transfer_fee')
        .eq('listing_type', 'seller').eq('status', 'published').eq('category_main', listing.category_main).limit(50)
      if ((data ?? []).some(c => isSimilar(listing, c))) {
        const q = new URLSearchParams({ dong: dongOf(listing.address) ?? '', cat: listing.category_main, fee: String(listing.transfer_fee ?? '') })
        similarLink = `/explore?${q.toString()}`
      }
    }
    const copy = statusNotifCopy(status, !!similarLink)
    if (!copy) return 0
    return await notifyWatchers({ listing, kind: 'status', title: copy.title, body: copy.body, link: similarLink, immediate: true, extra: { status } })
  } catch (_) { return 0 }
}

/** 같은 매물 찜 7일 내 5건 이상 → 전원에게 1회 */
async function maybeSendDensity(listing) {
  const since = new Date(Date.now() - WATCH.DENSITY_DAYS * 864e5).toISOString()
  const { count } = await supabase.from('watchlist').select('id', { count: 'exact', head: true }).eq('target_type', 'listing').eq('target_id', String(listing.id)).gte('created_at', since)
  const { data: sent } = await supabase.from('notifications').select('id').eq('type', 'watch_density').contains('payload', { listing_id: listing.id }).limit(1)
  if (!shouldSendDensity({ recentCount: count ?? 0, alreadySent: (sent ?? []).length > 0 })) return 0
  const copy = densityNotifCopy()
  return notifyWatchers({ listing, kind: 'density', title: copy.title, link: `/e2/${listing.id}`, immediate: true })
}

// ── 양도인 한마디 · 알리기 ───────────────────────────────────
export async function fetchOwnerMessageState(listingId) {
  try {
    const { data } = await supabase.from('listing_owner_messages').select('template_key, sent_at').eq('listing_id', listingId).order('sent_at', { ascending: false }).limit(20)
    const rows = data ?? []
    const lastMsgAt = rows.find(r => !String(r.template_key).startsWith('push_'))?.sent_at ?? null
    const lastPushAt = rows.find(r => String(r.template_key).startsWith('push_'))?.sent_at ?? null
    const { data: queued } = await supabase.from('notifications').select('id, type').contains('payload', { listing_id: listingId }).gt('scheduled_at', new Date().toISOString())
    return { lastMsgAt, lastPushAt, queued: queued ?? [], canMessage: ownerMsgAllowed(lastMsgAt), canPush: ownerPushAllowed(lastPushAt) && (queued ?? []).length > 0 }
  } catch (_) { return { lastMsgAt: null, lastPushAt: null, queued: [], canMessage: false, canPush: false } }
}

export async function sendOwnerMessage(listing, templateKey, slot = null) {
  const text = ownerTemplateText(templateKey, slot)
  if (!text) return { ok: false }
  try {
    const { error } = await supabase.from('listing_owner_messages').insert({ listing_id: listing.id, template_key: templateKey, payload: slot ? { slot } : null })
    if (error) return { ok: false }
    const copy = ownerMsgCopy(templateKey, slot)
    const n = await notifyWatchers({ listing, kind: 'owner_msg', title: copy.title, link: `/e2/${listing.id}`, immediate: true, extra: { template_key: templateKey } })
    logEvent('owner_msg_sent', { template_key: templateKey, listingId: listing.id, n })
    return { ok: true, n }
  } catch (_) { return { ok: false } }
}

/** [찜한 분들께 알리기] — 예약된 price/info 알림을 지금 발송 */
export async function pushQueuedNow(listing) {
  try {
    const st = await fetchOwnerMessageState(listing.id)
    if (!st.canPush) return { ok: false, n: 0 }
    const ids = st.queued.map(q => q.id)
    const { error } = await supabase.from('notifications').update({ scheduled_at: null, sent_at: new Date().toISOString() }).in('id', ids)
    if (error) return { ok: false, n: 0 }
    const kinds = [...new Set(st.queued.map(q => String(q.type).replace('watch_', '')))]
    await supabase.from('listing_owner_messages').insert({ listing_id: listing.id, template_key: `push_${kinds[0] ?? 'info'}`, payload: { kinds, n: ids.length } })
    for (const k of kinds) logEvent('owner_push_sent', { kind: k, listingId: listing.id })
    return { ok: true, n: ids.length }
  } catch (_) { return { ok: false, n: 0 } }
}

// ── A7 응답 시간 · 찜 후 문의 라벨 ──────────────────────────
/** 이 양도인(device)의 첫 답장까지 걸린 시간 목록(시간) */
export async function fetchResponseHours(ownerDeviceId) {
  try {
    const { data: convs } = await supabase.from('conversations').select('id, sender_id').eq('receiver_id', ownerDeviceId).limit(50)
    const ids = (convs ?? []).map(c => c.id)
    if (!ids.length) return []
    const { data: msgs } = await supabase.from('messages').select('conversation_id, sender_id, created_at').in('conversation_id', ids).order('created_at', { ascending: true })
    const first = {}, reply = {}
    for (const m of msgs ?? []) {
      if (!first[m.conversation_id] && m.sender_id !== ownerDeviceId) first[m.conversation_id] = m.created_at
      else if (first[m.conversation_id] && !reply[m.conversation_id] && m.sender_id === ownerDeviceId) reply[m.conversation_id] = m.created_at
    }
    return Object.keys(reply).map(id => (new Date(reply[id]) - new Date(first[id])) / 36e5)
  } catch (_) { return [] }
}

/** 문의함 라벨 — 대화 생성 전에 그 매물을 찜한 문의자면 true. { [conversation_id]: true } */
export async function watchedBeforeInquiry(conversations) {
  try {
    const convs = (conversations ?? []).filter(c => c.listing_id && c.sender_id)
    if (!convs.length) return {}
    const { data } = await supabase.from('watchlist').select('device_id, target_id, created_at').eq('target_type', 'listing')
      .in('target_id', [...new Set(convs.map(c => c.listing_id))]).in('device_id', [...new Set(convs.map(c => c.sender_id))])
    const out = {}
    for (const c of convs) {
      const hit = (data ?? []).some(w => w.device_id === c.sender_id && w.target_id === c.listing_id && (!c.created_at || new Date(w.created_at) <= new Date(c.created_at)))
      if (hit) out[c.id] = true
    }
    return out
  } catch (_) { return {} }
}

// ── A5 공통점 카드 숨김·프로필 조건 ─────────────────────────
export const getCommonHiddenOn = () => { try { return localStorage.getItem(COMMON_HIDE_KEY) } catch (_) { return null } }
export const hideCommonCard = () => { try { localStorage.setItem(COMMON_HIDE_KEY, kstToday()) } catch (_) {} }

/** [네] — 창업준비 조건 필드 채움 + 찜한 매물 동네를 area 찜으로 등록 */
export async function applyCommonConditions(cond, listings) {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') || {}
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...raw, prefIndustry: cond.industry ?? raw.prefIndustry ?? null, prefFeeMax: cond.feeMax ?? raw.prefFeeMax ?? null }))
    const dongs = [...new Set((listings ?? []).map(l => l.bjd_code || dongOf(l.address)).filter(Boolean))]
    for (const d of dongs) await addWatch({ type: 'area', id: d })
    return true
  } catch (_) { return false }
}

export { guOf }

/** 알림 항목 탭 — watch_notifications.clicked_at + 이벤트 (파트 A9) */
export async function markWatchNotifClicked(notificationId, kind) {
  try {
    logEvent('watch_notif_click', { kind })
    await supabase.from('watch_notifications').update({ clicked_at: new Date().toISOString() }).eq('notification_id', notificationId)
  } catch (_) {}
}
