/**
 * 통합 오더 P0 후속 — 홈(창업 피드)·내 관심: 조회 오류 ≠ 비어 있음
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const REST = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function base(page) {
  await mockGemini(page); await mockMarketData(page)
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill(json([])) : r.fulfill(json([], 201)))
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'err-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup', region: '서울' }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_st', category: 'startup', name: '창업', active: true }]))
  })
}

test.describe('창업 홈 피드', () => {
  test('조회 실패: "공개된 매물 없음"이 아니라 오류 안내 + 다시 시도 → 복구', async ({ page }) => {
    await base(page)
    let fail = true
    await page.route(`${REST}/listings_visible*`, r => fail ? r.fulfill(json({ message: 'boom' }, 500))
      : r.fulfill(json([{ id: 'x1', listing_type: 'seller', status: 'published', shop_name: '복구 카페', shop_name_public: true, address: '서울 마포구 서교동 1-1', transfer_fee: '2000', image_urls: [], review_choices: {}, created_at: '2026-07-01T00:00:00Z' }])))
    await page.goto('/a7/startup')
    await expect(page.getByTestId('startup-feed-error')).toContainText('불러오지 못했어요')
    await expect(page.getByText('아직 공개된 매물이 없어요')).toHaveCount(0)
    fail = false
    await page.getByTestId('startup-feed-retry').click()
    await expect(page.getByText('복구 카페').first()).toBeVisible()
    await expect(page.getByTestId('startup-feed-error')).toHaveCount(0)
  })

  test('정상 0건: 기존 안내 그대로', async ({ page }) => {
    await base(page)
    await page.route(`${REST}/listings_visible*`, r => r.fulfill(json([])))
    await page.goto('/a7/startup')
    await expect(page.getByText('아직 공개된 매물이 없어요')).toBeVisible()
    await expect(page.getByTestId('startup-feed-error')).toHaveCount(0)
  })
})

test.describe('내 관심', () => {
  test('찜 목록 조회 실패: "찜한 것이 없어요"가 아니라 오류 안내 + 다시 시도', async ({ page }) => {
    await base(page)
    let fail = true
    await page.route(`${REST}/watchlist*`, r => fail ? r.fulfill(json({ message: 'boom' }, 500)) : r.fulfill(json([])))
    await page.goto('/favorites')
    await expect(page.getByTestId('favorites-load-error')).toContainText('불러오지 못했어요')
    await expect(page.getByText('아직 찜한 것이 없어요')).toHaveCount(0)
    fail = false
    await page.getByTestId('favorites-retry').click()
    await expect(page.getByText('아직 찜한 것이 없어요')).toBeVisible() // 정상 0건은 기존 문구
    await expect(page.getByTestId('favorites-load-error')).toHaveCount(0)
  })

  test('찜한 매물 정보 조회 실패: 오류 안내 표시', async ({ page }) => {
    await base(page)
    await page.route(`${REST}/watchlist*`, r => r.fulfill(json([{ id: 'w1', target_type: 'listing', target_id: 'L1', created_at: new Date().toISOString(), muted_at: null }])))
    await page.route(`${REST}/listings_visible*`, r => r.fulfill(json({ message: 'boom' }, 500)))
    await page.goto('/favorites')
    await expect(page.getByTestId('favorites-load-error')).toBeVisible()
  })
})
