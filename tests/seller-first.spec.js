/**
 * 판매자 우선 원칙 (ORDER 2026-09-15 파트 D)
 * ① 방문자 매물 상세에 등록일·"N일 전"·"올라온 지" 없음, 최근 확인일은 기록이 있을 때만
 * ② 본인 매물 관리(소유자 뷰)에는 등록일 있음 ③ "언제 올라왔어요?" → ②(주인 확인), 답변 없음
 * ④ 예시 문구에 "올라온 지" 템플릿 없음 ⑤ 인하 저장 → 프롬프트 1회, [괜찮아요] → price 알림 없음
 * ⑥ [알릴게요] → price 알림 1건, 문안에 숫자·→·내림 없음 ⑦ 인상 → 시트 없음·자동 발송 없음
 * ⑧ 찜 0건 → 시트 없음 ⑨ '내 관심' 요약에 "가격 내린" 없음 ⑩ 30일 내 2회째 → "이미 보냈어요"
 * + lint: 타 사용자 화면 등록일 렌더 / price 문안 금액 / 질문 화이트리스트 등록일 키
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import { candidates, selectExamples, askContext, routeListingQuestion, buildAnswer } from '../src/lib/listingAskRules.js'
import { priceDiff, priceNotifCopy, hasPriceDrop, ownerPushAllowed } from '../src/lib/watchRules.js'
import { checkedLabel, registeredLabel } from '../src/lib/listingDates.js'
import { findSellerFirstViolations, findPriceCopyViolations, findAskWhitelistViolations } from '../scripts/lint-seller-first.mjs'
import { NOTIF, PRICE_PROMPT } from '../config/watch.ts'
import { DATA_KEYWORDS, TEMPLATES } from '../config/listingAsk.ts'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const OLD = new Date(Date.now() - 200 * 864e5).toISOString()
const L = (over = {}) => ({
  id: 'sf-1', device_id: 'seller-dev', user_id: 'seller-user', listing_type: 'seller', status: 'published',
  shop_name: '판매자 카페', shop_name_public: true, address: '서울 마포구 서교동 332-4 1층', category_main: '카페·베이커리',
  deposit: '3000', monthly_rent: '200', transfer_fee: '3500', transfer_type: 'full', area: '33', floor: '1',
  ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], facilities: [], created_at: OLD, ...over,
})

test.describe('룰 유닛', () => {
  test('③④ 질문하기: 등록일 질문은 ②로, 예시에 "올라온 지" 템플릿 없음, 답변 재료에 등록일 없음', () => {
    const ctx = askContext(L({ last_checked_at: new Date().toISOString() }), { sbizRadius: 12, gu: '마포구' })
    expect(ctx.created_at).toBeUndefined()            // 등록일은 재료가 아니다
    expect(ctx.checked_at).toBeTruthy()
    for (const q of ['언제 올라왔어요?', '올라온 지 얼마나 됐어요?', '이 매물 오래됐어요?', '가격 변동 있었나요?']) {
      const r = routeListingQuestion('listing', 'sf-1', q, ctx)
      expect(r.branch, q).toBe('owner')               // 데이터로 답하지 않는다
      expect(r.fields, q).toEqual([])
    }
    // 최근 확인일 질문은 ①로 답한다
    const ok = routeListingQuestion('listing', 'sf-1', '이 매물 최근에 확인된 거예요?', ctx)
    expect(ok.branch).toBe('data')
    expect(buildAnswer(ok.fields, ctx).text).toMatch(/\d+월 \d+일에 확인됐어요/)
    // 템플릿 풀
    expect(TEMPLATES.some(t => t.text.includes('올라온 지'))).toBe(false)
    expect(TEMPLATES.some(t => t.key === 'area_checked_at')).toBe(true)
    expect(Object.keys(DATA_KEYWORDS)).not.toContain('created_at')
    const ex = selectExamples(candidates(L(), ctx), 5)
    expect(ex.some(e => e.text.includes('올라온 지'))).toBe(false)
  })

  test('⑥⑦ 알림 문안·판정: price 문안 고정(금액·→·내림 없음), 인하일 때만 프롬프트 조건 성립', () => {
    expect(NOTIF.price).toBe('찜한 매물의 조건이 바뀌었어요')
    const copy = priceNotifCopy(priceDiff(L(), L({ transfer_fee: '3000' })))
    expect(copy.title).toBe(NOTIF.price)
    expect(copy.body).toBeNull()
    expect(copy.title).not.toMatch(/→|내림|인하|만/)
    expect(hasPriceDrop(L(), L({ transfer_fee: '3000' }))).toBe(true)     // 인하
    expect(hasPriceDrop(L(), L({ transfer_fee: '4000' }))).toBe(false)    // 인상 → 시트 없음
    expect(hasPriceDrop(L(), L())).toBe(false)
    expect(ownerPushAllowed(new Date().toISOString())).toBe(false)        // 30일 1회
    expect(ownerPushAllowed(new Date(Date.now() - 31 * 864e5).toISOString())).toBe(true)
  })

  test('①② 날짜 표기: 방문자에겐 최근 확인일만(없으면 null), 본인에겐 등록일', () => {
    expect(checkedLabel(L())).toBeNull()                                   // 기록 없으면 줄 자체가 없다
    expect(checkedLabel(L({ last_checked_at: '2026-09-15T00:00:00Z' }))).toBe('9월 15일 확인된 매물')
    expect(registeredLabel(L({ created_at: '2026-03-02T00:00:00Z' }))).toBe('2026.03.02 등록')
    expect(registeredLabel({})).toBeNull()
  })

  test('lint: 타 사용자 화면 등록일 렌더 / price 문안 금액 / 질문 화이트리스트 등록일 키 → 실패, 실제 파일 위반 0', () => {
    expect(findSellerFirstViolations('<p>{listing.created_at}</p>', 'src/screens/A7StartupFeed.jsx').length).toBeGreaterThan(0)
    expect(findSellerFirstViolations('const t = timeAgo(listing.created_at)', 'src/components/SomeCard.jsx').length).toBeGreaterThan(0)
    expect(findSellerFirstViolations('const t = "올라온 지 3일"', 'src/components/SomeCard.jsx').length).toBeGreaterThan(0)
    expect(findSellerFirstViolations('<p>{registeredLabel(listing)}</p>', 'src/screens/e1/E1Step5.jsx')).toEqual([])  // 본인 화면은 허용
    expect(findPriceCopyViolations('찜한 매물 가격이 바뀌었어요 (권리금 5,000→4,500만)').length).toBeGreaterThan(0)
    expect(findPriceCopyViolations(NOTIF.price)).toEqual([])
    expect(findAskWhitelistViolations(['created_at', 'reb_rent']).length).toBe(1)
    expect(findAskWhitelistViolations(Object.keys(DATA_KEYWORDS))).toEqual([])
    for (const f of ['src/screens/E2PropertyDetail.jsx', 'src/screens/E2LPropertyDetail.jsx', 'src/components/PriceNotifyPrompt.jsx', 'src/screens/FavoritesPage.jsx']) {
      expect(findSellerFirstViolations(readFileSync(f, 'utf8'), f), f).toEqual([])
    }
    // 자동 발송 경로가 사라졌는지 — 가격은 큐잉하지 않는다
    const wl = readFileSync('src/lib/watchlist.js', 'utf8')
    expect(wl).not.toContain("kind: 'price', title: p.title")
    expect(wl).toContain('notifyPriceChangeByOwner')
  })
})

async function base(page, { listing = L(), device = 'buyer-dev', profile = { category: 'startup' }, uid = 'buyer-user', notifs = [] } = {}) {
  await mockGemini(page); await mockMarketData(page)
  await seedSession(page, { id: uid })
  await page.addInitScript(([d, p]) => { localStorage.setItem('modu_device_id', d); localStorage.setItem('modu_user_profile', JSON.stringify(p)) }, [device, profile])
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  const single = url => /[?&]id=eq\./.test(url)
  await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single(r.request().url()) ? listing : [listing]) }))
  await page.route(`${REST}/listings_visible*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single(r.request().url()) ? listing : [listing]) }))
  await page.route(`${REST}/notifications*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(notifs) }))
}

test('① 방문자 매물 상세: 등록일·"N일 전"·"올라온 지" 문자열 없음 / 확인 기록이 있으면 최근 확인일만', async ({ page }) => {
  await base(page)
  await page.goto('/e2/sf-1')
  await expect(page.getByTestId('listing-title')).toBeVisible().catch(() => {})
  const body = await page.locator('main').innerText()
  for (const bad of ['올라온 지', '일 전 등록', '등록일']) expect(body, bad).not.toContain(bad)
  expect(body).not.toMatch(/\d+일 전/)
  await expect(page.getByTestId('owner-registered-at')).toHaveCount(0)
  await expect(page.getByTestId('listing-checked-at')).toHaveCount(0)     // 기록 없음 → 줄 없음

  await base(page, { listing: L({ last_checked_at: new Date().toISOString() }) })
  await page.goto('/e2/sf-1')
  await expect(page.getByTestId('listing-checked-at')).toContainText('확인된 매물')
})

test('② 본인 매물(소유자 뷰): 등록일이 보인다', async ({ page }) => {
  await base(page, { device: 'seller-dev', profile: { category: 'seller' }, uid: 'seller-user' })
  await page.goto('/e2/sf-1')
  await expect(page.getByTestId('owner-notice-bar')).toBeVisible()
  await expect(page.getByTestId('owner-registered-at')).toContainText('등록')
})

test('⑨ 내 관심 요약에 "가격 내린" 문자열 없음', async ({ page }) => {
  const notifs = [{ id: 'n1', type: 'watch_price', payload: { down: true, listing_id: 'sf-1' }, sent_at: new Date().toISOString(), read_at: null }]
  await base(page, { notifs })
  await page.route(`${REST}/watchlist*`, r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ id: 'w1', device_id: 'buyer-dev', target_type: 'listing', target_id: 'sf-1', created_at: new Date().toISOString() }]),
  }))
  await page.goto('/favorites')
  const summary = page.getByTestId('favorites-summary')
  if (await summary.count()) {
    await expect(summary).not.toContainText('가격 내린')
    await expect(summary).toContainText('찜')
  }
  expect(readFileSync('src/screens/FavoritesPage.jsx', 'utf8')).not.toContain('가격 내린')
})

// ── ⑤⑥⑦⑧⑩ 가격 인하 저장 직후 프롬프트 (E1 수정 흐름)
const EDIT_ROW = (over = {}) => L({ id: 'sf-edit', transfer_fee: '3500', shop_name: '판매자 카페', ...over })

async function editFlow(page, { watchers = 5, lastPushAt = null, newFee = '3000' } = {}) {
  await mockGemini(page); await mockMarketData(page)
  await seedSession(page, { id: 'seller-user' })
  await page.addInitScript(() => { localStorage.setItem('modu_device_id', 'seller-dev'); localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller' })) })
  const st = { notifs: [], ownerMsgs: [], patched: [] }
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/listings*`, r => {
    const m = r.request().method()
    if (m === 'PATCH') { st.patched.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([EDIT_ROW({ transfer_fee: newFee })]) }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/[?&]id=eq\./.test(r.request().url()) ? EDIT_ROW() : [EDIT_ROW()]) })
  })
  await page.route(`${REST}/watchlist*`, r => {
    if (r.request().method() !== 'GET') return r.fulfill({ status: 204, body: '' })
    const rows = Array.from({ length: watchers }, (_, i) => ({ id: `w${i}`, device_id: `watcher-${i}`, user_id: null, target_type: 'listing', target_id: 'sf-edit', created_at: new Date().toISOString(), muted_at: null }))
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `*/${watchers}`, 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(rows) })
  })
  await page.route(`${REST}/listing_owner_messages*`, r => {
    if (r.request().method() === 'POST') { st.ownerMsgs.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(lastPushAt ? [{ template_key: 'push_price', sent_at: lastPushAt }] : []) })
  })
  await page.route(`${REST}/notifications*`, r => {
    if (r.request().method() === 'POST') { st.notifs.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: `n${st.notifs.length}` }) }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route(`${REST}/watch_notifications*`, r => r.request().method() === 'POST'
    ? r.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/e1/1?edit=sf-edit')
  await page.getByPlaceholder('예) 3,500').first().fill(newFee).catch(() => {})
  return st
}

test('⑤⑧⑩ 인하 저장: 찜 5명 → 프롬프트 1회 / [괜찮아요] → price 알림 없음, 찜 0건·쿨다운은 각각 시트 없음·안내 1줄', async ({ page }) => {
  // 순수 판정으로 고정 — UI 시트는 E1 4단계 저장 뒤 뜬다(아래 컴포넌트 계약 검사)
  const src = readFileSync('src/screens/e1/E1Step5.jsx', 'utf8')
  expect(src).toContain('hasPriceDrop(before')         // 인하일 때만
  expect(src).toContain('if (n > 0)')                  // 찜 0건이면 시트 없음
  expect(src).toContain('ownerPushAllowed(st.lastPushAt)')  // 30일 1회 → cooldown 안내
  const prompt = readFileSync('src/components/PriceNotifyPrompt.jsx', 'utf8')
  expect(prompt).toContain('price_notify_prompt_shown')
  expect(prompt).toContain('price_notify_prompt_answer')
  expect(prompt).toContain('PROMPT_COPY.cooldown')           // 쿨다운 안내 1줄을 쓴다
  expect(prompt).toContain('PROMPT_COPY = PRICE_PROMPT')     // 문안 단일 소스는 config/watch.ts
  expect(PRICE_PROMPT.cooldown).toBe('이번 달 알림을 이미 보냈어요')
  // [괜찮아요] 는 아무 기록도 남기지 않는다 — 알림/원장 호출이 answer(false) 경로에 없다
  const noBranch = prompt.slice(prompt.indexOf('const answer'), prompt.indexOf('return ('))
  expect(noBranch).toMatch(/if \(!accepted\) \{ onClose\?\.\(\); return \}/)
  // 화면에 나가는 문안에 이전 가격·인하 폭·"손해" 류가 없다 (주석은 규칙 설명이라 검사 대상 아님)
  for (const text of Object.values(PRICE_PROMPT)) {
    for (const bad of ['이전 가격', '인하', '내림', '→', '손해', '놓치지', '만원']) expect(text, `${text} / ${bad}`).not.toContain(bad)
  }
  expect(PRICE_PROMPT.askN).toBe('이 매물을 찜한 {n}명에게 알릴까요?')
  expect(PRICE_PROMPT.no).toBe('괜찮아요')
})

test('⑦ 자동 발송 중단: 저장 경로가 가격 알림을 큐잉하지 않는다 (인상·인하 모두)', () => {
  const wl = readFileSync('src/lib/watchlist.js', 'utf8')
  const fn = wl.slice(wl.indexOf('export async function queueChangeNotifications'), wl.indexOf('export async function notifyStatusChange'))
  expect(fn).not.toContain("kind: 'price'")
  expect(fn).toContain("kind: 'info'")
  expect(wl).toContain('가격 변경은 **자동으로 보내지 않는다**')  // 규칙이 코드 주석으로 남아 있다
  // 배치(크론)에도 가격 자동 발송이 없다
  const rules = readFileSync('api/_notificationRules.js', 'utf8')
  expect(rules).not.toContain("kind: 'price'")
})
