/**
 * A7SellerDashboard — "내 공개 매물" 카드 실데이터 연결 검증
 *
 * 1. 매물 1개: 더미 "홍대 고양이 카페" 없음 + 실 shop_name 표시
 * 2. 매물 0개: "아직 등록한 매물이 없어요" 안내 표시
 *
 * 주의: setSellerLocalStorage는 about:blank 컨텍스트에서 호출하면 SecurityError.
 * getProfile()이 빈 localStorage에서 {}를 반환하므로 A7은 프로필 없이도 렌더 가능.
 * → setSellerLocalStorage 없이 mockGemini + route mock + goto 순서로 진행.
 */
import { test, expect } from '../fixtures.js'
import { mockGemini } from '../helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

const MOCK_LISTING = {
  id: 'test-listing-uuid-001',
  shop_name: '테스트 분식집',
  transfer_fee: '1500',
  address: '서울 강남구 역삼동 123-4 1층',
  transfer_type: '영업양도',
  status: 'published',
  image_urls: [],
  device_id: 'test-device-id',
  review_choices: {},
  created_at: new Date().toISOString(),
}

function mockListings(page, rows) {
  return page.route(SUPABASE_LISTINGS, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      })
    } else {
      await route.continue()
    }
  })
}

test.describe('A7 내 공개 매물 카드', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
  })

  test('매물 1개: 실 shop_name 표시, 더미 "홍대 고양이 카페" 없음', async ({ page }) => {
    await mockListings(page, [MOCK_LISTING])
    await page.goto('/a7/seller')

    // 더미 텍스트가 화면에 없어야 함
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()

    // 실 데이터 shop_name이 카드에 표시되어야 함
    await expect(page.getByText('테스트 분식집')).toBeVisible()
  })

  test('사진 없는 매물: "📷 사진 없음" 배지 표시', async ({ page }) => {
    await mockListings(page, [{ ...MOCK_LISTING, image_urls: [] }])
    await page.goto('/a7/seller')

    await expect(page.getByText('📷 사진 없음')).toBeVisible()
  })

  test('사진 있는 매물: "📷 사진 없음" 배지 없음', async ({ page }) => {
    await mockListings(page, [{ ...MOCK_LISTING, image_urls: ['https://example.com/photo.jpg'] }])
    await page.goto('/a7/seller')

    await expect(page.getByText('📷 사진 없음')).not.toBeVisible()
  })

  test('매물 0개: "아직 등록한 매물이 없어요" 안내 표시', async ({ page }) => {
    await mockListings(page, [])
    await page.goto('/a7/seller')

    // 빈 상태 안내 문구 — exact:true 로 카드 내 텍스트만 지정 (완성도 힌트와 구분)
    await expect(page.getByText('아직 등록한 매물이 없어요', { exact: true })).toBeVisible()

    // 더미 텍스트도 없어야 함
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()
  })

  test('매물 0개: Gemini 호출 없이 고정 코칭 문구 표시', async ({ page }) => {
    // beforeEach의 mockGemini보다 나중에 등록 → 이 라우트가 먼저 처리됨 (호출 횟수 집계)
    let geminiCalls = 0
    await page.route('https://generativelanguage.googleapis.com/**', async route => {
      geminiCalls++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'dummy' }] } }] }),
      })
    })

    await mockListings(page, [])
    await page.goto('/a7/seller')

    // 고정 문구가 표시되어야 함
    await expect(page.getByText('첫 매물을 등록해보세요')).toBeVisible()

    // Gemini는 한 번도 호출되지 않아야 함
    expect(geminiCalls, `매물 0개인데 Gemini가 ${geminiCalls}회 호출됨`).toBe(0)
  })
})

