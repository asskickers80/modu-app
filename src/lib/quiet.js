/**
 * quiet 공개 단계 — 데이터 계층 (ORDER 2026-09-12 파트 B). 판정·문안은 quietRules(순수).
 * 마스킹은 DB 뷰(listings_visible). 여기서는 등록 시 quiet 설정, 반응 카드 집계, 개별 공개, 공개 전환, 만료.
 */
import { supabase, getDeviceId } from './supabase'
import { logEvent } from './eventLog'
import { notifyWatchers } from './watchlist'
import { watcherSummary, guOf, dongOf } from './watchRules'
import { QUIET, QUIET_COPY } from '../../config/quiet'
import { maskDraft, quietDeadline, daysSince, compareAvg, compareLine, reactionLine } from './quietRules'
import { fetchWatcherStats } from './watchlist'

async function currentUserId() {
  try { const { data: { session } } = await supabase.auth.getSession(); return session?.user?.id ?? null } catch (_) { return null }
}

/** 등록 payload 에 quiet 필드 부여 — ai_draft 는 full 그대로, masked 는 룰 치환 */
export function quietPayload(payload, data) {
  const masked = maskDraft(payload.ai_draft, { shopName: data.shopName, jibun: data.jibunAddress, buildingName: data.buildingRegistry?.buildingName ?? data.daumBuildingName, brandName: data.franchiseBrandName, dong: dongOf(data.address) ?? '이 동네' })
  return { ...payload, visibility: 'quiet', quiet_started_at: new Date().toISOString(), quiet_deadline_at: quietDeadline(), ai_draft_masked: masked ?? {} }
}

/** 내 quiet 매물 수 — 등록 화면 카드 비활성 판정 */
export async function fetchMyQuietCount() {
  try {
    // GET 으로 센다(HEAD 아님) — 등록 화면의 '쓰기 0건' 검증과 충돌하지 않게
    const { data } = await supabase.from('listings').select('id').eq('device_id', getDeviceId()).eq('visibility', 'quiet').in('status', ['published', 'negotiating'])
    return Array.isArray(data) ? data.length : 0
  } catch (_) { return 0 }
}

/** 반응 카드 재료 — 조회·찜·문의 + 익명 요약 + 같은 동·업종 공개 매물 첫 14일 평균 찜(표본 3+) */
export async function fetchQuietReaction(listing) {
  try {
    const stats = await fetchWatcherStats(listing.id)
    const { count: q } = await supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('listing_id', listing.id)
    const d = daysSince(listing.quiet_started_at)
    const summary = watcherSummary(stats.n, stats.profiles, guOf(listing.address))
    let compare = null
    const dong = dongOf(listing.address)
    if (dong && listing.category_main) {
      const { data: peers } = await supabase.from('listings').select('id, published_at').eq('listing_type', listing.listing_type ?? 'seller').eq('visibility', 'public').eq('category_main', listing.category_main).ilike('address', `%${dong}%`).neq('id', listing.id).limit(50)
      const ids = (peers ?? []).filter(p => p.published_at).map(p => p.id)
      if (ids.length) {
        const { data: ws } = await supabase.from('watchlist').select('target_id, created_at').eq('target_type', 'listing').in('target_id', ids)
        const counts = ids.map(id => {
          const pub = new Date(peers.find(p => p.id === id).published_at).getTime()
          return (ws ?? []).filter(w => w.target_id === id && new Date(w.created_at).getTime() - pub <= QUIET.COMPARE_WINDOW_DAYS * 864e5).length
        })
        compare = compareLine(listing.category_main, compareAvg(counts))
      }
    }
    logEvent('quiet_reaction_view', { d, v: listing.views ?? 0, w: stats.n, q: q ?? 0, compared: !!compare })
    return { line: reactionLine({ d, v: listing.views ?? 0, w: stats.n, q: q ?? 0 }), summary, compare, w: stats.n, q: q ?? 0 }
  } catch (_) { return null }
}

/** [이 분께 공개] — 문의자(기기·계정)에게만 숨김 필드 열기 + 알림. 되돌리기 없음 */
export async function revealToInquirer(listing, conv) {
  try {
    const row = { listing_id: listing.id, revealed_to_device_id: conv.sender_id ?? null, via: 'inquiry' }
    const { error } = await supabase.from('listing_reveals').insert(row)
    if (error && !String(error.message).includes('duplicate')) return false
    await supabase.from('notifications').insert({ device_id: conv.sender_id, type: 'quiet_revealed', title: QUIET_COPY.revealed, payload: { link: `/e2/${listing.id}`, dedupe_key: `reveal:${listing.id}:${conv.sender_id}` }, sent_at: new Date().toISOString() })
    logEvent('quiet_reveal', { listingId: listing.id })
    return true
  } catch (_) { return false }
}
export async function fetchReveals(listingIds) {
  try {
    const { data } = await supabase.from('listing_reveals').select('listing_id, revealed_to_device_id').in('listing_id', listingIds)
    return data ?? []
  } catch (_) { return [] }
}

/** [공개로 바꾸기] — 빈 항목(상호·사진)만 채워서 public 전환. 찜한 사람 전원에게 info 알림(일일 한도 규칙 동일) */
export async function switchToPublic(listing, { shopName = null, imageUrls = null } = {}) {
  try {
    const patch = { visibility: 'public', published_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (shopName) patch.shop_name = shopName
    if (Array.isArray(imageUrls) && imageUrls.length) patch.image_urls = imageUrls
    const { error } = await supabase.from('listings').update(patch).eq('id', listing.id)
    if (error) return false
    const stats = await fetchWatcherStats(listing.id)
    const { count: q } = await supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('listing_id', listing.id)
    logEvent('quiet_to_public', { days: daysSince(listing.quiet_started_at), w: stats.n, q: q ?? 0, listingId: listing.id })
    await notifyWatchers({ listing, kind: 'info', title: QUIET_COPY.publicNotice, link: `/e2/${listing.id}`, immediate: true })
    return true
  } catch (_) { return false }
}
export { currentUserId }
