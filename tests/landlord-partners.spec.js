/**
 * 임대인 거래처·지원 업체 섹션 — 양도인 ⑥ 동형 (대표 지시: 소유주에게도 업체 문의·추천 동선)
 * 실업체 데이터(기업회원 입점) 전까지 준비중 정직 표시 + 제안 수신 설정 진입.
 */
import { test, expect } from './fixtures.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'

function seed(page) {
  return page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'lp-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord', region: '서울' }))
  })
}
function mocks(page) {
  page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  page.route(`${SUPABASE}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  page.route(`${SUPABASE}/daily_contents*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  page.route(`${SUPABASE}/market_news*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
}

test('임대인 홈: 거래처·지원 업체 섹션 — 준비중 정직 표시(가짜 업체 없음)', async ({ page }) => {
  await seed(page); mocks(page)
  await page.goto('/a7/landlord')
  const sec = page.getByTestId('landlord-partners')
  await expect(sec).toContainText('거래처·지원 업체')
  await expect(sec).toContainText('기업회원 입점 후 실제 업체가 표시돼요')
})

test('썸네일 폴백: 외관 사진만 있는 상가(도면 [])도 카드에 사진 표시', async ({ page }) => {
  await seed(page); mocks(page)
  const row = {
    id: 'lp-photo', listing_type: 'landlord', deal_type: 'sale', status: 'published',
    address: '인천 영종구 햇내로14번길 9 101호', sale_price: '169000',
    interior_image_urls: [], // 도면 없음 — 빈 배열이 폴백을 막던 버그 케이스
    exterior_image_urls: ['https://x.test/ext1.jpg'],
    image_urls: ['https://x.test/ext1.jpg'],
    device_id: 'lp-dev', created_at: '2026-08-01T00:00:00Z',
  }
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([row]) }))
  await page.goto('/a7/landlord')
  const card = page.getByTestId('landlord-listing-card')
  await expect(card.locator('img[src="https://x.test/ext1.jpg"]')).toBeVisible() // 자리표시 아이콘 아님
})

test('제안 받기 설정 → /my/proposal-settings, 임대인 프로필에서 카테고리 렌더', async ({ page }) => {
  await seed(page); mocks(page)
  await page.goto('/a7/landlord')
  await page.getByTestId('landlord-proposal-settings').click()
  await expect(page).toHaveURL(/\/my\/proposal-settings/)
  await expect(page.getByText('인테리어·간판')).toBeVisible()
  await expect(page.getByText('세무·회계·법무·노무')).toBeVisible()
})
