/**
 * 사장님 매출 '이 상황에 맞는 서비스' 카드 (ORDER 2026-09-09 파트 A)
 * 유닛: 상황 룰(우선순위·게이트·근거) / PRICING §1 정렬 lint
 * UI: ① sales_drop 카드·문안 ② 4주 → 카드 없음 ③ lease 60일 + 매출 -20% → lease 1장만
 *     ④ 기업회원 0곳 → 칩 없음 + pending 기록 ⑤ [닫기] → 30일 내 미표시 ⑥ 정렬 함수 plan_tier → lint 실패
 *     ⑦ 연동 매출 → "카드매출 기준" ⑧ 양도 상담 칩 → 미리보기 열림, listing 행 생성 없음
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'
import { readFileSync } from 'node:fs'
import { getSalesSignal, cardCopyOf, basisOf, isSuppressed } from '../src/lib/salesSignalRules.js'
import { sortVendors, matchesRegion } from '../src/lib/vendors.js'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'
import { kstToday, addDays } from '../src/lib/weekUtil.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const TODAY = kstToday()
const back = (n) => addDays(TODAY, -n)

/** n일치 일 매출 — 최근 30일은 recent, 그 전은 base (source 선택) */
const entriesOf = (n, { recent = 82000, base = 100000, source } = {}) =>
  Array.from({ length: n }, (_, i) => ({ sale_date: back(i), revenue: i < 30 ? recent : base, ...(source ? { source } : {}) }))

// ── 유닛 ─────────────────────────────────────────────────────
test.describe('상황 룰 유닛', () => {
  test('8주 데이터·최근 30일 -18% → sales_drop, 문안에 18', () => {
    const r = getSalesSignal({ entries: entriesOf(56) })
    expect(r.signal).toBe('sales_drop')
    expect(r.params.pct).toBe(-18)
    expect(cardCopyOf(r).line1).toBe('최근 한 달 매출이 이전 석 달 평균보다 18% 적어요')
    expect(cardCopyOf(r).line2).toContain('입력하신 매출 기준')
  })

  test('4주 데이터 → null (게이트 미달) / -10% → null (기준 미달)', () => {
    expect(getSalesSignal({ entries: entriesOf(28) })).toBeNull()
    expect(getSalesSignal({ entries: entriesOf(56, { recent: 90000 }) })).toBeNull()
  })

  test('lease_end_date 60일 + 매출 -20% → lease_end_near 1개만', () => {
    const r = getSalesSignal({ entries: entriesOf(56, { recent: 80000 }), roleData: { lease_end_date: back(-60) } })
    expect(r.signal).toBe('lease_end_near')
    expect(r.params.days).toBe(60)
    expect(cardCopyOf(r).line1).toBe('임대차 만료까지 60일 남았어요')
    // 91일이면 해당 없음 → 매출 하락으로 넘어간다
    expect(getSalesSignal({ entries: entriesOf(56, { recent: 80000 }), roleData: { lease_end_date: back(-91) } }).signal).toBe('sales_drop')
  })

  test('weekday_gap: 특정 요일이 4주 연속 주 평균 60% 미만 → 요일·비율', () => {
    // 최근 4주 매일 입력, 월요일만 30% 수준. 하락 게이트(8주)는 미달이라 sales_drop 은 안 걸린다
    const entries = Array.from({ length: 28 }, (_, i) => {
      const d = back(i)
      const isMon = new Date(`${d}T00:00:00Z`).getUTCDay() === 1
      return { sale_date: d, revenue: isMon ? 30000 : 100000 }
    })
    const r = getSalesSignal({ entries })
    expect(r.signal).toBe('weekday_gap')
    expect(r.params.weekday).toBe('월')
    expect(r.params.q).toBe(30)
    expect(cardCopyOf(r).line1).toBe('월요일 매출이 다른 날의 30% 수준이에요')
  })

  test('근거 줄: 연동만 → 카드매출 / 섞임 → 카드매출 + 입력 / 컬럼 부재(빈 배열) → 입력하신', () => {
    expect(basisOf(['crefia_api', 'crefia_api'])).toBe('카드매출 기준')
    expect(basisOf(['crefia_api', 'manual'])).toBe('카드매출 + 입력 매출 기준')
    expect(basisOf([])).toBe('입력하신 매출 기준')
    expect(basisOf(['photo'])).toBe('입력하신 매출 기준')
  })

  test('30일 규칙: 닫은 지 29일 → 숨김, 30일 → 표시 / 노출 당일은 계속 표시', () => {
    expect(isSuppressed({ dismissedOn: back(29) }, TODAY)).toBe(true)
    expect(isSuppressed({ dismissedOn: back(30) }, TODAY)).toBe(false)
    expect(isSuppressed({ shownOn: TODAY }, TODAY)).toBe(false)
    expect(isSuppressed({ shownOn: back(1) }, TODAY)).toBe(true)
  })

  test('정렬: 거리 → 응답률, 결제 등급 무관 (⑥ lint: plan_tier 참조 시 실패)', () => {
    const origin = { lat: 37.55, lng: 126.92 }
    const list = [
      { id: 'far', lat: 37.60, lng: 126.92, responseRate: 0.9 },
      { id: 'near-low', lat: 37.551, lng: 126.92, responseRate: 0.1 },
      { id: 'nocoord', lat: null, lng: null, responseRate: 1 },
    ]
    expect(sortVendors(list, origin).map(v => v.id)).toEqual(['near-low', 'far', 'nocoord'])
    // 좌표 없으면 응답률만
    expect(sortVendors([{ id: 'a', responseRate: 0.2 }, { id: 'b', responseRate: 0.8 }]).map(v => v.id)).toEqual(['b', 'a'])
    expect(matchesRegion('서울 마포구 양화로 45', { region: '서울', regionSub: '마포구' })).toBe(true)
    expect(matchesRegion('서울 강남구 역삼동 1', { region: '서울', regionSub: '마포구' })).toBe(false)

    // ⑥ lint — 실제 정렬 함수는 위반 0, plan_tier 를 정렬 키로 쓰는 코드는 위반 1
    const real = readFileSync('src/lib/vendors.js', 'utf8')
    expect(findPricingSortViolations(real, 'src/lib/vendors.js')).toEqual([])
    expect(real).toContain('// 정렬은 결제 등급과 무관 — docs/principles/PRICING.md §1')
    const bad = `export function sortVendors(list) {\n  return [...list].sort((a, b) => (b.plan_tier === 'vendor_paid') - (a.plan_tier === 'vendor_paid'))\n}`
    const v = findPricingSortViolations(bad, 'x.js')
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ name: 'sortVendors', token: 'plan_tier', line: 1 })
    const badArrow = `const rankByPaid = (xs) => {\n  return xs.filter(x => x.premium)\n}`
    expect(findPricingSortViolations(badArrow)).toHaveLength(1)
  })
})

