/**
 * 임대인 매물 영속화 사이클 (ORDER-landlord-persist-v1)
 * 등록 저장(listing_type=landlord) → E2L 실표시 → 문의 발신(receiver=임대인) →
 * 임대인 인박스 수신 → 탐색 seller 필터.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, seedSession } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const LISTINGS = `${SUPABASE}/rest/v1/listings*`
const CONVERSATIONS = `${SUPABASE}/rest/v1/conversations*`

const BUYER = 'landlord-buyer-device'
const SELLER = 'landlord-owner-device'

const LANDLORD_LISTING = {
  id: 'ffffffff-1111-2222-3333-444444444444',
  listing_type: 'landlord', deal_type: 'lease', status: 'published',
  shop_name: '서교동 코너 상가', address: '서울 마포구 서교동 332-4',
  floor: '1', area: '33', deposit: '5000', monthly_rent: '180', maintenance: '12',
  recommended_biz: ['카페·베이커리', '음식점'], ai_draft: { description: '홍대입구역 도보 3분 1층 코너 상가.' },
  image_urls: [], review_choices: {}, edited_texts: {}, device_id: SELLER, owner_nickname: '김소유',
  created_at: '2026-07-21T00:00:00Z',
}

test.describe('임대인 매물 영속화 사이클', () => {
  test.beforeEach(async ({ page }) => { await mockGemini(page) })

  test('E1p 공개 → listings 저장(listing_type=landlord, user_id 스탬프)', async ({ page }) => {
    let inserted = null
    await seedSession(page) // 로그인 상태 저장 → user_id 스탬프(처음부터 계정 소유)
    await page.route(LISTINGS, async r => {
      if (r.request().method() === 'POST') {
        inserted = JSON.parse(r.request().postData())
        await r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'new-landlord' }]) })
      } else {
        await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
    })

    await page.goto('/e1p/5')
    await page.getByRole('button', { name: '상가 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await page.getByRole('button', { name: '대시보드로 이동' }).click({ timeout: 5000 })
    // 저장(await) 후 navigate — URL 전환을 기다린 뒤 단언(레이스 방지)
    await expect(page).toHaveURL(/\/a7\/landlord/)

    expect(inserted, 'listings insert가 호출되지 않음').not.toBeNull()
    const row = Array.isArray(inserted) ? inserted[0] : inserted
    expect(row.listing_type).toBe('landlord')
    expect(row.device_id).toBeTruthy()
    expect(row.user_id).toBe('test-user') // 소유권 user_id 우선 — 생성 시 스탬프
  })

  test('E2L 실데이터 표시 + 문의 발신(receiver=임대인)', async ({ page }) => {
    let convBody = null
    await seedSession(page) // 로그인 문의자 — 행동 게이트 = 세션 판정(IDENTITY-MODEL)
    await page.addInitScript(([dev]) => {
      localStorage.setItem('modu_device_id', dev)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup' }))
    }, [BUYER])
    await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LANDLORD_LISTING) }))
    await page.route(CONVERSATIONS, async r => {
      const req = r.request()
      if (req.method() === 'POST') {
        convBody = JSON.parse(req.postData())
        await r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'conv-l', ...convBody }) })
      } else if (req.url().includes('sender_id=eq.')) {
        await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      } else {
        await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'conv-l', listing_id: LANDLORD_LISTING.id, sender_id: BUYER, receiver_id: SELLER, sender_name: '문의자', receiver_name: '김소유' }) })
      }
    })

    await page.goto(`/e2l/${LANDLORD_LISTING.id}`)
    await expect(page.getByText('임대인 매물')).toBeVisible()
    await expect(page.getByText('임대 조건')).toBeVisible()
    await expect(page.getByText('서교동 코너 상가')).toBeVisible()

    await page.getByRole('button', { name: /임대인에게 DM 문의하기/ }).click()
    await expect(page.getByText('문의하려면 가입이 필요해요')).toHaveCount(0) // 게이트 미발동(로그인 세션)
    await page.getByRole('button', { name: 'DM 대화 시작하기' }).click()
    await expect(page).toHaveURL(/\/d4\/chat\/conv-l/) // 대화 생성 후 이동 — 완료 대기

    expect(convBody).not.toBeNull()
    expect(convBody.receiver_id).toBe(SELLER)   // 수신 = 임대인
    expect(convBody.listing_id).toBe(LANDLORD_LISTING.id)
  })

  test('임대인 인박스 수신 (반대편)', async ({ page }) => {
    await page.addInitScript(([dev]) => {
      localStorage.setItem('modu_device_id', dev)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
    }, [SELLER])
    await page.route(CONVERSATIONS, r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{ id: 'conv-l', listing_id: LANDLORD_LISTING.id, listing_name: '서교동 코너 상가', listing_emoji: '🏢', sender_id: BUYER, receiver_id: SELLER, sender_name: '문의자', receiver_name: '김소유', last_message: '문의드려요', last_message_at: '2026-07-21T09:00:00Z', sender_last_read_at: null, receiver_last_read_at: null, contact_status: null }]),
    }))

    await page.goto('/d4/landlord/inbox')
    await expect(page.getByText('서교동 코너 상가')).toBeVisible()
    await expect(page.getByText('문의자')).toBeVisible()
  })

  test('탐색은 seller만 — listing_type=eq.seller 필터 적용', async ({ page }) => {
    let listingsUrl = null
    await page.route(LISTINGS, r => {
      const url = r.request().url()
      if (r.request().method() === 'GET' && url.includes('status=in')) listingsUrl = decodeURIComponent(url)
      return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.goto('/explore')
    await expect.poll(() => listingsUrl).not.toBeNull()
    expect(listingsUrl).toContain('listing_type=eq.seller')
  })
})
