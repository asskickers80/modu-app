/**
 * 미구현 기능 (예정) 표기 (ORDER-planned-label-v1)
 * E1p Step2 로딩 체크리스트: (예정) 표기 존재 + (예정) 항목 완료 체크(✓) 부재.
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

test.describe('(예정) 표기', () => {
  test.beforeEach(async ({ page }) => { await mockGemini(page) })

  test('E1p Step2 로딩: 실호출 없는 단계에 (예정) + ✓ 부재, 실호출 단계는 표기 없음', async ({ page }) => {
    await page.goto('/e1p/2') // 로딩 애니(약 3.2s) 동안 체크리스트 노출
    // 실호출 없는 3단계 = (예정)
    await expect(page.getByTestId('load-step-0')).toContainText('위치·상권 데이터 수집 (예정)')
    await expect(page.getByTestId('load-step-1')).toContainText('등기·건축물 정보 분석 (예정)')
    await expect(page.getByTestId('load-step-2')).toContainText('인근 임대 시세 비교 (예정)')
    // 실호출 단계(설명문 초안)는 (예정) 없음
    await expect(page.getByTestId('load-step-3')).toContainText('설명문 초안')
    await expect(page.getByTestId('load-step-3')).not.toContainText('(예정)')
    // (예정) 항목엔 완료 체크(✓) 절대 없음 — 안 한 일에 완료 표시 금지
    await expect(page.getByTestId('load-step-0').getByTestId('load-check')).toHaveCount(0)
    await expect(page.getByTestId('load-step-1').getByTestId('load-check')).toHaveCount(0)
    await expect(page.getByTestId('load-step-2').getByTestId('load-check')).toHaveCount(0)
  })

  test('기존 (미구현) → (예정) 통일: 미구현 표기 소멸', async ({ page }) => {
    await page.goto('/e1p/4')
    await expect(page.getByText('등기부등본 자동열람 완료 (예정)')).toBeVisible()
    await expect(page.getByText(/\(미구현\)/)).toHaveCount(0) // 미구현 표기 전부 예정으로 통일
  })
})
