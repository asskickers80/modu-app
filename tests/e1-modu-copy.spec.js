/**
 * E1 카피 개편 — '모두' 주어 화법 (2026-07-19 오더)
 *
 * 1. 홈 CTA 카드: "매물 등록하기" + "소개글은 모두가 써드려요" (등록·수정 병기 제거)
 * 2. E1/1 단계 안내: "기본 정보 입력 → 모두가 초안 작성 → 확인하고 공개"
 * 3. E1/2 초안 결과: "모두가 써본 초안이에요" + "고칠 부분만 다듬어주세요" + "모두 작성 ✦" 배지
 * 4. E1 범위 사용자 노출 'AI' 문구 0건
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

test.describe('E1 모두 화법 카피', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
  })

  test('홈 CTA: 매물 등록하기 + 소개글은 모두가 써드려요', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller' }))
    })
    await page.route(SUPABASE_LISTINGS, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/a7/seller')
    await expect(page.getByText('매물 등록하기')).toBeVisible()
    await expect(page.getByText('가게 기본 정보만 알려주세요. 소개글은 모두가 써드려요.')).toBeVisible()
    // 옛 병기 표기 사멸
    await expect(page.getByText('매물 등록 · 수정하기')).toHaveCount(0)
    await expect(page.getByText('기본 팩트 입력')).toHaveCount(0)
  })

  test('E1/1 단계 안내 + E1/2 초안 결과 화면 문구', async ({ page }) => {
    await page.goto('/e1/1')
    await expect(page.getByText('기본 정보 입력 → 모두가 초안 작성 → 확인하고 공개')).toBeVisible()

    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()

    await expect(page.getByText('모두가 써본 초안이에요')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('고칠 부분만 다듬어주세요')).toBeVisible()
    await expect(page.getByTestId('ai-badge-description')).toHaveText('모두 작성 ✦')
    // E1 범위 'AI' 노출 0건
    await expect(page.getByText(/\bAI\b/)).toHaveCount(0)
  })
})
