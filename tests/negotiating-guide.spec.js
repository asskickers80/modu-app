/**
 * 협의중 status + 진행 가이드 재구성 (ORDER-guide-status-cleanup)
 *
 * A. 협의중 전환 규칙 / 탐색 노출·뱃지 / 홈 카드 뱃지
 * B. 진행 가이드 6단계 자동 판정 + 하드코딩 부재
 * C. 업종 미입력 매물까지 재질문 확장
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`
const CONVERSATIONS = `${SUPABASE}/conversations*`
const MESSAGES = `${SUPABASE}/messages*`
const ME = 'nego-device'

const BASE = {
  id: 'l1', device_id: ME, status: 'published',
  shop_name: '협의 테스트 카페', shop_name_public: true,
  address: '서울 마포구 서교동 332-4',
  deposit: '3000', monthly_rent: '200', transfer_fee: '3000', transfer_type: 'full',
  area: '33', biz_type: '카페·커피전문점',
  category_main: '카페·베이커리', category_sub: '카페·커피전문점',
  ai_draft: {}, review_choices: {}, edited_texts: {}, item_visibility: {},
  image_urls: [], interior_image_urls: [], facilities: [],
  created_at: '2026-07-19T00:00:00Z',
}

function seed(page) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
  }, ME)
}

/** 홈(목록)·E2(단건)를 Accept 헤더로 구분해 응답 */
function mockListing(page, row, onPatch) {
  return page.route(LISTINGS, async route => {
    const req = route.request()
    if (req.method() === 'PATCH') {
      onPatch?.(req)
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(single ? row : [row]),
    })
  })
}

function mockD4(page, { convs = [], msgs = [] } = {}) {
  page.route(CONVERSATIONS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(convs) }))
  page.route(MESSAGES, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(msgs) }))
}

// ─────────────────────────────────────────── A
test.describe('A. 협의중 status', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page); await mockMarketData(page); await seed(page)
  })

  test('공개중 → 협의 시작 버튼으로 전환', async ({ page }) => {
    let body = null
    await mockListing(page, BASE, req => { body = JSON.parse(req.postData() ?? '{}') })
    await mockD4(page)

    await page.goto('/e2/l1')
    await page.getByTestId('owner-status-negotiate').click()

    await expect(page.getByText('협의 중으로 바꿨어요')).toBeVisible()
    expect(body.status).toBe('negotiating')
  })

  test('협의중 → 공개 중으로 되돌리기 + 거래완료 가능, 숨기기는 없음', async ({ page }) => {
    await mockListing(page, { ...BASE, status: 'negotiating' })
    await mockD4(page)
    await page.goto('/e2/l1')

    await expect(page.getByTestId('owner-status-republish')).toBeVisible()
    await expect(page.getByTestId('owner-status-complete')).toBeVisible()
    await expect(page.getByTestId('owner-status-hide')).toHaveCount(0)
    await expect(page.getByTestId('owner-status-negotiate')).toHaveCount(0)
  })

  test('거래완료는 종착 — 어떤 상태 전환도 없다', async ({ page }) => {
    await mockListing(page, { ...BASE, status: 'completed' })
    await mockD4(page)
    await page.goto('/e2/l1')

    for (const id of ['negotiate', 'republish', 'hide', 'publish', 'complete']) {
      await expect(page.getByTestId(`owner-status-${id}`)).toHaveCount(0)
    }
  })

  test('숨김에서는 협의 시작이 뜨지 않는다 (hidden은 현행 유지)', async ({ page }) => {
    await mockListing(page, { ...BASE, status: 'hidden' })
    await mockD4(page)
    await page.goto('/e2/l1')

    await expect(page.getByTestId('owner-status-publish')).toBeVisible()
    await expect(page.getByTestId('owner-status-negotiate')).toHaveCount(0)
  })

  test('협의중 매물은 방문자도 볼 수 있고 문의도 가능', async ({ page }) => {
    await mockListing(page, { ...BASE, status: 'negotiating', device_id: 'someone-else' })
    await mockD4(page)
    await page.goto('/e2/l1')

    await expect(page.getByText('매물을 찾을 수 없어요')).toHaveCount(0)
    await expect(page.getByText('DM으로 문의하기')).toBeVisible()
    await expect(page.getByText('🤝 협의 중인 매물이에요 — 문의는 계속 받고 있어요')).toBeVisible()
  })

  test('숨김 매물은 여전히 방문자에게 안 보인다', async ({ page }) => {
    await mockListing(page, { ...BASE, status: 'hidden', device_id: 'someone-else' })
    await mockD4(page)
    await page.goto('/e2/l1')

    await expect(page.getByText('매물을 찾을 수 없어요')).toBeVisible()
  })

  test('홈 내 매물 카드 뱃지가 "협의 중"', async ({ page }) => {
    await mockListing(page, { ...BASE, status: 'negotiating' })
    await mockD4(page)
    await page.goto('/a7/seller')

    await expect(page.getByTestId('my-listing-card').getByText('협의 중')).toBeVisible()
  })

  test('탐색: 협의중 매물이 노출되고 "협의 중" 뱃지가 붙는다', async ({ page }) => {
    await page.route(LISTINGS, async route => {
      const url = decodeURIComponent(route.request().url())
      const m = url.match(/status=in\.\(([^)]*)\)/)
      const rows = [{ ...BASE, status: 'negotiating', device_id: 'someone-else' }]
        .filter(r => !m || m[1].split(',').includes(r.status))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    })
    await page.goto('/explore')

    await expect(page.getByText('협의 테스트 카페')).toBeVisible()
    await expect(page.getByTestId('explore-negotiating-badge')).toBeVisible()
  })
})

