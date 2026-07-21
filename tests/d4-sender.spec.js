/**
 * D4 발신자 판정 — 대화 참가자 기준 (ORDER-d4-sender-bug-v1)
 *
 * 소유자(양도인)가 익명 등록 후 로그인하며 device_id가 흔들려, 답장 메시지의
 * sender_id가 conversation.receiver_id와도 어긋난 상황(고아 sender)에서도
 * "문의자(conversation.sender_id) vs 아닌 것"으로 갈라 좌/우·아바타가 옳아야 한다.
 */
import { test, expect } from './fixtures.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const CONVERSATIONS = `${SUPABASE}/rest/v1/conversations*`
const MESSAGES = `${SUPABASE}/rest/v1/messages*`

const INQUIRER = 'inquirer-mac'   // 문의자(맥북) = conversation.sender_id
const OWNER_NOW = 'owner-phone'   // 소유자(폰)의 현재 기기 ID = conversation.receiver_id
const OWNER_MSG_SENDER = 'owner-orphan-id' // 답장 메시지에 저장된, 참가자 둘 다와 어긋난 고아 id

const CONV = {
  id: 't1',
  listing_id: 'l1',
  listing_name: '왓더버거',
  listing_emoji: '🏠',
  sender_id: INQUIRER,
  receiver_id: OWNER_NOW,
  sender_name: '문의자',
  receiver_name: '김양도',
  contact_status: null,
}

const MSGS = [
  { id: 'm1', conversation_id: 't1', sender_id: INQUIRER,          content: '문의합니다',   type: 'text', created_at: '2026-07-21T12:07:00Z' },
  { id: 'm2', conversation_id: 't1', sender_id: OWNER_MSG_SENDER,  content: '네 안녕하세요', type: 'text', created_at: '2026-07-21T12:22:00Z' },
]

function mockChat(page) {
  page.route(CONVERSATIONS, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CONV) }))
  page.route(MESSAGES, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MSGS) }))
}

function row(page, text) {
  return page.locator('div[data-mine]', { hasText: text })
}

test.describe('D4 발신자 판정 — 양자 시나리오', () => {
  test('소유자 뷰: 소유자 답장=우측(내 메시지), 문의자 메시지=좌측', async ({ page }) => {
    await page.addInitScript(id => localStorage.setItem('modu_device_id', id), OWNER_NOW)
    await mockChat(page)

    await page.goto('/d4/chat/t1')

    // 소유자 답장은 '내 메시지'(우측)
    await expect(row(page, '네 안녕하세요')).toHaveAttribute('data-mine', 'true')
    // 문의자 메시지는 상대(좌측)
    await expect(row(page, '문의합니다')).toHaveAttribute('data-mine', 'false')
  })

  test('문의자 뷰: 문의자 메시지=우측, 소유자 답장=좌측(상대 아바타)', async ({ page }) => {
    await page.addInitScript(id => localStorage.setItem('modu_device_id', id), INQUIRER)
    await mockChat(page)

    await page.goto('/d4/chat/t1')

    await expect(row(page, '문의합니다')).toHaveAttribute('data-mine', 'true')
    // 소유자 답장(고아 sender)이 좌측이면서 '문의자'가 아니라 소유자로 렌더돼야 한다
    await expect(row(page, '네 안녕하세요')).toHaveAttribute('data-mine', 'false')
  })
})
