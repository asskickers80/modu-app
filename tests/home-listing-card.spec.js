/**
 * 홈 매물 등록 CTA → 내 매물 카드 전환 (ORDER-home-listing-card-v1)
 *
 * 1. 매물 0건 → 네이비 등록 CTA 유지
 * 2. 매물 1건 → 내 매물 카드 (제목·상태 뱃지) + 탭 시 E2 상세
 * 3. "+ 새 매물 등록" → /e1/1 (중복 등록 허용)
 * 4. 매물 2건 → "매물 N건" 요약 + 탭 시 내 매물 리스트
 * 5. example 매물만 있으면 0건 취급
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

const BASE = {
  transfer_fee: '1500',
  address: '서울 강남구 역삼동 123-4 1층',
  transfer_type: '영업양도',
  status: 'published',
  shop_name_public: true,
  image_urls: [],
  interior_image_urls: [],
  device_id: 'test-device-id',
  review_choices: {},
  created_at: new Date().toISOString(),
}
const L1 = { ...BASE, id: 'listing-001', shop_name: '테스트 분식집' }
const L2 = { ...BASE, id: 'listing-002', shop_name: '두번째 카페' }

function mockListings(page, rows) {
  return page.route(SUPABASE_LISTINGS, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    } else {
      await route.continue()
    }
  })
}

test.describe('홈 내 매물 카드', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
  })

  test('매물 0건: 등록 CTA 유지, 내 매물 카드 없음', async ({ page }) => {
    await mockListings(page, [])
    await page.goto('/a7/seller')

    await expect(page.getByTestId('register-listing-cta')).toBeVisible()
    await expect(page.getByText('매물 등록하기')).toBeVisible()
    await expect(page.getByTestId('my-listing-card')).toHaveCount(0)
  })

  test('매물 1건: 카드로 전환 — 상호명 + 상태 뱃지, 등록 CTA 사멸', async ({ page }) => {
    await mockListings(page, [L1])
    await page.goto('/a7/seller')

    const card = page.getByTestId('my-listing-card')
    await expect(card).toBeVisible()
    await expect(card.getByText('테스트 분식집')).toBeVisible()
    await expect(card.getByText('공개 중')).toBeVisible()

    // CTA 자리를 카드가 대체 — 네이비 등록 CTA는 사라져야 함
    await expect(page.getByTestId('register-listing-cta')).toHaveCount(0)
  })

  test('매물 1건: 카드 탭 → 해당 매물 상세(E2)로 이동', async ({ page }) => {
    await mockListings(page, [L1])
    await page.goto('/a7/seller')

    await page.getByTestId('my-listing-card').click()
    await expect(page).toHaveURL('/e2/listing-001')
  })

  test('"+ 새 매물 등록" 탭 → /e1/1 (중복 등록 허용)', async ({ page }) => {
    await mockListings(page, [L1])
    await page.goto('/a7/seller')

    await page.getByTestId('new-listing-button').click()
    await expect(page).toHaveURL('/e1/1')
  })

  test('상호 비공개: 상호명 대신 동+업종 표시', async ({ page }) => {
    await mockListings(page, [{ ...L1, shop_name_public: false, biz_type: '패스트푸드' }])
    await page.goto('/a7/seller')

    const card = page.getByTestId('my-listing-card')
    await expect(card.getByText('역삼동 패스트푸드')).toBeVisible()
    await expect(card.getByText('테스트 분식집')).toHaveCount(0)
  })

  test('매물 2건: "매물 2건" 요약 표시', async ({ page }) => {
    await mockListings(page, [L1, L2])
    await page.goto('/a7/seller')

    await expect(page.getByTestId('my-listing-count')).toHaveText('매물 2건')
    await expect(page.getByTestId('register-listing-cta')).toHaveCount(0)
  })

  test('매물 2건: 카드 탭 → 내 매물 리스트, 두 매물 모두 노출', async ({ page }) => {
    await mockListings(page, [L1, L2])
    await page.goto('/a7/seller')

    await page.getByTestId('my-listing-card').click()
    await expect(page).toHaveURL('/my/listings')

    await expect(page.getByTestId('my-listing-row-listing-001')).toBeVisible()
    await expect(page.getByTestId('my-listing-row-listing-002')).toBeVisible()
  })

  test('내 매물 리스트: 행 탭 → 해당 매물 상세로', async ({ page }) => {
    await mockListings(page, [L1, L2])
    await page.goto('/my/listings')

    await page.getByTestId('my-listing-row-listing-002').click()
    await expect(page).toHaveURL('/e2/listing-002')
  })

  test('example 매물만 있는 계정: 0건 취급 → 등록 CTA', async ({ page }) => {
    await mockListings(page, [{ ...L1, status: 'example' }])
    await page.goto('/a7/seller')

    await expect(page.getByTestId('register-listing-cta')).toBeVisible()
    await expect(page.getByTestId('my-listing-card')).toHaveCount(0)
  })

  test('example + 실매물 1건: 실매물만 세어 카드 1건 (N건 요약 아님)', async ({ page }) => {
    await mockListings(page, [{ ...L2, status: 'example' }, L1])
    await page.goto('/a7/seller')

    await expect(page.getByTestId('my-listing-card')).toBeVisible()
    await expect(page.getByTestId('my-listing-count')).toHaveCount(0)
    await expect(page.getByText('테스트 분식집')).toBeVisible()
  })

  test('내 매물 리스트도 example을 제외한다', async ({ page }) => {
    await mockListings(page, [L1, { ...L2, status: 'example' }])
    await page.goto('/my/listings')

    await expect(page.getByTestId('my-listing-row-listing-001')).toBeVisible()
    await expect(page.getByTestId('my-listing-row-listing-002')).toHaveCount(0)
  })

  test('카드·리스트 어디에도 "AI" 노출 없음', async ({ page }) => {
    await mockListings(page, [L1])
    await page.goto('/a7/seller')

    await expect(page.getByTestId('my-listing-card')).toBeVisible()
    const cardText = await page.getByTestId('my-listing-card').innerText()
    expect(cardText).not.toContain('AI')

    await page.goto('/my/listings')
    await expect(page.getByTestId('my-listing-row-listing-001')).toBeVisible()
    const listText = await page.locator('main').innerText()
    expect(listText).not.toContain('AI')
  })
})
