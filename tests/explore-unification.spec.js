/**
 * 탐색 — 웹·앱 통합 오더 P0
 * 1) 같은 매물의 제목·거래유형·가격·관심순이 PC와 같은 뜻으로 보인다
 * 2) 조회 오류는 '정상 0건'이 아니다 — 완화 카드·0건 로그 없음, 정상 0건은 그대로
 */
import { test, expect } from './fixtures.js'

const LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings_visible*'
const EVENTS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/events*'

const seller = (o) => ({
  id: 's', listing_type: 'seller', status: 'published', shop_name: '기본 카페', shop_name_public: true,
  address: '서울 마포구 서교동 1-1', transfer_fee: '2500', transfer_type: 'full',
  image_urls: [], review_choices: {}, created_at: '2026-07-01T00:00:00Z', views: 0, ...o,
})
const landlord = (o) => ({
  id: 'l', listing_type: 'landlord', status: 'published', address: '서울 마포구 서교동 3-3',
  floor: '1', area: '40', image_urls: [], review_choices: {}, created_at: '2026-07-01T00:00:00Z', views: 0, ...o,
})

const mockRows = (page, rows) => page.route(LISTINGS, r =>
  r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    : r.continue())

test.describe('탐색 P0-1: 같은 매물, 같은 표시', () => {
  test('조회 요청에 title·listing_type·deal_type·sale_price·views가 실린다 (마스킹뷰 유지)', async ({ page }) => {
    let url = ''
    await page.route(LISTINGS, r => { url = decodeURIComponent(r.request().url()); return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) })
    await page.goto('/explore')
    await expect.poll(() => url).toContain('listings_visible')
    for (const c of ['title', 'listing_type', 'deal_type', 'sale_price', 'views']) expect(url, c).toMatch(new RegExp(`[=,]${c}[,&]`))
    expect(url).not.toContain('select=*')
  })

  test('저장된 제목(title)이 있으면 그대로 보인다', async ({ page }) => {
    await mockRows(page, [seller({ id: 'a', title: '서교동 1층 감성 카페 양도' })])
    await page.goto('/explore')
    await expect(page.getByText('서교동 1층 감성 카페 양도')).toBeVisible()
  })

  test('관심 많은 순: views가 큰 매물이 먼저', async ({ page }) => {
    await mockRows(page, [
      seller({ id: 'low', shop_name: '조회적은집', views: 3, created_at: '2026-07-09T00:00:00Z' }),
      seller({ id: 'high', shop_name: '조회많은집', views: 90, created_at: '2026-07-01T00:00:00Z' }),
    ])
    await page.goto('/explore')
    await page.getByRole('button', { name: /필터/ }).click()
    await page.getByRole('button', { name: '관심 많은 순' }).click()
    const first = await page.locator('main button').first().textContent()
    expect(first).toContain('조회많은집')
  })

  test('상가 매매: 거래유형 "매매"와 매매가가 보이고 권리금은 없다', async ({ page }) => {
    await mockRows(page, [landlord({ id: 'sale', deal_type: 'sale', sale_price: '125000', title: '서교동 매매 상가' })])
    await page.goto('/explore?type=landlord')
    const card = page.locator('main button', { hasText: '서교동 매매 상가' })
    await expect(card).toContainText('매매')
    await expect(page.getByTestId('explore-sale-price')).toContainText('매매가')
    await expect(card).not.toContainText('권리금')
  })

  test('상가 both는 "임대·매매", 임대는 매매가 없음', async ({ page }) => {
    await mockRows(page, [
      landlord({ id: 'b', deal_type: 'both', sale_price: '90000', deposit: '5000', monthly_rent: '300', title: '양쪽 상가' }),
      landlord({ id: 'r', deal_type: 'lease', sale_price: '77777', deposit: '1000', monthly_rent: '100', title: '임대만 상가' }),
    ])
    await page.goto('/explore?type=landlord')
    await expect(page.locator('main button', { hasText: '양쪽 상가' })).toContainText('임대·매매')
    await expect(page.locator('main button', { hasText: '양쪽 상가' })).toContainText('매매가')
    await expect(page.locator('main button', { hasText: '임대만 상가' })).not.toContainText('매매가')
  })
})

test.describe('탐색 P0-2: 오류는 정상 0건이 아니다', () => {
  test('일반 실패: 오류 안내 + 다시 시도, 완화 카드·0건 로그 없음 → 재시도 성공', async ({ page }) => {
    let fail = true
    const logs = []
    await page.route(EVENTS, r => { logs.push(r.request().postData() ?? ''); return r.fulfill({ status: 201, body: '' }) })
    await page.route(LISTINGS, r => fail
      ? r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'boom' }) })
      : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([seller({ shop_name: '복구된 카페' })]) }))
    await page.goto('/explore')
    await expect(page.getByTestId('explore-load-error')).toContainText('불러오지 못했어요')
    await expect(page.getByTestId('relax-count')).toHaveCount(0)
    await page.waitForTimeout(500)
    expect(logs.filter(l => l.includes('search_empty_shown'))).toHaveLength(0)
    fail = false
    await page.getByTestId('explore-retry').click()
    await expect(page.getByText('복구된 카페')).toBeVisible()
    await expect(page.getByTestId('explore-load-error')).toHaveCount(0)
  })

  test('권한 제한(403): 별도 안내, 재시도 버튼 없음, 완화 카드 없음', async ({ page }) => {
    await page.route(LISTINGS, r => r.fulfill({ status: 403, contentType: 'application/json',
      body: JSON.stringify({ code: '42501', message: 'permission denied for view listings_visible' }) }))
    await page.goto('/explore')
    await expect(page.getByTestId('explore-load-error')).toContainText('볼 수 없어요')
    await expect(page.getByTestId('explore-retry')).toHaveCount(0)
    await expect(page.getByTestId('relax-count')).toHaveCount(0)
  })

  test('정상 0건: 조건 풀기 카드와 0건 로그는 그대로', async ({ page }) => {
    const logs = []
    await page.route(EVENTS, r => { logs.push(r.request().postData() ?? ''); return r.fulfill({ status: 201, body: '' }) })
    await mockRows(page, [])
    await page.goto('/explore')
    await expect(page.getByTestId('relax-count')).toBeVisible()
    await expect(page.getByTestId('explore-load-error')).toHaveCount(0)
    await expect.poll(() => logs.filter(l => l.includes('search_empty_shown')).length).toBeGreaterThan(0)
  })
})
