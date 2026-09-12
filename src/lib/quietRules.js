/**
 * quiet 공개 단계 — 순수 룰 (ORDER 2026-09-12 파트 B). supabase 무의존.
 * 마스킹 자체는 DB 뷰(listings_visible)가 한다. 여기서는 소개글 룰 치환·기간·비교·문안만.
 * visibility 는 정렬 키로 쓰지 않는다(§1-1).
 */
import { QUIET, PROS_LINES, PROS_LINES_OWNER_FIRST, CONS_LINES, QUIET_COPY } from '../../config/quiet'
import { fmt } from './rebStatsRules'

/** 숨김 값 문자열들 → "이 매물"/"이 동네" 치환, 치환 후에도 남으면 그 문장 제거. AI 재호출 없음 */
export function maskDraft(draft, { shopName = '', jibun = '', buildingName = '', brandName = '', dong = '이 동네' } = {}) {
  const secrets = [shopName, jibun, buildingName, brandName].map(s => String(s ?? '').trim()).filter(s => s.length >= 2)
  const maskText = (text) => {
    let t = String(text ?? '')
    for (const s of secrets) t = t.split(s).join(s === jibun ? dong : '이 매물')
    // 지번·번지 패턴 잔존(예: 395-1) 제거 — 문장 단위
    return t.split(/(?<=[.!?])\s+/).filter(sent => !/\d+-\d+\b/.test(sent) && !secrets.some(s => sent.includes(s))).join(' ').trim()
  }
  const walk = (v) => Array.isArray(v) ? v.map(walk) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : (typeof v === 'string' ? maskText(v) : v)
  return draft ? walk(draft) : draft
}
/** masked 소개글에 숨김 문자열이 남아 있으면 true(테스트 실패 조건) */
export function containsSecret(draft, secrets = []) {
  const text = JSON.stringify(draft ?? {})
  return secrets.filter(s => String(s ?? '').trim().length >= 2).some(s => text.includes(s))
}

export const canStartQuiet = (myListings = []) => (myListings ?? []).filter(l => l.visibility === 'quiet' && ['published', 'negotiating'].includes(l.status)).length < QUIET.MAX_QUIET_PER_USER
export const quietDeadline = (now = new Date()) => new Date(now.getTime() + QUIET.QUIET_DAYS * 864e5).toISOString()
export const prosLines = (axis = 'seller') => axis === 'landlord' ? [PROS_LINES_OWNER_FIRST, ...PROS_LINES.slice(1)] : PROS_LINES
export const consLines = () => CONS_LINES.map(l => l.replace('{QUIET_DAYS}', String(QUIET.QUIET_DAYS)))
export const labelFor = (axis = 'seller') => axis === 'landlord' ? QUIET_COPY.labelOwner : QUIET_COPY.labelSeller

export const daysSince = (iso, now = new Date()) => (iso ? Math.max(0, Math.floor((now - new Date(iso)) / 864e5)) : 0)
export const daysLeft = (deadlineIso, now = new Date()) => (deadlineIso ? Math.ceil((new Date(deadlineIso) - now) / 864e5) : null)
/** 남은 기간 알림 대상 일수(7·1) — 정확히 그 날에만 */
export const reminderDue = (deadlineIso, now = new Date()) => { const d = daysLeft(deadlineIso, now); return QUIET.REMIND_DAYS.includes(d) ? d : null }
export const isExpired = (listing, now = new Date()) => listing?.visibility === 'quiet' && !!listing.quiet_deadline_at && new Date(listing.quiet_deadline_at) <= now

export function reactionLine({ d, v, w, q }) {
  return QUIET_COPY.reaction.replace('{d}', String(d)).replace('{v}', fmt(v)).replace('{w}', fmt(w)).replace('{q}', fmt(q))
}
/** 같은 동·업종 공개 매물의 첫 N일 평균 찜 — 표본 미만이면 null (숫자 숨김) */
export function compareAvg(peerWatchCounts = [], min = QUIET.COMPARE_MIN_SAMPLE) {
  const xs = (peerWatchCounts ?? []).filter(n => Number.isFinite(n))
  if (xs.length < min) return null
  return Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10
}
export const compareLine = (industry, avg) => avg == null ? null : QUIET_COPY.compare.replace('{industry}', industry ?? '').replace('{days}', String(QUIET.COMPARE_WINDOW_DAYS)).replace('{avg}', String(avg))

/** 업종 대분류 → 목록 카드 아이콘 (스톡 이미지 금지) */
export const industryIcon = (main) => ({ '요식업': '🍽️', '카페·베이커리': '☕', '주점': '🍺', '도소매·판매': '🛍️', '미용·뷰티': '💇', '오락·레저': '🎳', '교육·서비스': '📚', '숙박·사무·기타': '🏢' }[main] ?? '🏪')
