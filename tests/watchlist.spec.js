/**
 * 찜 양방향 신호 (ORDER 2026-09-10 파트 A)
 * ① 찜 5번째 → 토스트 "5번째", 4번째 → 순번 없음 ② 권리금 인상 → price 알림 문안에 두 금액 ③ 찜 4건 → density 미발송, 5건 → 1회
 * ④ 양도인 한마디 → 자유 텍스트 UI 없음, 7일 내 2회째 비활성 ⑤ 찜 3건 → 공통점 카드 1회, [괜찮아요] → 30일 미표시
 * ⑥ 관심 2명 → 요약 없이 숫자만 ⑦ 응답 이력 4건 → 답장 시간 미표시 ⑧ 정렬 함수 찜 수·plan_tier 참조 시 lint 실패
 * ⑨ deal_result 공개 동의 없으면 금액 없음
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import {
  watchToast, priceDiff, priceNotifCopy, infoDiff, infoNotifCopy, statusNotifCopy, shouldSendDensity, withinDailyCaps,
  ownerTemplateText, ownerMsgAllowed, ownerPushAllowed, commonConditions, watcherSummary, medianResponseHours,
  dealResultCopy, isSimilar, nextBatchTime, isHiddenUntil, noInquiryDespiteWatch,
} from '../src/lib/watchRules.js'
import { WATCH, OWNER_TEMPLATES } from '../config/watch.ts'
import { SIMILAR_WEEKDAY, buildSimilarDigest, isDigestDay } from '../api/_watchDigest.js'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'
import { kstToday, addDays } from '../src/lib/weekUtil.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const OWNER = 'owner-dev'
const LISTING = {
  id: 'w-1', device_id: OWNER, status: 'published', shop_name: '관심 카페', shop_name_public: true,
  address: '서울 마포구 서교동 332-4 1층', deposit: '3000', monthly_rent: '200', transfer_fee: '5000', transfer_type: 'full',
  area: '33', category_main: '카페·베이커리', ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], facilities: [],
  created_at: new Date(Date.now() - 20 * 864e5).toISOString(), published_at: new Date(Date.now() - 20 * 864e5).toISOString(),
}

test.describe('룰 유닛', () => {
  test('① 토스트: 5번째 → 순번 표시, 4번째 → 순번 없음, 업체·동네 문구', () => {
    expect(watchToast('listing', 5)).toBe('양도인에게 관심이 전달됐어요 · 이 매물 관심 5번째')
    expect(watchToast('listing', 4)).toBe('양도인에게 관심이 전달됐어요')
    expect(watchToast('vendor')).toBe('이 업체 소식을 받아볼게요')
    expect(watchToast('area')).toBe('이 동네 새 매물을 주 1회 모아서 알려드릴게요')
  })

  test('② 권리금 인상 → price 알림, 문안에 두 금액 (인상도 보낸다) / 정보 추가 문안', () => {
    const d = priceDiff({ transfer_fee: '5000', deposit: '3000', monthly_rent: '200' }, { transfer_fee: '5500', deposit: '3000', monthly_rent: '200' })
    expect(d).toEqual([{ field: 'transfer_fee', label: '권리금', from: 5000, to: 5500, down: false }])
    expect(priceNotifCopy(d).title).toBe('찜한 매물 가격이 바뀌었어요 (권리금 5,000→5,500만)')
    const two = priceNotifCopy(priceDiff({ transfer_fee: 5000, monthly_rent: 200 }, { transfer_fee: 4500, monthly_rent: 180 }))
    expect(two.body).toBe('권리금 5,000→4,500만 · 월세 200→180만'); expect(two.down).toBe(true)
    expect(priceNotifCopy(priceDiff({ transfer_fee: 5000 }, { transfer_fee: 5000 }))).toBeNull()
    expect(infoDiff({ image_urls: [] }, { image_urls: ['a'] })).toContain('사진')
    expect(infoNotifCopy(['사진']).title).toBe('찜한 매물에 사진이 추가됐어요')
    expect(statusNotifCopy('sold').title).toBe('찜한 매물이 거래 완료됐어요')
    expect(statusNotifCopy('hidden', true).body).toBe('비슷한 매물 보기')
    expect(new Date(nextBatchTime()).getTime()).toBeGreaterThan(Date.now())
  })

  test('③ density: 7일 내 4건 → 미발송, 5건 → 발송, 이미 보냈으면 재발송 없음 / 하루 상한', () => {
    expect(shouldSendDensity({ recentCount: 4 })).toBe(false)
    expect(shouldSendDensity({ recentCount: 5 })).toBe(true)
    expect(shouldSendDensity({ recentCount: 9, alreadySent: true })).toBe(false)
    expect(withinDailyCaps({ sameListingToday: 0, userToday: 2 })).toBe(true)
    expect(withinDailyCaps({ sameListingToday: 1, userToday: 0 })).toBe(false)
    expect(withinDailyCaps({ sameListingToday: 0, userToday: 3 })).toBe(false)
  })

  test('④ 한마디: 템플릿 3개뿐(자유 텍스트 없음), 시간대 칩 필수, 7일·30일 쿨다운', () => {
    expect(OWNER_TEMPLATES).toHaveLength(3)
    expect(ownerTemplateText('ask_anytime')).toBe('궁금한 점은 편하게 물어보세요')
    expect(ownerTemplateText('visit_time', '평일 오후')).toBe('방문은 평일 오후에 편해요')
    expect(ownerTemplateText('visit_time', '아무때나')).toBeNull()
    expect(ownerTemplateText('자유 텍스트')).toBeNull()
    const d = (n) => new Date(Date.now() - n * 864e5).toISOString()
    expect(ownerMsgAllowed(d(6))).toBe(false); expect(ownerMsgAllowed(d(8))).toBe(true); expect(ownerMsgAllowed(null)).toBe(true)
    expect(ownerPushAllowed(d(29))).toBe(false); expect(ownerPushAllowed(d(31))).toBe(true)
  })

  test('⑤ 공통점: 2건 → null, 3건 → 업종 최빈값·권리금 상한 (역 거리 없음) / 30일 숨김', () => {
    const l = (fee, cat) => ({ transfer_fee: fee, category_main: cat, address: '서울 마포구 서교동 1' })
    expect(commonConditions([l(3000, '카페·베이커리'), l(4000, '카페·베이커리')])).toBeNull()
    const c = commonConditions([l(3000, '카페·베이커리'), l(4000, '카페·베이커리'), l(2500, '요식업')])
    expect(c.industry).toBe('카페·베이커리'); expect(c.feeMax).toBe(4000)
    expect(c.line).toBe('찜한 매물의 공통점: 카페·베이커리 · 권리금 4,000만 이하 — 이 조건으로 새 매물 알림 받을까요?')
    expect(isHiddenUntil(addDays(kstToday(), -29))).toBe(true)
    expect(isHiddenUntil(addDays(kstToday(), -30))).toBe(false)
  })

  test('⑥ 관심 요약: 2명 → 없음(숫자만), 3명 → 창업 준비·동네 집계 / 찜 10건+ 문의 0건 14일', () => {
    const ps = [{ category: 'startup', region: '서울', region_sub: '마포구' }, { category: 'startup' }, { category: 'seller', region_sub: '강남구' }]
    expect(watcherSummary(2, ps, '마포구')).toBeNull()
    expect(watcherSummary(3, ps, '마포구')).toBe('창업 준비 2명 · 이 동네 찾는 사람 1명')
    expect(noInquiryDespiteWatch({ watchers: 10, inquiries: 0, publishedAt: new Date(Date.now() - 15 * 864e5).toISOString() })).toBe(true)
    expect(noInquiryDespiteWatch({ watchers: 9, inquiries: 0, publishedAt: new Date(Date.now() - 15 * 864e5).toISOString() })).toBe(false)
    expect(noInquiryDespiteWatch({ watchers: 10, inquiries: 1, publishedAt: new Date(Date.now() - 15 * 864e5).toISOString() })).toBe(false)
  })

  test('⑦ 응답 시간: 이력 4건 → null, 5건 → 중앙값 올림', () => {
    expect(medianResponseHours([1, 2, 3, 4])).toBeNull()
    expect(medianResponseHours([1, 2, 3.2, 4, 40])).toBe(4)
    expect(medianResponseHours([0.2, 0.3, 0.1, 0.5, 0.4])).toBe(1)
  })

  test('⑧ lint: 정렬 함수가 찜 수·plan_tier 를 참조하면 실패', () => {
    expect(findPricingSortViolations('function sortByInterest(list) {\n  return list.sort((a, b) => b.watch_count - a.watch_count)\n}')).toHaveLength(1)
    expect(findPricingSortViolations('const rankListings = (xs) => {\n  return xs.sort((a, b) => (b.plan_tier === "premium") - (a.plan_tier === "premium"))\n}')).toHaveLength(1)
    expect(findPricingSortViolations('function sortByScore(list) {\n  return list.sort((a, b) => b.score - a.score)\n}')).toEqual([])
  })

  test('⑨ deal_result: 공개 동의 없으면 null(=status 알림만), 동의 시 두 금액', () => {
    expect(dealResultCopy({ consented: false, finalFee: 4500, listedFee: 5000 })).toBeNull()
    expect(dealResultCopy({ consented: true, finalFee: 4500, listedFee: 5000 }).title).toBe('찜하신 매물이 권리금 4,500만에 거래됐어요 (등록가 5,000만)')
    // 비슷한 매물: 같은 동·같은 업종·권리금 ±30%
    expect(isSimilar(LISTING, { id: 'x', status: 'published', address: '서울 마포구 서교동 10', category_main: '카페·베이커리', transfer_fee: '6000' })).toBe(true)
    expect(isSimilar(LISTING, { id: 'x', status: 'published', address: '서울 마포구 서교동 10', category_main: '카페·베이커리', transfer_fee: '7000' })).toBe(false)
    expect(isSimilar(LISTING, { id: 'x', status: 'published', address: '서울 마포구 합정동 10', category_main: '카페·베이커리', transfer_fee: '5000' })).toBe(false)
  })

  test('동네 묶음: 요일 값이 config 와 동일, 새 매물 0건 → 발송 없음, 2건 → "새 매물 2건" 1행', () => {
    expect(SIMILAR_WEEKDAY).toBe(WATCH.SIMILAR_WEEKDAY)
    const monday = new Date('2026-09-13T21:00:00Z') // KST 월요일 06:00
    expect(isDigestDay(monday)).toBe(true)
    const w = [{ id: 'a1', device_id: 'd1', target_id: '1144012000', muted_at: null }]
    expect(buildSimilarDigest({ areaWatches: w, newListings: [], now: monday })).toEqual([])
    const rows = buildSimilarDigest({ areaWatches: w, newListings: [{ id: 'l1', bjd_code: '1144012000', address: '서울 마포구 서교동 1' }, { id: 'l2', bjd_code: '1144012000', address: '서울 마포구 서교동 2' }], now: monday })
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('찜한 동네에 새 매물 2건')
    expect(rows[0].payload.link).toBe('/explore?dong=%EC%84%9C%EA%B5%90%EB%8F%99')
    expect(buildSimilarDigest({ areaWatches: w, newListings: [{ id: 'l1', bjd_code: '1144012000', address: 'x' }], existingKeys: new Set([rows[0].payload.dedupe_key]), now: monday })).toEqual([])
  })
})

// ── UI ───────────────────────────────────────────────────────
async function baseMocks(page) {
  await mockGemini(page); await mockMarketData(page)
  await page.route(`${REST}/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }))
}

test('① UI: 찜 → watchlist 저장 + 토스트 "5번째" (count 5) / count 4면 순번 없음', async ({ page }) => {
  await baseMocks(page)
  await seedSession(page)
  await page.addInitScript(() => localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup' })))
  await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTING) }))
  const posts = []
  let count = 5
  await page.route(`${REST}/watchlist*`, r => {
    const req = r.request()
    if (req.method() === 'POST') { posts.push(JSON.parse(req.postData() || '{}')); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    if (req.method() === 'HEAD' || req.headers()['prefer']?.includes('count=exact')) {
      // 브라우저가 JS에 헤더를 열어주려면 expose 가 필요하다 (supabase-js 는 content-range 로 count 를 읽는다)
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `*/${count}`, 'access-control-expose-headers': 'content-range' }, body: '[]' })
    }
    if (req.method() === 'DELETE') return r.fulfill({ status: 204, body: '' })
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.goto('/e2/w-1')
  await page.getByRole('button', { name: '찜' }).click()
  await expect(page.getByText('양도인에게 관심이 전달됐어요 · 이 매물 관심 5번째')).toBeVisible()
  await expect.poll(() => posts.length).toBe(1)
  expect(posts[0]).toMatchObject({ target_type: 'listing', target_id: 'w-1' })
  await expect(page.getByRole('button', { name: '찜' })).toHaveAttribute('aria-pressed', 'true')

  // 해제 후 다시 찜 — 이번엔 4번째 → 순번 없음
  await page.getByRole('button', { name: '찜' }).click()
  await expect(page.getByText('관심을 해제했어요')).toBeVisible()
  count = 4
  await page.getByRole('button', { name: '찜' }).click()
  await expect(page.getByText('양도인에게 관심이 전달됐어요', { exact: true })).toBeVisible()
  // 동네 찜 칩도 있다
  await expect(page.getByTestId('watch-area')).toContainText('서교동 새 매물 알림')
})

test('④·⑥ UI: 소유자 카드 — 관심 2명은 숫자만, 한마디는 템플릿 3개(자유 텍스트 없음) → 보낸 뒤 7일 비활성', async ({ page }) => {
  await baseMocks(page)
  await page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
  }, OWNER)
  await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTING) }))
  await page.route(`${REST}/watchlist*`, r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ id: 'wa', device_id: 'w1', user_id: null, muted_at: null, created_at: new Date().toISOString() }, { id: 'wb', device_id: 'w2', user_id: null, muted_at: null, created_at: new Date().toISOString() }]) }))
  const msgs = []
  await page.route(`${REST}/listing_owner_messages*`, r => {
    if (r.request().method() === 'POST') { msgs.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(msgs.map(m => ({ ...m, sent_at: new Date().toISOString() }))) })
  })
  const notifs = []
  await page.route(`${REST}/notifications*`, r => {
    if (r.request().method() === 'POST') { notifs.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: `n${notifs.length}` }) }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.goto('/e2/w-1')
  const card = page.getByTestId('watch-owner-card')
  await expect(card.getByTestId('watch-owner-count')).toHaveText('관심 2명')
  await expect(card.getByTestId('watch-owner-summary')).toHaveCount(0) // ⑥ n<3 → 숫자만
  await expect(card.getByTestId('owner-push')).toBeDisabled() // 예약된 변경 알림 없음 → 비활성
  await card.getByTestId('owner-msg-open').click()
  const sheet = page.getByTestId('owner-msg-sheet')
  await expect(sheet.locator('textarea, input[type="text"]')).toHaveCount(0) // ④ 자유 텍스트 UI 없음
  await expect(sheet.getByTestId('owner-msg-templates').getByRole('button')).toHaveCount(3)
  await sheet.getByTestId('owner-tpl-visit_time').click()
  await sheet.getByTestId('owner-slot-평일 오후').click()
  await sheet.getByTestId('owner-msg-send').click()
  await expect(page.getByText('찜한 2명에게 전했어요')).toBeVisible()
  expect(msgs[0]).toMatchObject({ listing_id: 'w-1', template_key: 'visit_time', payload: { slot: '평일 오후' } })
  await expect.poll(() => notifs.length).toBe(2)
  expect(notifs[0]).toMatchObject({ type: 'watch_owner_msg', title: '양도인이 답했어요: 방문은 평일 오후에 편해요', device_id: 'w1' })
  await expect(card.getByTestId('owner-msg-open')).toBeDisabled() // 7일 내 2회째 비활성
})

test('⑤ UI: 내 관심 — 매물 찜 3건 → 공통점 카드 1회, [괜찮아요] → 새로고침해도 미표시 / 비교표 3행', async ({ page }) => {
  await baseMocks(page)
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'fav-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup', region: '서울' }))
  })
  const rows = ['a', 'b', 'c'].map((k, i) => ({ ...LISTING, id: `f-${k}`, shop_name: `카페 ${k}`, transfer_fee: String(3000 + i * 500), category_main: i < 2 ? '카페·베이커리' : '요식업' }))
  await page.route(`${REST}/watchlist*`, r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify(rows.map(l => ({ id: `w-${l.id}`, target_type: 'listing', target_id: l.id, created_at: new Date().toISOString(), muted_at: null }))) }))
  await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) }))
  await page.goto('/favorites')
  await expect(page.getByTestId('favorites-summary')).toHaveText('찜 3개')
  await expect(page.getByTestId('watch-common-card')).toContainText('찜한 매물의 공통점: 카페·베이커리 · 권리금 4,000만 이하')
  await expect(page.getByTestId('watch-compare-row')).toHaveCount(3)
  await page.getByTestId('watch-common-no').click()
  await expect(page.getByTestId('watch-common-card')).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('favorites-summary')).toBeVisible()
  await expect(page.getByTestId('watch-common-card')).toHaveCount(0)
})

test('⑦ UI: 응답 이력 4건 → 답장 시간 미표시, 5건 → "보통 2시간 안에 답해요"', async ({ page }) => {
  for (const n of [4, 5]) {
    await baseMocks(page)
    await seedSession(page)
    await page.addInitScript(() => localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup' })))
    await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTING) }))
    const convs = Array.from({ length: n }, (_, i) => ({ id: `c${i}`, sender_id: `u${i}` }))
    const t0 = Date.now() - 864e5
    const msgs = convs.flatMap(c => [
      { conversation_id: c.id, sender_id: c.sender_id, created_at: new Date(t0).toISOString() },
      { conversation_id: c.id, sender_id: OWNER, created_at: new Date(t0 + 2 * 36e5).toISOString() },
    ])
    await page.route(`${REST}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().url().includes('receiver_id=eq.') ? convs : []) }))
    await page.route(`${REST}/messages*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(msgs) }))
    await page.goto('/e2/w-1')
    await expect(page.getByRole('button', { name: 'DM으로 문의하기' })).toBeVisible()
    if (n === 4) await expect(page.getByTestId('owner-response-time')).toHaveCount(0)
    else await expect(page.getByTestId('owner-response-time')).toHaveText('이 양도인은 보통 2시간 안에 답해요')
  }
})
