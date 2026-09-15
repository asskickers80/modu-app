/**
 * 모두에 질문하기 — 순수 룰 (ORDER 2026-09-13 파트 A3·A4·A5). supabase·네트워크 무의존.
 * 예시 후보 생성·선별·회전 / 질문 라우팅(①데이터 ②주인 ③시세) / 답변 조립·검증 / 축 분류.
 * 정렬·노출 어디에도 plan_tier 는 없다(§1-1). 답변 재료는 A4 화이트리스트뿐이다.
 */
import { TEMPLATES, AXIS_LISTING_FIELDS, PRICE_ROUTE_WORDS, OWNER_ONLY_WORDS, DATA_KEYWORDS, AXIS_KEYWORDS, ASK, ASK_FORBIDDEN } from '../../config/listingAsk'

/** 사용자가 확정한 필드만 재료로 쓴다 — listing_field_sources.status === 'auto' 는 제외 (A4) */
export function confirmedFields(fieldSources = {}) {
  const out = {}
  for (const [k, v] of Object.entries(fieldSources ?? {})) if (v?.status && v.status !== 'auto') out[k] = v
  return out
}
export const isAutoField = (fieldSources, field) => (fieldSources ?? {})[field]?.status === 'auto'

/** 매물 + 조회 결과 → 답변 재료(화이트리스트). 값이 없는 키는 아예 넣지 않는다 */
export function askContext(listing = {}, extra = {}) {
  const ctx = {}
  const put = (k, v) => { if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)) ctx[k] = v }
  const auto = extra.fieldSources ?? {}
  const own = (field, value) => (isAutoField(auto, field) ? null : value)
  put('sbiz_radius', extra.sbizRadius); put('sbiz_mix', extra.sbizMix)
  put('reb_vacancy', extra.rebVacancy); put('reb_rent', extra.rebRent)
  put('station_distance', extra.stationDistance); put('road_face', extra.roadFace)
  put('building_year', own('buildingYear', extra.buildingYear ?? listing.use_approval_date?.slice(0, 4)))
  put('floor', own('floor', listing.floor)); put('area', own('area', listing.area))
  put('monthly_rent', listing.monthly_rent)
  put('checked_at', listing.last_checked_at ?? listing.updated_at)
  put('transfer_reason', listing.rights_info?.transfer_reason ?? listing.transfer_reason)
  put('industry', listing.category_main ?? listing.biz_type); put('gu', extra.gu); put('station', extra.station)
  return ctx
}

const SLOT = { '{업종}': 'industry', '{구}': 'gu', '{역}': 'station' }
export function fillSlots(text, ctx = {}) {
  let out = text
  for (const [slot, key] of Object.entries(SLOT)) if (out.includes(slot)) out = out.replace(slot, ctx[key] ?? '')
  return out.replace(/\s+/g, ' ').trim()
}
const hasSlotValue = (text, ctx) => Object.entries(SLOT).every(([slot, key]) => !text.includes(slot) || !!ctx[key])

/** 등록 필드에 이미 값이 있는 축의 ② 템플릿은 후보에서 제외. 값이 있으면 data 로 승격되는 축 무관 2종은 별도 */
export function axisAnswered(listing = {}, axis) {
  const fields = AXIS_LISTING_FIELDS[axis] ?? []
  return fields.some(f => {
    const v = listing[f] ?? listing.rights_info?.[f]
    return Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== ''
  })
}

/** 1단계 후보 — requires 충족 + 슬롯 값 존재 + 이미 등록된 축 제외 */
export function candidates(listing = {}, ctx = {}) {
  return TEMPLATES
    .filter(t => t.requires.every(r => ctx[r] !== undefined))
    .filter(t => !(t.branch === 'owner' && axisAnswered(listing, t.axis)))
    .filter(t => hasSlotValue(t.text, ctx))
    .map(t => ({ ...t, text: fillSlots(t.text, ctx) }))
}

