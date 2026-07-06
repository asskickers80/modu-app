/**
 * ModuSpinner 로딩 표시 테스트
 *
 * E1/2 AI 초안 생성 대기 화면에서 브랜드 스피너(ModuSpinner, aria-label="loading")가
 * 렌더되는지, 생성 완료 후 사라지고 기존 "다음 — 검수·공개 선택" 흐름이 유지되는지 확인.
 * Gemini 응답은 mockGemini가 처리하되, 지연 라우트를 겹쳐 로딩 화면을 안정적으로 노출.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

test.describe('ModuSpinner 로딩 표시', () => {
  test('E1/2: AI 초안 대기 중 브랜드 스피너 렌더 → 완료 후 소멸 + 다음 버튼 노출', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    // 나중에 등록한 라우트가 먼저 매칭됨 — 1.5초 지연 후 mockGemini로 넘김(fallback)
    await page.route('https://generativelanguage.googleapis.com/**', async route => {
      await new Promise(r => setTimeout(r, 1500))
      await route.fallback()
    })

    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()

    // 로딩 중: ModuSpinner 렌더 (svg role="img" aria-label="loading")
    const spinner = page.getByRole('img', { name: 'loading' })
    await expect(spinner).toBeVisible()
    await expect(page.getByText('AI가 매물 설명을 작성 중이에요')).toBeVisible()

    // 회귀: 생성 완료 → 스피너 소멸 + 다음 버튼 노출
    await expect(
      page.getByRole('button', { name: /^다음$/ })
    ).toBeVisible({ timeout: 15_000 })
    await expect(spinner).toHaveCount(0)
  })
})
