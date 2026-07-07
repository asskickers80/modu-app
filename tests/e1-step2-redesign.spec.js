/**
 * E1/2 Step 2 재설계 — 명시적 수정 버튼 UI 상호작용 검증
 *
 * 검증 항목:
 * 1. ✏️ 수정 버튼 표시 (숨은 탭 동작 아닌 명시적 진입점)
 * 2. 수정 버튼 클릭 → 편집 모드(textarea 등장)
 * 3. 텍스트 수정 → 저장 버튼 클릭 → 바뀐 내용 표시
 * 4. 저장 후 AI 배지 제거 (사용자 글로 전환)
 * 5. 공개/비공개 토글 동작
 * 6. 편집 중 스크린샷
 * 7. 다음 버튼 → /e1/3 이동
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import path from 'node:path'

test('E1/2: 수정 버튼 탭 → 텍스트 고침 → 저장 → 바뀐 내용 표시', async ({ page }) => {
  await mockGemini(page)
  await mockMarketData(page)

  // E1/1 → E1/2 이동
  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
  await expect(page).toHaveURL('/e1/2')

  // AI 생성 완료 대기 — description 카드 등장
  const descBlock = page.getByTestId('block-description')
  await expect(descBlock).toBeVisible({ timeout: 15_000 })

  // 1. AI 배지 초기 표시 확인
  const aiBadge = page.getByTestId('ai-badge-description')
  await expect(aiBadge).toBeVisible()

  // 2. ✏️ 수정 버튼 표시 확인 — 명시적 진입점
  const editBtn = page.getByTestId('edit-btn-description')
  await expect(editBtn).toBeVisible()
  await expect(editBtn).toContainText('수정')

  // 3. 수정 버튼 클릭 → 편집 모드 진입 (textarea 등장)
  await editBtn.click()
  const textarea = page.getByTestId('edit-textarea-description')
  await expect(textarea).toBeVisible()
  await expect(textarea).toBeFocused()

  // 편집 중 스크린샷
  await page.screenshot({ path: path.join('tests', 'e1-step2-editing.png'), fullPage: false })

  // 4. 텍스트 수정
  await textarea.fill('대표님이 직접 수정한 매물 설명입니다.')

  // 5. 저장 버튼 클릭
  const saveBtn = page.getByTestId('save-btn-description')
  await expect(saveBtn).toBeVisible()
  await saveBtn.click()

  // 6. 편집 모드 종료: textarea 사라지고 수정된 텍스트 표시
  await expect(textarea).not.toBeVisible()
  await expect(descBlock.getByText('대표님이 직접 수정한 매물 설명입니다.')).toBeVisible()

  // 7. 저장 후 AI 배지 제거
  await expect(aiBadge).not.toBeVisible()

  // 8. facility 블록 공개→비공개 토글
  const facilityToggle = page.getByTestId('visibility-toggle-facility')
  await expect(facilityToggle).toBeVisible()
  await expect(facilityToggle).toHaveText('공개')
  await facilityToggle.click()
  await expect(facilityToggle).toHaveText('비공개')

  // 9. 저장 후 스크린샷
  await page.screenshot({ path: path.join('tests', 'e1-step2-redesign.png'), fullPage: false })

  // 10. 다음 → /e1/3 이동
  await page.getByRole('button', { name: /^다음$/ }).click()
  await expect(page).toHaveURL('/e1/3')

  console.log('✅ E1/2: 수정버튼 탭→편집→저장→바뀐내용 표시 모두 통과')
})
