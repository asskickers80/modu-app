/**
 * 회원가입 의도 vs 기존 계정 — 카카오 콜백 확인 화면
 *
 * 1. 회원가입 탭에서 카카오를 눌렀는데 이미 가입된 계정이면
 *    조용히 로그인하지 않고 "이미 모두 회원이에요" 확인 화면을 보여준다.
 * 2. 확인 화면에서 "돌아가기" → 세션 정리 후 /a4 복귀.
 * 3. 로그인 탭에서 왔으면(intent=login) 확인 없이 바로 대시보드.
 */
import { test, expect } from './fixtures.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'

// 카카오 dev 프록시 + Supabase 인증/REST를 전부 mock — 실호출 없음
async function mockKakaoExistingAccount(page) {
  // 카카오 토큰 교환 + 프로필 (vite dev 프록시 경로)
  await page.route('**/kauth/oauth/token', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'tok' }) }))
  await page.route('**/kapi/v2/user/me', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: 999001, kakao_account: { profile: { nickname: '김기존' } },
    }) }))

  // Supabase REST — profiles는 기존 계정, 나머지는 빈 응답
  await page.route(`${SUPABASE}/rest/v1/**`, route => {
    const method = route.request().method()
    if (method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ status: 204, body: '' })
  })
  await page.route(`${SUPABASE}/rest/v1/profiles*`, route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        category: 'seller', nickname: '김기존', profile_data: {},
      }) })
    }
    return route.fulfill({ status: 204, body: '' })
  })

  // Supabase 인증 — 기존 계정이므로 signInWithPassword 성공
  const user = {
    id: 'u-exist-1', aud: 'authenticated',
    email: 'kakao_999001@kakao.modu.internal',
    user_metadata: { device_id: 'dev-x' },
  }
  await page.route(`${SUPABASE}/auth/v1/token*`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      access_token: 'at', token_type: 'bearer', expires_in: 3600, refresh_token: 'rt', user,
    }) }))
  await page.route(`${SUPABASE}/auth/v1/user*`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))
  await page.route(`${SUPABASE}/auth/v1/logout*`, route =>
    route.fulfill({ status: 204, body: '' }))
}

function seedIntent(page, intent) {
  return page.addInitScript(value => {
    localStorage.setItem('modu_auth_intent', value)
    localStorage.setItem('modu_device_id', 'dev-x') // 기준 기기 ID와 일치 → 병합 없이 통과
  }, intent)
}

test.describe('회원가입 의도 + 기존 카카오 계정', () => {
  test.beforeEach(async ({ page }) => {
    await mockKakaoExistingAccount(page)
  })

  test('회원가입 탭에서 온 기존 계정 → 조용한 로그인 대신 확인 화면', async ({ page }) => {
    await seedIntent(page, 'signup')
    await page.goto('/auth/kakao-callback?code=testcode-signup')

    await expect(page.getByText('이미 모두 회원이에요')).toBeVisible()
    await expect(page.getByRole('button', { name: '기존 계정으로 로그인' })).toBeVisible()
    await expect(page.getByRole('button', { name: '돌아가기' })).toBeVisible()
    // 대시보드로 자동 이동하지 않았어야 한다
    expect(page.url()).toContain('/auth/kakao-callback')
  })

  test('확인 화면에서 돌아가기 → /a4 복귀', async ({ page }) => {
    await seedIntent(page, 'signup')
    await page.goto('/auth/kakao-callback?code=testcode-decline')

    await page.getByRole('button', { name: '돌아가기' }).click()
    await expect(page).toHaveURL(/\/a4/)
  })

  test('기존 계정으로 로그인 선택 → 기존 역할 대시보드 진입', async ({ page }) => {
    await seedIntent(page, 'signup')
    await page.goto('/auth/kakao-callback?code=testcode-accept')

    await page.getByRole('button', { name: '기존 계정으로 로그인' }).click()
    await expect(page).toHaveURL(/\/a7\/seller/)
  })

  test('로그인 탭에서 온 기존 계정 → 확인 없이 바로 대시보드', async ({ page }) => {
    await seedIntent(page, 'login')
    await page.goto('/auth/kakao-callback?code=testcode-login')

    await expect(page).toHaveURL(/\/a7\/seller/)
    await expect(page.getByText('이미 모두 회원이에요')).not.toBeVisible()
  })
})
