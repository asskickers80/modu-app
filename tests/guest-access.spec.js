/**
 * 방문자 열람 자유 원칙 (ORDER-guest-access-v1)
 *
 * 1. 방문자 홈(/a7/browsing) 하단 네비 — 탐색·커뮤니티·마이는 실제 화면으로 개방(가입 게이트 없음)
 * 2. 방문자가 매물 상세(E2)를 로그인 없이 열람 가능
 * 3. 행동(문의=DM)만 가입 게이트 — 역할 미확정 방문자가 문의하면 가입 유도 시트, 튕기지 않음
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'

const MOCK_LISTING = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  shop_name: '방문자 열람 카페',
  address: '서울 마포구 서교동 332-4 1층',
  floor: '1',
  area: '33',
  deposit: '3000',
  monthly_rent: '200',
  transfer_fee: '2500',
  transfer_type: 'full',
  ai_draft: {},
  review_choices: {},
  edited_texts: {},
  image_urls: [],
  facilities: [],
  status: 'published',
  device_id: 'seller-device-9999',
  created_at: new Date().toISOString(),
}

// 열람 화면(탐색·커뮤니티)이 마운트하며 도는 조회를 전부 빈 배열로 — 실 네트워크 차단
function mockReadsEmpty(page) {
  return page.route(`${SUPABASE}/rest/v1/**`, route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    return route.continue()
  })
}

test.describe('방문자 열람 자유', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
  })

  test('방문자 홈 하단 네비: 탐색·커뮤니티·마이는 게이트 없이 실제 화면으로 이동', async ({ page }) => {
    await mockReadsEmpty(page)
    await page.addInitScript(() =>
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'browsing' })))

    await page.goto('/a7/browsing')
    await expect(page.getByText('자영업자들의 이야기')).toBeVisible()

    // 탐색 → /explore (가입 시트 없음)
    await page.getByRole('button', { name: '탐색' }).click()
    await expect(page).toHaveURL(/\/explore/)

    // 홈으로 돌아가 커뮤니티 → /community
    await page.goto('/a7/browsing')
    await page.getByRole('button', { name: '커뮤니티' }).click()
    await expect(page).toHaveURL(/\/community/)

    // 홈으로 돌아가 마이 → /my
    await page.goto('/a7/browsing')
    await page.getByRole('button', { name: '마이' }).click()
    await expect(page).toHaveURL(/\/my/)
  })

  test('방문자가 매물 상세(E2)를 로그인 없이 열람', async ({ page }) => {
    await page.route(`${SUPABASE}/rest/v1/listings*`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LISTING) }))

    // 역할 미확정 방문자 (프로필 없음)
    await page.goto(`/e2/${MOCK_LISTING.id}`)

    await expect(page.getByText('매물을 찾을 수 없어요')).toHaveCount(0)
    await expect(page.getByText('방문자 열람 카페')).toBeVisible()
    await expect(page.getByText('DM으로 문의하기')).toBeVisible()
  })

  test('방문자 문의 → 가입 게이트 시트(튕기지 않음), DM 시트는 안 뜸', async ({ page }) => {
    await page.route(`${SUPABASE}/rest/v1/listings*`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LISTING) }))

    await page.goto(`/e2/${MOCK_LISTING.id}`)
    await page.getByRole('button', { name: 'DM으로 문의하기' }).click()

    // 가입 유도 시트가 뜨고, 화면은 그대로(E2 유지)
    await expect(page.getByText('문의하려면 가입이 필요해요')).toBeVisible()
    await expect(page.getByRole('button', { name: '가입하고 문의하기' })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/e2/${MOCK_LISTING.id}`))

    // 실제 DM 시작 시트("DM 대화 시작하기")는 뜨지 않아야 한다
    await expect(page.getByText('DM 대화 시작하기')).toHaveCount(0)
  })

  test('가입하고 문의하기 → 온보딩 생략, 가입 화면 직행 + returnTo 저장', async ({ page }) => {
    await page.route(`${SUPABASE}/rest/v1/listings*`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LISTING) }))

    await page.goto(`/e2/${MOCK_LISTING.id}`)
    await page.getByRole('button', { name: 'DM으로 문의하기' }).click()
    await page.getByRole('button', { name: '가입하고 문의하기' }).click()

    // 행동 게이트 발 가입 — 역할 선택(A2) 재시작이 아니라 가입 화면(A4) 직행
    await expect(page).toHaveURL('/a4')
    await expect(page.getByText('당신은 누구인가요?')).toHaveCount(0) // 역할 선택 화면 미노출
    // 가입 완료 후 돌아올 매물 경로(문의 시트 재오픈 의도 포함)가 저장돼 있어야 함
    const returnTo = await page.evaluate(() => localStorage.getItem('modu_return_to'))
    expect(returnTo).toBe(`/e2/${MOCK_LISTING.id}?contact=1`)
  })

  test('가입 후 복귀(?contact=1): 비소유자면 문의 시트가 자동으로 열린다', async ({ page }) => {
    await page.route(`${SUPABASE}/rest/v1/listings*`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LISTING) }))
    // 가입 완료(역할 확정) + 이 매물의 소유자가 아님(device 불일치)
    await page.addInitScript(() => {
      localStorage.setItem('modu_device_id', 'buyer-device-xyz')
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller' }))
    })

    await page.goto(`/e2/${MOCK_LISTING.id}?contact=1`)

    // 문의 시트(DM 대화 시작하기)가 자동으로 떠 있어야 한다
    await expect(page.getByRole('button', { name: 'DM 대화 시작하기' })).toBeVisible()
  })

  test('비소유자가 E1 수정 URL 직접 진입 → 수정 폼 대신 E2로 차단', async ({ page }) => {
    await page.route(`${SUPABASE}/rest/v1/listings*`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LISTING) }))
    // 이 매물의 소유자가 아닌 기기
    await page.addInitScript(() =>
      localStorage.setItem('modu_device_id', 'not-the-owner-device'))

    await page.goto(`/e1/1?edit=${MOCK_LISTING.id}`)

    // E1 수정 폼을 열지 않고 매물 상세로 리다이렉트
    await expect(page).toHaveURL(new RegExp(`/e2/${MOCK_LISTING.id}`))
  })
})
