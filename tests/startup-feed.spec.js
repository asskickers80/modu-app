/**
 * A7StartupFeed — 양도 매물 섹션 실데이터 연결 검증
 *
 * 1. mock 매물 → 실 shop_name 렌더 + 카드 클릭 시 /e2/{실id} 이동 (t1~t8 더미 링크 제거 확인)
 * 2. 0건 → "아직 공개된 매물이 없어요" 안내
 */
import { test, expect } from '@playwright/test'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

const MOCK_LISTING = {
  id: 'feed-test-id-001',
  shop_name: '피드 테스트 매물',
  address: '서울 마포구 연남동 1-2',
  floor: '1층',
  area: '40',
  deposit: '2000',
  monthly_rent: '150',
  transfer_fee: '1500',
  transfer_type: 'full',
  image_urls: [],
  review_choices: {},
  status: 'published',
  created_at: new Date().toISOString(),
}

function mockListings(page, rows) {
  return page.route(SUPABASE_LISTINGS, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      })
    } else {
      await route.continue()
    }
  })
}

test.describe('창업준비 피드 양도 매물 실데이터', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page) // 카드 클릭 → E2 진입 시 실거래 API 외부 의존 차단
  })

  test('매물 1개: 실 shop_name 렌더 + 클릭 시 /e2/{실id} 이동', async ({ page }) => {
    await mockListings(page, [MOCK_LISTING])
    await page.goto('/a7/startup')

    // 실데이터 렌더
    await expect(page.getByText('피드 테스트 매물')).toBeVisible()

    // 옛 더미 상호명 없음
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()

    // 카드 클릭 → 실 id 상세로 이동 (t1 더미 링크가 아님)
    await page.getByText('피드 테스트 매물').click()
    await expect(page).toHaveURL(`/e2/${MOCK_LISTING.id}`)
  })

  test('매물 0개: "아직 공개된 매물이 없어요" 안내', async ({ page }) => {
    await mockListings(page, [])
    await page.goto('/a7/startup')

    await expect(page.getByText('아직 공개된 매물이 없어요')).toBeVisible()
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()
  })
})
