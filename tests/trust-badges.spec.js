/**
 * 매물 카드 신뢰 신호 검증 (ExplorePage)
 *
 * 1. 완성도 80%+ 매물 → "충실한 매물" 뱃지 표시
 * 2. 검수(review_choices) 있는 매물 → "AI 검수 완료" 표시
 * 3. 완성도 낮고 검수 없는 매물 → 뱃지 없음 (벌주는 표시 금지)
 * 4. 보증금·월세가 카드에 렌더
 */
import { test, expect } from './fixtures.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

// 완성도 80점: 주소20+상호10+면적5+보증·월세15+권리금10+방식5+검수3개15 = 80
const TRUSTED = {
  id: 'trusted-id',
  shop_name: '신뢰 카페',
  address: '서울 마포구 서교동 1-1',
  area: '33',
  deposit: '3000',
  monthly_rent: '200',
  transfer_fee: '2500',
  transfer_type: 'full',
  image_urls: [],
  review_choices: { description: 'keep', location: 'keep', facility: 'keep' },
  status: 'published',
  created_at: '2026-07-01T00:00:00Z',
}

// 완성도 30점(주소+상호), 검수 없음 → 어떤 뱃지도 없어야 함
const PLAIN = {
  id: 'plain-id',
  shop_name: '기본 매물',
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

test.describe('매물 카드 신뢰 신호', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([TRUSTED, PLAIN]),
      })
    })
    await page.goto('/explore')
  })

  test('완성도 80%+ 카드에만 "충실한 매물" 뱃지', async ({ page }) => {
    await expect(page.getByText('신뢰 카페')).toBeVisible()
    await expect(page.getByText('기본 매물')).toBeVisible()

    // 뱃지는 정확히 1개 (TRUSTED 카드에만)
    await expect(page.getByText('충실한 매물')).toHaveCount(1)

    // 뱃지가 붙은 카드가 TRUSTED인지 (카드 텍스트에 상호+뱃지 동시 포함)
    const trustedCard = page.locator('main button', { hasText: '신뢰 카페' })
    await expect(trustedCard.getByText('충실한 매물')).toBeVisible()
  })

  test('검수 매물에만 "AI 검수 완료", 미검수·저완성엔 뱃지 없음', async ({ page }) => {
    await expect(page.getByText('AI 검수 완료')).toHaveCount(1)

    // PLAIN 카드엔 어떤 신뢰 뱃지도 없어야 함
    const plainCard = page.locator('main button', { hasText: '기본 매물' })
    await expect(plainCard.getByText('충실한 매물')).toHaveCount(0)
    await expect(plainCard.getByText('AI 검수 완료')).toHaveCount(0)
  })

  test('보증금·월세가 카드에 렌더', async ({ page }) => {
    const trustedCard = page.locator('main button', { hasText: '신뢰 카페' })
    await expect(trustedCard.getByText('보증 3,000만')).toBeVisible()
    await expect(trustedCard.getByText('월세 200만')).toBeVisible()
    await expect(trustedCard.getByText('권리금 2,500만')).toBeVisible()
  })
})
