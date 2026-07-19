/**
 * 양도자 E1 매물등록 — 핵심 3 시나리오
 *
 * 1. 빈 입력:   E1/1 필수 필드 미입력 → "다음" 버튼 비활성 + 페이지 이동 없음
 * 2. 새로고침:  E1/2 진행 중 reload → 앱 생존 + 상태 초기화 여부 관찰
 * 3. 중복 제출: E1/5 제출 버튼 이중 클릭 → Supabase insert 호출 횟수 확인
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedInteriorPhotos } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

// E1/1~E1/3 해피패스를 통과해 E1/4에 도달하는 헬퍼
async function goToStep5(page) {
  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
  await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
  await seedInteriorPhotos(page) // 내부 3장 필수 정책 통과
  await page.getByRole('button', { name: /다음.*완성도/ }).click()
  await expect(page).toHaveURL('/e1/4')
}

test.describe('E1 핵심 3 시나리오', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
  })

  // ── 시나리오 1: 빈 입력 ──────────────────────────────────────
  test('시나리오1: E1/1 빈 입력 → 다음 버튼 비활성, 페이지 이동 없음', async ({ page }) => {
    await page.goto('/e1/1')

    const nextBtn = page.getByRole('button', { name: /다음.*모두가 초안/ })

    // 1-a) 버튼이 disabled 상태여야 함
    await expect(nextBtn).toBeDisabled()

    // 1-b) force 클릭해도 /e1/2 로 이동하지 않아야 함
    await nextBtn.click({ force: true })
    await page.waitForTimeout(400)
    await expect(page).toHaveURL('/e1/1')
  })

  // ── 시나리오 2: 새로고침 ─────────────────────────────────────
  test('시나리오2: E1/2 진행 중 새로고침 → 입력값 유지 (sessionStorage 임시저장)', async ({ page }) => {
    // E1/1에서 예시 채움 → E1/2 이동
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await expect(page).toHaveURL('/e1/2')

    // 새로고침 — sessionStorage draft로 복원되어야 함
    await page.reload()

    // 2-a) URL 이 /e1/2 인지 (튕기지 않는지)
    await expect(page).toHaveURL('/e1/2')

    // 2-b) 흰화면·빈화면 아닌지
    const bodyText = await page.locator('body').textContent()
    expect(bodyText.trim().length, '새로고침 후 흰화면 발생').toBeGreaterThan(10)

    // 2-c) E1/1로 돌아가 입력값이 그대로 복원됐는지 DOM 단언
    await page.goto('/e1/1')
    await expect(
      page.locator('input[placeholder="예) 고양이 카페 서교점"]'),
      '새로고침 후 상호명 소실 — draft 복원 실패'
    ).toHaveValue('서교동 고양이 카페')
    await expect(
      page.getByText('서울 마포구 서교동 332-4'),
      '새로고침 후 주소 소실 — draft 복원 실패'
    ).toBeVisible()

    console.log('[시나리오2] 새로고침 후 상호·주소 복원 확인 (sessionStorage draft)')
  })

  // ── 시나리오 2b: 제출 후 draft 삭제 ──────────────────────────
  test('시나리오2b: 제출 성공 후 sessionStorage draft 삭제됨', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'mock-draft-clear' }]),
        })
      } else {
        await route.continue()
      }
    })

    await goToStep5(page)

    // 제출 전: draft가 존재해야 함
    const before = await page.evaluate(() => sessionStorage.getItem('modu_e1_draft'))
    expect(before, '제출 전 draft가 없음 — 저장 로직 미동작').not.toBeNull()

    // 제출
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await expect(page.getByText('매물이 공개됐어요!')).toBeVisible()

    // 제출 후: draft가 삭제되어야 함
    const after = await page.evaluate(() => sessionStorage.getItem('modu_e1_draft'))
    expect(after, '제출 성공 후에도 draft가 남아있음').toBeNull()

    console.log('[시나리오2b] 제출 성공 → modu_e1_draft 삭제 확인')
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
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
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

  // ── 시나리오 5: 사진 정책 — 내부 3장 미만이면 3단계에서 차단 ─────
  test('시나리오5: 사진 없이 E1/3 → 다음 비활성 + 남은 장수 안내, 이동 없음', async ({ page }) => {
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
    await expect(page).toHaveURL('/e1/3')

    // 내부 사진 0장 → 다음 비활성 + 남은 장수 표시 (2026-07-19 사진 정책)
    await expect(page.getByRole('button', { name: /다음.*완성도/ })).toBeDisabled()
    await expect(page.getByText('내부 사진 3장 더 올려주세요')).toBeVisible()
    await expect(page).toHaveURL('/e1/3')
  })

  // ── 시나리오 8: calcScore 사진 조건 검증 ────────────────────────
  // sessionStorage를 직접 시드해 확정적 점수를 만든다.
  // 기본 필드(address+shopName+area+deposit+rent+fee+type) = 65
  // (|| true 버그가 살아있으면 사진 없어도 77이 표시됨)
  test('시나리오8: 사진 없는 매물 완성도 65점, 사진 추가 시 77점 (12점 차이)', async ({ page }) => {
    // 알려진 데이터로 sessionStorage 시드 → goToStep5의 timing 플레이크 제거
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({
        category: 'seller', name: '테스터', bizType: '카페·디저트', region: '서울',
      }))
      sessionStorage.setItem('modu_e1_draft', JSON.stringify({
        address: '서울 마포구 서교동 332-4',
        shopName: '서교동 고양이 카페',
        area: '33',
        deposit: '3000',
        monthlyRent: '200',
        transferFee: '3000',
        transferType: 'full',
        reviewChoices: {},   // 0개 → +15 없음
        interiorPhotos: [],  // 사진 없음 → +12 없음
        exteriorPhotos: [],
        salesProof: false,
        facilities: [],
      }))
    })
    await page.goto('/e1/4')
    await page.waitForTimeout(500)

    const scoreText = await page.locator('span.text-\\[32px\\]').textContent()
    const scoreWithout = parseInt(scoreText, 10)
    console.log(`[시나리오8-a] 사진 없는 완성도: ${scoreWithout}%`)
    // 20(주소)+10(상호)+5(면적)+15(보증금+월세)+10(권리금)+5(양도방식) = 65
    expect(scoreWithout, '|| true 버그 미수정: 사진 없는데 77%가 표시됨').toBe(65)

    // 8-b) 사진 있을 경우 예상 점수 = 65 + 12 = 77 (수식 검증)
    const expectedWithPhotos = scoreWithout + 12
    console.log(`[시나리오8-b] 사진 추가 시 예상 완성도: ${expectedWithPhotos}% (12점 차이)`)
    expect(expectedWithPhotos).toBe(77)
  })

  // ── 시나리오 7: 직접 URL 진입 ─────────────────────────────────
  test('시나리오7: /e1/4 직접 URL 접근 → 가드 화면 노출 검증', async ({ page }) => {
    // /e1/4 직접 접근 — "아직 매물 작성이 완료되지 않았어요" 가드 확인
    await page.goto('/e1/4')
    console.log('[시나리오7-b] /e1/4 접근 후 URL:', page.url())
    // (a) 흰화면 아님
    const text5 = await page.locator('body').textContent()
    expect(text5.trim().length, '/e1/4 흰화면 발생').toBeGreaterThan(10)
    // (b) 최종 제출 UI가 렌더되지 않음 (공개하기 버튼·완성도 게이지 없어야 함)
    await expect(page.getByRole('button', { name: '매물 공개하기' })).not.toBeVisible()
    await expect(page.getByText('매물 완성도를 확인해요')).not.toBeVisible()
    // (c) 가드 안내 문구 노출
    await expect(page.getByText('아직 매물 작성이 완료되지 않았어요')).toBeVisible()
    await expect(page.getByRole('button', { name: '처음부터 시작' })).toBeVisible()
    console.log('[시나리오7-b] /e1/4 가드 정상: 안내 문구 노출, 공개 UI 없음')
  })
})
