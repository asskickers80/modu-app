/**
 * 가드 테스트 — 입력 검증 및 에러 화면 확인
 * TEST-FINDINGS.md의 T02~T07 시나리오에 대응
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

test.describe('입력 가드 & 에러 처리', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
  })

  // T02: A2 — 카테고리 미선택
  test('A2: 카테고리 미선택 → 다음 비활성', async ({ page }) => {
    await page.goto('/a2')
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  // T03: A3 — 일부만 답변
  test('A3: Q1만 선택 → 다음 비활성', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('이제 그만할 때가 됐나봐요').click()
    await page.getByRole('button', { name: '다음' }).click()
    await page.getByText('카페·디저트').click()
    // Q2, Q3 미선택
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  test('A3: Q1+Q2 선택, Q3 미선택 → 다음 비활성', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('이제 그만할 때가 됐나봐요').click()
    await page.getByRole('button', { name: '다음' }).click()
    await page.getByText('카페·디저트').click()
    await page.getByText('서울').click()
    // Q3 미선택
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  // T04: E1/1 — 필수 필드 미입력
  test('E1/1: 빈 상태 → 다음 비활성', async ({ page }) => {
    await page.goto('/e1/1')
    await expect(
      page.getByRole('button', { name: /다음.*AI 초안/ })
    ).toBeDisabled()
  })

  // E1/2 — AI 오류 에러 화면 (Gemini 실패 시뮬레이션)
  test('E1/2: Gemini 502 오류 → 에러 화면 + 재시도·건너뛰기 버튼', async ({ page }) => {
    // Gemini 502로 덮어씌우기
    await page.route('https://generativelanguage.googleapis.com/**', route =>
      route.fulfill({ status: 502, body: 'Bad Gateway' })
    )
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()

    await expect(page.getByText('AI 초안 생성이 지금 안 돼요')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'AI 없이 계속 진행 — 사진·증빙(4단계)' })).toBeVisible()
  })

  test('E1/2: 오류 후 "AI 없이 계속 진행" → E1/4 이동', async ({ page }) => {
    await page.route('https://generativelanguage.googleapis.com/**', route =>
      route.fulfill({ status: 502, body: 'Bad Gateway' })
    )
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
    await page.getByRole('button', {
      name: 'AI 없이 계속 진행 — 사진·증빙(4단계)',
      timeout: 15_000,
    }).click()
    await expect(page).toHaveURL('/e1/4')
  })
})
