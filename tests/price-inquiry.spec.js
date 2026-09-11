/**
 * '모두에 시세 물어보기' (ORDER 2026-09-11 파트 C, 외부 없음)
 * ① 진입점 4곳 시트·origin ② 같은 동 업종 3건 → 시세 범위 카드, 2건 → 없음·"데이터 부족" 없음 ③ 첨부에 이름·연락처·매출 금액·정확한 주소 없음
 * ④ 매출 구간 기본 OFF ⑤ 반경 내 3곳 동시 발송, 4곳 응답 → 카드 3 + 더 보기 ⑥ 정렬 = 응답 시각 오름차순(유료 늦으면 아래)
 * ⑦ [대화 열기] 전 대화 없음·업체에 연락처 없음 ⑧ 30일 내 같은 점포·칩 재탭 → 새 신호 없음 ⑨ 법인 자리 같은 규칙·assignee_type=modu
 * ⑩ 문안 lint ⑪ 배정 코드가 modu_vendor_id 를 정렬 키로 쓰면 lint 실패 ⑫ 7일 후 피드백 칩 1회
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import { attachmentItems, buildAttachment, ATTACHMENT_FORBIDDEN_KEYS, placeHashOf, isDuplicate, pickTargets, sortResponses, visibleResponses, labelText, assigneeTypeOf, feedbackDue, areaBandOf, rentBandOf } from '../src/lib/priceInquiryRules.js'
import { PRICE_INQUIRY, PRICE_INQUIRY_COPY } from '../config/priceInquiry.ts'
import { findCopyViolations } from '../scripts/lint-copy.mjs'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'
import { kstToday, addDays } from '../src/lib/weekUtil.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const ORIGIN = { lat: 37.55, lng: 126.92 }
const V = (id, cat, dlat = 0, extra = {}) => ({ id, device_id: `dev-${id}`, listing_type: 'business', status: 'published', biz_category: cat, shop_name: `업체 ${id}`, latitude: ORIGIN.lat + dlat, longitude: ORIGIN.lng, published_at: new Date(Date.now() - 90 * 864e5).toISOString(), ...extra })
const VENDORS = [V('r1', 'realestate', 0.005), V('r2', 'realestate', 0.009), V('c1', 'consulting', 0.03), V('far', 'realestate', 0.2)]

test.describe('룰 유닛', () => {
  test('③·④ 첨부: 업종·동·면적대·층·월세대만, 금지 키 없음, 매출 구간은 켰을 때만', () => {
    const items = attachmentItems({ industry: '카페·베이커리', address: '서울 마포구 서교동 332-4 1층', area: '33', floor: '1', monthlyRent: '180' })
    expect(items.map(i => i.key)).toEqual(['industry', 'dong', 'area_band', 'floor', 'rent_band'])
    expect(items.find(i => i.key === 'dong').value).toBe('서교동') // 정확한 주소 아님
    expect(areaBandOf('33')).toBe('30~40㎡'); expect(rentBandOf('180')).toBe('150~200만')
    const a = buildAttachment(items, { floor: false }, { chips: ['transfer_fee'], timing: 'in_3m' })
    expect(a).toEqual({ chips: ['transfer_fee'], timing: 'in_3m', industry: '카페·베이커리', dong: '서교동', area_band: '30~40㎡', rent_band: '150~200만' })
    expect(a).not.toHaveProperty('sales_band')
    expect(buildAttachment(items, {}, { chips: [], salesBand: '월 300만 미만' }).sales_band).toBe('월 300만 미만')
    for (const k of ATTACHMENT_FORBIDDEN_KEYS) expect(buildAttachment([{ key: k, label: k, value: 'x' }], {}, {})).not.toHaveProperty(k)
  })

  test('⑧ 중복: 30일 내 같은 점포·같은 칩 → 차단, 만료·다른 칩·다른 점포는 통과', () => {
    const ph = placeHashOf('서울 마포구 서교동 332-4 101호')
    expect(ph).toBe(placeHashOf('서울 마포구 서교동 332-4 101호 '))
    const ex = [{ place_hash: ph, status: 'open', attachment: { chips: ['transfer_fee'] }, created_at: new Date(Date.now() - 10 * 864e5).toISOString() }]
    expect(isDuplicate(ex, { placeHash: ph, chips: ['transfer_fee', 'cases'] })).toBe(true)
    expect(isDuplicate(ex, { placeHash: ph, chips: ['rent_sale'] })).toBe(false)
    expect(isDuplicate(ex, { placeHash: placeHashOf('다른 곳'), chips: ['transfer_fee'] })).toBe(false)
    expect(isDuplicate([{ ...ex[0], status: 'expired' }], { placeHash: ph, chips: ['transfer_fee'] })).toBe(false)
    expect(isDuplicate([{ ...ex[0], created_at: new Date(Date.now() - 31 * 864e5).toISOString() }], { placeHash: ph, chips: ['transfer_fee'] })).toBe(false)
  })

  test('⑤·⑥·⑨ 배정: 반경 내 realestate 2·consulting 1 → 3곳(전원 동시), 정렬은 응답 시각만, 법인은 같은 규칙', () => {
    const { targets, pending, widened } = pickTargets(VENDORS, ORIGIN)
    expect(targets.map(v => v.id)).toEqual(['r1', 'r2', 'c1']); expect(pending).toBe(false); expect(widened).toBe(false)
    expect(pickTargets(VENDORS, { lat: 38.5, lng: 127.9 }).pending).toBe(true)
    const w = pickTargets([V('x', 'realestate', 0.02)], ORIGIN); expect(w.targets).toHaveLength(1); expect(w.widened).toBe(true)
    const t = (id, min, extra = {}) => ({ id, vendor_id: id, responded_at: new Date(Date.now() - min * 6e4).toISOString(), ...extra })
    const sorted = sortResponses([t('paid', 1, { plan_tier: 'vendor_paid' }), t('a', 30), t('b', 20), t('c', 10)])
    expect(sorted.map(x => x.id)).toEqual(['a', 'b', 'c', 'paid']) // 유료 업체가 늦게 답하면 아래
    const { shown, more } = visibleResponses(sorted); expect(shown).toHaveLength(3); expect(more).toBe(1)
    expect(PRICE_INQUIRY.max_cards).toBe(3)
    // ⑨ 법인 자리 — 다른 업체와 같은 순번 규칙, 원장 assignee_type 만 modu
    const cfg = { modu_direct_enabled: true, modu_vendor_id: 'r2' }
    expect(assigneeTypeOf('r2', cfg)).toBe('modu'); expect(assigneeTypeOf('r1', cfg)).toBe('vendor'); expect(assigneeTypeOf('r2')).toBe('vendor')
    expect(pickTargets(VENDORS, ORIGIN).targets.findIndex(v => v.id === 'r2')).toBe(1) // 법인이어도 앞으로 오지 않는다
    expect(labelText(false)).toBe(PRICE_INQUIRY_COPY.label.vendor_only); expect(labelText(true)).toBe(PRICE_INQUIRY_COPY.label.vendor_and_modu)
  })

  test('⑩·⑪ lint: 문안 "AI"·"예상 권리금"·"추정" 실패 / 배정 코드 modu_vendor_id 정렬 키 실패, 실제 파일 위반 0', () => {
    for (const bad of ['"AI가 골라요"', '예상 권리금 3,000만', '추정 시세']) expect(findCopyViolations(bad).length).toBeGreaterThan(0)
    for (const f of ['config/priceInquiry.ts', 'config/demandSignal.ts', 'src/components/PriceInquirySheet.jsx', 'src/components/PriceInquiryResponses.jsx', 'src/components/DemandInbox.jsx', 'src/lib/priceInquiryRules.js']) {
      expect(findCopyViolations(readFileSync(f, 'utf8'), f)).toEqual([])
    }
    expect(findPricingSortViolations('function dispatchDemandSignal(vendors) {\n  return vendors.sort((a, b) => (a.id === modu_vendor_id ? -1 : 1))\n}')).toHaveLength(1)
    expect(findPricingSortViolations('const assignTargets = (vs) => {\n  return vs.filter(v => v.id !== PRICE_INQUIRY.modu_vendor_id)\n}')).toHaveLength(1)
    expect(findPricingSortViolations(readFileSync('src/lib/priceInquiryRules.js', 'utf8'), 'priceInquiryRules.js')).toEqual([])
    expect(findPricingSortViolations(readFileSync('src/lib/priceInquiry.js', 'utf8'), 'priceInquiry.js')).toEqual([])
  })

  test('⑫ 피드백 시점: 대화 7일 뒤', () => {
    expect(feedbackDue(new Date(Date.now() - 8 * 864e5).toISOString())).toBe(true)
    expect(feedbackDue(new Date(Date.now() - 6 * 864e5).toISOString())).toBe(false)
    expect(feedbackDue(null)).toBe(false)
  })
})

// ── UI ───────────────────────────────────────────────────────
const L = (i) => ({ id: `p${i}`, status: 'published', address: '서울 마포구 서교동 1', category_main: '카페·베이커리', transfer_fee: String(3000 + i * 500), monthly_rent: String(150 + i * 25), updated_at: new Date().toISOString() })
const MY_LISTING = { id: 'my-1', device_id: 'pi-dev', status: 'published', listing_type: 'seller', shop_name: '내 카페', shop_name_public: true, address: '서울 마포구 서교동 332-4 1층', bjd_code: '1144012000', area: '33', floor: '1', deposit: '3000', monthly_rent: '180', transfer_fee: '3500', transfer_type: 'full', category_main: '카페·베이커리', image_urls: [], review_choices: {}, latitude: ORIGIN.lat, longitude: ORIGIN.lng, created_at: new Date().toISOString() }

async function base(page, { role = 'seller', myListings = [], priceListings = [], vendors = VENDORS, signals = [], targets = [], feedback = [], sales = [] } = {}) {
  await mockGemini(page); await mockMarketData(page); await seedSession(page)
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/daily_sales*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sales) }))
  await page.route(`${REST}/listings*`, r => {
    const u = r.request().url()
    const body = u.includes('listing_type=eq.business') ? vendors : u.includes('category_main=eq.') ? priceListings : u.includes('device_id=eq.') ? myListings : u.includes('id=in.') ? vendors : []
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  const posted = { signals: [], targets: [], ledger: [], convs: [], feedback: [] }
  const patched = { signals: [], targets: [], ledger: [] }
  await page.route(`${REST}/demand_signals*`, r => {
    const m = r.request().method()
    if (m === 'POST') { posted.signals.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 's-new' }) }) }
    if (m === 'PATCH') { patched.signals.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 204, body: '' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(signals) })
  })
  await page.route(`${REST}/demand_signal_targets*`, r => {
    const m = r.request().method()
    if (m === 'POST') { posted.targets.push(...[].concat(JSON.parse(r.request().postData()))); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    if (m === 'PATCH') { patched.targets.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 204, body: '' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(targets) })
  })
  await page.route(`${REST}/inquiry_ledger*`, r => {
    const m = r.request().method()
    if (m === 'POST') { posted.ledger.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'l1' }) }) }
    if (m === 'PATCH') { patched.ledger.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 204, body: '' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'l-open', vendor_id: null }]) })
  })
  await page.route(`${REST}/conversations*`, r => {
    if (r.request().method() === 'POST') { posted.convs.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'conv-pi' }) }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: r.request().headers()['accept']?.includes('object') ? JSON.stringify({ id: 'conv-pi', listing_name: '업체 r1', sender_id: 'pi-dev', receiver_id: 'dev-r1', sender_name: '나', receiver_name: '업체 r1' }) : '[]' })
  })
  await page.route(`${REST}/price_inquiry_feedback*`, r => {
    if (r.request().method() === 'POST') { posted.feedback.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(feedback) })
  })
  const events = []
  await page.route(`${REST}/events*`, r => { if (r.request().method() === 'POST') events.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) })
  await page.addInitScript(role => {
    localStorage.setItem('modu_device_id', 'pi-dev')
    const pd = role === 'operating'
      ? { name: '김사장', category: 'operating', roleData: { operating: { bizLabel: '카페', region: '서울', region_sub: '마포구', category_main: '카페·베이커리' } } }
      : { name: '김대표', category: role, region: '서울', region_sub: '마포구', category_main: '카페·베이커리' }
    localStorage.setItem('modu_user_profile', JSON.stringify(pd))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p1', category: role, name: '김', active: true }]))
  }, role)
  return { posted, patched, events }
}

test('①(a)·② 사장님 시세 카드 보조 버튼 → 시트(origin sales_card) + 상단 시세 범위 카드(3건) / 2건이면 범위 카드 없음·"데이터 부족" 없음', async ({ page }) => {
  const { events } = await base(page, { role: 'operating', priceListings: [L(0), L(1), L(2)] })
  await page.goto('/a7/operating')
  await expect(page.getByTestId('next-action-card')).toHaveAttribute('data-signal', 'price_range')
  await page.getByTestId('price-inquiry-open').click()
  const sheet = page.getByTestId('price-inquiry-sheet')
  await expect(sheet.getByTestId('price-inquiry-title')).toHaveText('모두에 시세 물어보기')
  await expect(sheet.getByTestId('price-inquiry-range')).toContainText('같은 구 카페·베이커리 매물 3건')
  await expect(sheet.getByTestId('price-inquiry-label')).toHaveText(PRICE_INQUIRY_COPY.label.vendor_only)
  await expect(sheet).not.toContainText(/AI|예상 권리금|추정|가게/)
  await expect.poll(() => events.filter(e => e.event_name === 'price_inquiry_open').length).toBe(1)
  expect(events.find(e => e.event_name === 'price_inquiry_open').payload.origin).toBe('sales_card')

  const second = await base(page, { role: 'operating', priceListings: [L(0), L(1)], sales: Array.from({ length: 56 }, (_, i) => ({ sale_date: addDays(kstToday(), -i), revenue: i < 30 ? 780000 : 1000000 })) })
  await page.goto('/a7/operating')
  await page.getByTestId('sales-service-cta').click()
  await page.getByTestId('sales-chip-transfer').click()
  await page.getByTestId('transfer-intro').getByTestId('price-inquiry-open').click() // ①(d)
  await expect(page.getByTestId('price-inquiry-sheet')).toBeVisible()
  await expect(page.getByTestId('price-inquiry-range')).toHaveCount(0)
  await expect(page.getByTestId('price-inquiry-sheet')).not.toContainText('데이터 부족')
  await expect.poll(() => second.events.filter(e => e.event_name === 'price_inquiry_open').map(e => e.payload.origin)).toContain('listing_manage')
})

test('①(b)·③·④·⑤·⑦·⑧ 양도인: 온보딩 "시세만" → 홈 진입 즉시 시트, 첨부 DOM 검사, 매출 구간 없음, 전송 → 신호 1·대상 3 동시, 대화 없음 → 재탭 차단', async ({ page }) => {
  const { posted, events } = await base(page, { myListings: [MY_LISTING] })
  await page.addInitScript(() => localStorage.setItem('modu_ask_price', '1'))
  await page.goto('/a7/seller')
  const sheet = page.getByTestId('price-inquiry-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByTestId('price-inquiry-later')).toHaveText('나중에 등록하기')
  await expect.poll(() => events.filter(e => e.event_name === 'price_inquiry_open').map(e => e.payload.origin)).toContain('seller_onboarding')
  // ③ 첨부 항목: 업종·동·면적대·층·월세대만. 이름·연락처·매출 금액·정확한 주소 없음
  const attach = sheet.getByTestId('price-inquiry-attach')
  await expect(attach.getByRole('button')).toHaveCount(5)
  await expect(attach).not.toContainText(/이름|연락처|전화|332-4|1층 332|매출 금액|원\b/)
  await expect(attach).toContainText('동 · 서교동'); await expect(attach).toContainText('면적대 · 30~40㎡'); await expect(attach).toContainText('월세대 · 150~200만')
  await expect(sheet.getByTestId('pi-attach-sales-band')).toHaveCount(0) // 매출 기록 없음 → 토글 자체 없음
  await sheet.getByTestId('pi-chip-transfer_fee').click()
  await sheet.getByTestId('pi-timing-in_3m').click()
  await sheet.getByTestId('price-inquiry-send').click()
  await expect(page.getByText('물어봤어요 · 답이 오면 알려드릴게요')).toBeVisible()
  await expect.poll(() => posted.signals.length).toBe(1)
  expect(posted.signals[0]).toMatchObject({ topic_key: 'price_check', origin: 'seller_onboarding', status: 'open', target_count: 3, pending: false })
  expect(posted.signals[0].attachment).toEqual({ chips: ['transfer_fee'], timing: 'in_3m', industry: '카페·베이커리', dong: '서교동', area_band: '30~40㎡', floor: '1층', rent_band: '150~200만' })
  expect(posted.signals[0].attachment).not.toHaveProperty('sales_band') // ④ 기본 OFF
  await expect.poll(() => posted.targets.length).toBe(3) // ⑤ 전원 동시
  expect(posted.targets.map(t => t.vendor_id)).toEqual(['r1', 'r2', 'c1']); expect(posted.targets.every(t => t.assignee_type === 'vendor')).toBe(true)
  expect(posted.ledger[0]).toMatchObject({ source: 'price_inquiry', signal: 'price_check', status: 'sent', vendor_id: null })
  expect(posted.convs).toHaveLength(0) // ⑦ 대화 열기 전 대화 없음
  // ⑧ 재탭 — 같은 점포·같은 칩 30일 내 → 새 신호 없음
  await page.route(`${REST}/demand_signals*`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 's1', place_hash: posted.signals[0].place_hash, status: 'open', attachment: posted.signals[0].attachment, created_at: new Date().toISOString() }]) })
    : r.fulfill({ status: 500, body: '' }))
  await page.getByTestId('price-inquiry-open-seller').click()
  await page.getByTestId('pi-chip-transfer_fee').click()
  await page.getByTestId('price-inquiry-send').click()
  await expect(page.getByText('이미 물어보는 중이에요 · 답이 오면 알려드릴게요')).toBeVisible()
  expect(posted.signals).toHaveLength(1)
  await expect.poll(() => events.filter(e => e.event_name === 'price_inquiry_dedupe_blocked').length).toBe(1)
})

test('①(c) 소유주 홈: 부동산원 카드 아래 링크 → 시트(origin owner_card, 임대료·매매 시세 기본 선택)', async ({ page }) => {
  const { events } = await base(page, { role: 'landlord', myListings: [{ ...MY_LISTING, listing_type: 'landlord', deal_type: 'rent' }] })
  await page.route(`${REST}/reb_market_stats*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ quarter: '2026Q2', region_level: 'sigungu', region_code: '11440', region_name: '마포구', store_type: 'small', vacancy_rate: 6.3, rent_per_m2: 50000 }]) }))
  await page.goto('/a7/landlord')
  await expect(page.getByTestId('reb-stat-card')).toBeVisible()
  await page.getByTestId('price-inquiry-open-owner').click()
  await expect(page.getByTestId('price-inquiry-sheet')).toBeVisible()
  await expect(page.getByTestId('price-inquiry-reb')).toContainText('마포구 소규모 상가')
  await expect(page.getByTestId('pi-chip-rent_sale')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => events.filter(e => e.event_name === 'price_inquiry_open').map(e => e.payload.origin)).toContain('owner_card')
})

const SIG = { id: 's1', device_id: 'pi-dev', topic_key: 'price_check', origin: 'listing_manage', status: 'open', attachment: { chips: ['transfer_fee'], industry: '카페·베이커리', dong: '서교동' }, expires_at: new Date(Date.now() + 3 * 864e5).toISOString(), created_at: new Date().toISOString() }
const T = (id, vid, min, extra = {}) => ({ id, signal_id: 's1', vendor_id: vid, vendor_device_id: `dev-${vid}`, assignee_type: 'vendor', sent_at: new Date(Date.now() - 864e5).toISOString(), responded_at: new Date(Date.now() - min * 6e4).toISOString(), response_text: `업체 ${vid}입니다. 자료를 보고 답드릴게요.`, ...extra })

test('⑤·⑥·⑦ 응답 카드: 4곳 응답 → 3장 + 더 보기, 응답 시각 오름차순(유료 늦으면 아래), [대화 열기] → 이때 대화 생성 + 원장 replied', async ({ page }) => {
  const targets = [T('t-paid', 'far', 1, { plan_tier: 'vendor_paid' }), T('t1', 'r1', 40), T('t2', 'r2', 30), T('t3', 'c1', 20)]
  const { posted, patched } = await base(page, { myListings: [MY_LISTING], signals: [SIG], targets })
  await page.goto('/a7/seller')
  const card = page.getByTestId('price-inquiry-card')
  await expect(card.getByTestId('price-response')).toHaveCount(3)
  await expect(card.getByTestId('price-response').nth(0)).toContainText('업체 r1이 답했어요')
  await expect(card.getByTestId('price-response').nth(2)).toContainText('업체 c1이 답했어요')
  await expect(card).not.toContainText('업체 far') // ⑥ 유료·늦은 응답은 4번째 → 접힘
  await card.getByTestId('price-response-more').click()
  await expect(card.getByTestId('price-response')).toHaveCount(4)
  await expect(card.getByTestId('price-response').nth(3)).toContainText('업체 far')
  expect(posted.convs).toHaveLength(0) // ⑦ 열기 전 대화 없음
  await card.getByTestId('price-response-open').first().click()
  await expect(page).toHaveURL(/\/d4\/chat\/conv-pi/)
  expect(posted.convs[0]).toMatchObject({ listing_id: 'r1', receiver_id: 'dev-r1', sender_id: 'pi-dev' })
  expect(patched.targets.some(p => p.conversation_id === 'conv-pi')).toBe(true)
  expect(patched.ledger.some(p => p.status === 'replied' && p.vendor_id === 'r1' && p.assignee_type === 'vendor')).toBe(true)
})

test('⑦ 기업회원 화면: 시세 문의 라벨 + 첨부 요약만(이름·연락처 없음), [답하기] 기본 문장 200자 이내 → 응답 저장', async ({ page }) => {
  const targets = [{ id: 't1', signal_id: 's1', vendor_id: 'r1', vendor_device_id: 'pi-dev', assignee_type: 'vendor', sent_at: new Date().toISOString(), responded_at: null }]
  const { patched } = await base(page, { role: 'business', myListings: [V('r1', 'realestate', 0, { device_id: 'pi-dev' })], signals: [SIG], targets })
  await page.goto('/a7/business')
  const inbox = page.getByTestId('demand-inbox')
  await expect(inbox.getByTestId('demand-inbox-stats')).toHaveText('시세 문의 답변 0건 · 대화로 이어진 0건')
  await expect(inbox.getByTestId('demand-signal-label')).toHaveText('시세 문의')
  await expect(inbox.getByTestId('demand-signal-summary')).toHaveText('카페·베이커리 · 서교동')
  await expect(inbox).not.toContainText(/김대표|pi-dev|010|연락처/)
  await inbox.getByTestId('demand-reply-open').click()
  const ta = inbox.getByTestId('demand-reply-text')
  await expect(ta).toHaveValue('업체 r1입니다. 서교동 카페·베이커리 점포 시세, 자료를 보고 답드릴게요.')
  await inbox.getByTestId('demand-reply-send').click()
  await expect.poll(() => patched.targets.length).toBe(1)
  expect(patched.targets[0].response_text.length).toBeLessThanOrEqual(200)
})

test('⑫ 만료된 문의 → 안내 1회 + 피드백 칩 → 선택하면 저장, 이미 답했으면 재표시 없음', async ({ page }) => {
  const expired = { ...SIG, expires_at: new Date(Date.now() - 864e5).toISOString() }
  const { posted, patched } = await base(page, { myListings: [MY_LISTING], signals: [expired], targets: [] })
  await page.goto('/a7/seller')
  await expect(page.getByText('답이 없었어요 · 다시 물어볼 수 있어요').first()).toBeVisible()
  await expect.poll(() => patched.signals.some(p => p.status === 'expired')).toBe(true)
  const fb = page.getByTestId('price-inquiry-feedback')
  await expect(fb).toBeVisible()
  await fb.getByTestId('pi-feedback-no_contact').click()
  await expect.poll(() => posted.feedback.length).toBe(1)
  expect(posted.feedback[0]).toMatchObject({ signal_id: 's1', result: 'no_contact' })
  await expect(page.getByTestId('price-inquiry-feedback')).toHaveCount(0)

  await base(page, { myListings: [MY_LISTING], signals: [{ ...expired, status: 'expired' }], targets: [], feedback: [{ signal_id: 's1' }] })
  await page.goto('/a7/seller')
  await expect(page.getByText('내 카페').first()).toBeVisible()
  await expect(page.getByTestId('price-inquiry-feedback')).toHaveCount(0)
})
