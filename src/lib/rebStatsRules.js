/**
 * 부동산원 비교선 — 순수 룰 (ORDER 2026-09-11 파트 A). supabase 무의존.
 * 문안은 config/rebStats.ts, 상권 매핑은 config/rebDistricts.ts. 판단 문구 없음.
 */
import { REB, STORE_TYPE_LABEL, REB_COPY, COMPARE_BUCKETS } from '../../config/rebStats'
import { REB_DISTRICTS } from '../../config/rebDistricts'

const num = v => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null }
export const fmt = v => Number(v).toLocaleString('ko-KR')

/** Date → 'YYYYQn' (KST) */
export function quarterOf(d = new Date()) {
  const k = new Date(new Date(d).getTime() + 9 * 36e5)
  return `${k.getUTCFullYear()}Q${Math.floor(k.getUTCMonth() / 3) + 1}`
}
export function prevQuarterOf(q) {
  const [y, n] = [Number(q.slice(0, 4)), Number(q.slice(5))]
  return n === 1 ? `${y - 1}Q4` : `${y}Q${n - 1}`
}
export const quarterLabel = q => ({ yyyy: q.slice(0, 4), q: q.slice(5) })

/** 법정동 코드 앞 5자리 = 시군구 코드 */
export const sigunguCodeOf = bjd => (bjd && /^\d{10}$/.test(String(bjd)) ? String(bjd).slice(0, 5) : null)
/** 행정동/법정동 코드 → 부동산원 상권명 (매핑 없으면 null → 시군구 폴백) */
export const districtNameOf = code => (code ? REB_DISTRICTS[String(code)] ?? null : null)
/** 집합건물이면 aggregate, 아니면 config 기본값 */
export const storeTypeOf = listing => {
  const kind = listing?.autofill?.registry_kind ?? listing?.buildingRegistry?.kind ?? null
  return kind === 'exclusive' ? 'aggregate' : REB.DEFAULT_STORE_TYPE
}

/**
 * 후보 행 중 1개 선택 — 상권(district) 행 우선, 없으면 시군구. 최신 분기.
 * @returns { level, region_name, store_type, quarter, vacancy_rate, rent_per_m2 } | null
 */
export function pickStat(rows, { sigunguCode = null, districtName = null, storeType = REB.DEFAULT_STORE_TYPE } = {}) {
  const list = (rows ?? []).filter(r => r.store_type === storeType)
  const byQ = (a, b) => String(b.quarter).localeCompare(String(a.quarter))
  const district = districtName ? list.filter(r => r.region_level === 'district' && r.region_name === districtName).sort(byQ)[0] : null
  const sigungu = sigunguCode ? list.filter(r => r.region_level === 'sigungu' && r.region_code === sigunguCode).sort(byQ)[0] : null
  const r = district ?? sigungu ?? null
  if (!r) return null
  if (r.vacancy_rate == null && r.rent_per_m2 == null) return null
  return { level: r.region_level, region_name: r.region_name, store_type: r.store_type, quarter: r.quarter, vacancy_rate: r.vacancy_rate, rent_per_m2: r.rent_per_m2 }
}

/** 월세(만원)·전용면적(㎡) → ㎡당 임대료(원). 둘 중 하나라도 없으면 null */
export function rentPerM2(monthlyRentManwon, areaM2) {
  const rent = num(monthlyRentManwon), area = num(areaM2)
  if (!rent || !area || area <= 0) return null
  return Math.round(rent * 10000 / area)
}
export const comparePct = (mine, avg) => (mine && avg ? Math.round((mine / avg - 1) * 100) : null)
export const fmtSign = p => (p > 0 ? `+${p}` : String(p))
export const compareBucket = p => COMPARE_BUCKETS.find(b => p < b.max)?.key ?? 'over_20'

/**
 * 카드 문안 최대 2줄. 값이 null 이면 그 값을 빼고, 둘 다 null 이면 null(카드 없음).
 * @param mine { monthlyRent, area, label:'owner'|'listing' }
 */