// ── UI ───────────────────────────────────────────────────────
async function setup(page, { profileExtra = {}, sales = [], vendors = [] } = {}) {
  await mockGemini(page)
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/rest/v1/daily_sales*`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sales) })
    : r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }))
  const listingPosts = []
  await page.route(`${SUPABASE}/rest/v1/listings*`, r => {
    if (r.request().method() === 'POST') { listingPosts.push(r.request().postData()); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    const url = r.request().url()
    const m = url.match(/biz_category=eq\.(\w+)/)
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(m ? vendors.filter(v => v.biz_category === m[1]) : []) })
  })
  await page.addInitScript(extra => {
    localStorage.setItem('modu_device_id', 'svc-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({
      name: '김사장', category: 'operating',
      roleData: { operating: { bizLabel: '카페·커피전문점', region: '서울', region_sub: '마포구', category_main: '카페·베이커리', ...extra } },
    }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_op', category: 'operating', name: '김사장', active: true }]))
  }, profileExtra)
  return { listingPosts }
}

test('① 8주 데이터·최근 30일 -18% → sales_drop 카드, 문안에 18 + 근거 "입력하신 매출 기준"', async ({ page }) => {
  await setup(page, { sales: entriesOf(56) })
  await page.goto('/a7/operating')
  const card = page.getByTestId('sales-service-card')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-signal', 'sales_drop')
  await expect(card.getByTestId('sales-service-line1')).toHaveText('최근 한 달 매출이 이전 석 달 평균보다 18% 적어요')
  await expect(card.getByTestId('sales-service-line2')).toContainText('입력하신 매출 기준')
  await expect(card.getByTestId('sales-service-cta')).toHaveText('알아보기')
  await expect(card).not.toContainText('AI')
})

test('② 데이터 4주 → 카드 없음 (빈 카드·부족 안내 없음)', async ({ page }) => {
  await setup(page, { sales: entriesOf(28) })
  await page.goto('/a7/operating')
  await expect(page.getByTestId('sales-card')).toBeVisible()
  await expect(page.getByTestId('sales-next-unlock')).toBeVisible() // 매출 카드 자체는 정상 렌더
  await expect(page.getByTestId('sales-service-card')).toHaveCount(0)
  await expect(page.getByText('데이터가 부족해요')).toHaveCount(0)
})

test('③ lease_end_date 60일 + 매출 -20% → lease_end_near 1장만', async ({ page }) => {
  await setup(page, { sales: entriesOf(56, { recent: 80000 }), profileExtra: { lease_end_date: back(-60) } })
  await page.goto('/a7/operating')
  const card = page.getByTestId('sales-service-card')
  await expect(card).toHaveCount(1)
  await expect(card).toHaveAttribute('data-signal', 'lease_end_near')
  await expect(card.getByTestId('sales-service-line1')).toHaveText('임대차 만료까지 60일 남았어요')
  await expect(page.getByText('20% 적어요')).toHaveCount(0)
})

test('④ 카테고리 기업회원 0곳 → 그 칩 없음 + pending 기록, 양도 상담(내부) 칩은 표시', async ({ page }) => {
  await setup(page, { sales: entriesOf(56), vendors: [] })
  await page.goto('/a7/operating')
  await page.getByTestId('sales-service-cta').click()
  const sheet = page.getByTestId('sales-service-sheet')
  await expect(sheet.getByTestId('sales-service-sheet-title')).toHaveText('최근 한 달 매출이 이전 석 달 평균보다 18% 적어요')
  await expect(sheet.getByTestId('sales-chip-transfer')).toBeVisible()
  await expect(sheet.getByTestId('sales-chip-marketing')).toHaveCount(0)
  await expect(sheet.getByTestId('sales-chip-consulting')).toHaveCount(0)
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_vendor_pending') || '[]'))
  expect(pending).toEqual(expect.arrayContaining([
    expect.objectContaining({ region: '서울 마포구', category: 'marketing', signal: 'sales_drop', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    expect.objectContaining({ category: 'consulting', signal: 'sales_drop' }),
  ]))
})

test('④-2 기업회원 있으면 칩 표시 → 최대 3곳 + [더 보기]', async ({ page }) => {
  const vendors = Array.from({ length: 5 }, (_, i) => ({
    id: `v${i}`, device_id: `vd${i}`, listing_type: 'business', status: 'published', biz_category: 'marketing',
    shop_name: `홍보업체 ${i}`, address: '서울 마포구 서교동 1', image_urls: [], biz_tags: [],
  }))
  await setup(page, { sales: entriesOf(56), vendors })
  await page.goto('/a7/operating')
  await page.getByTestId('sales-service-cta').click()
  await page.getByTestId('sales-chip-marketing').click()
  await expect(page.getByTestId('sales-vendor')).toHaveCount(3)
  await page.getByTestId('sales-vendor-more').click()
  await expect(page.getByTestId('sales-vendor')).toHaveCount(5)
})

test('⑤ [닫기] → 즉시 사라지고 새로고침해도 30일 내 미표시', async ({ page }) => {
  await setup(page, { sales: entriesOf(56) })
  await page.goto('/a7/operating')
  await expect(page.getByTestId('sales-service-card')).toBeVisible()
  await page.getByTestId('sales-service-dismiss').click()
  await expect(page.getByTestId('sales-service-card')).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('sales-card')).toBeVisible()
  await expect(page.getByTestId('sales-service-card')).toHaveCount(0)
  const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_sales_card_seen') || '{}'))
  expect(seen.sales_drop.dismissedOn).toBe(TODAY)
})

test('⑦ 연동 매출 사용자 → 근거 줄 "카드매출 기준" (판정은 출처 무관)', async ({ page }) => {
  await setup(page, { sales: entriesOf(56, { source: 'crefia_api' }) })
  await page.goto('/a7/operating')
  const card = page.getByTestId('sales-service-card')
  await expect(card).toHaveAttribute('data-signal', 'sales_drop')
  await expect(card.getByTestId('sales-service-line2')).toContainText('카드매출 기준')
  await expect(card.getByTestId('sales-service-line2')).not.toContainText('입력하신')
})

test('⑧ 양도 상담 칩 → 등록 첫 화면 읽기 전용 미리보기, listing 행 생성 없음 → [시작하기]로 실제 등록', async ({ page }) => {
  const { listingPosts } = await setup(page, { sales: entriesOf(56) })
  await page.goto('/a7/operating')
  await page.getByTestId('sales-service-cta').click()
  await page.getByTestId('sales-chip-transfer').click()
  await expect(page.getByText('지금 등록하면 어떤 정보가 필요한지만 보여드릴게요')).toBeVisible()
  await page.getByTestId('transfer-preview-open').click()
  await expect(page).toHaveURL(/\/e1\/1\?preview=1$/)
  await expect(page.getByRole('heading', { name: '매물 등록 미리보기' })).toBeVisible()
  await expect(page.getByTestId('e1-preview-body')).toBeVisible()
  await expect(page.getByTestId('e1-preview-start')).toHaveText('시작하기')
  await expect(page.getByRole('button', { name: '예시 ✦' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /다음 — 모두가 초안 작성/ })).toHaveCount(0)
  expect(listingPosts).toHaveLength(0)
  await page.getByTestId('e1-preview-start').click()
  await expect(page).toHaveURL(/\/e1\/1$/)
  await expect(page.getByRole('heading', { name: '매물 등록' })).toBeVisible()
  await expect(page.getByRole('button', { name: /다음 — 모두가 초안 작성/ })).toBeVisible()
  expect(listingPosts).toHaveLength(0)
})