// ─────────────────────────────────────────── B
test.describe('B. 진행 가이드 6단계 자동 판정', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page); await mockMarketData(page); await seed(page)
  })

  const STEPS = ['register', 'photos', 'draft', 'publish', 'inquiry', 'negotiate']

  test('판정 불가 단계(계약서·잔금)는 더 이상 없다', async ({ page }) => {
    await mockListing(page, BASE)
    await mockD4(page)
    await page.goto('/a7/seller')

    await expect(page.getByTestId('guide-contract')).toHaveCount(0)
    await expect(page.getByTestId('guide-closing')).toHaveCount(0)
    await expect(page.getByTestId('guide-price')).toHaveCount(0)
  })

  test('하드코딩 부재 — 모든 단계가 데이터에 따라 완료로 바뀔 수 있다', async ({ page }) => {
    // 전 조건을 채운 매물: 사진 3장 + 검수 이력 + 공개 + 문의 + 내 답장
    await mockListing(page, {
      ...BASE, status: 'negotiating',
      interior_image_urls: ['a', 'b', 'c'],
      review_choices: { description: 'keep' },
    })
    await mockD4(page, { convs: [{ id: 'c1' }], msgs: [{ id: 'm1' }] })
    await page.goto('/a7/seller')

    // 접힘 상태이므로 펼쳐서 확인
    await expect(page.getByTestId('guide-summary')).toBeVisible()
    await page.getByRole('button', { name: '전체 보기' }).click()

    for (const id of STEPS) {
      await expect(page.getByTestId(`guide-${id}`), `${id} 단계가 완료로 안 바뀜`)
        .toHaveAttribute('data-done', 'true')
    }
  })

  test('소개글 다듬기 — 검수 이력(review_choices)으로 판정', async ({ page }) => {
    await mockListing(page, { ...BASE, interior_image_urls: ['a', 'b', 'c'], review_choices: {} })
    await mockD4(page)
    await page.goto('/a7/seller')
    await expect(page.getByTestId('guide-draft')).toHaveAttribute('data-done', 'false')

    await page.unroute(LISTINGS)
    await mockListing(page, {
      ...BASE, interior_image_urls: ['a', 'b', 'c'], review_choices: { description: 'keep' },
    })
    await page.reload()
    await expect(page.getByTestId('guide-draft')).toHaveAttribute('data-done', 'true')
  })

  test('매물 공개하기 — 숨김이면 미완료, 협의중이면 완료', async ({ page }) => {
    await mockListing(page, { ...BASE, status: 'hidden' })
    await mockD4(page)
    await page.goto('/a7/seller')
    await expect(page.getByTestId('guide-publish')).toHaveAttribute('data-done', 'false')

    await page.unroute(LISTINGS)
    await mockListing(page, { ...BASE, status: 'negotiating' })
    await page.reload()
    await expect(page.getByTestId('guide-publish')).toHaveAttribute('data-done', 'true')
  })

  test('첫 문의 받기 — 수신 대화가 있으면 완료', async ({ page }) => {
    await mockListing(page, BASE)
    await mockD4(page, { convs: [{ id: 'c1' }], msgs: [] })
    await page.goto('/a7/seller')

    await expect(page.getByTestId('guide-inquiry')).toHaveAttribute('data-done', 'true')
    // 내 답장은 없으므로 협의 시작은 미완료
    await expect(page.getByTestId('guide-negotiate')).toHaveAttribute('data-done', 'false')
  })

  test('가격 협의 — 답장이 없어도 status=negotiating이면 완료', async ({ page }) => {
    await mockListing(page, { ...BASE, status: 'negotiating' })
    await mockD4(page, { convs: [], msgs: [] })
    await page.goto('/a7/seller')

    await expect(page.getByTestId('guide-negotiate')).toHaveAttribute('data-done', 'true')
  })

  test('기다리는 단계는 CTA 대신 "기다리는 중" 표시', async ({ page }) => {
    await mockListing(page, {
      ...BASE, interior_image_urls: ['a', 'b', 'c'], review_choices: { description: 'keep' },
    })
    await mockD4(page)
    await page.goto('/a7/seller')

    // 1~4 완료 → 5(첫 문의)가 현재 단계이고 기다리는 단계다
    await expect(page.getByTestId('guide-waiting-inquiry')).toBeVisible()
    await expect(page.getByText('문의가 오면 모두가 바로 알려드려요')).toBeVisible()
  })

  test('전 단계 완료 시 접히고 "협의 진행 중" 요약만', async ({ page }) => {
    await mockListing(page, {
      ...BASE, status: 'negotiating',
      interior_image_urls: ['a', 'b', 'c'], review_choices: { description: 'keep' },
    })
    await mockD4(page, { convs: [{ id: 'c1' }], msgs: [{ id: 'm1' }] })
    await page.goto('/a7/seller')

    await expect(page.getByTestId('guide-summary')).toBeVisible()
    await expect(page.getByText('협의 진행 중')).toBeVisible()
    await expect(page.getByTestId('guide-register')).toBeHidden()
  })
})

