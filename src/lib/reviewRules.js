/**
 * 후기 — 순수 룰 (ORDER 2026-09-12 파트 A). supabase 무의존.
 * 원칙(A1): 매물에 대한 평가는 없다. 별점·점수·좋아요·추천 여부 없음 — 이 파일에 그런 필드가 생기면 안 된다.
 * 정렬은 최신순(created_at)만. 후기 수·plan_tier·visibility 는 정렬 키가 아니다(§1-1).
 */
import { REVIEWS, LISTING_CHIPS, VENDOR_CHIPS } from '../../config/reviews'

/** 프로필 축 → author_axis (사장님 축은 점포 소유 관점이라 owner 로 기록) */
export const axisOf = (category) => ({ startup: 'prep', landlord: 'owner', operating: 'owner', seller: 'seller', business: 'vendor' }[category] ?? 'prep')

/** 매물 후기 칩 검증 — '달랐어요'면 항목 칩 1개 이상 필수 */
export function validateListingChips(chips = {}) {
  const errors = []
  if (!LISTING_CHIPS.when.includes(chips.when)) errors.push('when')
  if (!Array.isArray(chips.seen) || !chips.seen.length || chips.seen.some(s => !LISTING_CHIPS.seen.includes(s))) errors.push('seen')
  if (!LISTING_CHIPS.match.includes(chips.match)) errors.push('match')
  if (chips.match === '달랐어요' && !(Array.isArray(chips.differs) && chips.differs.length && chips.differs.every(d => LISTING_CHIPS.differs.includes(d)))) errors.push('differs')
  return { ok: errors.length === 0, errors }
}
export function validateVendorChips(chips = {}) {
  const errors = []
  if (!VENDOR_CHIPS.what.includes(chips.what)) errors.push('what')
  if (!VENDOR_CHIPS.progress.includes(chips.progress)) errors.push('progress')
  return { ok: errors.length === 0, errors }
}
export const clampBody = (body) => String(body ?? '').trim().slice(0, REVIEWS.BODY_MAX) || null

/** 방문 시간대 칩 → visited_at 유도 (작성일 기준, 시각만 대표값) */
export function visitedAtFrom(whenChip, now = new Date()) {
  const hour = { '평일 점심': 12, '평일 저녁': 19, '주말 낮': 14, '주말 저녁': 19 }[whenChip]
  if (hour == null) return null
  const d = new Date(now); d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
export const canEdit = (createdAt, now = new Date()) => !!createdAt && (now - new Date(createdAt)) / 36e5 <= REVIEWS.EDIT_HOURS

/** 노출 후기 — 삭제·블라인드 제외, 최신순. 집계는 length 뿐(평균·요약 없음) */
export function visibleReviews(rows, now = new Date()) {
  return (rows ?? [])
    .filter(r => !r.deleted_at && (!r.blinded_until || new Date(r.blinded_until) <= now))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}
export const isBlinded = (r, now = new Date()) => !!r?.blinded_until && new Date(r.blinded_until) > now

/** 매물이 내려갔으면(거래 완료·보류·삭제) 후기 섹션 비노출 */
export const listingReviewable = (listing) => !!listing && ['published', 'negotiating'].includes(listing.status)

/** 한 매물에서 7일 내 삭제 3건 이상 → 운영 알림 */
export function massDeleteAlert(deletedRows, now = new Date()) {
  const since = now.getTime() - REVIEWS.MASS_DELETE_ALERT.days * 864e5
  return (deletedRows ?? []).filter(r => r.deleted_at && new Date(r.deleted_at).getTime() >= since).length >= REVIEWS.MASS_DELETE_ALERT.count
}
/** 같은 작성자가 30일 안에 3곳 이상 업체 후기 → 운영 알림 */
export function repeatVendorAlert(authorVendorReviews, now = new Date()) {
  const since = now.getTime() - REVIEWS.REPEAT_ALERT.days * 864e5
  const vendors = new Set((authorVendorReviews ?? []).filter(r => new Date(r.created_at).getTime() >= since).map(r => r.target_id))
  return vendors.size >= REVIEWS.REPEAT_ALERT.vendors
}
export const blindUntil = (now = new Date()) => new Date(now.getTime() + REVIEWS.BLIND_DAYS * 864e5).toISOString()
/** 미판정 이의신청이 블라인드 기간을 넘기면 자동 복구(keep) 대상 */
export const autoRestoreDue = (review, now = new Date()) => !!review?.blinded_until && new Date(review.blinded_until) <= now && !review.deleted_at
