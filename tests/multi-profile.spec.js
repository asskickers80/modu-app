/**
 * 멀티 프로필 병합 (ORDER-multi-profile-merge-v1)
 * (a) 신규 선택 + 기존 계정 = 합집합(덮어쓰기 없음)  (b) 칩 렌더+전환
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'

// A4 handleKakaoLogin과 동일 인코딩: btoa(encodeURIComponent(JSON)) → URL용 encodeURIComponent.
// (Node엔 btoa가 없어 Buffer로 동일 base64 생성 — ASCII라 결과 일치)
function encodeKakaoState(payload) {
  const b64 = Buffer.from(encodeURIComponent(JSON.stringify(payload))).toString('base64')
  return encodeURIComponent(b64)
}

test.describe('멀티 프로필', () => {
  test('보유 프로필 전부 칩 렌더 + 비활성 점 탭 전환', async ({ page }) => {
    await mockGemini(page)
    await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      : r.fulfill({ status: 204, body: '' }))
    await page.addInitScript(() => {
      localStorage.setItem('modu_device_id', 'mp-dev')
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', name: '김멀티' }))
      localStorage.setItem('modu_profiles', JSON.stringify([
        { id: 'p_seller', category: 'seller', name: '김멀티', active: true },
        { id: 'p_operating', category: 'operating', name: '김멀티', active: false },
        { id: 'p_landlord', category: 'landlord', name: '김멀티', active: false },
      ]))
    })

    await page.goto('/a7/seller')
    // 활성 = 양도인 칩, 비활성 = 사장님·소유주 점(aria-label)
    await expect(page.getByRole('button', { name: '양도인' })).toHaveAttribute('data-active', 'true')
    await expect(page.getByRole('button', { name: '사장님' })).toBeVisible()
    await expect(page.getByRole('button', { name: '소유주' })).toBeVisible()

    // 사장님(운영중) 점 탭 → 전환
    await page.getByRole('button', { name: '사장님' }).click()
    await expect(page).toHaveURL('/a7/operating')
  })

  test('신규 선택(landlord)+기존 계정(seller+operating) 로그인 = 합집합, 활성=landlord', async ({ page }) => {
    await mockGemini(page)
    await page.route('**/kauth/oauth/token', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'tok' }) }))
    await page.route('**/kapi/v2/user/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 999002, kakao_account: { profile: { nickname: '김멀티' } } }) }))
    // 넓은 REST mock 먼저, profiles* 나중(LIFO로 profiles가 이김)
    await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      : r.fulfill({ status: 204, body: '' }))
    await page.route(`${SUPABASE}/rest/v1/profiles*`, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ category: 'seller', nickname: '김멀티', profile_data: { roles: ['seller', 'operating'] } }) })
      : r.fulfill({ status: 204, body: '' }))
    const user = { id: 'u-multi', aud: 'authenticated', email: 'kakao_999002@kakao.modu.internal', user_metadata: { device_id: 'dev-x' } }
    await page.route(`${SUPABASE}/auth/v1/token*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'at', token_type: 'bearer', expires_in: 3600, refresh_token: 'rt', user }) }))
    await page.route(`${SUPABASE}/auth/v1/user*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))

    await page.addInitScript(() => {
      localStorage.setItem('modu_device_id', 'dev-x')          // canonical과 일치 → 병합 스킵
      localStorage.setItem('modu_auth_intent', 'login')        // 로그인 의도 → 확인화면 없이 진행
      localStorage.setItem('modu_onboarding_answers', JSON.stringify({ category: 'landlord', region: '서울' }))
    })

    await page.goto('/auth/kakao-callback?code=multi-code')
    await expect(page).toHaveURL(/\/a7\/landlord/, { timeout: 10_000 })

    const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_profiles') || '[]'))
    const cats = profiles.map(p => p.category).sort()
    expect(cats).toEqual(['landlord', 'operating', 'seller']) // 합집합 — 운영중 소실 없음, 임대인 추가
    expect(profiles.find(p => p.active)?.category).toBe('landlord')
  })

  // 실기기 버그 재현: 카카오 왕복이 인앱 브라우저/다른 컨텍스트로 떨어져 localStorage(pending)가
  // 콜백에 승계되지 않는 경우 — 오직 OAuth state만 선택 역할을 나른다.
  test('카카오 컨텍스트 소실: localStorage에 pending 없어도 state로 landlord 병합', async ({ page }) => {
    await mockGemini(page)
    await page.route('**/kauth/oauth/token', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'tok' }) }))
    await page.route('**/kapi/v2/user/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 999004, kakao_account: { profile: { nickname: '김컨텍' } } }) }))
    await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      : r.fulfill({ status: 204, body: '' }))
    // 기존 계정: seller만
    await page.route(`${SUPABASE}/rest/v1/profiles*`, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ category: 'seller', nickname: '김컨텍', profile_data: { roles: ['seller'] } }) })
      : r.fulfill({ status: 204, body: '' }))
    const user = { id: 'u-ctx', aud: 'authenticated', email: 'kakao_999004@kakao.modu.internal', user_metadata: { device_id: 'dev-x' } }
    await page.route(`${SUPABASE}/auth/v1/token*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'at', token_type: 'bearer', expires_in: 3600, refresh_token: 'rt', user }) }))
    await page.route(`${SUPABASE}/auth/v1/user*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))

    await page.addInitScript(() => {
      localStorage.setItem('modu_device_id', 'dev-x') // canonical과 일치 → 병합 스킵
      // ⚠️ 컨텍스트 소실 재현: pending_roles·onboarding_answers·auth_intent 전부 없음.
      //    A2/A4가 다른 브라우저 컨텍스트에서 쓴 값이 여기로 넘어오지 않았다고 가정.
    })

    // authorize 때 state에 landlord를 실어 보냈다 → 콜백 URL의 state만이 역할을 나른다
    const state = encodeKakaoState({ r: ['landlord'], c: 'seller', i: 'login' })
    await page.goto(`/auth/kakao-callback?code=ctx-lost&state=${state}`)
    await expect(page).toHaveURL(/\/a7\/landlord/, { timeout: 10_000 })

    const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_profiles') || '[]'))
    expect(profiles.map(p => p.category).sort()).toEqual(['landlord', 'seller']) // state로 병합 — seller만 남지 않음
    expect(profiles.find(p => p.active)?.category).toBe('landlord')
  })

  // 실기기 재현 경로: A2에서 역할 고른 뒤 "로그인 지름길"로 들어가는 경우
  test('A2 역할 선택 후 로그인 지름길 → 선택이 modu_pending_roles에 저장(소실 방지)', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('상가 보유 중, 팔거나 임대 맞추고 싶어요!').click() // 소유주(임대인) 구름
    await page.getByRole('button', { name: /로그인/ }).click()
    await expect(page).toHaveURL(/\/a4/)
    const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_pending_roles') || '[]'))
    expect(pending).toContain('landlord') // 지름길이 선택을 저장해야 로그인 병합에서 합류됨
  })

  test('경로무관: A2 칩 토글 = 선택 즉시 저장(내비 전)', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('상가 보유 중, 팔거나 임대 맞추고 싶어요!').click() // 임대인 선택만 (다음/지름길 누르지 않음)
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('modu_pending_roles') || '[]')))
      .toContain('landlord')
  })

  test('경로무관: A3 직접 진입 = 자기 역할 pending 보장(URL 직접)', async ({ page }) => {
    await page.goto('/a3/landlord') // 온보딩 거치지 않고 URL 직접
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('modu_pending_roles') || '[]')))
      .toContain('landlord')
  })

  test('로그인 지름길 경로(pending_roles, 온보딩답변 없음) + 기존 계정 = 합집합, 선택 역할 활성', async ({ page }) => {
    await mockGemini(page)
    await page.route('**/kauth/oauth/token', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'tok' }) }))
    await page.route('**/kapi/v2/user/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 999003, kakao_account: { profile: { nickname: '김구계정' } } }) }))
    await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      : r.fulfill({ status: 204, body: '' }))
    // 구계정: profile_data에 roles 없음(단수 seller만)
    await page.route(`${SUPABASE}/rest/v1/profiles*`, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ category: 'seller', nickname: '김구계정', profile_data: {} }) })
      : r.fulfill({ status: 204, body: '' }))
    const user = { id: 'u-old', aud: 'authenticated', email: 'kakao_999003@kakao.modu.internal', user_metadata: { device_id: 'dev-x' } }
    await page.route(`${SUPABASE}/auth/v1/token*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'at', token_type: 'bearer', expires_in: 3600, refresh_token: 'rt', user }) }))
    await page.route(`${SUPABASE}/auth/v1/user*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))

    await page.addInitScript(() => {
      localStorage.setItem('modu_device_id', 'dev-x')
      localStorage.setItem('modu_auth_intent', 'login')
      localStorage.setItem('modu_pending_roles', JSON.stringify(['landlord'])) // 지름길이 저장한 선택
      // 온보딩 답변 없음 (A3 거치지 않은 지름길 경로)
    })

    await page.goto('/auth/kakao-callback?code=old-acc')
    await expect(page).toHaveURL(/\/a7\/landlord/, { timeout: 10_000 })
    const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_profiles') || '[]'))
    expect(profiles.map(p => p.category).sort()).toEqual(['landlord', 'seller']) // 선택 소실 없음
    expect(profiles.find(p => p.active)?.category).toBe('landlord')             // 고른 역할이 활성
  })
})
