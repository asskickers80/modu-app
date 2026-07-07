/**
 * E1/2 Step 2 재설계 — 항목별 카드 UI 상호작용 검증
 *
 * 검증 항목:
 * 1. AI 생성 블록에 'AI 작성 ✦' 배지 초기 표시
 * 2. textarea 수정 → AI 배지 제거 (이제 사용자 글이므로)
 * 3. 공개/비공개 토글 클릭 → '비공개' 표시 전환
 * 4. 다음 버튼 → /e1/3 이동
 * 5. Step 2 전체 스크린샷
 *
 * 화면 수 유지: 이 테스트 완료 후 4-screen 테스트도 통과해야 함.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import path from 'node:path'

test('E1/2: 항목 탭 → 인라인 수정 → AI 배지 제거 → 공개 토글 → 다음 진행', async ({ page }) => {
  await mockGemini(page)
  await mockMarketData(page)

  // E1/1 → E1/2 이동
  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
  await expect(page).toHaveURL('/e1/2')

  // AI 생성 완료 대기 — description 카드가 DOM에 나타날 때까지
  const descBlock = page.getByTestId('block-description')
  await expect(descBlock).toBeVisible({ timeout: 15_000 })

  // 1. AI 배지 초기 표시 확인
  const aiBadge = page.getByTestId('ai-badge-description')
  await expect(aiBadge).toBeVisible()

  // 2. textarea 수정 → AI 배지 제거
  const textarea = descBlock.locator('textarea')
  await textarea.fill('사용자가 직접 수정한 설명입니다.')
  await expect(aiBadge).not.toBeVisible()

  // 3. facility 블록 공개→비공개 토글
  const facilityToggle = page.getByTestId('visibility-toggle-facility')
  await expect(facilityToggle).toBeVisible()
  await expect(facilityToggle).toHaveText('공개')
  await facilityToggle.click()
  await expect(facilityToggle).toHaveText('비공개')

  // 스크린샷
  await page.screenshot({ path: path.join('tests', 'e1-step2-redesign.png'), fullPage: false })

  // 4. 다음 → /e1/3 이동
  await page.getByRole('button', { name: /^다음$/ }).click()
  await expect(page).toHaveURL('/e1/3')

  console.log('✅ E1/2 재설계: 항목 수정·AI 배지·토글·다음 이동 모두 통과')
})
