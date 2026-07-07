/**
 * 양도자 매물 등록 E1/1 ~ E1/5 흐름 테스트
 *
 * Gemini API는 mockGemini()로 인터셉트 → 실제 API 키 불필요.
 * 각 테스트는 A7 대시보드부터 시작 (localStorage에 seller 프로필 심기).
 */
import { test, expect } from '../fixtures.js'
import { mockGemini, mockMarketData, setSellerLocalStorage } from '../helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

test.describe('양도자 매물 등록 (E1/1~E1/5)', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    // A7에 직접 접근하기 위해 localStorage 프로필 먼저 심기
    await page.goto('/a7/seller')
    await setSellerLocalStorage(page)
    await page.reload()
  })

  // ── A7 → E1/1 ─────────────────────────────────────────────

  test('A7: "매물 등록·수정하기" 클릭 → E1/1 이동', async ({ page }) => {
    await page.getByRole('button', { name: '매물 등록 · 수정하기' }).click()
    await expect(page).toHaveURL('/e1/1')
  })

  // ── E1/1 ───────────────────────────────────────────────────

  test('E1/1: 빈 상태 → 다음 버튼 비활성', async ({ page }) => {
    await page.goto('/e1/1')
    await expect(
      page.getByRole('button', { name: /다음.*AI 초안/ })
    ).toBeDisabled()
  })

  test('E1/1: 예시✦ 버튼 → 필드 자동채움 → 다음 활성화', async ({ page }) => {
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await expect(
      page.getByRole('button', { name: /다음.*AI 초안/ })
    ).toBeEnabled()
  })

  test('E1/1 → E1/2: 예시 채움 후 다음 클릭', async ({ page }) => {
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
    await expect(page).toHaveURL('/e1/2')
  })

  // ── E1/2 ───────────────────────────────────────────────────

  test('E1/2: AI 생성 완료 → "다음" 버튼 노출', async ({ page }) => {
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()

    // Gemini 응답이 목 되어 있어 빠르게 완료됨
    await expect(
      page.getByRole('button', { name: /^다음$/ })
    ).toBeVisible({ timeout: 15_000 })
  })

  test('E1/2 → E1/3: AI 생성 후 다음 클릭', async ({ page }) => {
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
    await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
    await expect(page).toHaveURL('/e1/3')
  })

  test('E1/2: 생성 완료 → 구형 선택버튼 없음 + ✏️수정버튼으로 편집 + 다음(/e1/3) 이동', async ({ page }) => {
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()

    // 생성 완료: 다음 버튼 대기
    await expect(page.getByRole('button', { name: /^다음$/ })).toBeVisible({ timeout: 15_000 })

    // 구형 3-선택 버튼(그대로/공개안함) 없음 확인 — 리디자인으로 제거됨
    await expect(page.getByRole('button', { name: '그대로' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '공개안함' })).toHaveCount(0)

    // 새 UI: 항목별 ✏️ 수정 버튼으로 편집 진입
    const editBtn = page.getByTestId('edit-btn-description')
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    const textarea = page.getByTestId('edit-textarea-description')
    await expect(textarea).toBeVisible()
    await textarea.fill('수정된 테스트 텍스트')
    await expect(textarea).toHaveValue('수정된 테스트 텍스트')

    // 저장 버튼으로 편집 완료
    await page.getByTestId('save-btn-description').click()
    await expect(textarea).not.toBeVisible()

    // 다음 → E1/3 이동
    await page.getByRole('button', { name: /^다음$/ }).click()
    await expect(page).toHaveURL('/e1/3')
  })

  // ── E1/3 ───────────────────────────────────────────────────

  test('E1/3 → E1/4: 사진 없이 "다음 — 완성도 확인" 클릭', async ({ page }) => {
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
    await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
    await page.getByRole('button', { name: /다음.*완성도/ }).click()
    await expect(page).toHaveURL('/e1/4')
  })

  // ── E1/4 (완성도·공개) ──────────────────────────────────────

  test('E1/4: "매물 공개하기" → 본인인증 모달 노출', async ({ page }) => {
    // E1/4까지 진행
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
    await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
    await page.getByRole('button', { name: /다음.*완성도/ }).click()

    // E1/5
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await expect(page.getByText('본인인증이 필요해요')).toBeVisible()
  })

  test('E1/5: 더미 본인인증 통과 → A7 대시보드 복귀', async ({ page }) => {
    // Supabase listings POST mock — 실 DB에 쓰지 않도록 인터셉트
    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'mock-listing-id' }]) })
      } else {
        await route.continue()
      }
    })

    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
    await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
    await page.getByRole('button', { name: /다음.*완성도/ }).click()
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    // 성공 모달
    await expect(page.getByText('매물이 공개됐어요!')).toBeVisible()
    // 대시보드 이동 확인
    await page.getByRole('button', { name: '대시보드로 이동' }).click()
    await expect(page).toHaveURL('/a7/seller')
  })
})
