/**
 * 헤더 통일 (ORDER-header-unify-v1) — 5축 공통 골격(HomeHeaderBar): 칩 · (뱃지) · 심볼 · (축 확장) · ⋯
 * 알림 벨(껍데기 토스트 + 상시 가짜 빨간 점)·설정 톱니(하단 '마이' 탭 중복)는 제거 —
 * 알림은 실이벤트·알림 센터가 갖춰질 때 UnreadDot 규격으로 일괄 도입(껍데기 벨 금지).
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'
import fs from 'fs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'

const AXES = [
  ['seller', '/a7/seller'],
  ['landlord', '/a7/landlord'],
  ['startup', '/a7/startup'],
  ['operating', '/a7/operating'],
  ['business', '/a7/business'],
]

async function setup(page, cat) {
  await mockGemini(page)
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.addInitScript(c => {
    localStorage.setItem('modu_device_id', 'hd-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: c, name: '김헤더' }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: `p_${c}`, category: c, name: '김헤더', active: true }]))
  }, cat)
}

for (const [cat, path] of AXES) {
  test(`${cat} 헤더: 공통 골격(칩·심볼·⋯) + 벨·톱니 부재`, async ({ page }) => {
    await setup(page, cat)
    await page.goto(path)
    const bar = page.getByTestId('home-header-bar')
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('button', { name: '프로필 추가' })).toBeVisible() // ProfileChips (+)
    await expect(bar.getByRole('button', { name: 'modu symbol' })).toBeVisible() // 심볼 홈 버튼
    // ⋯ 시트는 5축 배선(아래 소스 회귀) — "항목 없으면 미노출" 기존 정책이라 렌더 단언은 생략
    // 알림 벨(가짜 점)·설정 톱니 부재 — 껍데기 제거
    await expect(page.getByText('알림 준비 중이에요')).toHaveCount(0)
    await expect(bar.locator('.bg-red-500, .bg-red-400')).toHaveCount(0) // 상시 가짜 점 사망
  })
}

test('소스 회귀: 5축 전부 HomeHeaderBar+MoreSheet 배선, 벨 svg·알림 토스트 부재', () => {
  const AXIS_FILES = ['A7SellerDashboard', 'A7LandlordDashboard', 'A7StartupFeed', 'A7OperatingDashboard', 'A7BusinessDashboard']
  for (const f of AXIS_FILES) {
    const src = fs.readFileSync(`src/screens/${f}.jsx`, 'utf8')
    expect(src.includes('<HomeHeaderBar'), `${f}: 공용 헤더 미배선`).toBe(true)
    expect(src.includes('MoreSheet'), `${f}: ⋯ 시트 누락`).toBe(true)
    expect(src.includes('알림 준비 중이에요'), `${f}: 껍데기 알림 벨 잔존`).toBe(false)
    expect(/M8 2a5 5 0 015 5/.test(src), `${f}: 벨 아이콘 잔존`).toBe(false)
  }
})

test('축 데이터 차이만 허용: 기업회원 검증 뱃지 + 창업자 탐색 필터(실동작)', async ({ page }) => {
  await setup(page, 'business')
  await page.goto('/a7/business')
  await expect(page.getByText('🛡️ 검증됨')).toBeVisible()

  await setup(page, 'startup')
  await page.goto('/a7/startup')
  await page.getByRole('button', { name: '탐색 필터' }).click()
  await expect(page).toHaveURL('/explore')
})
