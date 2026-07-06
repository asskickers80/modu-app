import { test, expect } from '../fixtures.js'
import { mockGemini, runSellerOnboarding } from '../helpers.js'

test.describe('양도자 온보딩 (A1→A4→A7)', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
  })

  // ── A1 ────────────────────────────────────────────────────

  test('A1: 스플래시 — 2초 후 A2로 자동 이동', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/a2/, { timeout: 5_000 })
  })

  // ── A2 ────────────────────────────────────────────────────

  test('A2: 양도자 칩 선택 → 다음 활성화', async ({ page }) => {
    await page.goto('/a2')
    const next = page.getByRole('button', { name: '다음' })
    await expect(next).toBeDisabled()
    await page.getByText('이제 그만할 때가 됐나봐요').click()
    await expect(next).toBeEnabled()
  })

  test('A2 → A3: 양도자 선택 후 다음 클릭', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('이제 그만할 때가 됐나봐요').click()
    await page.getByRole('button', { name: '다음' }).click()
    await expect(page).toHaveURL('/a3/seller')
  })

  // ── A3 ────────────────────────────────────────────────────

  test('A3: Q1만 답변 → 다음 비활성', async ({ page }) => {
    await page.goto('/a3/seller', { state: { category: 'seller' } })
    await page.getByText('카페·디저트').click()
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  test('A3 → A4: 3개 질문 모두 답변 후 다음', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('이제 그만할 때가 됐나봐요').click()
    await page.getByRole('button', { name: '다음' }).click()
    await page.getByText('카페·디저트').click()
    await page.getByText('서울').click()
    await page.getByText('자리·시설만').click()
    await page.getByRole('button', { name: '다음' }).click()
    await expect(page).toHaveURL('/a4')
  })

  // ── A4 ────────────────────────────────────────────────────

  test('A4 → A7: 네이버 더미 로그인 → 양도자 대시보드', async ({ page }) => {
    await runSellerOnboarding(page)
    await expect(page).toHaveURL('/a7/seller')
    await expect(page.getByRole('button', { name: '양도자' })).toBeVisible()
  })
})
