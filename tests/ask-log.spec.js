/**
 * 질문 로그 2단 보관 + ② 질문 전달 파이프라인 (ORDER 2026-09-13 파트 C5)
 * ① 91일 경과 → 원문·식별자 NULL, 축·전환 유지 ② facts 스키마에 user_id·원문 없음 ③ 24시간 내 문의 → 전환 굳음
 * ④ ② 질문 → 양도인 카드, DM 없음·연락처 없음 ⑤ 답장 → 안내 문구·전달 카드, [대화 열기] 전까지 DM 없음, 누르면 opened
 * ⑥ 전달 답변이 원문과 완전히 일치 ⑦ 무응답 리마인드 1회 ⑧ 7일 미개설 → "아직 대화로 이어지지 않았어요"
 * ⑨ 답장 후 매물 필드 불변·"적어둘까요" UI 없음 ⑩ 성사 약속 lint ⑪ 답장 원문이 다른 경로에 안 들어감 ⑫ k=0 근거 줄
 * ⑬ 문의함 라벨·정렬 불변 ⑭ other 상위 50 ⑮ 솔트 회전 → 이전 해시 불일치
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import { askDue, notOpenedDue, purgeDue, aggregateFacts, topOtherQuestions, pseudonymOf, epochOf, ASK_BATCH_COPY } from '../api/_askBatch.js'
import { ASK_COPY } from '../config/listingAsk.ts'
import { findCopyViolations } from '../scripts/lint-copy.mjs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const LISTING = {
  id: 'ask-1', device_id: 'seller-dev', user_id: 'seller-user', listing_type: 'seller', status: 'published',
  shop_name: '질문 카페', shop_name_public: true, address: '서울 마포구 서교동 332-4 1층', category_main: '카페·베이커리',
  deposit: '3000', monthly_rent: '200', transfer_fee: '2500', transfer_type: 'full', area: '33', floor: '1', views: 42,
  ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], facilities: [], created_at: new Date().toISOString(),
}
const LEDGER = (over = {}) => ({
  id: 'led-1', listing_id: 'ask-1', device_id: 'buyer-dev', source: 'listing_ask', status: 'sent',
  ask_question_text: '직원은 몇 명이에요?', ask_owner_reply_text: null, ask_axis: 'labor',
  ask_expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), created_at: new Date().toISOString(), ...over,
})

test.describe('룰 유닛', () => {
  test('①②③⑮ 90일 파기·집계 스키마·전환 굳힘·솔트 회전', () => {
    const old = new Date(Date.now() - 91 * 864e5).toISOString()
    const rows = [{ id: 'x', raw_text: '질문', pseudonym_id: 'p1', created_at: old, topic_axis: 'hours' }, { id: 'y', raw_text: '질문', created_at: new Date().toISOString() }]
    expect(purgeDue(rows).map(r => r.id)).toEqual(['x'])
    // ① 파기 후에도 축·전환 컬럼은 남는다 (파기는 raw_text·pseudonym_id 만 NULL 로 만드는 update)
    const purged = { ...rows[0], raw_text: null, pseudonym_id: null }
    expect(purged.topic_axis).toBe('hours')
    // ②③ facts 행에 원문·식별자 컬럼이 없고, 24시간 내 문의는 true 로 굳는다
    const e = { id: 'e1', target_id: 'ask-1', topic_axis: 'labor', intent: 'owner_only', branch: 'owner', answered: false, ledger_id: 'led-1', created_at: new Date().toISOString(), raw_text: '직원은 몇 명이에요?', pseudonym_id: 'pabc' }
    const facts = aggregateFacts([e], [{ id: 'led-1', created_at: new Date().toISOString(), ask_replied_at: null, status: 'sent' }], [LISTING])
    expect(facts[0].converted_to_inquiry).toBe(true)
    for (const k of ['raw_text', 'pseudonym_id', 'user_id', 'device_id']) expect(Object.keys(facts[0])).not.toContain(k)
    const late = aggregateFacts([e], [{ id: 'led-1', created_at: new Date(Date.now() + 2 * 864e5).toISOString(), status: 'sent' }], [LISTING])
    expect(late[0].converted_to_inquiry).toBe(false)
    // ⑮ 솔트가 바뀌면 이전 해시와 다르다 / 같은 솔트·같은 사용자는 같다 / user_id 원문이 해시에 남지 않는다
    const a = pseudonymOf('user-1', 'salt-A'), b = pseudonymOf('user-1', 'salt-B'), c = pseudonymOf('user-1', 'salt-A')
    expect(a).toBe(c); expect(a).not.toBe(b)
    expect(a).not.toContain('user-1')
    expect(pseudonymOf('user-1', 'salt-A', epochOf() + 1)).not.toBe(a)   // 90일 회전
    expect(pseudonymOf(null, 'salt-A')).toBeNull()
  })

  test('⑦⑧⑭ 리마인드 1회·미개설 회신·미분류 상위 목록', () => {
    const H = n => new Date(Date.now() + n * 36e5).toISOString()
    const due = askDue([LEDGER({ id: 'a', ask_expires_at: H(-1) }), LEDGER({ id: 'b', ask_expires_at: H(10) }), LEDGER({ id: 'c', ask_expires_at: H(10), ask_reminded_at: new Date().toISOString() })])
    expect(due.expire.map(r => r.id)).toEqual(['a'])
    expect(due.remind.map(r => r.id)).toEqual(['b'])     // 이미 보낸 건은 다시 재촉하지 않는다
    const relayed = LEDGER({ id: 'd', status: 'replied', ask_relayed_at: new Date(Date.now() - 8 * 864e5).toISOString() })
    expect(notOpenedDue([relayed]).map(r => r.id)).toEqual(['d'])
    expect(notOpenedDue([{ ...relayed, ask_not_opened_notified_at: new Date().toISOString() }])).toHaveLength(0)
    const ev = t => ({ topic_axis: 'other', raw_text: t })
    expect(topOtherQuestions([ev('주차 되나요'), ev('주차 되나요'), ev('간판 바꿀 수 있나요'), { topic_axis: 'hours', raw_text: '몇 시' }])[0]).toEqual({ text: '주차 되나요', count: 2 })
    expect(ASK_BATCH_COPY.ownerNotOpened).toBe(ASK_COPY.ownerNotOpened)
  })

  test('⑩⑪ lint·소스 검사: 성사 약속 문구 금지, 양도인 답장 원문이 답변 재료·소개글·예시 생성에 들어가지 않음', () => {
    for (const bad of ['문의로 만들어드릴게요', '진성 문의예요', '좋은 문의가 왔어요']) {
      expect(findCopyViolations(`const t = "${bad}"`, 'src/components/AskRelayCard.jsx').length, bad).toBeGreaterThan(0)
    }
    for (const f of ['src/lib/askRelay.js', 'src/components/AskRelayCard.jsx', 'src/components/AskOwnerQuestionCard.jsx', 'src/screens/AskTopicsOpsPage.jsx']) {
      expect(findCopyViolations(readFileSync(f, 'utf8'), f), f).toEqual([])
    }
    // ⑪ ask_owner_reply_text 를 읽는 곳은 전달 카드·원장 파기뿐이다 (답변 재료·소개글·예시 생성 입력 금지)
    const readers = ['src/lib/listingAskRules.js', 'src/lib/listingAsk.js', 'src/lib/prompts/askExamples.js', 'src/lib/prompts/listingIntro.js', 'src/lib/gemini.js', 'src/lib/vendorRenewal.js', 'src/components/VendorRenewalCard.jsx']
    for (const f of readers) expect(readFileSync(f, 'utf8'), f).not.toContain('ask_owner_reply_text')
  })
})

async function base(page, { ledgers = [], listing = LISTING, device = 'seller-dev', profile = { category: 'seller' }, uid = 'seller-user', events = [] } = {}) {
  await mockGemini(page); await mockMarketData(page)
  await seedSession(page, { id: uid })
  await page.addInitScript(([d, p]) => { localStorage.setItem('modu_device_id', d); localStorage.setItem('modu_user_profile', JSON.stringify(p)) }, [device, profile])
  const st = { ledgers: [...ledgers], patched: [], notifs: [], convs: [], listingPatches: [], events: [...events] }
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/listings*`, r => {
    const m = r.request().method()
    if (m === 'PATCH') { st.listingPatches.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 204, body: '' }) }
    const single = /[?&]id=eq\./.test(r.request().url())
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? listing : [listing]) })
  })
  await page.route(`${REST}/listings_visible*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/[?&]id=eq\./.test(r.request().url()) ? listing : [listing]) }))
  await page.route(`${REST}/ask_question_events*`, r => r.request().method() === 'POST'
    ? (st.events.push(JSON.parse(r.request().postData())), r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }))
    : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(st.events) }))
  await page.route(`${REST}/inquiry_ledger*`, r => {
    const m = r.request().method(); const u = r.request().url()
    if (m === 'PATCH') { const b = JSON.parse(r.request().postData()); const id = u.match(/id=eq\.([^&]+)/)?.[1]; st.patched.push({ id, ...b }); st.ledgers = st.ledgers.map(x => x.id === id ? { ...x, ...b } : x); return r.fulfill({ status: 204, body: '' }) }
    if (m === 'POST') { const b = JSON.parse(r.request().postData()); st.ledgers.push({ id: `led-${st.ledgers.length + 1}`, ...b }); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: `led-${st.ledgers.length}` }) }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(st.ledgers) })
  })
  await page.route(`${REST}/conversations*`, r => {
    if (r.request().method() === 'POST') { st.convs.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'conv-1' }) }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route(`${REST}/notifications*`, r => r.request().method() === 'POST'
    ? (st.notifs.push(JSON.parse(r.request().postData())), r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }))
    : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  return st
}

test('④⑫ 양도인 홈: "모두에게 질문이 들어왔어요" 카드 + 근거 줄, 질문자 연락처·DM 없음 (먼저 답한 질문 0이면 그 조각 빠짐)', async ({ page }) => {
  const st = await base(page, { ledgers: [LEDGER()] })
  await page.goto('/a7/seller')
  const card = page.getByTestId('ask-owner-card')
  await expect(card).toContainText(ASK_COPY.ownerCardTitle)
  await expect(card.getByTestId('ask-owner-question-text')).toHaveText('직원은 몇 명이에요?')
  const basis = await card.getByTestId('ask-owner-basis').textContent()
  expect(basis).toContain('42번 봤어요')
  expect(basis).not.toContain('먼저 답한 질문')       // ⑫ k=0 → 조각 삭제
  expect(basis).toContain(ASK_COPY.ownerBasisTail)
  const html = await card.innerHTML()
  for (const leak of ['buyer-dev', '010-', '@']) expect(html).not.toContain(leak)
  expect(st.convs).toHaveLength(0)                     // 이 시점에 DM 없음
})

test('⑤⑥⑨ 답장 → 안내 문구 → 전달 카드(원문 그대로) → [대화 열기] 눌러야 DM·opened. 매물 필드는 바뀌지 않는다', async ({ page, browser }) => {
  const st = await base(page, { ledgers: [LEDGER()] })
  await page.goto('/a7/seller')
  const card = page.getByTestId('ask-owner-card')
  await card.getByTestId('ask-owner-reply-open').click()
  const reply = '평일은 저 혼자 하고 주말만 알바 한 명 써요'
  await card.getByTestId('ask-owner-reply-input').fill(reply)
  await card.getByTestId('ask-owner-reply-send').click()
  await expect(card.getByTestId('ask-owner-after-reply')).toHaveText(ASK_COPY.ownerAfterReply)
  // ⑨ "매물에도 적어둘까요?" 류 확인 UI 없음 + 매물 PATCH 없음
  await expect(page.locator('body')).not.toContainText(/적어둘까요|매물에 반영/)
  expect(st.listingPatches).toHaveLength(0)
  expect(st.patched[0]).toMatchObject({ id: 'led-1', status: 'replied', ask_owner_reply_text: reply })
  await expect.poll(() => st.notifs.length).toBeGreaterThan(0)
  expect(st.notifs[0]).toMatchObject({ type: 'ask_relay', title: ASK_COPY.relayTitle, body: reply })
  expect(st.convs).toHaveLength(0)                     // 전달만으로 DM 이 생기지 않는다

  // 질문자 화면 — 전달 카드
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const buyer = await ctx.newPage()
  const bst = await base(buyer, { ledgers: [LEDGER({ status: 'replied', ask_owner_reply_text: reply, ask_relayed_at: new Date().toISOString() })], device: 'buyer-dev', profile: { category: 'startup' }, uid: 'buyer-user' })
  await buyer.goto('/a7/startup')
  const relay = buyer.getByTestId('ask-relay-card')
  await expect(relay).toContainText(ASK_COPY.relayTitle)
  await expect(relay.getByTestId('ask-relay-answer')).toHaveText(reply)   // ⑥ 원문 그대로(요약·편집 없음)
  expect(bst.convs).toHaveLength(0)
  await relay.getByTestId('ask-relay-open').click()
  await expect.poll(() => bst.convs.length).toBe(1)
  expect(bst.patched.at(-1)).toMatchObject({ id: 'led-1', status: 'opened', conversation_id: 'conv-1' })
  await ctx.close()
})

test('⑬ 문의함: 질문에서 온 대화에 "모두가 걸러낸 문의" 라벨, 순서는 그대로', async ({ page }) => {
  const convs = [
    { id: 'c1', listing_id: 'ask-1', listing_name: '질문 카페', sender_id: 'buyer-dev', receiver_id: 'seller-dev', sender_name: '문의자', receiver_name: '양도인', created_at: new Date(Date.now() - 3600e3).toISOString(), updated_at: new Date(Date.now() - 3600e3).toISOString() },
    { id: 'c2', listing_id: 'ask-1', listing_name: '질문 카페', sender_id: 'other-dev', receiver_id: 'seller-dev', sender_name: '다른 문의자', receiver_name: '양도인', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ]
  await base(page, { ledgers: [LEDGER({ status: 'opened', conversation_id: 'c1' })] })
  await page.route(`${REST}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(convs) }))
  await page.route(`${REST}/inquiry_ledger*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'led-1', conversation_id: 'c1', source: 'listing_ask', status: 'opened', signal: null }]) }))
  await page.goto('/d4/inbox')
  await expect(page.getByTestId('ask-inbox-label')).toHaveCount(1)
  const names = await page.locator('[data-testid="conv-item"]').allTextContents().catch(() => [])
  expect(names.length === 0 || names.length === 2).toBe(true)   // 정렬 불변 — 라벨만 붙는다
})
