/**
 * 조건 완화 계산 (ORDER 2026-09-21 파트 A). 순수 룰 — 모델 호출 없음, supabase 무의존.
 * 한 번에 한 칸. 단일 완화가 전부 0건일 때만 두 칸 조합까지. 건수 0 후보는 만들지 않는다.
 */
import { RELAX, RELAX_PRIORITY, RELAX_LABEL, PRICE_LADDER, RENT_LADDER, DEPOSIT_LADDER, FLOOR_STEP } from '../../config/searchRelax'
import { matchesFilters, countMatches, activeFilterKeys } from './searchFilters'
import { INDUSTRY_CATEGORIES } from './categories'

const fmtMoney = v => (v == null ? RELAX_LABEL.noLimit : Number(v).toLocaleString('ko-KR'))
/** 두 칸 조합 라벨 — 앞 문장을 '…넓히고 …보면' 으로 잇는다 */
const connective = label => label.replace(/보면$/, '보고').replace(/넓히면$/, '넓히고').replace(/빼면$/, '빼고')
const nextLadder = (ladder, cur) => {
  const i = ladder.findIndex(v => v === cur)
  if (i < 0) { const bigger = ladder.filter(v => v === null || v > cur); return bigger.length ? bigger[0] : undefined }
  return i + 1 < ladder.length ? ladder[i + 1] : undefined
}
/** 소분류 → 같은 대분류(INDUSTRY-CATEGORY-MAP 단일 소스) */
export function mainOfSub(sub) {
  for (const main of INDUSTRY_CATEGORIES) if (main.subs.some(s => s.label === sub)) return main.label
  return null
}

/** 필터 하나를 한 칸 푼 결과 — 풀 수 없으면 null */
export function relaxOne(filters, key) {
  const f = { ...filters }
  switch (key) {
    case 'transferFee': case 'monthlyRent': case 'deposit': {
      const ladder = key === 'transferFee' ? PRICE_LADDER : key === 'monthlyRent' ? RENT_LADDER : DEPOSIT_LADDER
      if (filters[key] == null) return null
      const next = nextLadder(ladder, filters[key])
      if (next === undefined) return null
      f[key] = next
      return { key, filtersAfter: f, label: RELAX_LABEL[key].replace('{v}', fmtMoney(next)), before: fmtMoney(filters[key]), after: fmtMoney(next) }
    }
    case 'area': {
      if (!filters.area || filters.area === '전체 지역') return null
      f.area = '전체 지역'
      return { key, filtersAfter: f, label: RELAX_LABEL.area.replace('{v}', '전체 지역'), before: filters.area, after: '전체 지역' }
    }
    case 'type': {
      if (!filters.type || filters.type === '전체') return null
      f.type = '전체'
      return { key, filtersAfter: f, label: RELAX_LABEL.type.replace('{v}', filters.type), before: filters.type, after: '전체' }
    }
    case 'query': {
      if (!filters.query?.trim()) return null
      f.query = ''
      return { key, filtersAfter: f, label: RELAX_LABEL.query.replace('{v}', filters.query.trim()), before: filters.query.trim(), after: '검색어 없음' }
    }
    case 'floor': {
      const i = FLOOR_STEP.indexOf(filters.floor)
      if (i < 0 || i + 1 >= FLOOR_STEP.length) return null
      const next = FLOOR_STEP[i + 1]
      f.floor = next
      return { key, filtersAfter: f, label: RELAX_LABEL.floor.replace('{v}', next), before: filters.floor, after: next }
    }
    case 'areaSize': {
      const a = filters.areaSize
      if (!a || (a.min == null && a.max == null)) return null
      const pct = RELAX.AREA_STEP_PCT / 100
      const min = a.min == null ? null : Math.max(0, Math.round(a.min * (1 - pct)))
      const max = a.max == null ? null : Math.round(a.max * (1 + pct))
      f.areaSize = { min, max }
      return { key, filtersAfter: f, label: RELAX_LABEL.areaSize.replace('{min}', String(min ?? 0)).replace('{max}', String(max ?? '')), before: `${a.min ?? 0}~${a.max ?? ''}평`, after: `${min ?? 0}~${max ?? ''}평` }
    }
    case 'industry': {
      const sub = filters.industry?.sub
      if (!sub) return null
      const main = mainOfSub(sub) ?? filters.industry?.main
      if (!main) return null
      f.industry = { main, sub: null }
      return { key, filtersAfter: f, label: RELAX_LABEL.industry.replace('{v}', main), before: sub, after: main }
    }
    case 'check': {
      const list = filters.check ?? []
      if (!list.length) return null
      const dropped = list[0]
      f.check = list.slice(1)
      return { key, filtersAfter: f, label: RELAX_LABEL.check.replace('{v}', dropped), before: dropped, after: '해제' }
    }
    default: return null
  }
}

/**
 * @param filters 현재 탐색 필터
 * @param ctx { rows } — 카운트 대상(현재 탐색이 받아 둔 목록). count 함수를 주입하면 서버 카운트로 바꿀 수 있다
 * @returns RelaxOption[] — { key, label, filtersAfter, count, steps }
 */
export function relaxSearch(filters = {}, ctx = {}) {
  const rows = ctx.rows ?? []
  const count = ctx.count ?? (f => countMatches(rows, f))
  const active = activeFilterKeys(filters)
  if (!active.length) return []
  const ordered = RELAX_PRIORITY.filter(k => active.includes(k))

  // 1) 한 칸씩
  const singles = []
  for (const key of ordered) {
    const r = relaxOne(filters, key)
    if (!r) continue
    const n = count(r.filtersAfter)
    if (n >= RELAX.MIN_COUNT) singles.push({ ...r, count: n, steps: 1 })
  }
  if (singles.length) return singles.slice(0, RELAX.MAX_OPTIONS)

  // 2) 두 칸 조합 (서로 다른 필터 각각 한 칸). 세 칸 이상은 시도하지 않는다
  const pairs = []
  for (let i = 0; i < ordered.length; i++) {
    const a = relaxOne(filters, ordered[i])
    if (!a) continue
    for (let j = i + 1; j < ordered.length; j++) {
      const b = relaxOne(a.filtersAfter, ordered[j])
      if (!b) continue
      const n = count(b.filtersAfter)
      if (n < RELAX.MIN_COUNT) continue
      pairs.push({
        key: `${a.key}+${b.key}`, label: `${connective(a.label)} ${b.label}`,
        filtersAfter: b.filtersAfter, count: n, steps: 2,
        before: `${a.before} · ${b.before}`, after: `${a.after} · ${b.after}`,
      })
      if (pairs.length >= RELAX.MAX_OPTIONS) return pairs
    }
  }
  return pairs.slice(0, RELAX.MAX_OPTIONS)
}

export { matchesFilters, countMatches, activeFilterKeys }
