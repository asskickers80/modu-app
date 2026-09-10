/**
 * 찜 양방향 신호 — 순수 룰 (ORDER 2026-09-10 파트 A). supabase 무의존, 테스트가 Node에서 직접 import.
 * 임계값·문안은 config/watch.ts 한 곳. 여기서는 계산과 문안 조립만.
 */
import { WATCH, TOAST, OWNER_TEMPLATES, NOTIF, STATUS_LABEL, PRICE_FIELDS } from '../../config/watch'
import { calcScore, listingToScoreInput } from './completeness'
import { kstToday, daysBetween } from './weekUtil'

const KST = 9 * 36e5
export const fmtMan = v => Number(v ?? 0).toLocaleString('ko-KR')
const num = v => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null }

/** A2 즉시 응답 토스트 */
export function watchToast(type, ordinal = null) {
  if (type === 'vendor') return TOAST.vendor
  if (type === 'area') return TOAST.area
  const n = Number(ordinal)
  return n >= WATCH.ORDINAL_MIN ? `${TOAST.listing} · ${TOAST.listingOrdinal.replace('{n}', String(n))}` : TOAST.listing
}

/** 권리금·보증금·월세 변경 목록 (인상도 포함) */
export function priceDiff(before, after) {
  const out = []
  for (const { field, label } of PRICE_FIELDS) {
    const a = num(before?.[field]), b = num(after?.[field])
    if (a === null || b === null || a === b) continue
    out.push({ field, label, from: a, to: b, down: b < a })
  }
  return out
}

/** 사진 추가 / 매출 인증 배지 / 완성도 10점 이상 상승 */
export function infoDiff(before, after) {
  const out = []
  const pb = (before?.image_urls ?? []).length, pa = (after?.image_urls ?? []).length
  if (pa > pb) out.push('사진')
  if (!before?.sales_proof && after?.sales_proof) out.push('매출 인증 배지')
  const sb = calcScore(listingToScoreInput(before ?? {})), sa = calcScore(listingToScoreInput(after ?? {}))
  if (sa - sb >= WATCH.INFO_SCORE_DELTA) out.push('새 정보')
  return out
}

export function priceNotifCopy(diffs) {
  if (!diffs?.length) return null
  const parts = diffs.map(d => `${d.label} ${fmtMan(d.from)}→${fmtMan(d.to)}만`)
  return { title: `${NOTIF.price} (${parts[0]})`, body: parts.length > 1 ? parts.join(' · ') : null, down: diffs.some(d => d.down) }
}
export function infoNotifCopy(labels) {
  if (!labels?.length) return null
  return { title: NOTIF.info.replace('{what}', labels.join('·')), body: null }
}
export function statusNotifCopy(status, hasSimilar = false) {
  const label = STATUS_LABEL[status]
  if (!label) return null
  return { title: NOTIF.status.replace('{status}', label), body: hasSimilar ? NOTIF.similarButton : null }
}
export const densityNotifCopy = () => ({ title: NOTIF.density, body: null })
export const similarNotifCopy = (n) => (n > 0 ? { title: NOTIF.similar.replace('{n}', String(n)), body: null } : null)
export function ownerMsgCopy(templateKey, slot = null) {
  const text = ownerTemplateText(templateKey, slot)
  return text ? { title: NOTIF.owner_msg.replace('{text}', text), body: null } : null
}
/** deal_result — 최종 권리금 공개 동의가 있을 때만 금액. 동의 없으면 null(= status 알림만) */
export function dealResultCopy({ consented = false, finalFee = null, listedFee = null } = {}) {
  if (!consented || finalFee == null || listedFee == null) return null
  return { title: NOTIF.deal_result.replace('{final}', fmtMan(finalFee)).replace('{listed}', fmtMan(listedFee)), body: null }
}

/** 양도인 한마디 템플릿 텍스트 — 자유 텍스트 불가, 키가 없으면 null */
export function ownerTemplateText(key, slot = null) {
  const t = OWNER_TEMPLATES.find(x => x.key === key)
  if (!t) return null
  if (t.slots) return t.slots.includes(slot) ? t.text.replace('{slot}', slot) : null
  return t.text
}

/** density: 7일 내 찜 수가 기준 이상이고 아직 보낸 적 없을 때만 1회 */
export const shouldSendDensity = ({ recentCount = 0, alreadySent = false }) =>
  !alreadySent && recentCount >= WATCH.DENSITY_MIN

/** 하루 상한 — 같은 매물 1건, 사용자당 3건 */
export const withinDailyCaps = ({ sameListingToday = 0, userToday = 0 }) =>
  sameListingToday < WATCH.PER_LISTING_PER_DAY && userToday < WATCH.PER_USER_PER_DAY

