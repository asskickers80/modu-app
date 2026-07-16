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
    await page.getByText('매각 진행 중, 새로 들어오실 분 찾습니다!').click()
    await expect(next).toBeEnabled()
  })

  test('A2 → A3: 양도자 선택 후 다음 클릭', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('매각 진행 중, 새로 들어오실 분 찾습니다!').click()
    await page.getByRole('button', { name: '다음' }).click()
    await expect(page).toHaveURL('/a3/seller')
  })

  // ── A3 ────────────────────────────────────────────────────

  test('A3: Q1만 답변 → 다음 비활성', async ({ page }) => {
    await page.goto('/a3/seller', { state: { category: 'seller' } })
    await page.getByText('카페·베이커리').click()
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  test('A3 → A4: 가게 정보 3개 + 목적 답변 후 다음', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('매각 진행 중, 새로 들어오실 분 찾습니다!').click()
    await page.getByRole('button', { name: '다음' }).click()
    await page.getByText('카페·베이커리').click()
    await page.getByText('서울').click()
    await page.getByText('자리·시설만').click()
    // 섹션 1 완료 → 자동 접힘 + 요약 칩, 섹션 2 자동 펼침
    await expect(page.getByText('☑️ 카페·베이커리 · 서울 · 바닥권리')).toBeVisible()
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled()
    await page.getByText('하루라도 빨리 정리하고 싶어요').click()
    await page.getByRole('button', { name: '다음' }).click()
    await expect(page).toHaveURL('/a4')
  })

  test('A3: 대분류 탭 → 소분류 드릴다운 선택 → 요약 칩에 소분류 반영', async ({ page }) => {
    await page.goto('/a3/seller')
    await page.getByText('요식업', { exact: true }).click()
    await expect(page.getByText('더 자세한 업종을 고를 수 있어요')).toBeVisible()
    await page.getByRole('button', { name: '치킨', exact: true }).click()
    // 지역도 동일 드릴다운 — 시/도 → 구 단위
    await page.getByText('서울', { exact: true }).click()
    await expect(page.getByText('더 자세한 지역을 고를 수 있어요')).toBeVisible()
    await page.getByRole('button', { name: '강남구', exact: true }).click()
    await page.getByText('자리·시설만').click()
    await expect(page.getByText('☑️ 치킨 · 서울 강남구 · 바닥권리')).toBeVisible()
  })

  test('A3: 업종 직접 검색 — 동의어(통닭) → 대분류·소분류 자동 세팅', async ({ page }) => {
    await page.goto('/a3/seller')
    // 직접 검색은 대분류를 눌러 세부 선택 단계에 들어가야 노출
    await expect(page.getByText('업종 직접 검색')).not.toBeVisible()
    await page.getByText('주점', { exact: true }).click()
    await page.getByText('업종 직접 검색').click()
    await page.getByPlaceholder('업종을 입력해보세요 (예: 통닭, 헤어샵)').fill('통닭')
    await page.getByRole('button', { name: /^치킨 요식업$/ }).click()
    await page.getByText('서울', { exact: true }).click()
    await page.getByText('자리·시설만').click()
    await expect(page.getByText('☑️ 치킨 · 서울 · 바닥권리')).toBeVisible()
  })

  // ── A4 ────────────────────────────────────────────────────

  test('A4 → A7: 네이버 더미 로그인 → 양도자 대시보드', async ({ page }) => {
    await runSellerOnboarding(page)
    await expect(page).toHaveURL('/a7/seller')
    await expect(page.getByRole('button', { name: '양도자' })).toBeVisible()
  })
})
