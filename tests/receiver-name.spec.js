/**
 * receiver_name 실명화 (owner_nickname 스냅샷)
 *
 * 1. 닉네임 있는 주인이 매물 저장 → listings insert에 owner_nickname 스냅샷 저장
 * 2. owner_nickname 있는 매물에 문의 → conversations insert의 receiver_name = 닉네임
 * 3. owner_nickname 없는 옛 매물(null) → receiver_name = '양도자' 폴백
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'
const SUPABASE_MESSAGES = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/messages*'

const LISTING = {
  id: 'eeeeeeee-ffff-0000-1111-333333333333',
  shop_name: '주인 닉네임 카페',
  address: '서울 마포구 서교동 9-9',
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
  device_id: 'seller-device-y',
  created_at: new Date().toISOString(),
}

// E2 문의 흐름 공용 mock — POST된 conversations insert body를 캡처
function mockDmFlow(page, listing) {
  const captured = { body: null }
  page.route(SUPABASE_LISTINGS, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listing) })
  })
  page.route(SUPABASE_CONVERSATIONS, async route => {
    const req = route.request()
    if (req.method() === 'POST') {
      captured.body = JSON.parse(req.postData())
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'conv-owner', ...captured.body }),
      })
    } else if (req.url().includes('sender_id=eq.')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'conv-owner', listing_name: listing.shop_name, sender_name: '문의자', receiver_name: '양도자' }),
      })
    }
  })
  page.route(SUPABASE_MESSAGES, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  return captured
}

async function startDm(page, listingId) {
  await page.goto(`/e2/${listingId}`)
  await page.getByRole('button', { name: 'DM으로 문의하기' }).click()
  await page.getByRole('button', { name: 'DM 대화 시작하기' }).click()
  await expect(page).toHaveURL(/\/d4\/chat\/conv-owner/)
}

test.describe('receiver_name 실명화', () => {
  test.beforeEach(async ({ page }) => {
    await mockMarketData(page)
  })

  test('매물 저장: 주인 닉네임 → owner_nickname 스냅샷 저장', async ({ page }) => {
    await mockGemini(page)
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({
        category: 'seller', bizType: '카페·디저트', region: '서울', name: '김주인사장',
      }))
    })
    let savedBody = null
    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() === 'POST') {
        savedBody = JSON.parse(route.request().postData())
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'new-id' }]) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      }
    })

    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
    await page.getByRole('button', { name: /다음.*완성도/ }).click()
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await expect(page.getByText('매물이 공개됐어요!')).toBeVisible()

    expect(savedBody, 'listings insert가 호출되지 않음').not.toBeNull()
    const row = Array.isArray(savedBody) ? savedBody[0] : savedBody
    expect(row.owner_nickname).toBe('김주인사장')
  })

  test('문의: owner_nickname 있는 매물 → receiver_name = 닉네임', async ({ page }) => {
    const captured = mockDmFlow(page, { ...LISTING, owner_nickname: '김주인사장' })

    await startDm(page, LISTING.id)

    expect(captured.body).not.toBeNull()
    expect(captured.body.receiver_name).toBe('김주인사장')
  })

  test('문의: owner_nickname 없는 옛 매물(null) → receiver_name = 양도인 폴백', async ({ page }) => {
    const captured = mockDmFlow(page, { ...LISTING, owner_nickname: null })

    await startDm(page, LISTING.id)

    expect(captured.body.receiver_name).toBe('양도인')
  })
})
