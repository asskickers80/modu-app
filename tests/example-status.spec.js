/**
 * 예시✦ 연습 등록 = status 'example' (마켓 미노출)
 *
 * 1. 예시 채움 그대로 제출 → insert status='example'
 * 2. 일반 draft 제출 → status='published' (기존 동작 유지)
 * 3. 예시 채움 후 상호명 수정 → isDemo 해제 → published
 * 4. A7: example 매물은 '예시' 배지 + 거래 완료 처리 액션 없음
 * 5. 탐색은 status=eq.published 쿼리 → example 자동 제외
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'
const DRAFT_KEY = 'modu_e1_draft'
const MY_DEVICE = 'example-test-device'

const READY_DRAFT = {
  address: '서울 마포구 서교동 332-4', shopName: '서교동 고양이 카페',
  floor: 'B1', area: '33', deposit: '3000', monthlyRent: '200', maintenance: '10',
  transferFee: '3000', transferType: 'full', monthlySales: '2800',
  reviewChoices: { description: 'keep', location: 'keep', facility: 'keep' },
  editedTexts: {}, photosAdded: false, salesProof: false, facilities: [],
  interiorPhotos: [], exteriorPhotos: [],
  aiDraft: { description: '초안', facility: '시설', salesAnalysis: null },
}

function captureInsert(page) {
  const captured = { body: null }
  page.route(SUPABASE_LISTINGS, async route => {
    const req = route.request()
    if (req.method() === 'POST') {
      captured.body = JSON.parse(req.postData())
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'new-1' }]) })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
  })
  return captured
}

async function submitFromStep5(page, draft) {
  await page.goto('/e1/1')
  await page.evaluate(([k, d]) => sessionStorage.setItem(k, JSON.stringify(d)), [DRAFT_KEY, draft])
  await page.goto('/e1/4')
  await page.getByRole('button', { name: '매물 공개하기' }).click()
  await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
  await expect(page.getByText('매물이 공개됐어요!')).toBeVisible()
}

test.describe('예시 등록 status=example', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => localStorage.setItem('modu_device_id', id), MY_DEVICE)
  })

  test('예시 채움(isDemo) 제출 → example', async ({ page }) => {
    const captured = captureInsert(page)
    await submitFromStep5(page, { ...READY_DRAFT, isDemo: true })
    expect(captured.body.status).toBe('example')
  })

  test('일반 제출(isDemo 없음) → published 유지', async ({ page }) => {
    const captured = captureInsert(page)
    await submitFromStep5(page, READY_DRAFT)
    expect(captured.body.status).toBe('published')
  })

  test('예시✦ 클릭 후 상호명 수정 → isDemo 해제', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/e1/1')

    await page.getByRole('button', { name: '예시 ✦' }).click()
    let draft = await page.evaluate(k => JSON.parse(sessionStorage.getItem(k)), DRAFT_KEY)
    expect(draft.isDemo, '예시 채움 후 isDemo 미설정').toBe(true)

    await page.locator('input[placeholder="예) 고양이 카페 서교점"]').fill('진짜 우리 가게')
    draft = await page.evaluate(k => JSON.parse(sessionStorage.getItem(k)), DRAFT_KEY)
    expect(draft.isDemo, '상호명 실입력 후에도 isDemo 유지됨').toBe(false)
  })

  // 홈 카드 전환(ORDER-home-listing-card-v1) 이후: example은 0건 취급이라 홈에 카드로 뜨지 않는다.
  // 예시 배지는 E2 상세 배너가 담당(아래 테스트), 홈에서는 등록 CTA가 유지되는지를 본다.
  test('A7: example 매물 = 0건 취급(등록 CTA) + 거래완료 액션 없음', async ({ page }) => {
    await mockGemini(page)
    await page.route(SUPABASE_CONVERSATIONS, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route(SUPABASE_LISTINGS, route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{
          id: 'ex-1', shop_name: '예시 연습 매물', address: '서울 마포구', transfer_fee: '3000',
          transfer_type: 'full', image_urls: [], review_choices: {}, status: 'example',
          device_id: MY_DEVICE, created_at: new Date().toISOString(),
        }]),
      }))

    await page.goto('/a7/seller')
    await expect(page.getByTestId('register-listing-cta')).toBeVisible()
    await expect(page.getByTestId('my-listing-card')).toHaveCount(0)
    await expect(page.getByText('예시 연습 매물')).toHaveCount(0)

    // 더보기 시트는 여전히 example 매물을 대상으로 열린다 (거래완료·숨기기만 비노출)
    await page.getByRole('button', { name: '···' }).click()
    await expect(page.getByText('거래 완료 처리')).toHaveCount(0)
    await expect(page.getByText('매물 숨기기')).toHaveCount(0) // 이미 비노출 상태
  })

  test('E2 주인 시점: example 매물 배너가 예시 안내 (숨김 문구 아님)', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          id: 'ex-2', shop_name: '예시 배너 매물', address: '서울 마포구 서교동 1-1',
          deposit: '3000', monthly_rent: '200', transfer_fee: '2500', transfer_type: 'full',
          ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], facilities: [],
          status: 'example', device_id: MY_DEVICE, created_at: new Date().toISOString(),
        }),
      }))
    await page.route('**/RTMSDataSvcNrgTrade/**', route => route.fulfill({ status: 500, body: 'err' }))

    await page.goto('/e2/ex-2')
    await expect(page.getByText('예시 배너 매물')).toBeVisible()
    await expect(page.getByText(/예시 매물이에요 — 실제 등록하려면/)).toBeVisible()
    await expect(page.getByText('숨김 상태예요')).toHaveCount(0)
  })

  test('탐색: published 필터 쿼리 → example 자동 제외', async ({ page }) => {
    let listUrl = null
    await page.route(SUPABASE_LISTINGS, route => {
      listUrl = route.request().url()
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.goto('/explore')
    await expect(page.getByText('조건에 맞는 매물이 없어요')).toBeVisible()
    expect(listUrl, '탐색 쿼리에 published 필터 없음').toContain('status=eq.published')
  })
})
