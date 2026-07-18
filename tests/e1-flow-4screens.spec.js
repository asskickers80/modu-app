/**
 * E1 흐름 4화면 단언
 *
 * 진입부터 제출 직전까지 사용자가 지나는 화면이 정확히 4개임을 단언한다.
 * 각 화면: URL / 진행 표시(X/4) / 화면 제목
 *
 * 1/4 — /e1/1  기본 팩트를 입력해요
 * 2/4 — /e1/2  모두가 써본 초안이에요
 * 3/4 — /e1/3  사진·증빙을 보완해요
 * 4/4 — /e1/4  매물 완성도를 확인해요
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import path from 'node:path'

const SCREENS = [
  { url: '/e1/1', progress: '1 / 4', title: '기본 팩트를 입력해요',    shot: 'e1-step1-basic.png' },
  { url: '/e1/2', progress: '2 / 4', title: '모두가 써본 초안이에요',    shot: 'e1-step2-draft.png' },
  { url: '/e1/3', progress: '3 / 4', title: '사진·증빙을 보완해요',    shot: 'e1-step3-photos.png' },
  { url: '/e1/4', progress: '4 / 4', title: '매물 완성도를 확인해요',   shot: 'e1-step4-publish.png' },
]

test('E1 흐름: 진입→제출 전 정확히 4개 화면', async ({ page }) => {
  await mockGemini(page)
  await mockMarketData(page)

  // ── 1단계: 기본 팩트 ─────────────────────────────────────
  await page.goto('/e1/1')
  await expect(page).toHaveURL('/e1/1')
  await expect(page.getByText(SCREENS[0].progress)).toBeVisible()
  await expect(page.getByText(SCREENS[0].title)).toBeVisible()
  await page.screenshot({ path: path.join('tests', SCREENS[0].shot), fullPage: false })

  // 예시 채워서 다음 활성화
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()

  // ── 2단계: AI 초안 ───────────────────────────────────────
  await expect(page).toHaveURL('/e1/2')
  // AI 생성 완료 대기 (mock이므로 빠름)
  await expect(page.getByText(SCREENS[1].progress)).toBeVisible()
  await expect(page.getByRole('button', { name: /^다음$/ })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(SCREENS[1].title)).toBeVisible()
  await page.screenshot({ path: path.join('tests', SCREENS[1].shot), fullPage: false })

  await page.getByRole('button', { name: /^다음$/ }).click()

  // ── 3단계: 사진·증빙 ─────────────────────────────────────
  await expect(page).toHaveURL('/e1/3')
  await expect(page.getByText(SCREENS[2].progress)).toBeVisible()
  await expect(page.getByText(SCREENS[2].title)).toBeVisible()
  await page.screenshot({ path: path.join('tests', SCREENS[2].shot), fullPage: false })

  await page.getByRole('button', { name: /다음.*완성도/ }).click()

  // ── 4단계: 완성도·공개 ───────────────────────────────────
  await expect(page).toHaveURL('/e1/4')
  await expect(page.getByText(SCREENS[3].progress)).toBeVisible()
  await expect(page.getByText(SCREENS[3].title)).toBeVisible()
  await page.screenshot({ path: path.join('tests', SCREENS[3].shot), fullPage: false })

  // 제출 전 도달 확인 (공개하기 버튼 존재)
  await expect(page.getByRole('button', { name: '매물 공개하기' })).toBeVisible()

  // ── 4개 화면 외 이탈 경로 없음 단언 ─────────────────────
  // 위 4번의 URL 도달이 전부임. /e1/3 단계에는 '입력할게요/건너뜀' 게이트가 없어야 함
  await page.goto('/e1/3')
  await expect(page.getByRole('button', { name: '입력할게요' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '건너뜀' })).toHaveCount(0)

  console.log('✅ E1 흐름: 정확히 4개 화면 통과 (/e1/1 → /e1/2 → /e1/3 → /e1/4)')
  SCREENS.forEach(s => console.log(`  ${s.progress}  ${s.url}  ${s.title}`))
})