export const ownerMsgAllowed = (lastSentAt, now = new Date()) =>
  !lastSentAt || (now - new Date(lastSentAt)) / 864e5 >= WATCH.OWNER_MSG_COOLDOWN_DAYS
export const ownerPushAllowed = (lastPushAt, now = new Date()) =>
  !lastPushAt || (now - new Date(lastPushAt)) / 864e5 >= WATCH.OWNER_PUSH_COOLDOWN_DAYS

/** 다음 배치 발송 시각(KST 05:30) — price/info 는 배치 대기, [알리기]면 즉시 */
export function nextBatchTime(now = new Date()) {
  const kst = new Date(now.getTime() + KST)
  const t = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), WATCH.BATCH_HOUR_KST, WATCH.BATCH_MINUTE) - KST)
  if (t <= now) t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString()
}

/** 주소 → 동 토큰 (없으면 구) */
export function dongOf(address) {
  const tokens = String(address ?? '').trim().split(/\s+/)
  return tokens.find(t => /(동|읍|면|리|가)\d*$/.test(t)) ?? tokens.find(t => /(구|군|시)$/.test(t)) ?? null
}
export function guOf(address) {
  const tokens = String(address ?? '').trim().split(/\s+/)
  return tokens.find(t => /(구|군)$/.test(t)) ?? tokens[1] ?? null
}

/** 비슷한 매물: 같은 동·같은 업종·권리금 ±30% */
export function isSimilar(ref, cand) {
  if (!ref || !cand || cand.id === ref.id) return false
  if (!['published'].includes(cand.status)) return false
  const d = dongOf(ref.address); if (!d || !String(cand.address ?? '').includes(d)) return false
  if (!ref.category_main || cand.category_main !== ref.category_main) return false
  const a = num(ref.transfer_fee), b = num(cand.transfer_fee)
  if (a === null || b === null || a === 0) return false
  return Math.abs(b - a) / a <= WATCH.SIMILAR_FEE_RATIO
}

/** A5 찜한 매물의 공통점 — 업종 최빈값 · 권리금 상한(상위값). 3건 미만이면 null. 역 거리 데이터 없음 → 제외 */
export function commonConditions(listings) {
  const rows = (listings ?? []).filter(Boolean)
  if (rows.length < WATCH.COMMON_MIN) return null
  const freq = new Map()
  for (const l of rows) if (l.category_main) freq.set(l.category_main, (freq.get(l.category_main) ?? 0) + 1)
  const industry = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const fees = rows.map(l => num(l.transfer_fee)).filter(v => v !== null)
  const feeMax = fees.length ? Math.max(...fees) : null
  if (!industry && feeMax === null) return null
  const parts = [industry, feeMax !== null ? `권리금 ${fmtMan(feeMax)}만 이하` : null].filter(Boolean)
  return { industry, feeMax, line: `찜한 매물의 공통점: ${parts.join(' · ')} — 이 조건으로 새 매물 알림 받을까요?` }
}

/** A4 익명 요약 — 창업 준비 a명 · 이 동네 찾는 사람 b명 (n<3 이면 숫자만) */
export function watcherSummary(n, profiles = [], listingGu = null) {
  if (n < WATCH.SUMMARY_MIN) return null
  const a = profiles.filter(p => p?.category === 'startup' || p?.startupMode).length
  const b = listingGu ? profiles.filter(p => [p?.region_sub, p?.region].filter(Boolean).some(r => String(r).includes(listingGu) || listingGu.includes(String(r)))).length : 0
  if (!a && !b) return null
  return [a ? `창업 준비 ${a}명` : null, b ? `이 동네 찾는 사람 ${b}명` : null].filter(Boolean).join(' · ')
}

/** A7 응답 시간 중앙값(시간, 올림) — 이력 5건 미만이면 null */
export function medianResponseHours(hours) {
  const xs = (hours ?? []).filter(h => Number.isFinite(h) && h >= 0).sort((a, b) => a - b)
  if (xs.length < WATCH.RESPONSE_HISTORY_MIN) return null
  const mid = Math.floor(xs.length / 2)
  const med = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2
  return Math.max(1, Math.ceil(med))
}

/** A4 찜 10건+ 문의 0건 14일 → true */
export const noInquiryDespiteWatch = ({ watchers = 0, inquiries = 0, publishedAt = null, now = new Date() }) =>
  watchers >= WATCH.NO_INQUIRY_WATCH_MIN && inquiries === 0 && !!publishedAt &&
  daysBetween(kstToday(new Date(publishedAt)), kstToday(now)) >= WATCH.NO_INQUIRY_DAYS

export const isHiddenUntil = (hiddenOn, now = new Date()) =>
  !!hiddenOn && daysBetween(hiddenOn, kstToday(now)) < WATCH.COMMON_HIDE_DAYS
