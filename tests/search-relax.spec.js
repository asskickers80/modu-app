/**
 * 탐색 조건 완화 계산 (ORDER 2026-09-21 파트 A4)
 * ① 권리금 3,000 0건 → 4,000 3건이면 후보 1개 ② 단일 전부 0건 → 두 칸 조합 1개(steps 2)
 * ③ 세 칸 조합은 시도하지 않음(쿼리 호출 수) ④ count 0 후보 없음 ⑤ 우선순위 순서 반영
 * ⑥ 소분류 → 대분류 매핑이 INDUSTRY-CATEGORY-MAP 과 일치
 */
import { test, expect } from './fixtures.js'
import { relaxSearch, relaxOne, mainOfSub } from '../src/lib/searchRelax.js'
import { matchesFilters, countMatches, activeFilterKeys } from '../src/lib/searchFilters.js'
import { RELAX, RELAX_PRIORITY, PRICE_LADDER } from '../config/searchRelax.ts'
import { INDUSTRY_CATEGORIES } from '../src/lib/categories.ts'

const L = (over = {}) => ({
  id: 'x', shop_name: '카페', address: '서울 마포구 서교동 1', transfer_type: 'full',
  transfer_fee: '3500', deposit: '3000', monthly_rent: '200', area: '33', floor: '1',
  category_main: '요식업', category_sub: '카페·디저트', ...over,
})

test('① 권리금 한 칸 완화: 3,000 0건 → 4,000 3건이면 후보 1개, 라벨에 실제 다음 칸 값', () => {
  const rows = [L({ id: 'a', transfer_fee: '3500' }), L({ id: 'b', transfer_fee: '3800' }), L({ id: 'c', transfer_fee: '4000' }), L({ id: 'd', transfer_fee: '9000' })]
  const filters = { transferFee: 3000, area: '마포' }
  expect(countMatches(rows, filters)).toBe(0)
  const opts = relaxSearch(filters, { rows })
  const fee = opts.find(o => o.key === 'transferFee')
  expect(fee).toBeTruthy()
  expect(fee.count).toBe(3)
  expect(fee.label).toBe('권리금 4,000까지 보면')
  expect(fee.filtersAfter.transferFee).toBe(4000)
  expect(fee.steps).toBe(1)
  for (const bad of ['조금', '약간', '넓게', '추천', 'AI', '까다']) expect(fee.label).not.toContain(bad)
})

test('②③④ 단일 전부 0건 → 두 칸 조합 1개(steps 2), 세 칸은 시도하지 않음, count 0 후보 없음', () => {
  // 마포·권리금 2,000 → 어떤 단일 완화로도 0건. (지역 해제 + 권리금 3,000)이면 1건
  const rows = [L({ id: 'a', address: '서울 강남구 역삼동 1', transfer_fee: '2600' })]
  const filters = { area: '마포', transferFee: 2000, type: '영업양도' }
  expect(countMatches(rows, filters)).toBe(0)
  let calls = 0
  const count = f => { calls++; return countMatches(rows, f) }
  const opts = relaxSearch(filters, { rows, count })
  expect(opts).toHaveLength(1)
  expect(opts[0].steps).toBe(2)
  expect(opts[0].count).toBe(1)
  expect(opts[0].key.split('+')).toHaveLength(2)          // 두 칸까지만
  expect(RELAX.MAX_STEPS).toBe(2)
  for (const o of opts) expect(o.count).toBeGreaterThanOrEqual(RELAX.MIN_COUNT)   // ④
  // ③ 세 칸 조합을 만들지 않으므로 호출 수는 (단일 3) + (쌍 ≤3) 수준에 머문다
  expect(calls).toBeLessThanOrEqual(10)
})

test('⑤ 우선순위 config 순서가 결과 순서에 반영된다', () => {
  const rows = [
    L({ id: 'a', address: '서울 강남구 역삼동 1', transfer_fee: '3500' }),          // 지역만 풀면 걸린다
    L({ id: 'b', transfer_fee: '4500' }),                                          // 권리금만 풀면 걸린다
    L({ id: 'c', transfer_fee: '3500', transfer_type: 'empty' }),                   // 양도 방식만 풀면 걸린다
  ]
  const filters = { area: '마포', transferFee: 4000, type: '영업양도' }
  const opts = relaxSearch(filters, { rows })
  const keys = opts.map(o => o.key)
  const expected = RELAX_PRIORITY.filter(k => keys.includes(k))
  expect(keys).toEqual(expected)
  expect(keys[0]).toBe('area')     // 기본 우선순위: 지역부터
  expect(opts.length).toBeLessThanOrEqual(RELAX.MAX_OPTIONS)
})

test('⑥ 업종 완화: 소분류 → 같은 대분류(INDUSTRY-CATEGORY-MAP 과 일치)', () => {
  for (const main of INDUSTRY_CATEGORIES) {
    for (const sub of main.subs.slice(0, 2)) expect(mainOfSub(sub.label), sub.label).toBe(main.label)
  }
  const rows = [L({ id: 'a', category_sub: '치킨' }), L({ id: 'b', category_sub: '분식' })]
  const filters = { industry: { main: '요식업', sub: '카페·디저트' } }
  expect(countMatches(rows, filters)).toBe(0)
  const opts = relaxSearch(filters, { rows })
  expect(opts[0]).toMatchObject({ key: 'industry', count: 2, label: "'요식업' 전체로 보면" })
  expect(opts[0].filtersAfter.industry).toEqual({ main: '요식업', sub: null })
})

test('필터 판정·활성 키: 화면과 같은 함수 하나만 쓴다', () => {
  expect(matchesFilters(L(), { area: '마포' })).toBe(true)
  expect(matchesFilters(L(), { area: '강남' })).toBe(false)
  expect(matchesFilters(L(), { type: '바닥권리' })).toBe(false)
  expect(matchesFilters(L(), { query: '카페' })).toBe(true)
  expect(matchesFilters(L({ area: '99' }), { areaSize: { min: 20, max: 40 } })).toBe(true)    // 99㎡ ≈ 29.9평
  expect(matchesFilters(L({ area: '200' }), { areaSize: { min: 20, max: 40 } })).toBe(false)  // 200㎡ ≈ 60평
  expect(activeFilterKeys({ area: '전체 지역', type: '전체', query: '  ' })).toEqual([])
  expect(activeFilterKeys({ area: '마포', transferFee: 3000 })).toEqual(['area', 'transferFee'])
  // 풀 수 없는 필터는 null (사다리 끝·기본값)
  expect(relaxOne({ transferFee: null }, 'transferFee')).toBeNull()
  expect(relaxOne({ transferFee: PRICE_LADDER.at(-2) }, 'transferFee').filtersAfter.transferFee).toBeNull()  // 상한 없음까지
  expect(relaxOne({ area: '전체 지역' }, 'area')).toBeNull()
})
