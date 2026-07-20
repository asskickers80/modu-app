/**
 * 홈 헤더 업종·지역 — 매물 기준 전환 (ORDER-home-header-source-of-truth)
 *
 * 1. 매물 0건 → 온보딩 선택값 유지
 * 2. 매물 1건 → 매물의 업종 + 매물 주소의 시/도 (시·군은 미노출)
 * 3. 2건 이상 → 최근 등록 매물 기준
 * 4. 매물 주소 수정 → 헤더 즉시 갱신
 * 5. 온보딩 원본 값은 프로필에 그대로 보존 (표시만 분기)
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

// 온보딩 선택값 — 매물과 일부러 다르게 둔다 (어느 쪽이 이겼는지 구분되도록)
const ONBOARDING = { category: 'seller', bizType: '패스트푸드', region: '경기' }

const BASE = {
  transfer_fee: '3000', transfer_type: 'full', status: 'published',
  shop_name_public: true, image_urls: [], interior_image_urls: [],
  device_id: 'header-device', review_choices: {},
}
// 다음(Daum) 우편번호 API 정식명 포맷
const WONJU = {
  ...BASE, id: 'l-wonju', shop_name: '원주 가게', biz_type: '치킨·피자',
  address: '강원특별자치도 원주시 시청로 1', created_at: '2026-07-10T00:00:00.000Z',
}
const SEOUL = {
  ...BASE, id: 'l-seoul', shop_name: '서울 가게', biz_type: '카페·디저트',
  address: '서울특별시 마포구 양화로 1', created_at: '2026-07-19T00:00:00.000Z',
}

function seed(page, profile = ONBOARDING) {
  return page.addInitScript(p => {
    localStorage.setItem('modu_user_profile', JSON.stringify(p))
  }, profile)
}

function mockListings(page, rows) {
  return page.route(SUPABASE_LISTINGS, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    } else {
      await route.continue()
    }
  })
}

test.describe('홈 헤더 진실의 원천', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
  })

  test('매물 0건: 온보딩 선택값 유지', async ({ page }) => {
    await seed(page)
    await mockListings(page, [])
    await page.goto('/a7/seller')

    await expect(page.getByText('패스트푸드 양도 준비 중')).toBeVisible()
    await expect(page.getByText('경기 지역')).toBeVisible()
  })

  test('매물 1건(원주): 업종·지역이 매물 기준 — "강원 지역"', async ({ page }) => {
    await seed(page)
    await mockListings(page, [WONJU])
    await page.goto('/a7/seller')

    await expect(page.getByText('치킨·피자 양도 준비 중')).toBeVisible()
    await expect(page.getByText('강원 지역')).toBeVisible()

    // 온보딩값이 헤더를 이기면 안 됨
    await expect(page.getByText('경기 지역')).toHaveCount(0)
  })

  test('시·군 단위는 헤더에 노출하지 않는다', async ({ page }) => {
    await seed(page)
    await mockListings(page, [WONJU])
    await page.goto('/a7/seller')

    await expect(page.getByText('강원 지역')).toBeVisible()
    await expect(page.getByText('원주시 지역')).toHaveCount(0)
    await expect(page.getByText('강원특별자치도 지역')).toHaveCount(0)
  })

  test('축약형 주소("서울 마포구 …")도 시/도로 인식', async ({ page }) => {
    await seed(page)
    await mockListings(page, [{ ...SEOUL, address: '서울 마포구 서교동 332-4' }])
    await page.goto('/a7/seller')

    await expect(page.getByText('서울 지역')).toBeVisible()
  })

  test('매물 2건: 가장 최근 등록 매물 기준', async ({ page }) => {
    // 조회는 created_at 내림차순 — 서울(7/19)이 원주(7/10)보다 최근
    await seed(page)
    await mockListings(page, [SEOUL, WONJU])
    await page.goto('/a7/seller')

    await expect(page.getByText('카페·디저트 양도 준비 중')).toBeVisible()
    await expect(page.getByText('서울 지역')).toBeVisible()
    await expect(page.getByText('강원 지역')).toHaveCount(0)
  })

  test('example 매물만 있으면 0건 취급 — 온보딩값 유지', async ({ page }) => {
    await seed(page)
    await mockListings(page, [{ ...WONJU, status: 'example' }])
    await page.goto('/a7/seller')

    await expect(page.getByText('패스트푸드 양도 준비 중')).toBeVisible()
    await expect(page.getByText('경기 지역')).toBeVisible()
  })

  test('주소를 알 수 없으면 온보딩 지역으로 폴백', async ({ page }) => {
    await seed(page)
    await mockListings(page, [{ ...WONJU, address: '' }])
    await page.goto('/a7/seller')

    await expect(page.getByText('경기 지역')).toBeVisible()
  })

  test('매물 주소 수정 → 헤더 갱신', async ({ page }) => {
    await seed(page)
    let address = '강원특별자치도 원주시 시청로 1'
    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify([{ ...WONJU, address }]),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/a7/seller')
    await expect(page.getByText('강원 지역')).toBeVisible()

    // 매물 주소가 부산으로 수정된 상태를 시뮬레이션 → 재진입 시 헤더가 따라와야 함
    address = '부산광역시 해운대구 우동 1'
    await page.reload()
    await expect(page.getByText('부산 지역')).toBeVisible()
    await expect(page.getByText('강원 지역')).toHaveCount(0)
  })

  test('온보딩 원본 값은 프로필에 그대로 보존 (표시만 분기)', async ({ page }) => {
    await seed(page)
    await mockListings(page, [WONJU])
    await page.goto('/a7/seller')
    await expect(page.getByText('강원 지역')).toBeVisible()

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_user_profile')))
    expect(saved.region, '온보딩 지역이 매물 기준으로 덮어써짐').toBe('경기')
    expect(saved.bizType, '온보딩 업종이 매물 기준으로 덮어써짐').toBe('패스트푸드')
  })
})
