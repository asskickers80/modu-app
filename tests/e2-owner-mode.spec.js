/**
 * E2 매물 상세 — 소유자 모드 (ORDER-e2-owner-mode)
 *
 * 1. 내 매물: 안내 바 + "매물 수정하기" + 상태 전환, 문의하기·찜 부재
 * 2. 남의 매물: 현행 그대로 (문의하기 노출, 소유자 UI 부재)
 * 3. 상태 전환 → 소유권(device_id) 조건 포함, 홈 카드 뱃지 갱신
 * 4. 본문은 소유자·방문자 동일 (공개 모습 확인 목적)
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`
const MY_DEVICE = 'owner-mode-device'

const LISTING = {
  id: 'own-1', device_id: MY_DEVICE, status: 'published',
  shop_name: '내 카페', shop_name_public: true,
  address: '서울 마포구 서교동 332-4', address_detail: null,
  deposit: '3000', monthly_rent: '200', transfer_fee: '3000', transfer_type: 'full',
  area: '33', biz_type: '카페·커피전문점',
  category_main: '카페·베이커리', category_sub: '카페·커피전문점',
  ai_draft: {}, review_choices: {}, edited_texts: {}, item_visibility: {},
  image_urls: [], interior_image_urls: [], facilities: [],
  owner_nickname: '주인장', created_at: '2026-07-19T00:00:00Z',
}

function seedDevice(page) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
  }, MY_DEVICE)
}

// E2는 .single() 조회 — 단일 객체를 돌려준다
function mockOne(page, row) {
  return page.route(LISTINGS, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) })
    } else {
      await route.continue()
    }
  })
}

test.describe('E2 소유자 모드', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await seedDevice(page)
  })

  test('내 매물: 안내 바 + 수정 버튼, 문의하기·찜 없음', async ({ page }) => {
    await mockOne(page, LISTING)
    await page.goto('/e2/own-1')

    await expect(page.getByTestId('owner-notice-bar')).toBeVisible()
    await expect(page.getByText('내 매물이에요 · 방문자에게 이렇게 보여요')).toBeVisible()
    await expect(page.getByTestId('owner-edit-button')).toBeVisible()

    // 방문자 전용 액션은 사라진다
    await expect(page.getByText('DM으로 문의하기')).toHaveCount(0)
    await expect(page.getByText('전화번호는 공개되지 않아요 — 양쪽 합의 후에만 교환됩니다')).toHaveCount(0)
  })

  test('내 매물: 수정 버튼 → E1 편집 모드로 진입', async ({ page }) => {
    await mockOne(page, LISTING)
    await page.goto('/e2/own-1')

    await page.getByTestId('owner-edit-button').click()
    await expect(page).toHaveURL('/e1/1?edit=own-1')
  })

  test('본문은 방문자와 동일하게 보인다 (공개 모습 확인)', async ({ page }) => {
    await mockOne(page, LISTING)
    await page.goto('/e2/own-1')

    await expect(page.getByText('내 카페')).toBeVisible()
    await expect(page.getByText('카페·베이커리 > 카페·커피전문점')).toBeVisible()
  })

  test('남의 매물: 현행 그대로 (문의하기 노출, 소유자 UI 없음)', async ({ page }) => {
    await mockOne(page, { ...LISTING, device_id: 'someone-else-device' })
    await page.goto('/e2/own-1')

    await expect(page.getByText('DM으로 문의하기')).toBeVisible()
    await expect(page.getByTestId('owner-notice-bar')).toHaveCount(0)
    await expect(page.getByTestId('owner-edit-button')).toHaveCount(0)
    await expect(page.getByTestId('owner-actions')).toHaveCount(0)
  })

  test('device_id 없는 옛 매물: 소유자 모드 아님 (문의 불가 안내 유지)', async ({ page }) => {
    await mockOne(page, { ...LISTING, device_id: null })
    await page.goto('/e2/own-1')

    await expect(page.getByText('이 매물은 문의할 수 없어요')).toBeVisible()
    await expect(page.getByTestId('owner-notice-bar')).toHaveCount(0)
  })
})

test.describe('E2 소유자 모드 — 상태 전환', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await seedDevice(page)
  })

  test('공개중: 숨기기·거래완료 노출, 공개전환은 없음', async ({ page }) => {
    await mockOne(page, LISTING)
    await page.goto('/e2/own-1')

    await expect(page.getByTestId('owner-status-hide')).toBeVisible()
    await expect(page.getByTestId('owner-status-complete')).toBeVisible()
    await expect(page.getByTestId('owner-status-publish')).toHaveCount(0)
  })

  test('숨김: 공개전환·거래완료 노출, 숨기기는 없음', async ({ page }) => {
    await mockOne(page, { ...LISTING, status: 'hidden' })
    await page.goto('/e2/own-1')

    await expect(page.getByTestId('owner-status-publish')).toBeVisible()
    await expect(page.getByTestId('owner-status-complete')).toBeVisible()
    await expect(page.getByTestId('owner-status-hide')).toHaveCount(0)
  })

  test('거래완료: 상태 전환·수정 모두 차단', async ({ page }) => {
    await mockOne(page, { ...LISTING, status: 'completed' })
    await page.goto('/e2/own-1')

    // 상단 상태 배너에도 같은 문구가 있어 하단 액션 영역으로 한정
    await expect(page.getByTestId('owner-actions').getByText('거래완료된 매물이에요')).toBeVisible()
    await expect(page.getByText('완료 처리한 매물은 수정할 수 없어요')).toBeVisible()
    await expect(page.getByTestId('owner-edit-button')).toHaveCount(0)
    await expect(page.getByTestId('owner-status-hide')).toHaveCount(0)
    await expect(page.getByTestId('owner-status-complete')).toHaveCount(0)
  })

  test('숨기기 → PATCH에 소유권 조건 포함, 화면 즉시 반영', async ({ page }) => {
    let patchUrl = null
    let patchBody = null
    await page.route(LISTINGS, async route => {
      const req = route.request()
      if (req.method() === 'PATCH') {
        patchUrl = req.url()
        patchBody = JSON.parse(req.postData() ?? '{}')
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTING) })
    })

    await page.goto('/e2/own-1')
    await page.getByTestId('owner-status-hide').click()

    await expect(page.getByText('매물을 숨겼어요')).toBeVisible()
    expect(patchBody.status).toBe('hidden')
    expect(patchUrl).toContain(`device_id=eq.${MY_DEVICE}`)
    expect(patchUrl).toContain('id=eq.own-1')

    // 재조회 없이도 버튼이 공개 전환으로 바뀐다
    await expect(page.getByTestId('owner-status-publish')).toBeVisible()
  })

  test('거래완료는 확인 모달을 거친다', async ({ page }) => {
    let patched = false
    await page.route(LISTINGS, async route => {
      if (route.request().method() === 'PATCH') {
        patched = true
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTING) })
    })

    await page.goto('/e2/own-1')
    await page.getByTestId('owner-status-complete').click()

    // 모달만 뜨고 아직 저장되지 않는다
    await expect(page.getByText('거래 완료 처리할까요?')).toBeVisible()
    expect(patched, '확인 전에 이미 저장됨').toBe(false)

    await page.getByTestId('owner-complete-confirm').click()
    await expect(page.getByText('거래 완료 처리했어요 🤝')).toBeVisible()
    expect(patched).toBe(true)
  })

  test('상태 전환 실패하면 알리고 화면을 바꾸지 않는다', async ({ page }) => {
    await page.route(LISTINGS, async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'denied' }) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTING) })
    })

    await page.goto('/e2/own-1')
    await page.getByTestId('owner-status-hide').click()

    await expect(page.getByText('상태 변경에 실패했어요. 다시 시도해 주세요.')).toBeVisible()
    // 여전히 공개중 상태 — 숨기기 버튼이 그대로다
    await expect(page.getByTestId('owner-status-hide')).toBeVisible()
  })
})

test.describe('상태 전환 후 홈 카드 뱃지 갱신', () => {
  test('E2에서 숨김 처리 → 홈 내 매물 카드 뱃지가 "숨김"으로', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await seedDevice(page)

    let status = 'published'
    await page.route(LISTINGS, async route => {
      const req = route.request()
      if (req.method() === 'PATCH') {
        status = JSON.parse(req.postData() ?? '{}').status
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }
      const row = { ...LISTING, status }
      // 홈(A7)은 목록, E2는 단건 — .single() 여부를 Accept 헤더로 구분
      const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(single ? row : [row]),
      })
    })

    await page.goto('/a7/seller')
    await expect(page.getByTestId('my-listing-card').getByText('공개 중')).toBeVisible()

    await page.getByTestId('my-listing-card').click()
    await expect(page).toHaveURL('/e2/own-1')
    await page.getByTestId('owner-status-hide').click()
    await expect(page.getByText('매물을 숨겼어요')).toBeVisible()

    await page.goto('/a7/seller')
    await expect(page.getByTestId('my-listing-card').getByText('숨김')).toBeVisible()
  })
})
