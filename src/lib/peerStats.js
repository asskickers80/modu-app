/**
 * 문의 동향 조회 계층 (ORDER-close-flow-peer-stats-v1 항목 4)
 * 계산 룰은 peerStatsRules(순수) — 여기는 조회·캐시·이벤트만.
 * 실패(컬럼·테이블 미비 포함)는 null — 카드가 조용히 안 보일 뿐 기존 기능 무영향.
 * 결과는 매물별 1시간 캐시(localStorage) — 홈·상세 왕복마다 재계산하지 않는다.
 */
import { supabase } from './supabase'
import { logEvent } from './eventLog'
import { computePeerStats, computeGaps, exampleSummary, shouldPromote, SAMPLE_MIN, PEER_WINDOW_DAYS } from './peerStatsRules'

const CACHE_MS = 36e5 // 1시간
const cacheKey = (id) => `modu_peer_stats_${id}`
const dismissKey = (id) => `modu_gap_dismissed_${id}`

/** [그대로 둘게요] 30일 숨김 */
export function dismissPeerCard(listingId) {
  try { localStorage.setItem(dismissKey(listingId), String(Date.now())) } catch (_) {}
}
export function isPeerCardDismissed(listingId) {
  try {
    const at = Number(localStorage.getItem(dismissKey(listingId)))
    return !!at && Date.now() - at < 30 * 864e5
  } catch (_) { return false }
}

/**
 * @returns { stats, gaps, example, promoted } | null (표본 부족·실패 = null, 대체 카드 금지)
 */
export async function fetchPeerStats(myListing, axis = 'seller') {
  if (!myListing?.id) return null
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(myListing.id)))
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.result
  } catch (_) {}

  let result = null
  try {
    const since = new Date(Date.now() - PEER_WINDOW_DAYS * 864e5).toISOString()
    let q = supabase.from('listings')
      .select('id, address, area, category_main, category_sub, deal_type, status, published_at, image_urls, monthly_sales')
      .not('status', 'in', '(example,draft)') // 초안은 게시 매물이 아니다 — 비교군 제외(D-2)
      .gte('published_at', since)
    // listing_type: seller가 컬럼 default(옛 행은 null 가능), landlord는 명시 저장
    q = axis === 'landlord'
      ? q.eq('listing_type', 'landlord')
      : q.or('listing_type.eq.seller,listing_type.is.null')
    const { data: listings, error } = await q
    if (error) return null

    const { data: convs } = await supabase.from('conversations').select('listing_id, created_at')
    const firstInquiryAt = new Map()
    for (const c of convs ?? []) {
      if (!c.listing_id || !c.created_at) continue
      const prev = firstInquiryAt.get(c.listing_id)
      if (!prev || c.created_at < prev) firstInquiryAt.set(c.listing_id, c.created_at)
    }

    const stats = computePeerStats({ my: myListing, listings: listings ?? [], firstInquiryAt, axis })
    if (!stats) {
      logEvent('peer_stats_null', { listingId: myListing.id, axis })
    } else {
      let soldBands = []
      if (axis === 'seller') {
        const { data: surveys } = await supabase.from('listing_close_surveys')
          .select('final_price_band').eq('close_reason', 'sold').not('final_price_band', 'is', null)
        soldBands = (surveys ?? []).map(s => s.final_price_band)
      }
      const { peers, ...summary } = stats
      result = {
        stats: summary,
        gaps: computeGaps({ my: myListing, peers, soldBands, axis }),
        example: exampleSummary({ peers, firstInquiryAt, axis }),
        promoted: shouldPromote(stats),
      }
      logEvent('peer_stats_shown', { listingId: myListing.id, axis, stage: summary.stage, M: summary.M, N: summary.avgDays })
    }
  } catch (_) { return null }

  try { localStorage.setItem(cacheKey(myListing.id), JSON.stringify({ at: Date.now(), result })) } catch (_) {}
  return result
}

export { SAMPLE_MIN }
