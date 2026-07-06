/**
 * Bug 2 회귀 테스트: 탐색 페이지 시장조사 필터 칩 동작
 *
 * 재현: '같은 업종' '같은 브랜드' 칩이 눌리지 않던 버그
 *   - myListing null → disabled=true → !disabled && setSellerFilter 무시
 *   - disabled 스타일이 너무 흐릿해 눌리는 것처럼 보임
 * 기대: myListing 로드 후 → 칩 클릭 → sellerFilter 변경 → 결과 필터링
 */
import { test, expect } from '@playwright/test'
import { mockDailyContents } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const FAKE_DEVICE_ID = 'test-device-explore-001'

// 카페 매물 (나의 업종과 동일)
const CAFE_LISTING = {
  id: 'cafe-01',
  shop_name: '강남 카페',
  biz_type: '카페·디저트',
  address: '서울 마포구 서교동 10-1',
  franchise_brand_name: null,
  area: '30',
  deposit: '2000',
  monthly_rent: '150',
  transfer_fee: '2000',
  transfer_type: 'full',
  image_urls: [],
  review_choices: {},
  status: 'published',
  created_at: '2026-07-01T00:00:00Z',
}

// 다른 업종 매물
const OTHER_LISTING = {
  id: 'other-01',
  shop_name: '강남 치킨집',
  biz_type: '치킨·구이',
  address: '서울 강남구 역삼동 5-5',
  franchise_brand_name: null,
  area: '40',
  deposit: '3000',
  monthly_rent: '200',
  transfer_fee: '1500',
  transfer_type: 'facility',
  image_urls: [],
  review_choices: {},
  status: 'published',
  created_at: '2026-07-02T00:00:00Z',
}

// 나의 매물 (device_id 쿼리에 응답)
const MY_LISTING = {
  id: 'my-listing-01',
  shop_name: '내 카페',
  biz_type: '카페·디저트',
  address: '서울 마포구 서교동 332-4',
  franchise_brand_name: null,
  device_id: FAKE_DEVICE_ID,
  status: 'published',
}

test.describe('탐색 시장조사 필터 칩', () => {
  test.beforeEach(async ({ page }) => {
    await mockDailyContents(page)

    // 양도자 프로필 + device_id
    await page.addInitScript((deviceId) => {
      localStorage.setItem('modu_user_profile', JSON.stringify({
        category: 'seller',
        name: '테스터',
        bizType: '카페·디저트',
        region: '서울',
      }))
      localStorage.setItem('modu_device_id', deviceId)
    }, FAKE_DEVICE_ID)

    // Supabase listings mock:
    // - device_id 쿼리 → 나의 매물 반환
    // - 그 외 → 탐색 매물 목록 반환
    await page.route(`${SUPABASE}/listings*`, async route => {
      const url = route.request().url()
      if (url.includes(`device_id=eq.${FAKE_DEVICE_ID}`)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([MY_LISTING]),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([CAFE_LISTING, OTHER_LISTING]),
        })
      }
    })
  })

  test('myListing 로드 후 같은 업종 칩이 클릭 가능하다', async ({ page }) => {
    await page.goto('/explore')
    // myListing useEffect가 완료될 때까지 대기
    await page.waitForTimeout(800)

    const chip = page.getByRole('button', { name: '같은 업종' })
    await expect(chip).toBeVisible()

    // disabled 속성이 없어야 함 (myListing이 로드됐으므로)
    await expect(chip).not.toBeDisabled()
  })

  test('같은 업종 칩 클릭 → 같은 업종 매물만 표시', async ({ page }) => {
    await page.goto('/explore')
    await page.waitForTimeout(800)

    // 필터 전: 두 매물 모두 보임
    await expect(page.getByText('강남 카페')).toBeVisible()
    await expect(page.getByText('강남 치킨집')).toBeVisible()

    // 같은 업종 칩 클릭
    await page.getByRole('button', { name: '같은 업종' }).click()
    await page.waitForTimeout(200)

    // 카페 매물만 남아야 함
    await expect(page.getByText('강남 카페')).toBeVisible()
    await expect(page.getByText('강남 치킨집')).not.toBeVisible()
  })

  test('같은 업종 칩 재클릭 → 필터 해제', async ({ page }) => {
    await page.goto('/explore')
    await page.waitForTimeout(800)

    const chip = page.getByRole('button', { name: '같은 업종' })

    // 필터 적용
    await chip.click()
    await page.waitForTimeout(200)
    await expect(page.getByText('강남 치킨집')).not.toBeVisible()

    // 같은 칩 다시 클릭 → 해제
    await chip.click()
    await page.waitForTimeout(200)
    await expect(page.getByText('강남 치킨집')).toBeVisible()
  })

  test('myListing 없을 때 필터 칩은 disabled(pointer-events 차단)', async ({ page }) => {
    // myListing이 로드되지 않는 상황: device_id 쿼리는 빈 배열, 탐색 목록만 반환
    await page.route(`${SUPABASE}/listings*`, async route => {
      const url = route.request().url()
      if (url.includes('device_id=eq.')) {
        // 이 device_id에 등록된 매물 없음
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([CAFE_LISTING, OTHER_LISTING]),
        })
      }
    })

    await page.goto('/explore')
    await page.waitForTimeout(800)

    // 3개 칩 전부 disabled 확인 — 매물 없으면 어느 칩도 활성이어선 안 됨
    await expect(page.getByRole('button', { name: '우리 동네' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '같은 업종' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '같은 브랜드' })).toBeDisabled()

    // force 클릭해도 필터가 적용되지 않음 — 두 매물 모두 여전히 보임
    await page.getByRole('button', { name: '같은 업종' }).click({ force: true })
    await page.waitForTimeout(200)
    await expect(page.getByText('강남 치킨집')).toBeVisible()
  })
})