const shuffle = (arr, seed = 1) => {
  const a = [...arr]; let s = Math.abs(Math.trunc(seed)) || 1
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2147483648; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/**
 * 2단계 선별 — 같은 축 2개 이상 금지, ① 최소 2개, ② 최소 1개. 규칙은 코드로 강제한다(모델 선별 결과도 이 함수를 통과해야 한다).
 * @returns 3~4개 (부족하면 가능한 만큼)
 */
export function selectExamples(cands = [], seed = 1) {
  const pool = shuffle(cands, seed)
  const picked = []; const usedAxis = new Set()
  const take = pred => { for (const c of pool) { if (picked.includes(c) || usedAxis.has(c.axis) || !pred(c)) continue; picked.push(c); usedAxis.add(c.axis); return true } return false }
  take(c => c.branch === 'data'); take(c => c.branch === 'data')   // ① 2개 먼저
  take(c => c.branch === 'owner')                                   // ② 1개
  if (picked.length < ASK.EXAMPLES_MAX) take(() => true)
  return picked.slice(0, ASK.EXAMPLES_MAX)
}
export function examplesValid(list = []) {
  const axes = list.map(x => x.axis)
  if (new Set(axes).size !== axes.length) return false
  if (list.filter(x => x.branch === 'data').length < ASK.MIN_DATA_EXAMPLES) return false
  if (list.filter(x => x.branch === 'owner').length < ASK.MIN_OWNER_EXAMPLES) return false
  return list.length >= ASK.EXAMPLES_MIN && list.length <= ASK.EXAMPLES_MAX
}
/** 3단계 회전 — 세션 seed 로 순환. 같은 사용자가 다시 봐도 같은 순서가 아니다 */
export const rotateExamples = (list = [], seed = 1) => shuffle(list, seed)

export const FALLBACK_EXAMPLES = [
  { key: 'fb_hours', axis: 'hours', branch: 'owner', text: '몇 시부터 몇 시까지 하세요?' },
  { key: 'fb_facility', axis: 'facility', branch: 'owner', text: '집기·시설은 그대로 넘기시는 거예요?' },
  { key: 'fb_contract', axis: 'contract', branch: 'owner', text: '계약 기간은 얼마나 남았어요?' },
]

const norm = s => String(s ?? '').toLowerCase().replace(/[\s?!.,~]/g, '')
export const questionHash = text => { const t = norm(text); let h = 5381; for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return `q${h.toString(36)}` }
export const clampQuestion = text => String(text ?? '').trim().slice(0, ASK.QUESTION_MAX)

export function classifyAxis(text) {
  const t = norm(text)
  for (const [axis, words] of Object.entries(AXIS_KEYWORDS)) if (words.some(w => t.includes(norm(w)))) return axis
  return 'other'
}
export const isPriceQuestion = text => { const t = norm(text); return PRICE_ROUTE_WORDS.some(w => t.includes(norm(w))) }

/** 질문 → 화이트리스트 필드 매칭 */
export function matchedFields(text, ctx = {}) {
  const t = norm(text)
  return Object.entries(DATA_KEYWORDS)
    .filter(([field, words]) => ctx[field] !== undefined && words.some(w => t.includes(norm(w))))
    .map(([field]) => field)
}

/**
 * A4 라우팅 — ③ 우선, 그다음 ①, 나머지는 ②.
 * @returns { branch:'price'|'data'|'owner', axis, fields:string[] }
 */
export const isOwnerOnlyQuestion = text => { const t = norm(text); return OWNER_ONLY_WORDS.some(w => t.includes(norm(w))) }

export function routeListingQuestion(targetType, targetId, text, ctx = {}) {
  const axis = classifyAxis(text)
  if (isPriceQuestion(text)) return { branch: 'price', axis: 'price', fields: [] }
  // 등록 경과일·가격 이력은 데이터로 답하지 않는다 — 주인에게 묻는다 (판매자 우선, 2026-09-15)
  if (isOwnerOnlyQuestion(text)) return { branch: 'owner', axis: axis === 'price' ? 'other' : axis, fields: [] }
  const fields = matchedFields(text, ctx)
  if (fields.length) return { branch: 'data', axis: axis === 'other' || axis === 'price' ? 'area' : axis, fields }
  return { branch: 'owner', axis, fields: [] }
}
export const intentOf = route => (route.branch === 'owner' ? 'owner_only' : route.fields?.length > 1 ? 'compare' : 'fact')

/** A5 — 금지 표현이 섞인 문장만 폐기. 남은 문장이 없으면 null (→ ② 로) */
export function sanitizeAnswer(text) {
  const kept = String(text ?? '').split(/(?<=[.!?…])\s+|\n+/).map(s => s.trim()).filter(s => s && !ASK_FORBIDDEN.test(s))
  const out = kept.join(' ').trim()
  return out || null
}
export const droppedSentences = text => String(text ?? '').split(/(?<=[.!?…])\s+|\n+/).map(s => s.trim()).filter(s => s && ASK_FORBIDDEN.test(s))

/** 화이트리스트 필드 → 답변 문장·근거 줄 (룰 조립. 무료 등급에서도 이 경로로 답한다) */
export function buildAnswer(fields = [], ctx = {}, basisAt = null) {
  const lines = []
  for (const f of fields) {
    const v = ctx[f]
    if (v === undefined) continue
    if (f === 'sbiz_radius') lines.push(`반경 300m 안에 ${ctx.industry ?? '같은 업종'}이 ${v}곳 있어요.`)
    if (f === 'sbiz_mix') lines.push(`이 근처에 가장 많은 업종은 ${Array.isArray(v) ? v.slice(0, 3).join(' · ') : v}예요.`)
    if (f === 'reb_vacancy') lines.push(`${ctx.gu ?? '이 지역'} 소규모 상가 공실률은 ${v}%예요.`)
    if (f === 'reb_rent') lines.push(`주변 소규모 상가 임대료는 ㎡당 ${Number(v).toLocaleString('ko-KR')}원이에요.`)
    if (f === 'station_distance') lines.push(`${ctx.station ?? '가까운 역'}에서 걸어서 ${v}분 거리예요.`)
    if (f === 'road_face') lines.push(`도로 접면은 ${v}예요.`)
    if (f === 'building_year') lines.push(`건물 사용승인은 ${v}년이에요.`)
    if (f === 'floor') lines.push(`${v}층이에요.`)
    if (f === 'area') lines.push(`전용면적은 ${v}㎡예요.`)
    if (f === 'checked_at') { const d = new Date(v); lines.push(`${d.getMonth() + 1}월 ${d.getDate()}일에 확인됐어요.`) }
    if (f === 'transfer_reason') lines.push(`양도 사유는 "${v}"로 적혀 있어요.`)
  }
  if (!lines.length) return null
  return { text: lines.join(' '), fields, basis: basisLine(fields, basisAt) }
}
export function basisLine(fields = [], at = null) {
  const src = []
  if (fields.some(f => f.startsWith('reb_'))) src.push('한국부동산원 공식 통계')
  if (fields.some(f => f.startsWith('sbiz_'))) src.push('소상공인시장진흥공단 상가업소 정보')
  if (fields.some(f => ['building_year'].includes(f))) src.push('건축물대장')
  if (fields.some(f => ['floor', 'area', 'transfer_reason'].includes(f))) src.push('양도인이 적은 값')
  if (fields.some(f => ['station_distance', 'road_face', 'checked_at'].includes(f))) src.push('모두가 본 것')
  const day = at ? new Date(at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  return `${[...new Set(src)].join(' · ') || '모두가 본 것'} (기준일 ${day})`
}

/** 이어질 만한 질문 2개 — 방금 쓴 축은 빼고 후보에서 */
export function followups(cands = [], usedAxis, n = ASK.FOLLOWUPS) {
  return cands.filter(c => c.axis !== usedAxis).slice(0, n)
}

export const quotaLeft = (usedToday = 0) => Math.max(0, ASK.DAILY_LIMIT_PER_LISTING - usedToday)
export const quotaBlocked = (usedToday = 0) => usedToday >= ASK.DAILY_LIMIT_PER_LISTING

/** 매물 필드 해시 — 값이 바뀌면 예시 캐시를 버린다 */
export function sourceFieldsHash(listing = {}, ctx = {}) {
  const key = JSON.stringify([listing.id, listing.category_main, listing.floor, listing.area, listing.monthly_rent, listing.address, Object.keys(ctx).sort()])
  let h = 5381; for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0
  return `h${h.toString(36)}`
}
