/**
 * 모두에 질문하기 (ORDER 2026-09-13 파트 A9)
 * ① 매물별 예시가 다름 ② requires 미충족 템플릿 제외 ③ 축 중복 없음·①②최소 충족 ④ 이미 등록된 축 제외
 * ⑤ 입력 시작 시 placeholder 사라짐 ⑥ 시세 질문 → ③ ⑦ 화이트리스트 밖 → ② + DM 없음 ⑧ 금지 문장 폐기
 * ⑨ auto 필드 제외 ⑩ 11번째 → 상한 안내 ⑪ 문안 lint ⑫ 정렬 lint ⑬ 무료 등급 프로덕션 → 모델 호출 없음
 * ⑭ 예시 프롬프트에 사용자 입력·연락처·답장 없음 ⑮ 호출 제한 → 백오프 재시도
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import {
  askContext, candidates, selectExamples, examplesValid, rotateExamples, routeListingQuestion,
  buildAnswer, sanitizeAnswer, droppedSentences, quotaBlocked, isAutoField, questionHash, classifyAxis,
} from '../src/lib/listingAskRules.js'
import { buildAskExamplesPrompt, applyAskExamplesResponse } from '../src/lib/prompts/askExamples.js'
import { backoffMs, askDue, purgeDue, aggregateFacts, hoursBand } from '../api/_askBatch.js'
import { ASK, ASK_COPY } from '../config/listingAsk.ts'
import { canSendUserInputToModel, AI } from '../config/ai.ts'
import { findCopyViolations } from '../scripts/lint-copy.mjs'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const L = (over = {}) => ({
  id: 'ask-1', device_id: 'seller-dev', user_id: 'seller-user', listing_type: 'seller', status: 'published',
  shop_name: '질문 카페', shop_name_public: true, address: '서울 마포구 서교동 332-4 1층', category_main: '카페·베이커리',
  deposit: '3000', monthly_rent: '200', transfer_fee: '2500', transfer_type: 'full', area: '33', floor: '1',
  ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], facilities: [], created_at: new Date(Date.now() - 5 * 864e5).toISOString(), ...over,
})
const CTX = { sbizRadius: 12, sbizMix: ['카페', '미용'], rebVacancy: 6.2, rebRent: 31500, gu: '마포구', station: '합정역', stationDistance: 6, roadFace: '2면' }

test.describe('룰 유닛', () => {
  test('①②③ 후보·선별: requires 미충족 제외, 축 중복 없음, ① 2개 이상·② 1개 이상, 매물별 예시가 서로 다름', () => {
    const ctx = askContext(L(), CTX)
    const c = candidates(L(), ctx)
    expect(c.some(x => x.key === 'area_vacancy')).toBe(true)
    // ② requires 미충족(부동산원·소진공 없음) → 해당 템플릿 없음
    const bare = candidates(L(), askContext(L(), {}))
    expect(bare.some(x => x.key === 'area_vacancy')).toBe(false)
    expect(bare.some(x => x.key === 'trade_nearby')).toBe(false)
    // 슬롯 값이 없으면 후보에서 제외 ({역} 자리)
    expect(candidates(L(), askContext(L(), { ...CTX, station: null })).some(x => x.key === 'area_station')).toBe(false)
    const ex = selectExamples(c, 11)
    expect(examplesValid(ex)).toBe(true)
    expect(new Set(ex.map(x => x.axis)).size).toBe(ex.length)
    expect(ex.filter(x => x.branch === 'data').length).toBeGreaterThanOrEqual(ASK.MIN_DATA_EXAMPLES)
    expect(ex.filter(x => x.branch === 'owner').length).toBeGreaterThanOrEqual(ASK.MIN_OWNER_EXAMPLES)
    // ① 매물 A·B 예시가 다르다 (업종·지역 슬롯이 실제 값으로 채워진다)
    const a = selectExamples(candidates(L(), askContext(L(), CTX)), 3).map(x => x.text).join('|')
    const b = selectExamples(candidates(L({ id: 'ask-2', category_main: '치킨·피자' }), askContext(L({ category_main: '치킨·피자' }), { ...CTX, gu: '강남구' })), 9).map(x => x.text).join('|')
    expect(a).not.toBe(b)
    // ③ 회전: 같은 목록도 seed 가 다르면 순서가 다르다
    expect(rotateExamples(ex, 1).map(x => x.key).join()).not.toBe(rotateExamples(ex, 8).map(x => x.key).join())
  })

  test('④⑨ 이미 등록된 축의 ② 템플릿 제외 / auto 상태 필드는 답변 재료에서 제외', () => {
    const withHours = L({ open_hours: '09:00~22:00' })
    expect(candidates(withHours, askContext(withHours, CTX)).some(x => x.axis === 'hours')).toBe(false)
    expect(candidates(L(), askContext(L(), CTX)).some(x => x.axis === 'hours')).toBe(true)
    const sources = { floor: { status: 'auto' }, area: { status: 'user_confirmed' } }
    expect(isAutoField(sources, 'floor')).toBe(true)
    const ctx = askContext(L(), { ...CTX, fieldSources: sources })
    expect(ctx.floor).toBeUndefined()   // auto → 재료 아님
    expect(ctx.area).toBe('33')
    expect(routeListingQuestion('listing', 'ask-1', '몇 층이에요?', ctx).branch).toBe('owner')
  })

  test('⑥⑦⑧ 라우팅: 시세 → ③ / 화이트리스트 → ① / 그 외 → ② , 금지 문장만 폐기', () => {
    const ctx = askContext(L(), CTX)
    expect(routeListingQuestion('listing', 'ask-1', '적정 권리금이 얼마예요?', ctx).branch).toBe('price')
    expect(routeListingQuestion('listing', 'ask-1', '여기 팔릴까요?', ctx).branch).toBe('price')
    const data = routeListingQuestion('listing', 'ask-1', '합정역에서 걸어서 몇 분이에요?', ctx)
    expect(data.branch).toBe('data'); expect(data.fields).toContain('station_distance')
    expect(buildAnswer(data.fields, ctx).text).toContain('6분')
    expect(buildAnswer(data.fields, ctx).basis).toContain('기준일')
    expect(routeListingQuestion('listing', 'ask-1', '직원은 몇 명이에요?', ctx).branch).toBe('owner')
    expect(classifyAxis('배달 비중이 어떻게 돼요?')).toBe('delivery')
    // 금지 표현이 섞이면 그 문장만 사라진다
    expect(sanitizeAnswer('1층이에요. 권리금은 적정합니다.')).toBe('1층이에요.')
    expect(droppedSentences('1층이에요. 월 매출은 3000만원쯤 나올 거예요.')).toHaveLength(1)
    expect(sanitizeAnswer('이 상권이 좋습니다.')).toBeNull()
    expect(questionHash('몇 층이에요?')).toBe(questionHash('몇층이에요'))
  })

  test('⑩⑬⑭⑮ 상한 / 무료 등급 가드 / 프롬프트 입력 / 배치 백오프·만료·파기·집계', () => {
    expect(quotaBlocked(ASK.DAILY_LIMIT_PER_LISTING - 1)).toBe(false)
    expect(quotaBlocked(ASK.DAILY_LIMIT_PER_LISTING)).toBe(true)
    // ⑬ 무료 등급 + 프로덕션 → 사용자 자유 입력을 모델에 보내지 않는다
    expect(canSendUserInputToModel('free', true)).toBe(false)
    expect(canSendUserInputToModel('free', false)).toBe(true)
    expect(canSendUserInputToModel('paid', true)).toBe(true)
    expect(AI.ASK.tier).toBe('free')
    // ⑭ 예시 프롬프트에는 매물 공개 정보와 후보 문장만 — 사용자 입력·연락처·양도인 답장 없음
    const prompt = buildAskExamplesPrompt({ industry: '카페·베이커리', gu: '마포구', floor: '1', area: '33', candidates: [{ axis: 'hours', branch: 'owner', text: '몇 시부터 몇 시까지 하세요?' }] })
    for (const leak of ['010-', '@', '답장', '사용자 입력', '문의자']) expect(prompt).not.toContain(leak)
    expect(prompt).toContain('몇 시부터')
    expect(applyAskExamplesResponse([{ key: 'k', axis: 'hours', branch: 'owner', text: '몇 시부터 몇 시까지 하세요?' }], '[{"i":1,"text":"권리금은 얼마예요?"}]')[0].text).toBe('몇 시부터 몇 시까지 하세요?')
    // ⑮ 호출 제한 → 지수 백오프
    expect([backoffMs(1), backoffMs(2), backoffMs(3)]).toEqual([1000, 2000, 4000])
    // 만료·리마인드·파기·집계
    const H = n => new Date(Date.now() + n * 36e5).toISOString()
    const due = askDue([{ id: 'a', status: 'sent', ask_expires_at: H(-1) }, { id: 'b', status: 'sent', ask_expires_at: H(10) }, { id: 'c', status: 'sent', ask_expires_at: H(100) }])
    expect(due.expire.map(r => r.id)).toEqual(['a']); expect(due.remind.map(r => r.id)).toEqual(['b'])
    const old = new Date(Date.now() - 91 * 864e5).toISOString()
    expect(purgeDue([{ id: 'x', raw_text: 'q', created_at: old }, { id: 'y', raw_text: 'q', created_at: new Date().toISOString() }]).map(r => r.id)).toEqual(['x'])
    expect(hoursBand(3)).toBe('lt6'); expect(hoursBand(null)).toBe('none')
    const ev = { id: 'e1', target_id: 'ask-1', topic_axis: 'hours', intent: 'owner_only', branch: 'owner', answered: false, ledger_id: 'g1', created_at: new Date().toISOString() }
    const facts = aggregateFacts([ev, { ...ev, id: 'e2' }], [{ id: 'g1', created_at: new Date().toISOString(), ask_replied_at: new Date(Date.now() + 2 * 36e5).toISOString(), status: 'opened' }], [L()])
    expect(facts).toHaveLength(1)
    expect(facts[0]).toMatchObject({ topic_axis: 'hours', branch: 'owner', converted_to_inquiry: true, owner_replied: true, opened_to_dm: true, count: 2 })
    expect(Object.keys(facts[0])).not.toContain('raw_text')
    expect(Object.keys(facts[0])).not.toContain('pseudonym_id')
  })

  test('⑪⑫ lint: 질문 화면 문안에 "AI"·판단 문구 → 실패, 라우팅·노출 코드가 plan_tier 참조 → 실패, 실제 파일 위반 0', () => {
    expect(findCopyViolations('const t = "AI가 답해요"', 'src/components/ListingAskSection.jsx').length).toBeGreaterThan(0)
    expect(findCopyViolations('const t = "여기는 좋은 자리예요"', 'src/components/ListingAskSection.jsx').length).toBeGreaterThan(0)
    for (const f of ['config/listingAsk.ts', 'src/lib/listingAskRules.js', 'src/lib/listingAsk.js', 'src/components/ListingAskSection.jsx', 'src/lib/prompts/askExamples.js']) {
      expect(findCopyViolations(readFileSync(f, 'utf8'), f), f).toEqual([])
      expect(findPricingSortViolations(readFileSync(f, 'utf8'), f), f).toEqual([])
    }
    expect(findPricingSortViolations('function routeQuestions(xs) {\n  return xs.sort((a, b) => a.plan_tier - b.plan_tier)\n}')).toHaveLength(1)
  })
})

async function base(page, { listing = L(), events = [], sources = [] } = {}) {
  await mockGemini(page); await mockMarketData(page)
  await seedSession(page, { id: 'buyer-user' })
  await page.addInitScript(([d, p]) => { localStorage.setItem('modu_device_id', d); localStorage.setItem('modu_user_profile', JSON.stringify(p)) }, ['buyer-dev', { category: 'startup' }])
  const st = { events: [...events], ledgers: [], notifs: [], examples: [] }
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listing) }))
  await page.route(`${REST}/listings_visible*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listing) }))
  await page.route(`${REST}/listing_field_sources*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sources) }))
  await page.route(`${REST}/listing_ask_examples*`, r => {
    if (r.request().method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    st.examples.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
  })
  await page.route(`${REST}/listing_ask_cache*`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }))
  await page.route(`${REST}/ask_question_events*`, r => {
    if (r.request().method() === 'POST') { st.events.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(st.events) })
  })
  await page.route(`${REST}/inquiry_ledger*`, r => {
    if (r.request().method() === 'POST') { const b = JSON.parse(r.request().postData()); st.ledgers.push(b); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: `led-${st.ledgers.length}` }) }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(st.ledgers) })
  })
  await page.route(`${REST}/conversations*`, r => {
    if (r.request().method() === 'POST') { st.conv = JSON.parse(r.request().postData()); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'conv-1' }) }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route(`${REST}/notifications*`, r => {
    if (r.request().method() === 'POST') { st.notifs.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  return st
}

test('⑤ 매물 상세 질문 섹션: 예시는 placeholder 로만 돌고, 입력을 시작하면 사라진다 (입력창은 빈 상태로 시작)', async ({ page }) => {
  await base(page)
  await page.goto('/e2/ask-1')
  const sec = page.getByTestId('ask-section')
  await expect(sec).toBeVisible()
  await expect(sec.getByTestId('ask-notice')).toHaveText(ASK_COPY.sectionNotice)
  const input = sec.getByTestId('ask-input')
  await expect(input).toHaveValue('')                       // 탭으로 문장을 채우지 않는다
  const ph = await input.getAttribute('placeholder')
  expect(ph).toBeTruthy(); expect(ph).not.toBe('')
  await input.fill('직원은 몇 명이에요?')
  await expect(input).toHaveValue('직원은 몇 명이에요?')     // 입력이 placeholder 를 가린다(표준 동작)
})

test('⑦ 화이트리스트 밖 질문 → ② 로 분류되고 [물어봐 주세요] 노출, 이 시점에 DM 없음', async ({ page }) => {
  const st = await base(page)
  await page.goto('/e2/ask-1')
  const sec = page.getByTestId('ask-section')
  await sec.getByTestId('ask-input').fill('직원은 몇 명이에요?')
  await sec.getByTestId('ask-submit').click()
  await expect(sec.getByTestId('ask-owner')).toContainText(ASK_COPY.ownerLine)
  expect(st.conv).toBeUndefined()                            // DM 스레드 없음
  await sec.getByTestId('ask-owner-send').click()
  await expect(sec.getByTestId('ask-owner-sent')).toHaveText(ASK_COPY.ownerSent)
  expect(st.conv).toBeUndefined()
  await expect.poll(() => st.ledgers.length).toBe(1)
  expect(st.ledgers[0]).toMatchObject({ source: 'listing_ask', status: 'sent', listing_id: 'ask-1', ask_question_text: '직원은 몇 명이에요?', ask_axis: 'labor' })
  expect(st.ledgers[0].conversation_id ?? null).toBeNull()
  await expect.poll(() => st.notifs.length).toBe(1)
  expect(st.notifs[0]).toMatchObject({ type: 'ask_owner_question', title: ASK_COPY.ownerCardTitle })
  expect(JSON.stringify(st.notifs[0])).not.toContain('buyer-dev')   // 질문자 식별자 없음
})

test('⑥ 시세·권리금 질문 → 답하지 않고 모두에 시세 물어보기 시트로', async ({ page }) => {
  const st = await base(page)
  await page.goto('/e2/ask-1')
  const sec = page.getByTestId('ask-section')
  await sec.getByTestId('ask-input').fill('적정 권리금이 얼마예요?')
  await sec.getByTestId('ask-submit').click()
  await expect(page.getByTestId('price-inquiry-sheet')).toBeVisible()
  await expect(sec.getByTestId('ask-answer')).toHaveCount(0)
  await expect.poll(() => st.events.length).toBeGreaterThan(0)
  expect(st.events.at(-1)).toMatchObject({ branch: 'price', topic_axis: 'price' })
})

test('⑩ 하루 상한(10) 도달 → 상한 안내만, 질문 섹션은 그대로 보인다', async ({ page }) => {
  const today = new Date().toISOString()
  const many = Array.from({ length: ASK.DAILY_LIMIT_PER_LISTING }, (_, i) => ({ id: `e${i}`, target_id: 'ask-1', created_at: today, topic_axis: 'hours', intent: 'owner_only', branch: 'owner' }))
  await base(page, { events: many })
  await page.goto('/e2/ask-1')
  const sec = page.getByTestId('ask-section')
  await sec.getByTestId('ask-input').fill('쉬는 날은 언제예요?')
  await sec.getByTestId('ask-submit').click()
  await expect(sec.getByTestId('ask-quota')).toHaveText(ASK_COPY.quota)
  await expect(sec.getByTestId('ask-input')).toBeVisible()   // 기능을 숨기지 않는다
})
