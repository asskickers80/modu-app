/**
 * 로그인 상태 프로필 추가 — A4 재로그인 요구 제거 (ORDER-profile-add-no-login-v1)
 *
 * 실기기 증상: 로그인 상태에서 (+) 추가 → A2 사장님 → A3 응답 완료 → A4(로그인)가 다시 뜸.
 * 원칙(IDENTITY-MODEL): 로그인 상태의 역할 추가는 인증 절차 없이 즉시 완료.
 * 경로 3종((+) 버튼 / A2부터 / A3 직접) × A4 미노출·roles 합집합·활성 전환 + 비로그인 회귀.
 */
import { test, expect } from './fixtures.js'
import { seedSession } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const UID = 'add-role-user'

async function loggedInSeller(page) {
  await seedSession(page, { id: UID })
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'add-role-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', name: '김추가', region: '서울' }))
    localStorage.setItem('modu_profiles', JSON.stringify([
      { id: 'p_seller', category: 'seller', name: '김추가', active: true },
    ]))
  })
  // syncRolesToServer: getUser 검증 + profiles 조회/PATCH
  await page.route(`${SUPABASE}/auth/v1/user*`, r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: UID, aud: 'authenticated', email: `${UID}@modu.internal`, user_metadata: {} }),
  }))
  const patched = []
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/rest/v1/profiles*`, r => {
    if (r.request().method() === 'PATCH') {
      patched.push(JSON.parse(r.request().postData() || '{}'))
      return r.fulfill({ status: 204, body: '' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profile_data: { roles: ['seller'] } }) })
  })
  return patched
}

async function answerOperating(page) {
  await page.getByRole('button', { name: '카페·디저트' }).click()
  await page.getByRole('button', { name: '서울', exact: true }).click()
  await page.getByText('POS·장부앱 연동').click()
  await page.getByRole('button', { name: '다음 — 내 대시보드 만들기' }).click()
}

function expectAddedOperating(page, patched) {
  return (async () => {
    await expect(page).toHaveURL('/a7/operating') // A4 미경유 — 바로 새 축 홈
    const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_profiles') || '[]'))
    expect(profiles.map(p => p.category).sort()).toEqual(['operating', 'seller']) // 합집합 — 기존 역할 보존
    expect(profiles.find(p => p.active)?.category).toBe('operating')             // 활성 = 방금 추가한 축
    const me = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_user_profile') || '{}'))
    expect(me.category).toBe('operating')
    expect(me.biz).toBe('cafe') // A3 응답이 활성 프로필에 저장
    // 서버 roles 합집합 반영 (syncRolesToServer)
    await expect.poll(() => patched.length).toBeGreaterThan(0)
    expect(patched.at(-1).profile_data.roles.sort()).toEqual(['operating', 'seller'])
  })()
}

test('경로1: (+) 버튼 → 추가 시트 → A2(multiprofile) 도달', async ({ page }) => {
  await loggedInSeller(page)
  await page.goto('/a7/seller')
  await page.getByRole('button', { name: '+', exact: true }).click()
  await page.getByText('+ 새 프로필 추가').click()
  await expect(page).toHaveURL('/a2?multiprofile=1')
})

test('경로2: A2부터 사장님 선택 → A3 응답 → A4 없이 완료 (실기기 증상 재현 경로)', async ({ page }) => {
  const patched = await loggedInSeller(page)
  await page.goto('/a2?multiprofile=1')
  await page.getByText('현재 영업 중, 운영에 필요한 모든 것!').click() // 사장님 구름
  await page.getByRole('button', { name: /다음/ }).click()
  await expect(page).toHaveURL(/\/a3\/operating/)
  await answerOperating(page)
  await expectAddedOperating(page, patched)
})

test('경로3: A3 직접 진입 → 응답 → A4 없이 완료', async ({ page }) => {
  const patched = await loggedInSeller(page)
  await page.goto('/a3/operating')
  await answerOperating(page)
  await expectAddedOperating(page, patched)
})

test('비로그인 회귀: A3 응답 완료 → 현행대로 A4(가입·로그인)로', async ({ page }) => {
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.goto('/a3/operating')
  await answerOperating(page)
  await expect(page).toHaveURL(/\/a4/)
})
