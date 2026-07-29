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

test('제안 받기 설정 → /my/proposal-settings, 임대인 프로필에서 카테고리 렌더', async ({ page }) => {
  await seed(page); mocks(page)
  await page.goto('/a7/landlord')
  await page.getByTestId('landlord-proposal-settings').click()
  await expect(page).toHaveURL(/\/my\/proposal-settings/)
  await expect(page.getByText('인테리어·간판')).toBeVisible()
  await expect(page.getByText('세무·회계·법무·노무')).toBeVisible()
})
