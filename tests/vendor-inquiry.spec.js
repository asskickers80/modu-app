/**
 * 기업회원 문의 채널 이원화 (ORDER 2026-09-09 파트 B) — [문의하기] + [전화하기], 강제 없음, 기록만
 * ① 전화번호 없는 기업회원 → [전화하기] 미렌더 ② [전화하기] → 원장 1행 channel=phone, 화면 전환 없음
 * ③ 첨부에서 지역 해제 → 전송 본문에 동 이름 없음 ④ 매출 구간 기본 꺼짐, 켜면 구간 문자열만(금액 없음)
 * ⑤ 기업회원 문의함 sales_card 라벨, 정렬 불변 ⑥ 상태 칩 '성사됐어요' → status=closed
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'
import { revenueBandOf, buildAttachment, attachmentItems } from '../src/lib/vendorInquiry.js'
import { kstToday, addDays } from '../src/lib/weekUtil.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const TODAY = kstToday()
const back = (n) => addDays(TODAY, -n)
const entriesOf = (n) => Array.from({ length: n }, (_, i) => ({ sale_date: back(i), revenue: i < 30 ? 82000 : 100000 }))

const vendor = (over = {}) => ({
  id: 'v1', device_id: 'vendor-dev', listing_type: 'business', status: 'published', biz_category: 'marketing',
  shop_name: '서교 홍보', address: '서울 마포구 서교동 1', image_urls: [], biz_tags: [], ...over,
})

test.describe('첨부 유닛', () => {
  test('매출 구간은 5단계 문자열만 / 지역 해제 시 본문에서 빠진다', () => {
    expect(revenueBandOf(entriesOf(56))).toBe('월 300만 미만')
    expect(revenueBandOf(Array.from({ length: 90 }, (_, i) => ({ sale_date: back(i), revenue: 500000 })))).toBe('월 1,000만~3,000만')
    expect(revenueBandOf([])).toBeNull()
    const items = attachmentItems({ bizLabel: '카페', regionLabel: '서울 마포구', situationLine: '가게 운영 중' })
    expect(buildAttachment(items, { region: false })).toBe('업종: 카페\n상황: 가게 운영 중')
    expect(buildAttachment(items, {}, '월 300만 미만')).toContain('최근 3개월 매출 구간: 월 300만 미만')
  })
})

/** 사장님 홈 + sales_drop 카드 + 마케팅 기업회원 1곳 */
async function setupOperating(page, { vendors }) {
  await mockGemini(page)
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/rest/v1/daily_sales*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entriesOf(56)) }))
  await page.route(`${SUPABASE}/rest/v1/listings*`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().url().includes('biz_category=eq.marketing') ? vendors : []) })
    : r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }))
  const ledger = []
  await page.route(`${SUPABASE}/rest/v1/inquiry_ledger*`, r => {
    if (r.request().method() === 'POST') {
      ledger.push(JSON.parse(r.request().postData() || '{}'))
      return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: `l${ledger.length}` }) })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  const messages = []
  await page.route(`${SUPABASE}/rest/v1/messages*`, r => {
    if (r.request().method() === 'POST') { messages.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route(`${SUPABASE}/rest/v1/conversations*`, r => {
    const m = r.request().method()
    if (m === 'POST') return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'c1' }) })
    if (m === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: r.request().headers()['accept']?.includes('object') ? 'null' : '[]' })
    return r.fulfill({ status: 204, body: '' })
  })
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'op-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({
      name: '김사장', category: 'operating',
      roleData: { operating: { bizLabel: '카페·커피전문점', region: '서울', region_sub: '마포구', category_main: '카페·베이커리' } },
    }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_op', category: 'operating', name: '김사장', active: true }]))
  })
  await page.goto('/a7/operating')
  await page.getByTestId('sales-service-cta').click()
  await page.getByTestId('sales-chip-marketing').click()
  await expect(page.getByTestId('sales-vendor')).toHaveCount(1)
  return { ledger, messages }
}

test('① 전화번호 없는 기업회원 → [전화하기] 미렌더, [문의하기]는 있음', async ({ page }) => {
  await setupOperating(page, { vendors: [vendor()] })
  await expect(page.getByTestId('vendor-inquire')).toBeVisible()
  await expect(page.getByTestId('vendor-call')).toHaveCount(0)
})

test('② [전화하기] → 원장 1행 channel=phone·status=sent, 끼어드는 화면 없음', async ({ page }) => {
  const { ledger } = await setupOperating(page, { vendors: [vendor({ biz_phone: '02-123-4567' })] })
  const call = page.getByTestId('vendor-call')
  await expect(call).toHaveAttribute('href', 'tel:02-123-4567')
  await call.click()
  await expect.poll(() => ledger.length).toBe(1)
  expect(ledger[0]).toMatchObject({ vendor_id: 'v1', channel: 'phone', status: 'sent', source: 'sales_card', signal: 'sales_drop', category: 'marketing', device_id: 'op-dev' })
  await expect(page).toHaveURL(/\/a7\/operating$/)
  await expect(page.getByTestId('inquiry-attach-sheet')).toHaveCount(0)
  await expect(page.getByTestId('sales-service-sheet')).toBeVisible()
})

