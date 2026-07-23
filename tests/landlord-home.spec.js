/**
 * 임대인 홈 골격 통일 (ORDER-landlord-home-align-v1)
 * 양도인 홈 골격 재사용 — 내 상가 카드(0/1/3/5 접힘) · 진행 가이드 점등 · 문의 지표(공유 컴포넌트).
 */
import { test, expect } from './fixtures.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`
const CONVERSATIONS = `${SUPABASE}/conversations*`
const MESSAGES = `${SUPABASE}/messages*`
const DEV = 'landlord-home-dev'

function seed(page) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord', region: '서울' }))
  }, DEV)
}
function mockListings(page, rows) {
  return page.route(LISTINGS, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    : r.fulfill({ status: 204, body: '' }))
}
function mockConvs(page, convs = [], msgs = []) {
  page.route(CONVERSATIONS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(convs) }))
  page.route(MESSAGES, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(msgs) }))
}
const L = (i, over = {}) => ({
  id: `L${i}`, listing_type: 'landlord', deal_type: 'lease', status: 'published',
  address: `서울 마포구 서교동 33${i}`, deposit: '3000', monthly_rent: '200',
  review_choices: {}, image_urls: [], device_id: DEV, created_at: `2026-07-1${i}T00:00:00Z`,
  ...over,
})

test.describe('임대인 홈 골격', () => {
  test.beforeEach(async ({ page }) => { await seed(page); await mockConvs(page) })

  test('0건: 등록 CTA 노출, 상가 카드 없음', async ({ page }) => {
    await mockListings(page, [])
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('register-landlord-cta')).toBeVisible()
    await expect(page.getByTestId('landlord-listing-card')).toHaveCount(0)
    await expect(page.getByText('상가 관리 중')).toBeVisible() // 의도 미상(status 없음) → 중립
  })

  test('1건: 카드 1개 + 단수 헤드라인 + 메타(임대) + 접힘 없음', async ({ page }) => {
    await mockListings(page, [L(1)])
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-listing-card')).toHaveCount(1)
    await expect(page.getByText('상가 1개 · 임대')).toBeVisible() // 실 deal_type=lease 승격
    await expect(page.getByTestId('landlord-listing-card')).toContainText('임대')
    await expect(page.getByTestId('landlord-cards-more')).toHaveCount(0)
    // 카드 탭 → E2L 상세
    await page.getByTestId('landlord-listing-card').click()
    await expect(page).toHaveURL('/e2l/L1')
  })

  test('3건: 카드 3개 + 복수 헤드라인 + 접힘 없음', async ({ page }) => {
    await mockListings(page, [L(1), L(2), L(3)])
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-listing-card')).toHaveCount(3)
    await expect(page.getByText('상가 3개', { exact: true })).toBeVisible() // occupancy 미설정 → 점유 breakdown 없음
    await expect(page.getByTestId('landlord-cards-more')).toHaveCount(0)
  })

  test('5건: 3개만 표시 + "외 2개" 접힘 → 펼치면 5개', async ({ page }) => {
    await mockListings(page, [L(1), L(2), L(3), L(4), L(5)])
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-listing-card')).toHaveCount(3)
    await expect(page.getByTestId('landlord-cards-more')).toContainText('외 2개')
    await page.getByTestId('landlord-cards-more').click()
    await expect(page.getByTestId('landlord-listing-card')).toHaveCount(5)
  })

  test('가이드 점등: 등록·소개글·공개 완료, 문의받기 현재(기다리는 중)', async ({ page }) => {
    await mockListings(page, [L(1, { status: 'published', review_choices: { description: 'keep' } })])
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('guide-register')).toHaveAttribute('data-done', 'true')
    await expect(page.getByTestId('guide-draft')).toHaveAttribute('data-done', 'true')
    await expect(page.getByTestId('guide-publish')).toHaveAttribute('data-done', 'true')
    await expect(page.getByTestId('guide-inquiry')).toHaveAttribute('data-done', 'false')
    await expect(page.getByTestId('guide-waiting-inquiry')).toBeVisible() // 문의받기 = 기다리는 중
  })

  test('문의 지표: 미확인 1건 → 새 문의 강조(레드) + 전체 1', async ({ page }) => {
    await mockListings(page, [L(1)])
    await mockConvs(page,
      [{ id: 'c1', sender_id: 'buyer-dev', receiver_id: DEV, created_at: '2026-07-15T00:00:00Z',
         last_message_at: '2026-07-16T00:00:00Z', receiver_last_read_at: null, sender_last_read_at: null }],
      [{ conversation_id: 'c1', sender_id: 'buyer-dev' }])
    await page.goto('/a7/landlord')
    // 매물 있으면 지표 자동 펼침
    await expect(page.getByTestId('metric-new-inquiry')).toHaveText('1')
    await expect(page.getByTestId('metric-inquiry-total')).toContainText('전체 1')
    await expect(page.getByTestId('metric-inquiry-dot')).toBeVisible() // 미확인 → 빨간 점
  })
})
