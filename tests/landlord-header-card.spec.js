/**
 * 임대인 홈 헤더 집계 + 상가 카드 제목 (ORDER-landlord-home-header-card-v1)
 * deal_type 집계(임대/매매, both 양쪽 +1) · 지역 승격/다지역 축약 · 카드 제목(동+번지, 호수 병기).
 */
import { test, expect } from './fixtures.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`
const CONVERSATIONS = `${SUPABASE}/conversations*`
const MESSAGES = `${SUPABASE}/messages*`
const DEV = 'landlord-hdr-dev'

function seed(page) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord', region: '서울', status: 'both' }))
  }, DEV)
}
function mocks(page, rows) {
  page.route(LISTINGS, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    : r.fulfill({ status: 204, body: '' }))
  page.route(CONVERSATIONS, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  page.route(MESSAGES, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
}
const L = (i, deal, over = {}) => ({
  id: `L${i}`, listing_type: 'landlord', deal_type: deal, status: 'published',
  address: `서울 마포구 서교동 3${i}0-1`, deposit: '3000', monthly_rent: '200', sale_price: '80000',
  review_choices: {}, image_urls: [], device_id: DEV, created_at: `2026-07-1${i}T00:00:00Z`, ...over,
})
const headline = (page) => page.getByTestId('landlord-headline')

test.describe('헤더 deal_type 집계', () => {
  test.beforeEach(async ({ page }) => { await seed(page) })

  test('임대만 → "임대 2개 진행 중"', async ({ page }) => {
    await mocks(page, [L(1, 'lease'), L(2, 'lease')])
    await page.goto('/a7/landlord')
    await expect(headline(page)).toHaveText('임대 2개 진행 중')
  })

  test('매매만 → "매매 2개 진행 중"', async ({ page }) => {
    await mocks(page, [L(1, 'sale'), L(2, 'sale')])
    await page.goto('/a7/landlord')
    await expect(headline(page)).toHaveText('매매 2개 진행 중')
  })

  test('혼합 → "임대 N · 매매 N 진행 중"', async ({ page }) => {
    await mocks(page, [L(1, 'lease'), L(2, 'lease'), L(3, 'sale')])
    await page.goto('/a7/landlord')
    await expect(headline(page)).toHaveText('임대 2 · 매매 1 진행 중')
  })

  test('both 포함 → 양쪽 각각 +1 ("임대 3 · 매매 2")', async ({ page }) => {
    // 임대2 + 매매1 + both1 → 임대=2+1=3, 매매=1+1=2
    await mocks(page, [L(1, 'lease'), L(2, 'lease'), L(3, 'sale'), L(4, 'both')])
    await page.goto('/a7/landlord')
    await expect(headline(page)).toHaveText('임대 3 · 매매 2 진행 중')
  })
})

test.describe('헤더 지역 승격', () => {
  test.beforeEach(async ({ page }) => { await seed(page) })

  test('단일 시도 → 그 시도', async ({ page }) => {
    await mocks(page, [L(1, 'lease'), L(2, 'lease')]) // 둘 다 서울
    await page.goto('/a7/landlord')
    await expect(page.getByText('서울 일대')).toBeVisible()
  })

  test('여러 시도 → "서울 외 1곳" 축약', async ({ page }) => {
    await mocks(page, [
      { ...L(1, 'lease'), address: '서울 마포구 서교동 330-1' },
      { ...L(2, 'lease'), address: '부산 해운대구 우동 100' },
    ])
    await page.goto('/a7/landlord')
    await expect(page.getByText('서울 외 1곳 일대')).toBeVisible()
  })
})

test.describe('상가 카드 제목 (상호 없음 제거)', () => {
  test.beforeEach(async ({ page }) => { await seed(page) })

  test('호수 있음 → "동 번지 (301호)"', async ({ page }) => {
    await mocks(page, [{ ...L(1, 'lease'), address: '서울 강동구 강일동 676-1 301호', address_detail: '301호' }])
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-listing-card')).toContainText('강일동 676-1 (301호)')
    await expect(page.getByTestId('landlord-listing-card')).not.toContainText('상호 없음')
  })

  test('호수 없음 → "동 번지"만', async ({ page }) => {
    await mocks(page, [{ ...L(1, 'lease'), address: '서울 강동구 강일동 676-1', address_detail: null }])
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-listing-card')).toContainText('강일동 676-1')
  })
})