test('③ [문의하기] 첨부 미리보기 — 지역 해제 → 전송 본문에 동 이름 없음, 원장 channel=app', async ({ page }) => {
  const { ledger, messages } = await setupOperating(page, { vendors: [vendor()] })
  await page.getByTestId('vendor-inquire').click()
  const sheet = page.getByTestId('inquiry-attach-sheet')
  await expect(sheet.getByText('이 정보는 이 업체에게만 보내져요')).toBeVisible()
  await expect(sheet.getByTestId('attach-region')).toContainText('서울 마포구')
  await expect(sheet.getByTestId('attach-situation')).toContainText('최근 한 달 매출이 이전 석 달 평균보다 18% 적어요')
  await sheet.getByTestId('attach-region').click()
  await expect(sheet.getByTestId('attach-region')).toHaveAttribute('aria-pressed', 'false')
  await sheet.getByTestId('inquiry-send').click()
  await expect.poll(() => messages.length).toBe(1)
  expect(messages[0].content).not.toContain('마포구')
  expect(messages[0].content).toContain('업종: 카페·커피전문점')
  expect(messages[0].content).toContain('상황: 최근 한 달 매출이 이전 석 달 평균보다 18% 적어요')
  expect(messages[0].content).not.toContain('매출 구간')
  await expect.poll(() => ledger.length).toBe(1)
  expect(ledger[0]).toMatchObject({ vendor_id: 'v1', conversation_id: 'c1', channel: 'app', status: 'sent', source: 'sales_card' })
  await expect(page).toHaveURL(/\/d4\/chat\/c1$/)
})

test('④ 매출 구간 기본 꺼짐 → 켜면 구간 문자열만 (숫자 금액 없음)', async ({ page }) => {
  const { messages } = await setupOperating(page, { vendors: [vendor()] })
  await page.getByTestId('vendor-inquire').click()
  const band = page.getByTestId('attach-sales-band')
  await expect(band).toHaveAttribute('aria-pressed', 'false')
  await band.click()
  await expect(band).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('inquiry-send').click()
  await expect.poll(() => messages.length).toBe(1)
  expect(messages[0].content).toContain('최근 3개월 매출 구간: 월 300만 미만')
  expect(messages[0].content).not.toMatch(/\d{2},\d{3}|\d+원/) // 82,000 같은 금액 없음
})

// ── 기업회원 문의함 ──────────────────────────────────────────
async function setupInbox(page) {
  const convs = [
    { id: 'c_a', listing_name: '서교 홍보', listing_emoji: '🏢', sender_id: 'x1', receiver_id: 'vendor-dev', sender_name: '김사장', receiver_name: '서교 홍보', last_message: '견적 문의', last_message_at: new Date().toISOString() },
    { id: 'c_b', listing_name: '서교 홍보', listing_emoji: '🏢', sender_id: 'x2', receiver_id: 'vendor-dev', sender_name: '박사장', receiver_name: '서교 홍보', last_message: '업종: 카페', last_message_at: new Date(Date.now() - 36e5).toISOString() },
  ]
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/rest/v1/conversations*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(convs) }))
  const patches = []
  await page.route(`${SUPABASE}/rest/v1/inquiry_ledger*`, r => {
    if (r.request().method() === 'PATCH') {
      patches.push({ url: r.request().url(), body: JSON.parse(r.request().postData() || '{}') })
      return r.fulfill({ status: 204, body: '' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify([{ id: 'l_b', conversation_id: 'c_b', vendor_id: 'v1', source: 'sales_card', status: 'sent', signal: 'sales_drop' }]) })
  })
  await page.addInitScript(() => localStorage.setItem('modu_device_id', 'vendor-dev'))
  await page.goto('/d4/business/inbox')
  return { patches }
}

test('⑤ 문의함: sales_card 출처만 "매출 상황에서 온 문의" 라벨, 순서는 그대로', async ({ page }) => {
  await setupInbox(page)
  const rows = page.getByTestId('business-inquiry-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('김사장')
  await expect(rows.nth(1)).toContainText('박사장')
  await expect(rows.nth(1).getByTestId('inquiry-source-label')).toHaveText('매출 상황에서 온 문의')
  await expect(rows.nth(0).getByTestId('inquiry-source-label')).toHaveCount(0)
  await expect(rows.nth(0).getByTestId('inquiry-outcome-chips')).toHaveCount(0) // 원장 없는 대화엔 칩 없음
  await expect(page.getByText('모든 문의는 DM으로 시작해요')).toHaveCount(0)
})

test('⑥ 상태 칩 "성사됐어요" → 원장 status=closed', async ({ page }) => {
  const { patches } = await setupInbox(page)
  const row = page.getByTestId('business-inquiry-row').nth(1)
  await row.getByTestId('inquiry-outcome-closed').click()
  await expect.poll(() => patches.length).toBe(1)
  expect(patches[0].url).toContain('id=eq.l_b')
  expect(patches[0].body.status).toBe('closed')
})