export function cardLines(stat, mine = {}) {
  if (!stat) return null
  const facts = [
    stat.vacancy_rate != null ? REB_COPY.factVacancy.replace('{v}', fmt(stat.vacancy_rate)) : null,
    stat.rent_per_m2 != null ? REB_COPY.factRent.replace('{r}', fmt(stat.rent_per_m2)) : null,
  ].filter(Boolean)
  if (!facts.length) return null
  const { yyyy, q } = quarterLabel(stat.quarter)
  const line1 = REB_COPY.line1.replace('{region}', stat.region_name).replace('{type}', STORE_TYPE_LABEL[stat.store_type] ?? stat.store_type)
    .replace('{facts}', facts.join(' · ')).replace('{yyyy}', yyyy).replace('{q}', q)
  let line2 = null, pct = null, mineValue = null
  if (stat.rent_per_m2 != null) {
    mineValue = rentPerM2(mine.monthlyRent, mine.area)
    if (mineValue) {
      pct = comparePct(mineValue, stat.rent_per_m2)
      const tpl = mine.label === 'listing' ? REB_COPY.mineListing : REB_COPY.mineOwner
      line2 = tpl.replace('{mine}', fmt(mineValue)).replace('{p}', fmtSign(pct))
    }
  }
  return { line1, line2, pct, mineValue, note: REB_COPY.note }
}

/** 소개글 프롬프트 재료 — 값이 null 이면 그 문장을 만들지 않는다 */
export function rebFacts(stat) {
  if (!stat) return null
  const { yyyy, q } = quarterLabel(stat.quarter)
  const src = `한국부동산원 ${yyyy}년 ${q}분기 기준`
  const lines = []
  if (stat.vacancy_rate != null) lines.push(`${stat.region_name} ${STORE_TYPE_LABEL[stat.store_type]} 공실률 ${fmt(stat.vacancy_rate)}% (${src})`)
  if (stat.rent_per_m2 != null) lines.push(`${stat.region_name} ${STORE_TYPE_LABEL[stat.store_type]} 임대료 ㎡당 ${fmt(stat.rent_per_m2)}원 (${src})`)
  return lines.length ? lines.join('\n') : null
}

/**
 * 정직 검증 — 통계를 언급한 문장의 숫자가 입력값과 다르면 그 문장을 제거한다.
 * 부동산원·공실률·㎡당 이 들어간 문장만 검사. 허용 숫자: 공실률·임대료·연도·분기.
 */
export function verifyStatNumbers(text, stat) {
  if (!text || typeof text !== 'string') return text
  if (!stat) return text.split(/(?<=[.!?])\s+/).filter(s => !/한국부동산원/.test(s)).join(' ')
  const { yyyy, q } = quarterLabel(stat.quarter)
  const allowed = new Set([String(yyyy), String(q), String(Number(yyyy))])
  if (stat.vacancy_rate != null) { allowed.add(String(stat.vacancy_rate)); allowed.add(fmt(stat.vacancy_rate)) }
  if (stat.rent_per_m2 != null) { allowed.add(String(stat.rent_per_m2)); allowed.add(fmt(stat.rent_per_m2)) }
  return text.split(/(?<=[.!?])\s+/).filter(s => {
    if (!/한국부동산원|공실률|㎡당/.test(s)) return true
    const nums = s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []
    return nums.every(n => allowed.has(n) || allowed.has(n.replace(/,/g, '')))
  }).join(' ')
}

/** 초안 객체(문자열 필드)에 검증 적용 */
export function verifyDraftStats(draft, stat) {
  if (!draft || typeof draft !== 'object') return draft
  const out = Array.isArray(draft) ? [] : {}
  for (const [k, v] of Object.entries(draft)) out[k] = typeof v === 'string' ? verifyStatNumbers(v, stat) : (v && typeof v === 'object' ? verifyDraftStats(v, stat) : v)
  return out
}
