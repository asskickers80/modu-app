/**
 * ExplorePage — 실데이터 연결 검증
 *
 * 1. 완성도 다른 매물 2개 → 완성도 높은 매물이 먼저 렌더 (기본 정렬 = 완성도순)
 * 2. 옛 더미 대표 상호명("홍대 고양이 카페")이 화면에 없음
 * 3. 0건 → "조건에 맞는 매물이 없어요" 안내
 */
import { test, expect } from './fixtures.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

// 완성도 높음(65점): 주소+상호+면적+보증금·월세+권리금+양도방식
const HIGH_SCORE = {
  id: 'high-score-id',
  shop_name: '고완성 카페',
  address: '서울 마포구 서교동 1-1',
  area: '33',
  deposit: '3000',
  monthly_rent: '200',
  transfer_fee: '2500',
  transfer_type: 'full',
  image_urls: [],
  review_choices: {},
  status: 'published',
  created_at: '2026-07-01T00:00:00Z', // 더 오래됨 — 완성도가 최신순을 이겨야 함
}

// 완성도 낮음(30점): 주소+상호만. created_at은 더 최신
const LOW_SCORE = {
  id: 'low-score-id',
  shop_name: '저완성 매물',
  address: '서울 강남구 역삼동 2-2',
  area: '',
  deposit: '',
  monthly_rent: '',
  transfer_fee: '',
  transfer_type: null,
  image_urls: [],
  review_choices: {},
  status: 'published',
  created_at: '2026-07-03T00:00:00Z',
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

test.describe('탐색 페이지 실데이터', () => {
  test('완성도순 기본 정렬: 높은 완성도 매물이 먼저 렌더', async ({ page }) => {
    // 응답 배열은 저완성이 먼저 — 클라이언트 정렬이 뒤집어야 함
    await mockListings(page, [LOW_SCORE, HIGH_SCORE])
    await page.goto('/explore')

    // 두 매물 다 렌더
    await expect(page.getByText('고완성 카페')).toBeVisible()
    await expect(page.getByText('저완성 매물')).toBeVisible()

    // 첫 번째 카드가 완성도 높은 매물이어야 함 (최신순이었다면 저완성이 먼저)
    const firstCard = await page.locator('main button').first().textContent()
    expect(firstCard, '완성도순 정렬 실패 — 첫 카드가 고완성 매물이 아님').toContain('고완성 카페')

    // 옛 더미 상호명이 없어야 함
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()
  })

  test('0건: "조건에 맞는 매물이 없어요" 안내', async ({ page }) => {
    await mockListings(page, [])
    await page.goto('/explore')

    await expect(page.getByText('조건에 맞는 매물이 없어요')).toBeVisible()
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()
  })
})
