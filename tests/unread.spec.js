/**
 * D4 안읽음 표시 (DB 컬럼 방식 — sender/receiver_last_read_at)
 *
 * 1. 새 메시지 있는 대화(읽음 컬럼 null) → 인박스에 안읽음 점 표시
 * 2. 스레드 진입 후 목록 복귀 → 점 해제 + 내 쪽(sender) 컬럼만 update
 * 3. 내가 마지막 메시지를 보낸 대화 → 점 없음 (전송 완료 시 열람 처리)
 * 4. 대시보드 외 화면의 메시지 탭 점 배지
 *
 * mock은 PATCH body를 대화 상태에 병합해 DB 저장을 흉내낸다.
 */
import { test, expect } from '@playwright/test'

const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'
const SUPABASE_MESSAGES = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/messages*'
const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

const MY_DEVICE = 'buyer-device' // 이 대화의 sender 쪽

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
  sender_last_read_at: null,
  receiver_last_read_at: null,
  contact_status: null,
}

/**
 * 대화 1건짜리 stateful mock — PATCH body를 state에 병합해 읽음 기록을 흉내낸다.
 * 반환값 patches 배열에 PATCH body를 순서대로 캡처.
 */
function mockConversations(page, initial = CONV) {
  const state = { ...initial }
  const patches = []
  page.route(SUPABASE_CONVERSATIONS, async route => {
    const req = route.request()
    if (req.method() === 'PATCH') {
      const body = JSON.parse(req.postData())
      patches.push(body)
      Object.assign(state, body)
      await route.fulfill({ status: 204, body: '' })
    } else if (req.method() === 'GET' && req.url().includes('id=eq.')) {
      // 단건 조회 (D4Chat 로드 · markConversationSeen의 역할 판정 조회)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state) })
    } else {
      // 인박스 목록
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([state]) })
    }
  })
  return patches
}

test.describe('D4 안읽음 표시', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => localStorage.setItem('modu_device_id', id), MY_DEVICE)
  })

  test('새 메시지 대화: 인박스에 안읽음 점 표시', async ({ page }) => {
    mockConversations(page)

    await page.goto('/d4/inbox')

    await expect(page.getByText('안읽음 카페')).toBeVisible()
    await expect(page.getByTestId('unread-dot')).toHaveCount(1)
  })

  test('스레드 진입 후 목록 복귀: 점 해제 + 내 쪽 컬럼만 update', async ({ page }) => {
    const patches = mockConversations(page)
    await page.route(SUPABASE_MESSAGES, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/d4/inbox')
    await expect(page.getByTestId('unread-dot')).toHaveCount(1)

    // 스레드 진입 → 열람 처리 (내 쪽 컬럼 PATCH)
    const patchDone = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().includes('/conversations'))
    await page.getByText('문의자').click()
    await expect(page).toHaveURL(/\/d4\/chat\/conv-u1/)
    await expect(page.getByText('안읽음 카페')).toBeVisible()
    await patchDone

    // 나는 이 대화의 sender — sender 컬럼만 기록, 상대(receiver) 컬럼은 안 건드림
    expect(patches.length).toBeGreaterThan(0)
    for (const body of patches) {
      expect(body.sender_last_read_at, '내 쪽(sender) 컬럼이 기록되지 않음').toBeTruthy()
      expect(body.receiver_last_read_at, '상대(receiver) 컬럼을 건드림').toBeUndefined()
    }

    // 목록 복귀 → 점 사라짐
    await page.goBack()
    await expect(page.getByText('안읽음 카페')).toBeVisible()
    await expect(page.getByTestId('unread-dot')).toHaveCount(0)
  })

  test('내가 마지막 메시지를 보낸 대화: 점 없음', async ({ page }) => {
    const patches = mockConversations(page)
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

    // 채팅에서 메시지 전송 — 전송 완료 후 내 쪽 열람 처리가 last_message_at보다 뒤여야 함
    await page.goto('/d4/chat/conv-u1')
    await page.getByPlaceholder('메시지 입력...').fill('제 메시지입니다')
    await page.getByPlaceholder('메시지 입력...').press('Enter')

    // 진입 시점 열람 PATCH가 아니라, last_message 갱신 "이후"의 열람 PATCH를 기다린다
    await expect.poll(() => {
      const li = patches.findIndex(b => 'last_message' in b)
      return li >= 0 && patches.slice(li + 1).some(b => b.sender_last_read_at)
    }, { message: '전송 후 내 쪽 열람 PATCH가 오지 않음' }).toBe(true)

    // 인박스로 이동 — 내 메시지가 마지막인 대화엔 점이 없어야 함
    await page.goto('/d4/inbox')
    await expect(page.getByText('안읽음 카페')).toBeVisible()
    await expect(page.getByTestId('unread-dot')).toHaveCount(0)
  })

  test('열람 기록: 역할 판정 GET 없이 PATCH 1회', async ({ page }) => {
    const patches = mockConversations(page)
    await page.route(SUPABASE_MESSAGES, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    // 대화 단건 GET(id=eq.)을 센다 — D4Chat 로드 1회 외에 markConversationSeen의 추가 GET이 없어야 함
    let getById = 0
    page.on('request', req => {
      if (req.method() === 'GET' && req.url().includes('/conversations') && req.url().includes('id=eq.')) getById++
    })

    const patchDone = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().includes('/conversations'))
    await page.goto('/d4/chat/conv-u1')
    await patchDone
    await page.waitForLoadState('networkidle') // StrictMode 이중 이펙트의 두 번째 요청까지 정산

    // StrictMode가 진입 이펙트를 2회 돌리므로 절대 횟수 대신 고정 비율로 단언:
    // 열람 기록 1건당 GET은 D4Chat 대화 로드 1회뿐 — 구 방식(역할 판정 GET)이면 GET이 PATCH의 2배가 된다
    expect(patches.length).toBeGreaterThan(0)
    expect(getById, '열람 기록에 역할 판정 GET이 섞임 (GET 수 ≠ PATCH 수)').toBe(patches.length)
    // 내 쪽(sender) 컬럼만 기록 — 상대 컬럼은 안 건드림
    for (const body of patches) {
      expect(body.sender_last_read_at).toBeTruthy()
      expect(body.receiver_last_read_at).toBeUndefined()
    }
  })

  test('대시보드 외 화면(탐색)의 메시지 탭에도 점 배지 표시', async ({ page }) => {
    mockConversations(page)
    await page.route(SUPABASE_LISTINGS, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/explore')

    await expect(page.getByTestId('tab-unread-dot')).toBeVisible()
  })
})
