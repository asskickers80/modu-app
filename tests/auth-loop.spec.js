/**
 * 뒤로가기 카카오 로그인 무한 루프 수정 (ORDER-auth-loop-fix-v1)
 * 원인: A4의 window.location.href(push)로 인증 URL이 히스토리에 남음 + 콜백 재방문 시 무한 스피너.
 * 수정: 인증 이동 replace(스택 오염 방지) + 콜백 재방문 가드(세션 존재/사용된 code → 대시보드 replace).
 */
import { test, expect } from './fixtures.js'
import { seedSession } from './helpers.js'
import fs from 'fs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'

test('소스 회귀: 인증 이동은 location.replace만 — href(push)로 kauth/nid 이동 금지', () => {
  const src = fs.readFileSync('src/screens/A4SignUp.jsx', 'utf8')
  // window.location.href = `https://kauth... / nid... 패턴 부재
  expect(/window\.location\.href\s*=[\s\S]{0,200}(kauth\.kakao|nid\.naver)/.test(src)).toBe(false)
  expect(src.includes('window.location.replace(')).toBe(true)
})

test.describe('콜백 재방문 가드 — 루프·스피너 갇힘 방지', () => {
  test('세션 있는 상태로 카카오 콜백 재진입 → 토큰 재교환 없이 대시보드 replace', async ({ page }) => {
    await seedSession(page) // 이미 로그인
    await page.addInitScript(() =>
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' })))
    let tokenCalls = 0
    await page.route('**/kauth/oauth/token', r => { tokenCalls++; return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) })
    await page.route('**/api/kakao-auth', r => { tokenCalls++; return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) })
    await page.route(`${SUPABASE}/rest/v1/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/auth/kakao-callback?code=revisit-code')
    await expect(page).toHaveURL(/\/a7\/landlord/, { timeout: 5000 }) // 활성 프로필 대시보드로
    expect(tokenCalls).toBe(0) // 재교환 없음
    await expect(page.getByText('카카오 로그인 처리 중')).toHaveCount(0) // 스피너 갇힘 없음
  })

  test('이미 사용한 code로 재진입(세션 없음) → 스피너 대신 로그인 화면(/a4)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'browsing' }))
      sessionStorage.setItem('kakao_code_used', 'used-code')
    })
    await page.route(`${SUPABASE}/rest/v1/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/auth/kakao-callback?code=used-code')
    await expect(page).toHaveURL(/\/a4/, { timeout: 5000 }) // 세션 없음 → 재로그인 유도(갇힘 없음)
  })

  test('네이버 콜백도 동일: 세션 있으면 대시보드 replace', async ({ page }) => {
    await seedSession(page)
    await page.addInitScript(() =>
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller' })))
    await page.route(`${SUPABASE}/rest/v1/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/auth/naver-callback?code=x&state=y')
    await expect(page).toHaveURL(/\/a7\/seller/, { timeout: 5000 })
  })
})
