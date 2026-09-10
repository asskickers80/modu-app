/**
 * 완성도 '다음 1개' 카드 + 고가치 행동 이벤트 + 양도 검토 신호 집계 (ORDER 2026-09-10 파트 C)
 * ① 사진 없는 매물 → 카드에 사진 항목·두 점수, 전부 채운 매물 → 카드 없음 ② 슬롯 미달 → 슬롯 문구 없음, 다 쓴 사용자 → 1줄
 * ③ 문의 전송 → high_value_action(inquiry) 1건 ④ price_card 2건인 동 → 집계 카드 없음, 3건 → 카드 ⑤ 문안 lint
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { getNextCompletenessItem } from '../src/lib/completenessNext.js'
import { calcScore, listingToScoreInput } from '../src/lib/completeness.js'
import { aggregateDemand } from '../src/lib/demandSignals.js'
import { findCopyViolations } from '../scripts/lint-copy.mjs'
import { SELLER_ITEMS, BADGE_THRESHOLD } from '../config/completeness.ts'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const FULL = {
  id: 'c-1', device_id: 'c-dev', status: 'published', shop_name: '완성 카페', shop_name_public: true,
  address: '서울 마포구 서교동 1', area: '33', deposit: '3000', monthly_rent: '200', transfer_fee: '2500', transfer_type: 'full',
  category_main: '카페·베이커리', sales_proof: true, image_urls: ['a.jpg', 'b.jpg', 'c.jpg'], review_choices: {}, created_at: new Date().toISOString(),
}

test.describe('유닛', () => {
  test('① 점수 산식 불변(가중치 합 90 상한 100) + 사진 없는 매물은 사진 항목·두 점수, 전부 채우면 null', () => {
    expect(SELLER_ITEMS.reduce((s, i) => s + i.weight, 0)).toBe(90)
    expect(calcScore(listingToScoreInput(FULL))).toBe(90)
    const noPhoto = { ...FULL, image_urls: [] }
    const n = getNextCompletenessItem(noPhoto)
    expect(n.key).toBe('photos')
    expect(n.line).toBe("사진을 올리면 완성도 78→90점 · '충실한 매물' 배지가 붙어요") // 78→90 이 배지 기준 80 을 넘는다
    expect(n.current).toBe(78); expect(n.projected).toBe(90)
    expect(getNextCompletenessItem(FULL)).toBeNull()
    // 가중치 최대 항목 우선: 주소·사진 둘 다 비면 주소(20)
    expect(getNextCompletenessItem({ ...noPhoto, address: '' }).key).toBe('address')
    // 배지 경계: 70 → 82 면 배지 문구
    const b = getNextCompletenessItem({ ...FULL, image_urls: [], sales_proof: false, address: '' }) // 20+12 비움 = 58 → 주소 채우면 78 (배지 미달)
    expect(b.unlock).toBeNull()
    const c = getNextCompletenessItem({ ...FULL, image_urls: [] }) // 78 → 90 ≥ 80
    expect(c.unlock).toBe("'충실한 매물' 배지가 붙어요")
    expect(c.line).toContain(`→90점 · '충실한 매물' 배지가 붙어요`)
    expect(BADGE_THRESHOLD).toBe(80)
  })

  test('① 사진 2장(점수는 만점) → 권장 3장 안내, 점수 변화 없음', () => {
    const n = getNextCompletenessItem({ ...FULL, image_urls: ['a', 'b'] })
    expect(n.key).toBe('photos')
    expect(n.line).toBe('사진 1장을 더 올리면 권장 3장이 채워져요 · 완성도 90점')
    expect(n.projected).toBe(n.current)
  })

  test('② 무료 슬롯 미달 → 슬롯 문구 없음, 다 쓴 사용자 → 1줄', () => {
    expect(getNextCompletenessItem({ ...FULL, image_urls: ['a', 'b'] }).slotNote).toBeNull()
    expect(getNextCompletenessItem({ ...FULL, image_urls: ['a', 'b'] }, { photoSlots: 2 }).slotNote).toBe('사진 슬롯을 늘릴 수 있어요')
    // 사진 항목이 아닌 카드에는 슬롯 문구를 붙이지 않는다
    expect(getNextCompletenessItem({ ...FULL, address: '' }, { photoSlots: 1 }).slotNote).toBeNull()
  })

  test('④ 집계: 2건인 구 → 없음, 3건 → 카드 재료, 개인 식별 입력 없음', () => {
    expect(aggregateDemand(['마포구', '마포구'])).toEqual([])
    expect(aggregateDemand(['마포구', '마포구', '마포구', '강남구'])).toEqual([{ region: '마포구', n: 3 }])
    expect(aggregateDemand([null, '', undefined])).toEqual([])
  })

  test('⑤ 카드 문안에 "배"·"늘어요" 포함 시 lint 실패', () => {
    expect(findCopyViolations("guide: '사진을 올리면 문의가 2배 늘어요'").map(v => v.token)).toEqual(['2배', '늘어요'])
    expect(findCopyViolations("guide: '사진을 올리면'")).toEqual([])
  })
})

test('① UI: 양도인 홈 — 사진 없는 매물이면 "다음 1개" 카드(두 점수), 전부 채운 매물이면 없음', async ({ page }) => {
  await mockGemini(page)
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'c-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
  })
  const rows = [{ ...FULL, image_urls: [] }]
  await page.route(`${SUPABASE}/rest/v1/listings*`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    : r.continue())
  await page.goto('/a7/seller')
  const card = page.getByTestId('completeness-next-card')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-item', 'photos')
  await expect(card.getByTestId('completeness-next-line')).toHaveText("사진을 올리면 완성도 78→90점 · '충실한 매물' 배지가 붙어요")
  await expect(card.getByTestId('photo-slot-note')).toHaveCount(0) // ② 슬롯 미달
  await card.click()
  await expect(page).toHaveURL(/\/e1\/3\?edit=c-1$/)

  rows[0] = FULL
  await page.goto('/a7/seller')
  await expect(page.getByTestId('my-listing-card').or(page.getByText('완성 카페')).first()).toBeVisible()
  await expect(page.getByTestId('completeness-next-card')).toHaveCount(0)
})

test('③ 문의 전송 → high_value_action(kind=inquiry) 이벤트 1건', async ({ page }) => {
  await mockGemini(page)
  await mockMarketData(page)
  await seedSession(page)
  await page.addInitScript(() => localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup' })))
  const listing = { ...FULL, id: 'hv-1', device_id: 'seller-dev', ai_draft: {}, edited_texts: {} }
  await page.route(`${SUPABASE}/rest/v1/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listing) }))
  await page.route(`${SUPABASE}/rest/v1/conversations*`, r => {
    const m = r.request().method()
    if (m === 'POST') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'conv-hv' }) })
    if (r.request().url().includes('sender_id=eq.')) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'conv-hv', listing_id: 'hv-1', listing_name: '완성 카페', sender_id: 'x', receiver_id: 'seller-dev', sender_name: '문의자', receiver_name: '양도자' }) })
  })
  await page.route(`${SUPABASE}/rest/v1/messages*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  const events = []
  await page.route(`${SUPABASE}/rest/v1/events*`, r => {
    if (r.request().method() === 'POST') events.push(JSON.parse(r.request().postData() || '{}'))
    return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
  })
  await page.goto('/e2/hv-1')
  await page.getByRole('button', { name: 'DM으로 문의하기' }).click()
  await page.getByRole('button', { name: 'DM 대화 시작하기' }).click()
  await expect(page).toHaveURL(/\/d4\/chat\/conv-hv/)
  await expect.poll(() => events.filter(e => e.event_name === 'high_value_action').length).toBe(1)
  const hv = events.find(e => e.event_name === 'high_value_action')
  expect(hv.payload).toMatchObject({ kind: 'inquiry', from: 'search', listing_id: 'hv-1' })
  expect(hv.payload.session_id).toMatch(/^s_/)
})

async function setupBusiness(page, { regions }) {
  await mockGemini(page)
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/rest/v1/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ id: 'v-re', device_id: 'biz-dev', listing_type: 'business', status: 'published', biz_category: 'realestate', shop_name: '테스트 공인' }]) }))
  await page.route(`${SUPABASE}/rest/v1/inquiry_ledger*`, r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify(regions.map(region => ({ region, created_at: new Date().toISOString() }))) }))
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'biz-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ name: '김대표', category: 'business', region: '서울' }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_b', category: 'business', name: '김대표', active: true }]))
  })
  await page.goto('/a7/business')
}

test('④ UI: 기업회원(부동산) 홈 — price_card 2건인 구 → 카드 없음, 3건 → "이번 주 마포구 양도 검토 신호 3건"', async ({ page }) => {
  await setupBusiness(page, { regions: ['마포구', '마포구'] })
  await expect(page.getByText('영업 상황판').first()).toBeVisible()
  await expect(page.getByTestId('demand-signal-card')).toHaveCount(0)

  await setupBusiness(page, { regions: ['마포구', '마포구', '마포구', '강남구'] })
  const card = page.getByTestId('demand-signal-card')
  await expect(card).toBeVisible()
  await expect(card.getByTestId('demand-signal-line')).toHaveText('이번 주 마포구 양도 검토 신호 3건')
  await expect(card.getByRole('button')).toHaveCount(0) // 정보 카드 — 응답 버튼 없음
})
