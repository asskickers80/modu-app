/**
 * 양도자 E1 매물등록 — 핵심 3 시나리오
 *
 * 1. 빈 입력:   E1/1 필수 필드 미입력 → "다음" 버튼 비활성 + 페이지 이동 없음
 * 2. 새로고침:  E1/2 진행 중 reload → 앱 생존 + 상태 초기화 여부 관찰
 * 3. 중복 제출: E1/5 제출 버튼 이중 클릭 → Supabase insert 호출 횟수 확인
 */
import { test, expect } from '@playwright/test'
import { mockGemini } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

// E1/1~E1/4 해피패스를 통과해 E1/5에 도달하는 헬퍼
async function goToStep5(page) {
  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
  await page.getByRole('button', { name: /다음.*검수/, timeout: 15_000 }).click()
  const keepBtns = page.getByRole('button', { name: '그대로' })
  for (const btn of await keepBtns.all()) {
    await btn.click()
  }
  await page.getByRole('button', { name: /다음.*사진/ }).click()
  await page.getByRole('button', { name: /다음.*완성도/ }).click()
  await expect(page).toHaveURL('/e1/5')
}

test.describe('E1 핵심 3 시나리오', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
  })

  // ── 시나리오 1: 빈 입력 ──────────────────────────────────────
  test('시나리오1: E1/1 빈 입력 → 다음 버튼 비활성, 페이지 이동 없음', async ({ page }) => {
    await page.goto('/e1/1')

    const nextBtn = page.getByRole('button', { name: /다음.*AI 초안/ })

    // 1-a) 버튼이 disabled 상태여야 함
    await expect(nextBtn).toBeDisabled()

    // 1-b) force 클릭해도 /e1/2 로 이동하지 않아야 함
    await nextBtn.click({ force: true })
    await page.waitForTimeout(400)
    await expect(page).toHaveURL('/e1/1')
  })

  // ── 시나리오 2: 새로고침 ─────────────────────────────────────
  test('시나리오2: E1/2 진행 중 새로고침 → 앱 생존 + 상태 초기화 관찰', async ({ page }) => {
    // E1/1에서 예시 채움 → E1/2 이동
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
    await expect(page).toHaveURL('/e1/2')

    // 새로고침 — E1Context(인메모리 useState) 초기화됨
    await page.reload()

    // 2-a) URL 이 /e1/2 인지 (튕기지 않는지)
    await expect(page).toHaveURL('/e1/2')

    // 2-b) 흰화면·빈화면 아닌지 (body에 텍스트가 있어야 함)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText.trim().length).toBeGreaterThan(10)

    // 2-c) Gemini mock 덕분에 빈 데이터로도 AI 생성이 완료되는지 관찰
    const nextVisible = await page
      .getByRole('button', { name: /다음.*검수/ })
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false)

    // 결과 콘솔 기록 (테스트 보고서에 포함됨)
    console.log('[시나리오2] 새로고침 후 현재 URL:', page.url())
    console.log('[시나리오2] "다음—검수" 버튼 노출 여부:', nextVisible)
    console.log('[시나리오2] E1Context 초기화됨 → 이전 입력값 소실 (인메모리 상태)')

    // 핵심 판정: 앱이 살아있어야 함 (흰화면 = 실패)
    expect(bodyText.trim().length).toBeGreaterThan(10)
  })

  // ── 시나리오 3: 중복 제출 ─────────────────────────────────────
  test('시나리오3: 제출 버튼 이중 클릭 → Supabase insert 호출 횟수 확인', async ({ page }) => {
    let insertCount = 0

    // Supabase listings POST 인터셉트
    // 응답을 1초 지연 → 두 번째 클릭이 첫 번째 응답 전에 도달하도록
    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() === 'POST') {
        insertCount++
        await new Promise(r => setTimeout(r, 1_000))
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'mock-listing-id' }]),
        })
      } else {
        await route.continue()
      }
    })

    await goToStep5(page)

    // 공개하기 → 본인인증 모달 열기
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await expect(page.getByText('본인인증이 필요해요')).toBeVisible()

    // 이중 클릭: 동일 JS tick 안에서 두 번 click 이벤트 발송
    // (첫 번째 click 이후 React DOM 업데이트 전에 두 번째 click 도달 가능)
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')]
      const authBtn = btns.find(b => b.textContent.includes('휴대폰 본인인증'))
      if (authBtn) {
        authBtn.click()
        authBtn.click()
      }
    })

    // 두 Supabase 요청이 완료될 만큼 대기 (각 1초 지연)
    await page.waitForTimeout(3_000)

    console.log(`[시나리오3] Supabase listings insert 호출 횟수: ${insertCount}`)

    if (insertCount > 1) {
      console.warn(`🔴 [시나리오3] 중복 저장 감지! insert ${insertCount}회 호출됨`)
    } else {
      console.log(`✅ [시나리오3] insert 1회 — 이중 제출 방어 동작`)
    }

    // 앱이 죽지 않았는지
    await expect(page.locator('body')).toBeVisible()

    // 1회 이하여야 정상 (2회 이상 = 🔴 중복 저장 버그)
    expect(insertCount, `중복 저장 발생: insert가 ${insertCount}회 호출됨`).toBeLessThanOrEqual(1)
  })

  // ── 시나리오 4: 뒤로가기 ─────────────────────────────────────
  test('시나리오4: E1/3에서 브라우저 뒤로가기 → 앱 생존 + URL·상태 관찰', async ({ page }) => {
    // E1/1 → E1/2 → E1/3 정상 진행
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*AI 초안/ }).click()
    await page.getByRole('button', { name: /다음.*검수/, timeout: 15_000 }).click()
    await expect(page).toHaveURL('/e1/3')

    // 브라우저 뒤로가기
    await page.goBack()

    const urlAfter = page.url()
    const bodyText = await page.locator('body').textContent()

    console.log('[시나리오4] 뒤로가기 후 URL:', urlAfter)
    console.log('[시나리오4] 앱 생존(body 텍스트 길이):', bodyText.trim().length)
    console.log('[시나리오4] E1Context는 인메모리 → React 앱 언마운트 없음 → 이전 입력값 유지')

    // 앱이 죽지 않아야 함 (흰화면 금지)
    expect(bodyText.trim().length).toBeGreaterThan(10)
  })

  // ── 시나리오 5: 사진 없이 제출 ───────────────────────────────
  test('시나리오5: E1/4 사진 건너뛰기 → 제출 → 저장 성공 여부 관찰', async ({ page }) => {
    let insertCount = 0

    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() === 'POST') {
        insertCount++
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'mock-no-photo-listing' }]),
        })
      } else {
        await route.continue()
      }
    })

    // 사진 없이 E1/5까지 (E1/4 다음 버튼 조건 없음 — 항상 활성)
    await goToStep5(page)

    // E1/5: 제출
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await page.waitForTimeout(2_000)

    console.log(`[시나리오5] 사진 없이 Supabase insert 호출 횟수: ${insertCount}`)
    if (insertCount > 0) {
      console.log('[시나리오5] 사진 미첨부 저장 허용됨 — E1/4가 사진 없이 진행 차단 안 함')
    } else {
      console.log('[시나리오5] 저장 시도 없음 — 어딘가에서 차단됨')
    }

    // 앱이 살아있어야 함
    await expect(page.locator('body')).toBeVisible()
  })

  // ── 시나리오 6: AI 초안 없이 강행 ────────────────────────────
  test('시나리오6: aiDraft 없이 /e1/3 직접 진입 → 가드 화면 노출 여부 관찰', async ({ page }) => {
    // E1Context aiDraft = null 상태로 /e1/3 직접 접근
    await page.goto('/e1/3')

    const bodyText = await page.locator('body').textContent()
    console.log('[시나리오6] /e1/3 직접 접근 후 URL:', page.url())

    // 앱이 죽지 않아야 함
    expect(bodyText.trim().length).toBeGreaterThan(10)

    const guardVisible = await page.getByText('AI 초안이 없어요').isVisible().catch(() => false)
    const btnVisible = await page.getByRole('button', { name: '1단계로 이동' }).isVisible().catch(() => false)
    console.log(`[시나리오6] "AI 초안이 없어요" 가드 노출: ${guardVisible}`)
    console.log(`[시나리오6] "1단계로 이동" 버튼 노출: ${btnVisible}`)

    // 가드 정상 동작 확인 (빈 블록 화면으로 열리면 🔴)
    await expect(page.getByText('AI 초안이 없어요')).toBeVisible()
    await expect(page.getByRole('button', { name: '1단계로 이동' })).toBeVisible()
  })

  // ── 시나리오 7: 직접 URL 진입 ─────────────────────────────────
  test('시나리오7: /e1/3·/e1/5 직접 URL 접근 → 가드 화면 노출 검증', async ({ page }) => {
    // 7-a) /e1/3 직접 접근 — "AI 초안이 없어요" 가드 확인
    await page.goto('/e1/3')
    console.log('[시나리오7-a] /e1/3 접근 후 URL:', page.url())
    // (a) 흰화면 아님
    const text3 = await page.locator('body').textContent()
    expect(text3.trim().length, '/e1/3 흰화면 발생').toBeGreaterThan(10)
    // (b) 가드 문구 노출
    await expect(page.getByText('AI 초안이 없어요')).toBeVisible()
    // (c) 정상 UI(검수 블록)는 렌더되지 않음
    await expect(page.getByText('항목별로 검수해 주세요')).not.toBeVisible()
    console.log('[시나리오7-a] /e1/3 가드 정상: "AI 초안이 없어요" 노출, 검수 UI 없음')

    // 7-b) /e1/5 직접 접근 — "아직 매물 작성이 완료되지 않았어요" 가드 확인
    await page.goto('/e1/5')
    console.log('[시나리오7-b] /e1/5 접근 후 URL:', page.url())
    // (a) 흰화면 아님
    const text5 = await page.locator('body').textContent()
    expect(text5.trim().length, '/e1/5 흰화면 발생').toBeGreaterThan(10)
    // (b) 최종 제출 UI가 렌더되지 않음 (공개하기 버튼·완성도 게이지 없어야 함)
    await expect(page.getByRole('button', { name: '매물 공개하기' })).not.toBeVisible()
    await expect(page.getByText('매물 완성도를 확인해요')).not.toBeVisible()
    // (c) 가드 안내 문구 노출
    await expect(page.getByText('아직 매물 작성이 완료되지 않았어요')).toBeVisible()
    await expect(page.getByRole('button', { name: '처음부터 시작' })).toBeVisible()
    console.log('[시나리오7-b] /e1/5 가드 정상: 안내 문구 노출, 공개 UI 없음')
  })
})
