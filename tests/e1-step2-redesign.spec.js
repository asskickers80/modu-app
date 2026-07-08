/**
 * E1/2 Step 2 재설계 — 명시적 수정 버튼 UI 상호작용 검증
 *
 * 검증 항목:
 * 1. 390px 뷰포트(앱 타깃)에서 수정 버튼 가시성 — viewport 내 좌표 단언
 * 2. ✏️ 수정 버튼 클릭 → 편집 모드(textarea 등장)
 * 3. 텍스트 수정 → 저장 버튼 클릭 → 바뀐 내용 표시
 * 4. 저장 후 AI 배지 제거 (사용자 글로 전환)
 * 5. 공개/비공개 토글 동작
 * 6. 편집 중 스크린샷 (390px 조건)
 * 7. 다음 버튼 → /e1/3 이동
 *
 * 배경: 이전 구현(헤더 내 버튼)이 PC 넓은 창 Playwright에서는 통과했으나
 *       실 브라우저 좁은 화면에서 안 보인다는 피드백(재현 미확인·추정).
 *       이 테스트는 390px(전역 viewport)에서 버튼 좌표를 직접 단언한다.
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

test('E1/2: 390px 뷰포트에서 수정 버튼이 화면 안에 있고 눌린다', async ({ page }) => {
  // 전역 viewport가 390px임을 명시적으로 재확인
  expect(page.viewportSize()?.width).toBe(390)

  await mockGemini(page)
  await mockMarketData(page)

  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*AI 초안/ }).click()

  const descBlock = page.getByTestId('block-description')
  await expect(descBlock).toBeVisible({ timeout: 15_000 })

  const editBtn = page.getByTestId('edit-btn-description')

  // 버튼이 DOM에 있고 visible — 기본 단언
  await expect(editBtn).toBeVisible()

  // 390px 화면 안에 실제로 들어와 있는지 좌표 단언
  const box = await editBtn.boundingBox()
  expect(box, '수정 버튼 boundingBox 없음 — 렌더 안 됨').not.toBeNull()
  expect(box.x, '수정 버튼 왼쪽이 화면 밖').toBeGreaterThanOrEqual(0)
  expect(box.x + box.width, '수정 버튼 오른쪽이 390px 밖으로 잘림').toBeLessThanOrEqual(390)

  // 390px 조건 스크린샷 (버튼 visible 상태)
  await page.screenshot({ path: path.join('tests', 'e1-step2-390px.png'), fullPage: false })

  // 실제로 눌리는지 — 클릭 후 textarea 등장
  await editBtn.click()
  await expect(page.getByTestId('edit-textarea-description')).toBeVisible()

  console.log(`✅ E1/2 390px: 수정 버튼 좌표 x=${box.x.toFixed(0)} right=${(box.x + box.width).toFixed(0)} (390px 안)`)
})
