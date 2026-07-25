/**
 * E2L 지도·거리뷰 + 공개 opt-in (ORDER-e2l-map-roadview-v1)
 * 키 없는 로컬 = 지도 미로드 → 정직 폴백. opt-in ON/OFF 표시, 지오코딩 저장 검증.
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

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
  test('show_map ON + 좌표 → 지도 패널(키 없어 준비중 폴백, 빈 회색 박스 아님)', async ({ page }) => {
    await mockOne(page, { ...BASE, show_map: true, latitude: 37.55, longitude: 126.92 })
    await page.goto('/e2l/map-1')
    await expect(page.getByText('위치', { exact: true })).toBeVisible()
    await expect(page.getByText('지도를 준비 중이에요')).toBeVisible() // 키 미설정 → 정직 폴백
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
    const s2 = page.getByRole('button', { name: /다음 — 검수·공개 선택/ })
    await expect(async () => { await s2.click(); await expect(page).toHaveURL(/\/e1p\/3/, { timeout: 1000 }) }).toPass({ timeout: 15000 })
    await page.getByRole('button', { name: /다음 — 도면·서류 추가/ }).click()
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
    await page.route('**/api/geocode', r => { geocodeCalled = true; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lat: 1, lng: 1 }) }) })

    await runToSave(page)
    await page.getByTestId('showmap-off').click() // 비공개 전환
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
