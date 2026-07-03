/**
 * D4 안읽음 표시 (localStorage 마지막 열람 시각 방식)
 *
 * 1. 새 메시지 있는 대화 → 인박스에 안읽음 점 표시
 * 2. 스레드 진입 후 목록 복귀 → 점 해제
 * 3. 내가 마지막 메시지를 보낸 대화 → 점 없음 (전송 완료 시 열람 처리)
 */
import { test, expect } from '@playwright/test'

const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'
const SUPABASE_MESSAGES = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/messages*'
const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

// 확실한 과거 시각 — 열람 마크(now)가 항상 이보다 뒤가 되도록
const PAST_AT = '2026-07-01T00:00:00Z'

const CONV = {
  id: 'conv-u1',
  listing_id: 'listing-x',
  listing_name: '안읽음 카페',
  listing_emoji: '🏠',
  sender_id: 'buyer-device',
  receiver_id: 'seller-device',
  sender_name: '문의자',
  receiver_name: '양도자',
  last_message: '새 메시지가 왔어요',
  last_message_at: PAST_AT,
  contact_status: null,
}

test.describe('D4 안읽음 표시', () => {
  test('새 메시지 대화: 인박스에 안읽음 점 표시', async ({ page }) => {
    await page.route(SUPABASE_CONVERSATIONS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([CONV]),
      })
    })

    await page.goto('/d4/inbox')

    await expect(page.getByText('안읽음 카페')).toBeVisible()
    await expect(page.getByTestId('unread-dot')).toHaveCount(1)
  })

  test('스레드 진입 후 목록 복귀: 점 해제', async ({ page }) => {
    await page.route(SUPABASE_CONVERSATIONS, async route => {
      const req = route.request()
      if (req.method() === 'GET' && req.url().includes('id=eq.')) {
        // D4Chat 단건 조회
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CONV) })
      } else if (req.method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([CONV]) })
      } else {
        await route.fulfill({ status: 204, body: '' })
      }
    })
    await page.route(SUPABASE_MESSAGES, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/d4/inbox')
    await expect(page.getByTestId('unread-dot')).toHaveCount(1)

    // 스레드 진입 → 열람 처리
    await page.getByText('문의자').click()
    await expect(page).toHaveURL(/\/d4\/chat\/conv-u1/)
    await expect(page.getByText('안읽음 카페')).toBeVisible()

    // 목록 복귀 → 점 사라짐
    await page.goBack()
    await expect(page.getByText('안읽음 카페')).toBeVisible()
    await expect(page.getByTestId('unread-dot')).toHaveCount(0)
  })

  test('내가 마지막 메시지를 보낸 대화: 점 없음', async ({ page }) => {
    let patchedAt = PAST_AT // 전송 시 conversations PATCH의 last_message_at 캡처

    await page.route(SUPABASE_CONVERSATIONS, async route => {
      const req = route.request()
      if (req.method() === 'PATCH') {
        patchedAt = JSON.parse(req.postData()).last_message_at ?? patchedAt
        await route.fulfill({ status: 204, body: '' })
      } else if (req.method() === 'GET' && req.url().includes('id=eq.')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CONV) })
      } else {
        // 인박스 목록 — 내가 보낸 메시지의 시각을 그대로 반영
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ ...CONV, last_message: '제 메시지입니다', last_message_at: patchedAt }]),
        })
      }
    })
    await page.route(SUPABASE_MESSAGES, async route => {
      const req = route.request()
      if (req.method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'm-new', created_at: new Date().toISOString(), ...JSON.parse(req.postData()) }),
        })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
    })

    // 채팅에서 메시지 전송 (전송 완료 후 열람 처리가 last_message_at보다 뒤여야 함)
    await page.goto('/d4/chat/conv-u1')
    const patchDone = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().includes('/conversations'))
    await page.getByPlaceholder('메시지 입력...').fill('제 메시지입니다')
    await page.getByPlaceholder('메시지 입력...').press('Enter')
    await patchDone
    await page.waitForTimeout(300) // PATCH 후 markConversationSeen 실행 여유

    // 인박스로 이동 — 내 메시지가 마지막인 대화엔 점이 없어야 함
    await page.goto('/d4/inbox')
    await expect(page.getByText('안읽음 카페')).toBeVisible()
    await expect(page.getByTestId('unread-dot')).toHaveCount(0)
  })

  test('대시보드 외 화면(탐색)의 메시지 탭에도 점 배지 표시', async ({ page }) => {
    await page.route(SUPABASE_CONVERSATIONS, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([CONV]) })
    })
    await page.route(SUPABASE_LISTINGS, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/explore')

    await expect(page.getByTestId('tab-unread-dot')).toBeVisible()
  })
})