// ─────────────────────────────────────────── C
test.describe('C. 업종 미입력 매물 재질문 확장', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page); await mockMarketData(page); await seed(page)
  })

  test('신·구 컬럼 모두 NULL이면 대분류부터 묻는다', async ({ page }) => {
    await mockListing(page, { ...BASE, biz_type: null, category_main: null, category_sub: null })
    await mockD4(page)
    await page.goto('/a7/seller')

    await expect(page.getByTestId('industry-sub-prompt')).toBeVisible()
    await expect(page.getByTestId('industry-main-picker')).toBeVisible()
    await expect(page.getByRole('button', { name: '요식업', exact: true })).toBeVisible()
  })

  test('대분류→소분류 선택 시 3필드 + biz_type 저장', async ({ page }) => {
    let body = null
    await mockListing(page, { ...BASE, biz_type: null, category_main: null, category_sub: null },
      req => { body = JSON.parse(req.postData() ?? '{}') })
    await mockD4(page)
    await page.goto('/a7/seller')

    await page.getByRole('button', { name: '요식업', exact: true }).click()
    await page.getByRole('button', { name: '치킨', exact: true }).click()

    await expect(page.getByText('업종을 저장했어요')).toBeVisible()
    expect(body.category_main).toBe('요식업')
    expect(body.category_sub).toBe('치킨')
    expect(body.ksic_code).toBe('56193')
    expect(body.biz_type, '표시용 라벨도 함께 채워야 함').toBe('치킨')
  })

  test('업종이 이미 다 있으면 뜨지 않는다', async ({ page }) => {
    await mockListing(page, BASE)
    await mockD4(page)
    await page.goto('/a7/seller')

    await expect(page.getByTestId('industry-sub-prompt')).toHaveCount(0)
  })
})
