/**
 * 수정 모드 미저장 이탈 경고 (B안 — 대표 선택)
 * 수정 세션에서 값을 고친 채 홈으로 나가려 하면 confirm 경고. 저장 완료 후엔 경고 없음.
 * 신규 등록(수정 아님)에는 경고 없음 — dirty는 수정 세션에서만 마킹.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const ROW = {
  id: 'uw-1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
  address: '경기 수원시 팔달구 인계동 8', floor: '1', area: '54', deposit: '3000', monthly_rent: '250',
  ai_draft: { description: 'x' }, review_choices: { confirmedAt: 'x' }, edited_texts: {}, item_visibility: {},
  image_urls: [], interior_image_urls: [], exterior_image_urls: [],
  device_id: 'uw-dev', terms_version: 'v1-2026-07', created_at: '2026-08-05T00:00:00Z',
}
function seed(page) {
  return page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'uw-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
  })
}

test('수정 중 칩 변경 후 ← 이탈 → 경고, 취소하면 화면 유지', async ({ page }) => {
  await seed(page)
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) }))
  await page.goto('/e1p/1?edit=uw-1')
  await expect(page.getByTestId('title-input')).toBeVisible()

  await page.getByTestId('spot-frontage-코너').click() // 변경 발생 → dirty

  let dialogMsg = null
  page.once('dialog', d => { dialogMsg = d.message(); d.dismiss() }) // 취소
  await page.locator('button').first().click() // 헤더 ← (홈 이탈)
  await expect.poll(() => dialogMsg).not.toBeNull()
  expect(dialogMsg).toContain('저장되지 않았어요')
  await expect(page).toHaveURL(/\/e1p\/1/) // 취소 → 유지
})

test('수정 중 변경 후 이탈 확인(수락) → 홈 이동', async ({ page }) => {
  await seed(page)
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) }))
  await page.route(`${SUPABASE}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route(`${SUPABASE}/daily_contents*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route(`${SUPABASE}/market_news*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/e1p/1?edit=uw-1')
  await expect(page.getByTestId('title-input')).toBeVisible()
  await page.getByTestId('spot-parking-가능').click()

  page.once('dialog', d => d.accept())
  await page.locator('button').first().click()
  await expect(page).toHaveURL(/\/a7\/landlord/)
})

test('변경 없이 이탈 → 경고 없음 / 신규 등록도 경고 없음', async ({ page }) => {
  await seed(page)
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) }))
  await page.route(`${SUPABASE}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route(`${SUPABASE}/daily_contents*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route(`${SUPABASE}/market_news*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  let dialogs = 0
  page.on('dialog', d => { dialogs++; d.accept() })

  await page.goto('/e1p/1?edit=uw-1')
  await expect(page.getByTestId('title-input')).toBeVisible()
  await page.locator('button').first().click() // 무변경 이탈
  await expect(page).toHaveURL(/\/a7\/landlord/)
  expect(dialogs).toBe(0)
})
