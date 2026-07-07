/**
 * Bug 1 회귀 테스트: E1 시설·집기 직접 입력 → 선택 목록 표시
 *
 * 재현: 직접 입력한 항목이 `facilities` 배열에는 추가되지만
 *       화면 칩 목록(categoryMap 기반)에는 렌더되지 않던 버그.
 * 기대: 직접 입력 → 선택 항목 영역에 칩으로 표시 + 취소 가능
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, mockDailyContents } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'

test.describe('E1 시설·집기 직접 입력 → 목록 표시', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await mockDailyContents(page)

    // 4단계에 직접 진입하기 위해 sessionStorage에 draft 심기
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({
        category: 'seller', name: '테스터', bizType: '카페·디저트', region: '서울',
      }))
      sessionStorage.setItem('modu_e1_draft', JSON.stringify({
        address: '서울 마포구 서교동 332-4',
        shopName: '서교동 고양이 카페',
        bizType: '카페·디저트',
        area: '33',
        deposit: '3000',
        monthlyRent: '200',
        transferFee: '3000',
        transferType: 'full',
        reviewChoices: {},
        interiorPhotos: [],
        exteriorPhotos: [],
        salesProof: false,
        facilities: [],
      }))
    })
  })

  test('직접 입력 항목이 선택 칩으로 표시된다', async ({ page }) => {
    await page.goto('/e1/3')
    await page.waitForTimeout(400)

    // 카테고리 칩 중 하나 클릭 (카페·디저트의 첫 카테고리)
    await page.getByRole('button', { name: '커피·음료 장비' }).click()

    // 직접 입력 필드에 커스텀 항목 입력
    const customInput = page.getByPlaceholder('직접 입력 후 추가')
    await customInput.fill('특수 에스프레소 머신')

    // 추가 버튼 클릭
    await page.getByRole('button', { name: '추가', exact: true }).click()

    // 선택 항목 영역에 커스텀 항목 칩이 나타나야 함
    await expect(page.getByRole('button', { name: /특수 에스프레소 머신/ })).toBeVisible()

    // "N개 선택됨" 텍스트 확인
    await expect(page.getByText('1개 선택됨')).toBeVisible()
  })

  test('직접 입력 + 프리셋 동시 선택 시 둘 다 칩 표시', async ({ page }) => {
    await page.goto('/e1/3')
    await page.waitForTimeout(400)

    await page.getByRole('button', { name: '커피·음료 장비' }).click()

    // 프리셋 항목 하나 클릭 (에스프레소 머신)
    const presetBtn = page.getByRole('button', { name: '에스프레소 머신' }).first()
    await presetBtn.click()

    // 직접 입력
    await page.getByPlaceholder('직접 입력 후 추가').fill('맞춤 제작 냉각기')
    await page.getByRole('button', { name: '추가', exact: true }).click()

    // 두 칩 모두 선택 항목 영역에 표시
    await expect(page.getByRole('button', { name: /에스프레소 머신/ }).last()).toBeVisible()
    await expect(page.getByRole('button', { name: /맞춤 제작 냉각기/ })).toBeVisible()
    await expect(page.getByText('2개 선택됨')).toBeVisible()
  })

  test('선택 칩의 × 탭으로 직접 입력 항목을 취소할 수 있다', async ({ page }) => {
    await page.goto('/e1/3')
    await page.waitForTimeout(400)

    await page.getByRole('button', { name: '커피·음료 장비' }).click()

    await page.getByPlaceholder('직접 입력 후 추가').fill('테스트 장비')
    await page.getByRole('button', { name: '추가', exact: true }).click()

    // 칩 존재 확인
    const chip = page.getByRole('button', { name: /테스트 장비/ })
    await expect(chip).toBeVisible()

    // 칩 탭하면 취소
    await chip.click()

    // 칩이 사라져야 함
    await expect(chip).not.toBeVisible()
    await expect(page.getByText('개 선택됨')).not.toBeVisible()
  })

  test('직접 입력 항목이 sessionStorage(draft)에 저장된다', async ({ page }) => {
    // Supabase PATCH mock
    let patchBody = null
    await page.route(`${SUPABASE}/listings*`, async route => {
      if (route.request().method() === 'PATCH') {
        patchBody = JSON.parse(route.request().postData() || '{}')
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
    })

    await page.goto('/e1/3')
    await page.waitForTimeout(400)

    await page.getByRole('button', { name: '커피·음료 장비' }).click()

    await page.getByPlaceholder('직접 입력 후 추가').fill('커스텀 기기A')
    await page.getByRole('button', { name: '추가', exact: true }).click()

    // draft가 sessionStorage에 업데이트됐는지 확인
    const draft = await page.evaluate(() => {
      const raw = sessionStorage.getItem('modu_e1_draft')
      return raw ? JSON.parse(raw) : null
    })

    expect(draft?.facilities, '커스텀 기기A가 draft.facilities에 포함돼야 함')
      .toContain('커스텀 기기A')
  })
})
