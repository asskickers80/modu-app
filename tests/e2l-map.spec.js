/**
 * E2L 지도·거리뷰 + 공개 opt-in (ORDER-e2l-map-roadview-v1)
 * 키 없는 로컬 = 지도 미로드 → 정직 폴백. opt-in ON/OFF 표시, 지오코딩 저장 검증.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, agreeListingTerms } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`

const BASE = {
  id: 'map-1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
  address: '서울 마포구 서교동 400-1', floor: '1층', area: '40',
  deposit: '3000', monthly_rent: '200', review_choices: {}, image_urls: [], device_id: 'x',
}
function mockOne(page, row) {
  return page.route(LISTINGS, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) })
    : r.fulfill({ status: 204, body: '' }))
}

test.describe('E2L 지도 표시·게이팅', () => {
  test('show_map ON + 좌표 → 지도 패널(스크립트 차단 시 정직 폴백, 빈 회색 박스 아님)', async ({ page }) => {
    // 네이버 지도 스크립트 실호출 금지 — 차단해 로드 실패 폴백 경로 검증(키 유무 무관 결정론)
    await page.route('https://oapi.map.naver.com/**', r => r.abort())
    await mockOne(page, { ...BASE, show_map: true, latitude: 37.55, longitude: 126.92 })
    await page.goto('/e2l/map-1')
    await expect(page.locator('#sec-map').getByText('위치', { exact: true })).toBeVisible() // 섹션 탭에도 같은 라벨이 있어 섹션 내부로 한정(ad-frame)
    await expect(page.getByText('지도를 불러오지 못했어요')).toBeVisible() // 로드 실패 → 정직 폴백
  })

  test('show_map ON + 좌표 없음 → "위치 좌표를 준비 중이에요"', async ({ page }) => {
    await mockOne(page, { ...BASE, show_map: true, latitude: null, longitude: null })
    await page.goto('/e2l/map-1')
    await expect(page.getByText('위치 좌표를 준비 중이에요')).toBeVisible()
  })

  test('show_map OFF → 위치 섹션·지도 미표시', async ({ page }) => {
    await mockOne(page, { ...BASE, show_map: false, latitude: 37.55, longitude: 126.92 })
    await page.goto('/e2l/map-1')
    await expect(page.getByTestId('map-panel')).toHaveCount(0)
    await expect(page.getByText('위치 좌표를 준비 중이에요')).toHaveCount(0)
    await expect(page.getByText('지도를 준비 중이에요')).toHaveCount(0)
  })
})

test.describe('E1p 지도 공개 opt-in + 지오코딩 저장', () => {
  test.beforeEach(async ({ page }) => { await mockGemini(page) })

  async function runToSave(page) {
    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click()
    await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
    // 소개글(초안+검수 1화면) — ready 후 도면으로 (draft-quality 4단계)
    const step2Next = page.getByRole('button', { name: /다음 — 도면·서류 추가/ })
    await expect(step2Next).toBeEnabled({ timeout: 15000 })
    await step2Next.click()
    await page.getByRole('button', { name: '다음 — 완성도 확인' }).click()
  }

  test('기본 ON + 지오코딩 좌표 저장', async ({ page }) => {
    let inserted = null
    await page.route(LISTINGS, async r => r.request().method() === 'POST'
      ? (inserted = JSON.parse(r.request().postData()), r.fulfill({ status: 201, contentType: 'application/json', body: '[{"id":"m"}]' }))
      : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route('**/api/geocode', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lat: 37.556, lng: 126.923 }) }))

    await runToSave(page)
    await expect(page.getByTestId('showmap-on')).toBeVisible() // opt-in 기본 노출
    await agreeListingTerms(page)
    await page.getByRole('button', { name: '상가 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await page.getByRole('button', { name: '대시보드로 이동' }).click({ timeout: 5000 })
    await expect(page).toHaveURL(/\/a7\/landlord/)

    const row = Array.isArray(inserted) ? inserted[0] : inserted
    expect(row.show_map).toBe(true)
    expect(row.latitude).toBe(37.556)
    expect(row.longitude).toBe(126.923)
  })

  test('opt-in OFF → show_map=false + 지오코딩 생략(좌표 없음)', async ({ page }) => {
    let inserted = null
    let geocodeCalled = false
    await page.route(LISTINGS, async r => r.request().method() === 'POST'
      ? (inserted = JSON.parse(r.request().postData()), r.fulfill({ status: 201, contentType: 'application/json', body: '[{"id":"m"}]' }))
      : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await runToSave(page)
    // 저장 시점부터 지오코딩 감시 — 초안 단계의 상권 실데이터용 지오코딩(district-data)은 정당 호출이라 제외
    await page.route('**/api/geocode', r => { geocodeCalled = true; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lat: 1, lng: 1 }) }) })
    await page.getByTestId('showmap-off').click() // 비공개 전환
    await agreeListingTerms(page)
    await page.getByRole('button', { name: '상가 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await page.getByRole('button', { name: '대시보드로 이동' }).click({ timeout: 5000 })
    await expect(page).toHaveURL(/\/a7\/landlord/)

    const row = Array.isArray(inserted) ? inserted[0] : inserted
    expect(row.show_map).toBe(false)
    expect(row.latitude).toBeUndefined() // 비공개면 지오코딩 생략
    expect(geocodeCalled).toBe(false)
  })
})
