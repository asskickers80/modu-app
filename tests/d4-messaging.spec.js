/**
 * D4 연락 흐름 실연결 검증
 *
 * 1. E2 문의 → conversations insert의 receiver_id = 매물 device_id (demo_seller 아님)
 * 2. device_id 없는 옛 매물 → 문의 버튼 대신 "문의할 수 없어요" 안내
 * 3. 양수자 인박스(D4StartupInbox) → mock 대화 실데이터 렌더 + 더미 텍스트 없음
 */
import { test, expect } from '@playwright/test'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'
const SUPABASE_MESSAGES = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/messages*'

const SELLER_DEVICE = 'seller-device-1234'

const MOCK_LISTING = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  shop_name: '실연결 문의 카페',
  address: '서울 마포구 서교동 332-4 1층',
  floor: '1',
  area: '33',
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
  device_id: SELLER_DEVICE,
  created_at: new Date().toISOString(),
}

test.describe('D4 연락 흐름 실연결', () => {

  test('E2 문의 → receiver_id가 매물 device_id로 저장 (demo_seller 아님)', async ({ page }) => {
    let insertedBody = null

    await page.route(SUPABASE_LISTINGS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_LISTING),
      })
    })

    await page.route(SUPABASE_CONVERSATIONS, async route => {
      const req = route.request()
      if (req.method() === 'POST') {
        insertedBody = JSON.parse(req.postData())
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'conv-1', ...insertedBody }),
        })
      } else if (req.url().includes('sender_id=eq.')) {
        // 중복 대화 조회(maybeSingle) → 기존 대화 없음
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      } else {
        // D4Chat의 id 기준 단건 조회
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'conv-1',
            listing_id: MOCK_LISTING.id,
            listing_name: MOCK_LISTING.shop_name,
            listing_emoji: '🏠',
            sender_id: 'buyer-device',
            receiver_id: SELLER_DEVICE,
            sender_name: '문의자',
            receiver_name: '양도자',
            contact_status: null,
          }),
        })
      }
    })

    await page.route(SUPABASE_MESSAGES, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto(`/e2/${MOCK_LISTING.id}`)

    // 문의 버튼 → 바텀시트 → 대화 시작
    await page.getByRole('button', { name: 'DM으로 문의하기' }).click()
    await page.getByRole('button', { name: 'DM 대화 시작하기' }).click()

    // 대화방으로 이동
    await expect(page).toHaveURL(/\/d4\/chat\/conv-1/)

    // insert 내용 단언: receiver = 매물 주인 device_id, listing_id 저장
    expect(insertedBody).not.toBeNull()
    expect(insertedBody.receiver_id).toBe(SELLER_DEVICE)
    expect(insertedBody.receiver_id).not.toBe('demo_seller')
    expect(insertedBody.listing_id).toBe(MOCK_LISTING.id)
  })

  test('device_id 없는 옛 매물: 문의 버튼 대신 안내 표시', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_LISTING, device_id: null }),
      })
    })

    await page.goto(`/e2/${MOCK_LISTING.id}`)

    // 매물 자체는 정상 표시
    await expect(page.getByText('실연결 문의 카페')).toBeVisible()

    // 문의 불가 안내, 버튼 없음
    await expect(page.getByText('이 매물은 문의할 수 없어요')).toBeVisible()
    await expect(page.getByRole('button', { name: 'DM으로 문의하기' })).not.toBeVisible()
  })

  test('양수자 인박스: mock 대화 실데이터 렌더 + 더미 없음', async ({ page }) => {
    await page.route(SUPABASE_CONVERSATIONS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'conv-9',
          listing_id: MOCK_LISTING.id,
          listing_name: '실연결 문의 카페',
          listing_emoji: '🏠',
          sender_id: 'my-device',
          receiver_id: SELLER_DEVICE,
          sender_name: '문의자',
          receiver_name: '양도자',
          last_message: '주말에 방문 가능할까요?',
          last_message_at: new Date().toISOString(),
          contact_status: null,
        }]),
      })
    })

    await page.goto('/d4/startup/inbox')

    // 실데이터 렌더
    await expect(page.getByText('실연결 문의 카페')).toBeVisible()
    await expect(page.getByText('주말에 방문 가능할까요?')).toBeVisible()
    await expect(page.getByText('문의 1건')).toBeVisible()

    // 옛 더미 잔재가 없어야 함
    await expect(page.getByText('서교동 코너 상가')).not.toBeVisible()
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()
    await expect(page.getByText('보낸 문의가 없어요')).not.toBeVisible()
  })
})
