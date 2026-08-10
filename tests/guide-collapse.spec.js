/**
 * 진행 가이드 완료 시 접기 (ORDER-guide-collapse-v1) — 양도인·임대인 공통
 *
 * 완료 판정: 등록 관련 4단계(등록·사진·소개글·공개)만 — 문의받기·협의시작은
 * 거래 상태 표시라 제외(오더 3항). 접힌 줄 = 거래 진행 상태, 탭하면 펼침(기록 열람).
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const ME = 'guide-collapse-dev'

const SELLER_DONE = {
  id: 's1', device_id: ME, status: 'published',
  shop_name: '접기 테스트', shop_name_public: true,
  address: '서울 마포구 서교동 332-4', transfer_fee: '3000', transfer_type: 'full',
  area: '33', biz_type: '카페·커피전문점',
  category_main: '카페·베이커리', category_sub: '카페·커피전문점',
  interior_image_urls: ['a', 'b', 'c'], image_urls: [],
  review_choices: { confirmedAt: '2026-08-01T00:00:00.000Z' },
  ai_draft: {}, edited_texts: {}, item_visibility: {}, facilities: [],
  created_at: '2026-07-19T00:00:00Z',
}

const LANDLORD_DONE = {
  id: 'L1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
  device_id: ME, address: '서울 서초구 서초동 100-1', shop_name: null,
  image_urls: ['https://x.test/p.jpg'], review_choices: { description: 'keep' },
  ai_draft: {}, edited_texts: {}, item_visibility: {}, created_at: '2026-07-11T00:00:00Z',
}

async function setup(page, cat, row, { convs = [], msgs = [] } = {}) {
  await mockGemini(page)
  await mockMarketData(page)
  await page.addInitScript(([id, c]) => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: c, region: '서울' }))
  }, [ME, cat])
  await page.route(`${SUPABASE}/conversations*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(convs) }))
  await page.route(`${SUPABASE}/messages*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(msgs) }))
  await page.route(`${SUPABASE}/listings*`, r => {
    const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? row : row ? [row] : []) })
  })
  for (const t of ['daily_contents', 'market_news']) {
    await page.route(`${SUPABASE}/${t}*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  }
}

test.describe('미완료면 펼침 유지', () => {
  test('양도인: 소개글 미검수 → 전 단계 목록 그대로, 접힌 줄 없음', async ({ page }) => {
    await setup(page, 'seller', { ...SELLER_DONE, review_choices: {} })
    await page.goto('/a7/seller')
    await expect(page.getByTestId('guide-draft')).toBeVisible()
    await expect(page.getByTestId('guide-summary')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '전체 보기' })).toHaveCount(0)
  })

  test('임대인: 사진 없음 → 펼침 유지', async ({ page }) => {
    await setup(page, 'landlord', { ...LANDLORD_DONE, image_urls: [] })
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('guide-photos')).toBeVisible()
    await expect(page.getByTestId('guide-summary')).toHaveCount(0)
  })
})

test.describe('등록 4단계 완료 → 접힘 + 거래 상태 문구', () => {
  test('양도인 문의 0건: "등록 완료 · 문의를 기다리는 중" + 토글 왕복', async ({ page }) => {
    await setup(page, 'seller', SELLER_DONE)
    await page.goto('/a7/seller')

    const summary = page.getByTestId('guide-summary')
    await expect(summary).toBeVisible()
    await expect(page.getByText('등록 완료 · 문의를 기다리는 중')).toBeVisible()
    await expect(page.getByTestId('guide-register')).not.toBeVisible() // 목록은 접힘

    // 줄 탭 → 펼침 (기록 열람)
    await summary.click()
    await expect(page.getByTestId('guide-register')).toBeVisible()
    await expect(summary).toHaveCount(0)
    // '접기' → 다시 접힘
    await page.getByRole('button', { name: '접기', exact: true }).click()
    await expect(page.getByTestId('guide-summary')).toBeVisible()
  })

  test('양도인 문의 2건 미답장: "문의 2건 · 답장을 기다리는 중"', async ({ page }) => {
    await setup(page, 'seller', SELLER_DONE, {
      convs: [{ id: 'c1', sender_id: 'b1', created_at: '2026-08-01T00:00:00Z' },
              { id: 'c2', sender_id: 'b2', created_at: '2026-08-02T00:00:00Z' }],
      msgs: [{ conversation_id: 'c1', sender_id: 'b1' }],
    })
    await page.goto('/a7/seller')
    await expect(page.getByText('문의 2건 · 답장을 기다리는 중')).toBeVisible()
  })

  test('양도인 답장 후: "문의 1건 · 협의 진행 중"', async ({ page }) => {
    await setup(page, 'seller', SELLER_DONE, {
      convs: [{ id: 'c1', sender_id: 'b1', created_at: '2026-08-01T00:00:00Z' }],
      msgs: [{ conversation_id: 'c1', sender_id: 'b1' }, { conversation_id: 'c1', sender_id: 'owner-y' }],
    })
    await page.goto('/a7/seller')
    await expect(page.getByText('문의 1건 · 협의 진행 중')).toBeVisible()
  })

  test('임대인 동일 동작: 접힘 → 줄 탭 펼침, 문의 문구', async ({ page }) => {
    await setup(page, 'landlord', LANDLORD_DONE, {
      convs: [{ id: 'c1', sender_id: 'b1', created_at: '2026-08-01T00:00:00Z',
                last_message_at: '2026-08-01T00:00:00Z', receiver_last_read_at: null, sender_last_read_at: null }],
      msgs: [{ conversation_id: 'c1', sender_id: 'b1' }],
    })
    await page.goto('/a7/landlord')
    await expect(page.getByText('문의 1건 · 답장을 기다리는 중')).toBeVisible()
    await page.getByTestId('guide-summary').click()
    await expect(page.getByTestId('guide-inquiry')).toBeVisible()
  })
})
