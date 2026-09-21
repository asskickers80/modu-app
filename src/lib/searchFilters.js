/**
 * 탐색 필터 판정 — 화면(ExplorePage)과 조건 완화 계산(searchRelax)이 같은 함수를 쓴다 (2026-09-21).
 * 두 곳이 따로 거르면 "칩에는 3건인데 눌러 보니 1건" 같은 거짓말이 생긴다.
 *
 * 현재 화면에 있는 필터: query(검색어) · type(양도 방식 라벨) · area(지역 문자열).
 * 아래 나머지 키(transferFee·monthlyRent·deposit·floor·areaSize·industry·check)는 필터가 생기면 그대로 동작한다.
 */
const num = v => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null }
const M2_PER_PYEONG = 3.3058

export const TRANSFER_LABEL = { full: '영업양도', empty: '바닥권리' }

/** 한 건이 필터를 통과하는가 */
export function matchesFilters(l, f = {}) {
  if (!l) return false
  if (f.query?.trim()) {
    const q = f.query.trim().toLowerCase()
    if (!((l.shop_name ?? '').toLowerCase().includes(q) || (l.address ?? '').toLowerCase().includes(q))) return false
  }
  if (f.type && f.type !== '전체' && TRANSFER_LABEL[l.transfer_type] !== f.type) return false
  if (f.area && f.area !== '전체 지역' && !(l.address ?? '').includes(f.area)) return false
  if (f.transferFee != null && !(num(l.transfer_fee) !== null && num(l.transfer_fee) <= f.transferFee)) return false
  if (f.monthlyRent != null && !(num(l.monthly_rent) !== null && num(l.monthly_rent) <= f.monthlyRent)) return false
  if (f.deposit != null && !(num(l.deposit) !== null && num(l.deposit) <= f.deposit)) return false
  if (f.floor) {
    const fl = String(l.floor ?? '')
    if (f.floor === '1층만' && !/^1/.test(fl)) return false
    if (f.floor === '1층·지하1층·2층' && !/^(1|2|b1|지하\s*1|-1)/i.test(fl)) return false
  }
  if (f.areaSize?.min != null || f.areaSize?.max != null) {
    const py = num(l.area) === null ? null : num(l.area) / M2_PER_PYEONG
    if (py === null) return false
    if (f.areaSize.min != null && py < f.areaSize.min) return false
    if (f.areaSize.max != null && py > f.areaSize.max) return false
  }
  if (f.industry?.sub && l.category_sub !== f.industry.sub) return false
  if (f.industry?.main && !f.industry.sub && l.category_main !== f.industry.main) return false
  for (const key of f.check ?? []) if (!l[key]) return false
  return true
}

/** 필터가 걸린 건수 — 카운트 쿼리 자리(현재 탐색은 목록을 한 번 받아 메모리에서 센다) */
export const countMatches = (rows = [], filters = {}) => (rows ?? []).filter(l => matchesFilters(l, filters)).length

/** 실제로 걸려 있는 필터 키 목록 (기본값은 '안 건 것'으로 본다) */
export function activeFilterKeys(f = {}) {
  const on = []
  if (f.query?.trim()) on.push('query')
  if (f.type && f.type !== '전체') on.push('type')
  if (f.area && f.area !== '전체 지역') on.push('area')
  if (f.transferFee != null) on.push('transferFee')
  if (f.monthlyRent != null) on.push('monthlyRent')
  if (f.deposit != null) on.push('deposit')
  if (f.floor && f.floor !== '전층') on.push('floor')
  if (f.areaSize?.min != null || f.areaSize?.max != null) on.push('areaSize')
  if (f.industry?.sub || f.industry?.main) on.push('industry')
  if ((f.check ?? []).length) on.push('check')
  return on
}
