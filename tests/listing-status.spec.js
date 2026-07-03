/**
 * 매물 상태 관리 (공개중 → 숨김 → 거래완료)
 *
 * 1. A7 숨기기 → update(status=hidden, 소유권 필터) + 탐색에서 미노출
 * 2. hidden 매물: A7 "숨김" 배지 + 다시 공개 → status=published + 탐색 재등장
 * 3. completed 매물: 수정 진입 차단 (토스트 + 이동 없음)
 * 4. 남의 hidden 매물 E2 직접 접근 → "매물을 찾을 수 없어요"
 * 5. 내 hidden 매물 E2 접근 → 보이되 숨김 상태 배너
 */
import { test, expect } from '@playwright/test'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const MY_DEVICE = 'status-test-device'

const LISTING = {
  id: 'cccccccc-dddd-eeee-ffff-000000000000',
  shop_name: '상태 테스트 카페',
  address: '서울 마포구 서교동 5-5',
  area: '33',
  deposit: '3000',
  monthly_rent: '200',
  transfer_fee: '2500',
  transfer_type: 'full',
  ai_draft: {},
  review_choices: {},
  edited_texts: {},
  image_urls: [],
  facilities: [],
  status: 'published',
  device_id: MY_DEVICE,
  created_at: new Date().toISOString(),
}

/**
 * 상태 반영형 mock — PATCH가 오면 status를 기억했다가 이후 GET에 반영.
 * PostgREST의 status=eq.published 필터도 에뮬레이션 (탐색 조회용).
 */
function mockStatefulListing(page, initialStatus, onPatch) {
  const state = { status: initialStatus, lastPatchUrl: null, lastPatchBody: null }
  page.route(SUPABASE_LISTINGS, async route => {
    const req = route.request()
    if (req.method() === 'PATCH') {
      state.lastPatchUrl = req.url()
      state.lastPatchBody = JSON.parse(req.postData())
      if (state.lastPatchBody.status) state.status = state.lastPatchBody.status
      if (onPatch) onPatch(req)
      await route.fulfill({ status: 204, body: '' })
    } else {
      const row = { ...LISTING, status: state.status }
      const rows = req.url().includes('status=eq.published')
        ? (row.status === 'published' ? [row] : [])
        : [row]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      })
    }
  })
  return state
}

test.describe('매물 상태 관리', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page) // E2 경유 테스트의 실거래 API 외부 의존 차단
    await page.addInitScript(id => localStorage.setItem('modu_device_id', id), MY_DEVICE)
  })

  test('숨기기: update(status=hidden, 소유권 필터) + 탐색 미노출', async ({ page }) => {
    const state = mockStatefulListing(page, 'published')

    await page.goto('/a7/seller')
    await expect(page.getByText('상태 테스트 카페')).toBeVisible()
    await expect(page.getByText('공개 중', { exact: true })).toBeVisible()

    // 더보기 → 매물 숨기기
    await page.getByRole('button', { name: '···' }).click()
    await page.getByText('매물 숨기기').click()

    await expect(page.getByText('매물을 숨겼어요 — 탐색에서 보이지 않아요')).toBeVisible()
    expect(state.lastPatchBody.status).toBe('hidden')
    expect(state.lastPatchUrl).toContain(`id=eq.${LISTING.id}`)
    expect(state.lastPatchUrl, '소유권(device_id) 필터 없이 update됨').toContain(`device_id=eq.${MY_DEVICE}`)
    // 상태 변경 추적성 — updated_at을 함께 갱신해야 변경 시각이 남는다
    expect(state.lastPatchBody.updated_at, 'status 변경에 updated_at 미갱신').toBeTruthy()
    expect(new Date(state.lastPatchBody.updated_at).toString()).not.toBe('Invalid Date')

    // 재조회 후 A7 배지가 숨김으로
    await expect(page.getByText('숨김', { exact: true })).toBeVisible()

    // 탐색: published 필터로 조회 → hidden 매물 미노출
    await page.goto('/explore')
    await expect(page.getByText('조건에 맞는 매물이 없어요')).toBeVisible()
    await expect(page.getByText('상태 테스트 카페')).not.toBeVisible()
  })

  test('hidden 매물: A7 숨김 배지 + 다시 공개 → status=published + 탐색 재등장', async ({ page }) => {
    const state = mockStatefulListing(page, 'hidden')

    await page.goto('/a7/seller')
    await expect(page.getByText('숨김', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: '···' }).click()
    await page.getByText('다시 공개하기').click()
    await expect(page.getByText('매물을 다시 공개했어요')).toBeVisible()
    expect(state.lastPatchBody.status).toBe('published')

    // published 매물은 탐색에 재등장
    await page.goto('/explore')
    await expect(page.getByText('상태 테스트 카페')).toBeVisible()
  })

  test('completed 매물: 수정 진입 차단 + 거래완료 배지', async ({ page }) => {
    mockStatefulListing(page, 'completed')

    await page.goto('/a7/seller')
    await expect(page.getByText('거래완료', { exact: true })).toBeVisible()

    // 더보기 → 매물 수정하기 → 차단 토스트, 이동 없음
    await page.getByRole('button', { name: '···' }).click()
    await expect(page.getByText('매물 숨기기')).not.toBeVisible()
    await expect(page.getByText('거래 완료 처리')).not.toBeVisible()
    await page.getByText('매물 수정하기').click()
    await expect(page.getByText('거래완료된 매물은 수정할 수 없어요')).toBeVisible()
    await expect(page).toHaveURL(/\/a7\/seller/)
  })

  test('남의 hidden 매물 E2 직접 접근: 매물을 찾을 수 없어요', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...LISTING, status: 'hidden', device_id: 'someone-else-device' }),
      })
    })

    await page.goto(`/e2/${LISTING.id}`)
    await expect(page.getByText('매물을 찾을 수 없어요')).toBeVisible()
    await expect(page.getByText('상태 테스트 카페')).not.toBeVisible()
  })

  test('내 hidden 매물 E2 접근: 보이되 숨김 상태 배너', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...LISTING, status: 'hidden' }),
      })
    })

    await page.goto(`/e2/${LISTING.id}`)
    await expect(page.getByText('상태 테스트 카페')).toBeVisible()
    await expect(page.getByText(/숨김 상태예요/)).toBeVisible()
  })
})
