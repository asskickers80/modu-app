/**
 * 소개글 다듬기 — 재생성이 아니라 기존 글 편집 (버그 수정)
 *
 * 이전 버그: /e1/2?edit= 진입 시 E1Context의 DB 로드(비동기)보다 먼저
 * useEffect가 돌아 aiDraft=null을 보고 Gemini를 재호출 → 기존 소개글을 덮어썼다.
 *
 * 1. 수정 진입 시 기존 글 로드 + Gemini 호출 0회
 * 2. 재생성은 명시적 버튼으로만
 * 3. 새 글은 비교 후 선택 — 고르기 전까지 기존 글 유지
 */
import { test, expect } from './fixtures.js'
import { mockMarketData } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const ME = 'draft-edit-device'
const EXISTING = '기존에 확정해 둔 소개글입니다. 이 문장이 유지돼야 합니다.'
const REWRITTEN = '모두가 새로 써본 소개글입니다.'

const LISTING = {
  id: 'l1', device_id: ME, status: 'published',
  shop_name: '테스트 카페', shop_name_public: true,
  address: '서울 마포구 서교동 332-4', address_detail: null,
  deposit: '3000', monthly_rent: '200', transfer_fee: '3000', transfer_type: 'full',
  area: '33', biz_type: '카페·커피전문점',
  category_main: '카페·베이커리', category_sub: '카페·커피전문점',
  ai_draft: { description: EXISTING, location: '역세권이에요', facility: '집기 완비' },
  review_choices: {}, edited_texts: {}, item_visibility: {},
  image_urls: [], interior_image_urls: [], facilities: [],
  created_at: '2026-07-19T00:00:00Z',
}

/** Gemini를 가로채되 호출 횟수를 센다 */
async function mockGeminiCounted(page, counter, text = REWRITTEN) {
  await page.route('https://generativelanguage.googleapis.com/**', async route => {
    counter.n++
    const body = {
      description: text, location: '새 위치 설명', facility: '새 시설 설명',
      salesAnalysis: '새 매출 설명', highlights: ['새 포인트'],
    }
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }),
    })
  })
}

function seed(page) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', bizType: '카페·디저트', region: '서울' }))
  }, ME)
}

function mockListing(page, row = LISTING) {
  return page.route(`${SUPABASE}/listings*`, async route => {
    if (route.request().method() !== 'GET') return route.continue()
    const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(single ? row : [row]),
    })
  })
}

test.describe('소개글 다듬기 — 기존 글 편집', () => {
  test.beforeEach(async ({ page }) => {
    await mockMarketData(page)
    await seed(page)
  })

  test('수정 진입: 기존 소개글이 뜨고 Gemini는 호출되지 않는다', async ({ page }) => {
    const calls = { n: 0 }
    await mockGeminiCounted(page, calls)
    await mockListing(page)

    await page.goto('/e1/2?edit=l1')
    await expect(page.getByTestId('block-description')).toContainText(EXISTING)

    // 기존 글이 보인 뒤에도 재생성이 돌지 않아야 함
    await page.waitForTimeout(800)
    expect(calls.n, `기존 글이 있는데 Gemini가 ${calls.n}회 호출됨`).toBe(0)
  })

  test('수정 진입 시 헤더가 "지금 소개글이에요"', async ({ page }) => {
    const calls = { n: 0 }
    await mockGeminiCounted(page, calls)
    await mockListing(page)

    await page.goto('/e1/2?edit=l1')
    await expect(page.getByText('지금 소개글이에요')).toBeVisible()
  })

  test('신규 등록은 종전대로 자동 생성한다 (회귀 방지)', async ({ page }) => {
    const calls = { n: 0 }
    await mockGeminiCounted(page, calls)
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.addInitScript(() => {
      sessionStorage.setItem('modu_e1_draft', JSON.stringify({
        address: '서울 마포구 서교동 332-4', shopName: '새 가게',
        deposit: '3000', monthlyRent: '200', transferFee: '3000', transferType: 'full',
        reviewChoices: {}, interiorPhotos: [], exteriorPhotos: [], facilities: [],
      }))
    })

    await page.goto('/e1/2')
    await expect(page.getByTestId('block-description')).toContainText(REWRITTEN)
    expect(calls.n, '신규 등록인데 초안 생성이 안 됨').toBeGreaterThan(0)
  })

  test('"모두가 새로 써드릴까요?" 누르기 전에는 호출 없음', async ({ page }) => {
    const calls = { n: 0 }
    await mockGeminiCounted(page, calls)
    await mockListing(page)

    await page.goto('/e1/2?edit=l1')
    await expect(page.getByTestId('rewrite-button')).toBeVisible()
    expect(calls.n).toBe(0)

    await page.getByTestId('rewrite-button').click()
    await expect(page.getByTestId('rewrite-compare')).toBeVisible()
    expect(calls.n, '새로 쓰기 버튼을 눌렀는데 호출이 없음').toBeGreaterThan(0)
  })

  test('새 글이 와도 고르기 전까지 기존 글이 유지된다', async ({ page }) => {
    const calls = { n: 0 }
    await mockGeminiCounted(page, calls)
    await mockListing(page)

    await page.goto('/e1/2?edit=l1')
    await page.getByTestId('rewrite-button').click()

    const sheet = page.getByTestId('rewrite-compare')
    await expect(sheet).toBeVisible()
    // 두 글이 나란히 비교된다
    await expect(sheet.getByText(EXISTING)).toBeVisible()
    await expect(sheet.getByText(REWRITTEN)).toBeVisible()
  })

  test('"지금 글 유지" → 기존 글 그대로', async ({ page }) => {
    const calls = { n: 0 }
    await mockGeminiCounted(page, calls)
    await mockListing(page)

    await page.goto('/e1/2?edit=l1')
    await page.getByTestId('rewrite-button').click()
    await page.getByTestId('keep-current').click()

    await expect(page.getByTestId('rewrite-compare')).toHaveCount(0)
    await expect(page.getByTestId('block-description')).toContainText(EXISTING)
    await expect(page.getByTestId('block-description')).not.toContainText(REWRITTEN)
  })

  test('"새 글로 바꾸기" → 새 글로 교체', async ({ page }) => {
    const calls = { n: 0 }
    await mockGeminiCounted(page, calls)
    await mockListing(page)

    await page.goto('/e1/2?edit=l1')
    await page.getByTestId('rewrite-button').click()
    await page.getByTestId('apply-new').click()

    await expect(page.getByTestId('rewrite-compare')).toHaveCount(0)
    await expect(page.getByTestId('block-description')).toContainText(REWRITTEN)
    await expect(page.getByTestId('block-description')).not.toContainText(EXISTING)
  })

  test('기존 수정문(edited_texts)이 있으면 그것이 뜬다', async ({ page }) => {
    const calls = { n: 0 }
    await mockGeminiCounted(page, calls)
    await mockListing(page, {
      ...LISTING,
      edited_texts: { description: '사용자가 직접 고친 문장입니다.' },
    })

    await page.goto('/e1/2?edit=l1')
    await expect(page.getByTestId('block-description')).toContainText('사용자가 직접 고친 문장입니다.')
    expect(calls.n).toBe(0)
  })
})
