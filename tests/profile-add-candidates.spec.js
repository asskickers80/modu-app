/**
 * 프로필 전환 시트 — "다른 카테고리로 추가" 후보 목록 (2026-08-11 대표 정책)
 * 6종 전부 후보: 보유분만 제외하고 전부 표시 (방문자 제외 필터 폐기).
 * 방문자는 A3 질문이 없어 후보 탭 시 즉시 추가+전환.
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const ALL = { seller: '양도인', landlord: '소유주', startup: '창업자', operating: '사장님', business: '기업회원', browsing: '방문자' }

async function setup(page, ownedCats) {
  await mockGemini(page)
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.addInitScript(cats => {
    localStorage.setItem('modu_device_id', 'cand-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: cats[0], name: '김후보' }))
    localStorage.setItem('modu_profiles', JSON.stringify(
      cats.map((c, i) => ({ id: `p_${c}`, category: c, name: '김후보', active: i === 0 }))))
  }, ownedCats)
}

async function openSheet(page, activeLabel) {
  await page.getByRole('button', { name: activeLabel }).click() // 활성 알약 → 시트
  await expect(page.getByText('다른 카테고리로 추가')).toBeVisible()
}

test('2개 보유(양도인·소유주) → 후보 4개: 창업자·사장님·기업회원·방문자', async ({ page }) => {
  await setup(page, ['seller', 'landlord'])
  await page.goto('/a7/seller')
  await openSheet(page, '양도인')
  for (const label of ['창업자', '사장님', '기업회원', '방문자']) {
    await expect(page.getByRole('button', { name: `+ ${label}` })).toBeVisible()
  }
  for (const label of ['양도인', '소유주']) {
    await expect(page.getByRole('button', { name: `+ ${label}` })).toHaveCount(0) // 보유분 제외
  }
})

test('5개 보유(방문자만 미보유) → 후보 1개: 방문자', async ({ page }) => {
  await setup(page, ['seller', 'landlord', 'startup', 'operating', 'business'])
  await page.goto('/a7/seller')
  await openSheet(page, '양도인')
  await expect(page.getByRole('button', { name: '+ 방문자' })).toBeVisible()
  for (const label of Object.values(ALL).filter(l => l !== '방문자')) {
    await expect(page.getByRole('button', { name: `+ ${label}` })).toHaveCount(0)
  }
})

test('6개 전부 보유 → 추가 후보 섹션 미노출', async ({ page }) => {
  await setup(page, Object.keys(ALL))
  await page.goto('/a7/seller')
  await page.getByRole('button', { name: '양도인' }).first().click()
  await expect(page.getByText('프로필 전환')).toBeVisible()
  await expect(page.getByText('다른 카테고리로 추가')).toHaveCount(0)
})

test('방문자 후보 탭 → A2·A4 없이 즉시 추가 + 방문자 홈 전환', async ({ page }) => {
  await setup(page, ['seller'])
  await page.goto('/a7/seller')
  await openSheet(page, '양도인')
  await page.getByRole('button', { name: '+ 방문자' }).click()
  await expect(page).toHaveURL('/a7/browsing')
  const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_profiles') || '[]'))
  expect(profiles.map(p => p.category).sort()).toEqual(['browsing', 'seller'])
  expect(profiles.find(p => p.active)?.category).toBe('browsing')
})

test('실역할 후보 탭 → A2(multiprofile) 경유 유지 (A3 질문 필요)', async ({ page }) => {
  await setup(page, ['seller'])
  await page.goto('/a7/seller')
  await openSheet(page, '양도인')
  await page.getByRole('button', { name: '+ 사장님' }).click()
  await expect(page).toHaveURL('/a2?multiprofile=1&preset=operating')
})
