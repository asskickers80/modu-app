/**
 * 뒤로가기 안전판 + 홈 탈출구 (실기기 증상: 상세에서 뒤로 → "로그인 처리 중" 화면에 멈춤)
 * 1. 인증 콜백 페이지가 bfcache로 되살아나면 스피너에 갇히지 않고 앱으로 복귀
 * 2. 직접 진입(스택 없음)한 상세의 뒤로가기는 인증 화면이 아니라 홈으로
 * 3. 상세 화면에 홈 버튼 — 하단 탭 없는 깊은 화면의 탈출구
 */
import { test, expect } from './fixtures.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const ROW = {
  id: 'bn-1', listing_type: 'landlord', deal_type: 'sale', status: 'published',
  address: '인천 영종구 햇내로14번길 9 101호', sale_price: '169000', show_map: false,
  ai_draft: { description: '설명문.' }, edited_texts: {}, item_visibility: {},
  image_urls: [], device_id: 'other', created_at: '2026-08-01T00:00:00Z',
}
const SELLER_ROW = {
  id: 'bn-2', listing_type: 'seller', status: 'published', shop_name: '뒤로 카페',
  address: '서울 마포구 서교동 1', transfer_fee: '3000', transfer_type: 'full',
  ai_draft: { description: '설명문.' }, edited_texts: {}, item_visibility: {},
  review_choices: {}, image_urls: [], device_id: 'other', created_at: '2026-08-01T00:00:00Z',
}

function seed(page, category = 'landlord') {
  return page.addInitScript(cat => {
    localStorage.setItem('modu_device_id', 'bn-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: cat }))
  }, category)
}
function mockRow(page, row) {
  return page.route(`${SUPABASE}/rest/v1/**`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().url().includes('listings') ? row : []) }))
}

test('직접 진입한 상가 상세 → 뒤로가기는 앱 홈으로 (막다른 인증 화면 금지)', async ({ page }) => {
  await seed(page)
  await mockRow(page, ROW)
  await page.goto(`/e2l/${ROW.id}`) // 새 문서 진입 = 스택 없음
  await page.getByRole('button', { name: '' }).first().click().catch(() => {})
  // 좌상단 back 버튼 (aria 없음 → 첫 버튼) 대신 명시적으로 클릭
  await page.locator('button').first().click()
  await expect(page).toHaveURL(/\/a7\/landlord/)
})

test('상가 상세 홈 버튼 → 활성 프로필 홈', async ({ page }) => {
  await seed(page)
  await mockRow(page, ROW)
  await page.goto(`/e2l/${ROW.id}`)
  await page.getByTestId('go-home').click()
  await expect(page).toHaveURL(/\/a7\/landlord/)
})

test('매물 상세(E2) 홈 버튼 → 양도인 홈', async ({ page }) => {
  await seed(page, 'seller')
  await mockRow(page, SELLER_ROW)
  await page.goto(`/e2/${SELLER_ROW.id}`)
  await page.getByTestId('go-home').click()
  await expect(page).toHaveURL(/\/a7\/seller/)
})

test('인증 콜백 bfcache 복원: 스피너에 갇히지 않고 로그인 화면으로 복귀', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
    sessionStorage.setItem('kakao_code_used', 'used-code')
  })
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/auth/kakao-callback?code=used-code')
  await expect(page).toHaveURL(/\/a4/) // 세션 없음 → 재로그인 유도

  // 뒤로가기로 콜백 페이지 복원 시도 — pageshow 가드가 다시 밖으로 보낸다
  await page.goBack()
  await expect(page.getByText('카카오 로그인 처리 중')).toHaveCount(0)
})

test('소스 회귀: 상세 화면은 navigate(-1) 직접 호출 대신 안전 back 사용', async () => {
  const fs = await import('fs')
  for (const f of ['src/screens/E2PropertyDetail.jsx', 'src/screens/E2LPropertyDetail.jsx']) {
    const src = fs.readFileSync(f, 'utf8')
    expect(src.includes('navigate(-1)'), `${f}에 navigate(-1) 잔존`).toBe(false)
    expect(src.includes('useSafeBack')).toBe(true)
  }
})
