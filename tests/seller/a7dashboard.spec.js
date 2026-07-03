/**
 * A7SellerDashboard — "내 공개 매물" 카드 실데이터 연결 검증
 *
 * 1. 매물 1개: 더미 "홍대 고양이 카페" 없음 + 실 shop_name 표시
 * 2. 매물 0개: "아직 등록한 매물이 없어요" 안내 표시
 *
 * 주의: setSellerLocalStorage는 about:blank 컨텍스트에서 호출하면 SecurityError.
 * getProfile()이 빈 localStorage에서 {}를 반환하므로 A7은 프로필 없이도 렌더 가능.
 * → setSellerLocalStorage 없이 mockGemini + route mock + goto 순서로 진행.
 */
import { test, expect } from '@playwright/test'
import { mockGemini } from '../helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

const MOCK_LISTING = {
  id: 'test-listing-uuid-001',
  shop_name: '테스트 분식집',
  transfer_fee: '1500',
  address: '서울 강남구 역삼동 123-4 1층',
  transfer_type: '영업양도',
  status: 'published',
  image_urls: [],
  device_id: 'test-device-id',
  review_choices: {},
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

test.describe('A7 내 공개 매물 카드', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
  })

  test('매물 1개: 실 shop_name 표시, 더미 "홍대 고양이 카페" 없음', async ({ page }) => {
    await mockListings(page, [MOCK_LISTING])
    await page.goto('/a7/seller')

    // 더미 텍스트가 화면에 없어야 함
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()

    // 실 데이터 shop_name이 카드에 표시되어야 함
    await expect(page.getByText('테스트 분식집')).toBeVisible()
  })

  test('사진 없는 매물: "📷 사진 없음" 배지 표시', async ({ page }) => {
    await mockListings(page, [{ ...MOCK_LISTING, image_urls: [] }])
    await page.goto('/a7/seller')

    await expect(page.getByText('📷 사진 없음')).toBeVisible()
  })

  test('사진 있는 매물: "📷 사진 없음" 배지 없음', async ({ page }) => {
    await mockListings(page, [{ ...MOCK_LISTING, image_urls: ['https://example.com/photo.jpg'] }])
    await page.goto('/a7/seller')

    await expect(page.getByText('📷 사진 없음')).not.toBeVisible()
  })

  test('매물 0개: "아직 등록한 매물이 없어요" 안내 표시', async ({ page }) => {
    await mockListings(page, [])
    await page.goto('/a7/seller')

    // 빈 상태 안내 문구 — exact:true 로 카드 내 텍스트만 지정 (완성도 힌트와 구분)
    await expect(page.getByText('아직 등록한 매물이 없어요', { exact: true })).toBeVisible()

    // 더미 텍스트도 없어야 함
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()
  })

  test('매물 0개: Gemini 호출 없이 고정 코칭 문구 표시', async ({ page }) => {
    // beforeEach의 mockGemini보다 나중에 등록 → 이 라우트가 먼저 처리됨 (호출 횟수 집계)
    let geminiCalls = 0
    await page.route('https://generativelanguage.googleapis.com/**', async route => {
      geminiCalls++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'dummy' }] } }] }),
      })
    })

    await mockListings(page, [])
    await page.goto('/a7/seller')

    // 고정 문구가 표시되어야 함
    await expect(page.getByText('첫 매물을 등록해보세요')).toBeVisible()

    // Gemini는 한 번도 호출되지 않아야 함
    expect(geminiCalls, `매물 0개인데 Gemini가 ${geminiCalls}회 호출됨`).toBe(0)
  })
})