test.describe('양도 진행 가이드 — 실데이터 판정', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
  })

  test('매물 0개: 전 단계 미완료, 매물 등록이 현재 단계(탭하여 등록)', async ({ page }) => {
    await mockListings(page, [])
    await page.goto('/a7/seller')
    await expect(page.getByText('아직 등록한 매물이 없어요', { exact: true })).toBeVisible()

    for (const id of ['register', 'photos', 'price', 'contract', 'closing']) {
      await expect(page.getByTestId(`guide-${id}`)).toHaveAttribute('data-done', 'false')
    }
    await expect(page.getByText('탭하여 등록 →')).toBeVisible()
  })

  test('매물 1개·사진 0장: 등록만 완료, 사진 단계가 현재(탭하여 추가)', async ({ page }) => {
    await mockListings(page, [{ ...MOCK_LISTING, image_urls: [] }])
    await page.goto('/a7/seller')
    await expect(page.getByText('테스트 분식집')).toBeVisible()

    await expect(page.getByTestId('guide-register')).toHaveAttribute('data-done', 'true')
    await expect(page.getByTestId('guide-photos')).toHaveAttribute('data-done', 'false')
    await expect(page.getByText('탭하여 추가 →')).toBeVisible()
  })

  test('매물 1개·사진 3장: 등록·사진 완료, 가격 협의는 다음 단계(미완료)', async ({ page }) => {
    await mockListings(page, [{
      ...MOCK_LISTING,
      image_urls: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
    }])
    await page.goto('/a7/seller')
    await expect(page.getByText('테스트 분식집')).toBeVisible()

    await expect(page.getByTestId('guide-register')).toHaveAttribute('data-done', 'true')
    await expect(page.getByTestId('guide-photos')).toHaveAttribute('data-done', 'true')
    await expect(page.getByTestId('guide-price')).toHaveAttribute('data-done', 'false')
    await expect(page.getByText('다음 단계')).toBeVisible()
  })

  test('예시(example) 매물: 실등록 아님 → 매물 등록 미완료', async ({ page }) => {
    await mockListings(page, [{ ...MOCK_LISTING, status: 'example' }])
    await page.goto('/a7/seller')
    await expect(page.getByText('테스트 분식집')).toBeVisible()

    await expect(page.getByTestId('guide-register')).toHaveAttribute('data-done', 'false')
    await expect(page.getByTestId('guide-photos')).toHaveAttribute('data-done', 'false')
  })
})

test.describe('신규 기기 회귀 — localStorage 빈 상태', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
  })

  test('내 매물 0건 표시 + 쿼리에 방금 생성된 device_id 필터 포함', async ({ page }) => {
    let listingsUrl = null
    await page.route(SUPABASE_LISTINGS, async route => {
      listingsUrl = route.request().url()
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.goto('/a7/seller')

    await expect(page.getByText('아직 등록한 매물이 없어요', { exact: true })).toBeVisible()

    // 신규 기기: device_id가 방금 생성됐고, 내 매물 쿼리가 그 값으로 필터했는지
    const deviceId = await page.evaluate(() => localStorage.getItem('modu_device_id'))
    expect(deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(listingsUrl, '내 매물 쿼리에 device_id 필터가 없음').toContain(`device_id=eq.${deviceId}`)
  })

  test('비보안 컨텍스트(crypto.randomUUID 없음): 백지 크래시 없이 렌더 + UUID 폴백', async ({ page }) => {
    // 폰에서 http://IP:5173 접속 시 조건 재현 — randomUUID 제거
    await page.addInitScript(() => { delete Crypto.prototype.randomUUID })
    await mockListings(page, [])
    await page.goto('/a7/seller')

    // 수정 전에는 getDeviceId throw → React 트리 언마운트(백지 화면)였음
    await expect(page.getByText('아직 등록한 매물이 없어요', { exact: true })).toBeVisible()

    // 폴백이 표준 UUID v4 형식으로 생성됐는지 (버전 4·variant 비트 고정)
    const deviceId = await page.evaluate(() => localStorage.getItem('modu_device_id'))
    expect(deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
