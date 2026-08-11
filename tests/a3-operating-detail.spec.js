/**
 * 사장님 A3 업종·지역 고도화 (ORDER-a3-operating-detail-v1)
 * 양도인 수준: 업종 2단계(대분류→소분류+검색, IndustryPicker) / 지역 2단계(시도→시군구+검색, RegionPicker).
 * 저장 필드는 양도인과 동일 구조(category_main·category_sub·ksic_code / region·region_sub).
 *
 * 검증은 로그인 즉시 완료 경로(saveProfile 실행 지점) — 비로그인 A3→A4 answers 전달은
 * A4 소셜 버튼 클릭 시에만 보관되므로(A4SignUp stashOnboardingAnswers) 여기서 다루지 않고,
 * 비로그인 A4행 회귀는 profile-add-no-login.spec이 고정한다.
 */
import { test, expect } from './fixtures.js'
import { seedSession } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'

async function setup(page) {
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/auth/v1/user*`, r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 'a3op-user', aud: 'authenticated', user_metadata: {} }),
  }))
  await seedSession(page, { id: 'a3op-user' }) // 로그인 — A3 완료 즉시 saveProfile + 홈 직행
  await page.addInitScript(() => localStorage.setItem('modu_device_id', 'a3op-dev'))
}

const readProfile = page => page.evaluate(() => JSON.parse(localStorage.getItem('modu_user_profile') || '{}'))

test('업종 2단계 + 지역 2단계 드릴다운 선택 저장 (양도인과 동일 필드)', async ({ page }) => {
  await setup(page)
  await page.goto('/a3/operating')
  await page.getByRole('button', { name: '카페·베이커리' }).click()
  await page.getByRole('button', { name: '카페·커피전문점' }).click() // 소분류 드릴다운
  await page.getByRole('button', { name: '서울', exact: true }).click()
  await page.getByRole('button', { name: '마포구' }).click() // 지역 시군구 드릴다운
  await page.getByText('POS·장부앱 연동').click()
  await page.getByRole('button', { name: '다음 — 내 대시보드 만들기' }).click()
  await expect(page).toHaveURL('/a7/operating')

  const p = await readProfile(page)
  expect(p.category_main).toBe('카페·베이커리')
  expect(p.category_sub).toBe('카페·커피전문점')
  expect(p.ksic_code).toBe('56221')
  expect(p.region).toBe('서울')
  expect(p.region_sub).toBe('마포구')
  expect(p.bizLabel).toBe('카페·커피전문점') // 홈 호환 라벨 = 소분류 우선
})

test('업종 직접 검색: 동의어(통닭) → 치킨 자동 세팅', async ({ page }) => {
  await setup(page)
  await page.goto('/a3/operating')
  await page.getByRole('button', { name: '요식업' }).click()
  await page.getByRole('button', { name: '업종 직접 검색' }).click()
  await page.getByPlaceholder(/업종을 입력해보세요/).fill('통닭')
  await page.getByRole('button', { name: /치킨/ }).first().click()
  await expect(page.getByRole('button', { name: '치킨', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '서울', exact: true }).click()
  await page.getByText('아직 안 해요').click()
  await page.getByRole('button', { name: '다음 — 내 대시보드 만들기' }).click()
  await expect(page).toHaveURL('/a7/operating')
  const p = await readProfile(page)
  expect(p.category_sub).toBe('치킨')
  expect(p.ksic_code).toBe('56193')
})

test('지역 직접 검색: 수원 → 경기 수원시 자동 세팅', async ({ page }) => {
  await setup(page)
  await page.goto('/a3/operating')
  await page.getByRole('button', { name: '카페·베이커리' }).click()
  await page.getByRole('button', { name: '경기', exact: true }).click()
  await page.getByRole('button', { name: '지역 직접 검색' }).click()
  await page.getByPlaceholder(/지역을 입력해보세요/).fill('수원')
  await page.getByRole('button', { name: /수원시/ }).first().click()
  await page.getByText('수동 입력').click()
  await page.getByRole('button', { name: '다음 — 내 대시보드 만들기' }).click()
  await expect(page).toHaveURL('/a7/operating')
  const p = await readProfile(page)
  expect(p.region).toBe('경기')
  expect(p.region_sub).toBe('수원시')
})

test('온라인·무점포 선택지 보존 + 홈 반영(bizLabel 소분류)', async ({ page }) => {
  await setup(page)
  await page.goto('/a3/operating')
  await page.getByRole('button', { name: '카페·베이커리' }).click()
  await page.getByRole('button', { name: '카페·커피전문점' }).click()
  await page.getByRole('button', { name: '온라인·무점포' }).click()
  await page.getByText('아직 안 해요').click()
  await page.getByRole('button', { name: '다음 — 내 대시보드 만들기' }).click()

  // 홈 반영: 운영중 홈 헤더에 소분류 라벨 표시 (profile.bizLabel)
  await expect(page).toHaveURL('/a7/operating')
  await expect(page.getByText('카페·커피전문점').first()).toBeVisible()
})
