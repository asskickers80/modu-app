/**
 * 매물 사진 정책 (2026-07-19 오더)
 *
 * 1. 하한: 내부 3장 미만 → 다음 비활성 + 남은 장수 표시, 채우면 진행
 * 2. 상한: 내부+외부 합산 5장(무료 등급 config) 도달 → 안내 문구 + 추가 차단
 * 3. 외부 사진: 신상 노출 안내 문구 노출 + 품질 규정 안내
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedInteriorPhotos } from './helpers.js'

async function gotoPhotoStep(page) {
  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
  await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
  await expect(page).toHaveURL('/e1/3')
}

test.describe('매물 사진 정책', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
  })

  test('하한: 내부 0장 → 차단, 2장 → 여전히 차단, 3장 → 진행', async ({ page }) => {
    await gotoPhotoStep(page)

    // 0장: 비활성 + 남은 장수
    await expect(page.getByRole('button', { name: /다음.*완성도/ })).toBeDisabled()
    await expect(page.getByText('내부 사진 3장 더 올려주세요')).toBeVisible()

    // 2장: 여전히 비활성 (경계값)
    await seedInteriorPhotos(page, 2)
    await expect(page.getByText('내부 사진 (2장)')).toBeVisible()
    await expect(page.getByRole('button', { name: /다음.*완성도/ })).toBeDisabled()
    await expect(page.getByText('내부 사진 1장 더 올려주세요')).toBeVisible()

    // 3장: 활성 → 이동
    await seedInteriorPhotos(page, 3)
    await expect(page.getByText('내부 사진 준비 완료 ✓')).toBeVisible()
    await page.getByRole('button', { name: /다음.*완성도/ }).click()
    await expect(page).toHaveURL('/e1/4')
  })

  test('상한: 합산 5장 도달 → 안내 문구 + 전체 카운터 5/5', async ({ page }) => {
    await gotoPhotoStep(page)

    // 내부 5장 주입 (합산 상한 도달)
    await seedInteriorPhotos(page, 5)
    await expect(page.getByText('내부 사진 (5장)')).toBeVisible()
    await expect(page.getByText('사진은 최대 5장까지 올릴 수 있어요')).toBeVisible()
    await expect(page.getByText('전체 5/5장')).toBeVisible()
    // 프리미엄 미출시 — 화면에 프리미엄 언급 금지 (정직 원칙)
    await expect(page.getByText(/프리미엄/)).toHaveCount(0)
  })

  test('외부 사진 안내: 신상 노출 문구 + 품질 규정 노출', async ({ page }) => {
    await gotoPhotoStep(page)

    await expect(page.getByText('외부 사진은 가게 위치가 드러날 수 있어요. 조용히 진행하고 싶다면 내부 사진만으로도 충분해요')).toBeVisible()
    await expect(page.getByText(/직접 촬영한 원본 사진만 올려주세요/)).toBeVisible()
    await expect(page.getByText('선택', { exact: true })).toBeVisible()
  })
})
