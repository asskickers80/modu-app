/**
 * '모두에 시세 물어보기' — 순수 룰 (ORDER 2026-09-11 파트 C). supabase 무의존.
 * 첨부·중복·배정 대상·정렬·라벨·응답 카드 문안. 정렬·발송 순서에 plan_tier·modu_vendor_id 를 쓰지 않는다(§1-1, 모두 자신에게도 적용).
 */
import { PRICE_INQUIRY, PRICE_INQUIRY_COPY, AREA_BAND_STEP, RENT_BAND_STEP, REQUEST_CHIPS } from '../../config/priceInquiry'
import { DEMAND } from '../../config/demandSignal'
import { distanceKm } from './nearbyBrokers'
import { dongOf, guOf } from './watchRules'

const num = v => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) && n > 0 ? n : null }

/** 10㎡ 단위 구간 "30~40㎡" / 50만 단위 "150~200만" */
export function areaBandOf(area) { const a = num(area); if (!a) return null; const lo = Math.floor(a / AREA_BAND_STEP) * AREA_BAND_STEP; return `${lo}~${lo + AREA_BAND_STEP}㎡` }
export function rentBandOf(rent) { const r = num(rent); if (!r) return null; const lo = Math.floor(r / RENT_BAND_STEP) * RENT_BAND_STEP; return `${lo}~${lo + RENT_BAND_STEP}만` }

/** 첨부 항목 목록 — 이름·연락처·매출 금액·정확한 주소는 아예 없다 */
export function attachmentItems({ industry, address, area, floor, monthlyRent }) {
  return [
    industry ? { key: 'industry', label: '업종', value: industry } : null,
    dongOf(address) ? { key: 'dong', label: '동', value: dongOf(address) } : null,
    areaBandOf(area) ? { key: 'area_band', label: '면적대', value: areaBandOf(area) } : null,
    floor ? { key: 'floor', label: '층', value: `${String(floor).replace(/층$/, '')}층` } : null,
    rentBandOf(monthlyRent) ? { key: 'rent_band', label: '월세대', value: rentBandOf(monthlyRent) } : null,
  ].filter(Boolean)
}
export const ATTACHMENT_FORBIDDEN_KEYS = ['name', 'phone', 'telephone', 'sales', 'revenue', 'address', 'email']

/** 전송용 attachment — 켜진 항목 + 요청 칩 + 시기 + (켰을 때만) 매출 구간 */
export function buildAttachment(items, enabled, { chips = [], timing = null, salesBand = null } = {}) {
  const out = { chips, timing }
  for (const it of items) if (enabled[it.key] !== false) out[it.key] = it.value
  if (salesBand) out.sales_band = salesBand
  for (const k of ATTACHMENT_FORBIDDEN_KEYS) delete out[k]
  return out
}

/** 같은 점포 판정용 해시 — 주소 문자열 정규화(공백·호실 제거) */
export function placeHashOf(address) {
  const t = String(address ?? '').replace(/\s+/g, '').replace(/\d+호$/, '').toLowerCase()
  let h = 0
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0
  return t ? `p${h.toString(36)}` : null
}

/** 30일 내 같은 점포·같은 요청 칩(하나라도 겹치면) → 중복. 만료된 신호는 제한 해제 */
export function isDuplicate(existing, { placeHash, chips, now = new Date() }) {
  const since = now.getTime() - PRICE_INQUIRY.dedupe_days * 864e5
  return (existing ?? []).some(s => s.place_hash === placeHash && s.status !== 'expired' &&
    new Date(s.created_at).getTime() >= since && (s.attachment?.chips ?? []).some(c => chips.includes(c)))
}

/** 배정 후보 — 카테고리별 반경 안. 0곳이면 반경 2배 재시도. 정렬 없음(전원 동시 발송) */
export function pickTargets(vendors, origin, { radius = DEMAND.radiusKm, retry = DEMAND.retryMultiplier } = {}) {
  const inRadius = (mult) => (vendors ?? []).filter(v => {
    if (!DEMAND.categories.includes(v.biz_category)) return false
    if (!origin || v.latitude == null || v.longitude == null) return false
    const d = distanceKm(origin, { lat: v.latitude, lng: v.longitude })
    return d != null && d <= (radius[v.biz_category] ?? 0) * mult
  })
  let list = inRadius(1)
  let widened = false
  if (!list.length) { list = inRadius(retry); widened = list.length > 0 }
  return { targets: list, widened, pending: list.length === 0 }
}

/** 응답 카드 정렬 — 응답 시각 오름차순만. plan_tier·modu_vendor_id 는 정렬 키가 아니다 (§1-1) */
export function sortResponses(targets) {
  return [...(targets ?? [])].filter(t => t.responded_at).sort((a, b) => new Date(a.responded_at) - new Date(b.responded_at))
}
export const visibleResponses = (sorted, max = PRICE_INQUIRY.max_cards) => ({ shown: sorted.slice(0, max), more: Math.max(0, sorted.length - max) })

/** 정직 라벨 — 법인이 켜지면 두 번째 템플릿 */
export const labelText = (enabled = PRICE_INQUIRY.modu_direct_enabled) =>
  PRICE_INQUIRY_COPY.label[enabled ? PRICE_INQUIRY.label_template[1] : PRICE_INQUIRY.label_template[0]]

/** 법인 기업회원 여부 → 원장 assignee_type (배정·정렬에는 쓰지 않는다 — 기록 분기만) */
export const assigneeTypeOf = (vendorId, cfg = PRICE_INQUIRY) =>
  cfg.modu_direct_enabled && cfg.modu_vendor_id && String(vendorId) === String(cfg.modu_vendor_id) ? 'modu' : 'vendor'

export function responseCardLine({ vendorName, avgHours = null, months = null }) {
  return PRICE_INQUIRY_COPY.responseCard.replace('{vendor}', vendorName)
    .replace(' · 평균 답장 {hours}시간', avgHours != null ? ` · 평균 답장 ${avgHours}시간` : '')
    .replace(' · 입점 {months}개월', months != null ? ` · 입점 ${months}개월` : '')
}
export function vendorReplyDefault({ vendorName, dong, industry, areaBand }) {
  return PRICE_INQUIRY_COPY.vendorReplyDefault.replace('{vendor}', vendorName).replace('{dong}', dong ?? '')
    .replace('{industry}', industry ?? '').replace('{areaBand}', areaBand ?? '').replace(/\s+/g, ' ').trim().slice(0, DEMAND.replyMaxChars)
}
export const chipLabel = key => REQUEST_CHIPS.find(c => c.key === key)?.label ?? key
export const feedbackDue = (openedAt, now = new Date()) => !!openedAt && (now - new Date(openedAt)) / 864e5 >= PRICE_INQUIRY.feedback_after_days
export const isExpired = (signal, now = new Date()) => !!signal?.expires_at && new Date(signal.expires_at) <= now && signal.status !== 'answered'
export { guOf }
