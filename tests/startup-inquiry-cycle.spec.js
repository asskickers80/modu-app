/**
 * 창업준비 축 문의 사이클 (ORDER-cleanup-startup-prep-v1 #5)
 *
 * 로그인 계정 기준: 창업준비(startup) 사용자가 E2에서 문의 발신 → 게이트 미발동(로그인) →
 * 대화 생성(receiver=양도인) → 양도인 인박스에서 수신 확인 (D4 반대편 사이클).
 */
import { test, expect } from './fixtures.js'
import { mockMarketData } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const LISTINGS = `${SUPABASE}/rest/v1/listings*`
const CONVERSATIONS = `${SUPABASE}/rest/v1/conversations*`
const MESSAGES = `${SUPABASE}/rest/v1/messages*`

const BUYER = 'startup-buyer-device'   // 창업준비(문의자)
const SELLER = 'seller-owner-device'   // 양도인(매물 소유자)

const MOCK_LISTING = {
  id: 'aaaaaaaa-1111-2222-3333-444444444444',
  shop_name: '창업 타깃 카페', address: '서울 마포구 서교동 33-1 1층',
  floor: '1', area: '33', deposit: '3000', monthly_rent: '200', transfer_fee: '2500', transfer_type: 'full',
  ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], facilities: [],
  status: 'published', device_id: SELLER, created_at: '2026-07-21T00:00:00Z',
}

// 로그인 세션 흉내 — useAuth().user를 채운다 (게이트 미발동 검증용)
function seedSession(page) {
  const future = Math.floor(Date.now() / 1000) + 3600
  return page.addInitScript((exp) => {
    localStorage.setItem('sb-edcqvmgqskeoegpqxlzy-auth-token', JSON.stringify({
      access_token: 't', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp,
      user: { id: 'startup-user', aud: 'authenticated', role: 'authenticated', email: 's@modu.internal', app_metadata: {}, user_metadata: {} },
    }))
  }, future)
}

test.describe('창업준비 문의 사이클', () => {
  test.beforeEach(async ({ page }) => { await mockMarketData(page) })

  test('창업준비(로그인)→E2→문의: 게이트 미발동 + 대화 생성(receiver=양도인)', async ({ page }) => {
    let inserted = null
    await page.addInitScript(([dev]) => {
      localStorage.setItem('modu_device_id', dev)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup' }))
    }, [BUYER])
    await seedSession(page)

    await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LISTING) }))
    await page.route(MESSAGES, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route(CONVERSATIONS, async r => {
      const req = r.request()
      if (req.method() === 'POST') {
        inserted = JSON.parse(req.postData())
        await r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'conv-startup', ...inserted }) })
      } else if (req.url().includes('sender_id=eq.')) {
        await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) // 중복 대화 없음
      } else {
        await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'conv-startup', listing_id: MOCK_LISTING.id, listing_name: MOCK_LISTING.shop_name, sender_id: BUYER, receiver_id: SELLER, sender_name: '창업자', receiver_name: '양도인', contact_status: null }) })
      }
    })

    await page.goto(`/e2/${MOCK_LISTING.id}`)
    await page.getByRole('button', { name: 'DM으로 문의하기' }).click()
    // 게이트(가입 유도) 미발동 — 로그인 상태
    await expect(page.getByText('문의하려면 가입이 필요해요')).toHaveCount(0)
    await page.getByRole('button', { name: 'DM 대화 시작하기' }).click()

    await expect(page).toHaveURL(/\/d4\/chat\/conv-startup/)
    expect(inserted).not.toBeNull()
    expect(inserted.sender_id).toBe(BUYER)      // 발신 = 창업준비
    expect(inserted.receiver_id).toBe(SELLER)   // 수신 = 양도인(매물 device_id)
  })

  test('양도인 수신: 생성된 대화가 양도인 인박스에 뜬다 (반대편)', async ({ page }) => {
    await page.addInitScript(([dev]) => {
      localStorage.setItem('modu_device_id', dev)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller' }))
    }, [SELLER])

    // 양도인(receiver=SELLER)이 조회하는 인박스 — 위에서 생성된 대화가 있다고 mock
    await page.route(CONVERSATIONS, r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{
        id: 'conv-startup', listing_id: MOCK_LISTING.id, listing_name: MOCK_LISTING.shop_name, listing_emoji: '🏪',
        sender_id: BUYER, receiver_id: SELLER, sender_name: '창업자', receiver_name: '양도인',
        last_message: '문의드려요', last_message_at: '2026-07-21T09:00:00Z',
        sender_last_read_at: null, receiver_last_read_at: null, contact_status: null,
      }]),
    }))

    await page.goto('/d4/inbox')
    // 매물명 그룹 + 상대(창업자) 표시 (양도인 뷰어 기준 otherPartyName = sender)
    await expect(page.getByText('창업 타깃 카페')).toBeVisible()
    await expect(page.getByText('창업자')).toBeVisible()
    await expect(page.getByTestId('unread-dot')).toHaveCount(1) // 미확인 수신
  })
})
