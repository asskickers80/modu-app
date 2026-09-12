/**
 * 후기 규칙 (ORDER 2026-09-12 파트 A)
 * ① 비로그인 → 숫자·본문 없음, "로그인하면 볼 수 있어요" ② 양도인 본인 → [방문 후기 남기기] 없음 ③ '달랐어요' 항목 칩 없이 제출 → 막힘
 * ④ [지우기] → 즉시 비노출 + 작성자 알림 1건 + 흔적 없음 ⑤ 기업회원 화면 [지우기] 없음·[이의신청] 있음 ⑥ 이의신청 → 비노출·건수 감소, 31일 경과 배치 → 복구
 * ⑦ 후기 화면 금지어 lint ⑧ 정렬 함수 후기 수 참조 lint ⑨ 거래 완료 → 후기 섹션 비노출
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import { validateListingChips, validateVendorChips, visibleReviews, canEdit, massDeleteAlert, repeatVendorAlert, listingReviewable, axisOf } from '../src/lib/reviewRules.js'
import { dueRestores } from '../api/_reviewBatch.js'
import { REVIEWS } from '../config/reviews.ts'
import { findCopyViolations } from '../scripts/lint-copy.mjs'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const LISTING = { id: 'rv-1', device_id: 'seller-dev', user_id: 'seller-user', status: 'published', shop_name: '후기 카페', shop_name_public: true, address: '서울 마포구 서교동 332-4 1층', deposit: '3000', monthly_rent: '200', transfer_fee: '2500', transfer_type: 'full', area: '33', category_main: '카페·베이커리', ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], facilities: [], created_at: new Date().toISOString() }
const VENDOR = { id: 'v-1', device_id: 'vendor-dev', user_id: 'vendor-user', listing_type: 'business', status: 'published', shop_name: '서교 인테리어', biz_tagline: '테스트 업체', biz_tags: [], address: '서울 마포구 서교동 1' }
const R = (id, over = {}) => ({ id, target_type: 'listing', target_id: 'rv-1', author_user_id: `u-${id}`, author_axis: 'prep', author_name: `회원${id}`, chips: { when: '평일 점심', seen: ['외관'], match: '같았어요', differs: [] }, body: `본문 ${id}`, created_at: new Date(Date.now() - 864e5).toISOString(), deleted_at: null, blinded_until: null, ...over })

test.describe('룰 유닛', () => {
  test('③ 매물 칩 검증: 달랐어요 → 항목 칩 필수 / 업체 칩 검증 / 축 매핑', () => {
    expect(validateListingChips({ when: '평일 점심', seen: ['외관'], match: '같았어요' }).ok).toBe(true)
    const v = validateListingChips({ when: '평일 점심', seen: ['외관'], match: '달랐어요', differs: [] })
    expect(v.ok).toBe(false); expect(v.errors).toEqual(['differs'])
    expect(validateListingChips({ when: '평일 점심', seen: [], match: '같았어요' }).errors).toEqual(['seen'])
    expect(validateVendorChips({ what: '중개', progress: '상담만' }).ok).toBe(true); expect(validateVendorChips({ what: '중개' }).ok).toBe(false)
    expect(axisOf('startup')).toBe('prep'); expect(axisOf('business')).toBe('vendor'); expect(axisOf('landlord')).toBe('owner')
  })
  test('⑥·⑨ 노출 규칙: 삭제·블라인드 제외 최신순 / 31일 경과 → 자동 복구 대상 / 내려간 매물은 섹션 없음 / 24시간 수정 / 운영 알림 임계', () => {
    const rows = [R('a'), R('b', { deleted_at: new Date().toISOString() }), R('c', { blinded_until: new Date(Date.now() + 5 * 864e5).toISOString() }), R('d', { created_at: new Date().toISOString() })]
    expect(visibleReviews(rows).map(r => r.id)).toEqual(['d', 'a'])
    expect(dueRestores([R('x', { blinded_until: new Date(Date.now() - 864e5).toISOString() }), R('y', { blinded_until: new Date(Date.now() + 864e5).toISOString() }), R('z', { blinded_until: new Date(Date.now() - 864e5).toISOString(), deleted_at: new Date().toISOString() })]).map(r => r.id)).toEqual(['x'])
    expect(REVIEWS.BLIND_DAYS).toBe(30)
    expect(listingReviewable({ status: 'sold' })).toBe(false); expect(listingReviewable({ status: 'hidden' })).toBe(false); expect(listingReviewable({ status: 'published' })).toBe(true)
    expect(canEdit(new Date(Date.now() - 23 * 36e5).toISOString())).toBe(true); expect(canEdit(new Date(Date.now() - 25 * 36e5).toISOString())).toBe(false)
    const d = (n) => ({ deleted_at: new Date(Date.now() - n * 864e5).toISOString() })
    expect(massDeleteAlert([d(1), d(2), d(3)])).toBe(true); expect(massDeleteAlert([d(1), d(2), d(9)])).toBe(false)
    const rv = (t, n) => ({ target_id: t, created_at: new Date(Date.now() - n * 864e5).toISOString() })
    expect(repeatVendorAlert([rv('v1', 1), rv('v2', 2), rv('v3', 3)])).toBe(true); expect(repeatVendorAlert([rv('v1', 1), rv('v1', 2), rv('v2', 3)])).toBe(false)
  })
  test('⑦·⑧ lint: 후기 화면에 평점·별점·추천·인증·검증 → 실패, 정렬 함수의 후기 수·visibility 참조 → 실패, 실제 파일 위반 0', () => {
    for (const bad of ['평점 4.5', '별점', '추천해요', '인증 완료', '검증된 후기']) expect(findCopyViolations(bad, 'src/components/ReviewSection.jsx').length).toBeGreaterThan(0)
    expect(findCopyViolations('검증된 사실', 'src/components/SomethingElse.jsx')).toEqual([]) // 범위 밖 파일엔 적용 안 함
    for (const f of ['config/reviews.ts', 'src/components/ReviewSection.jsx', 'src/screens/VendorDetailPage.jsx', 'src/lib/reviewRules.js', 'src/lib/reviews.js']) {
      expect(findCopyViolations(readFileSync(f, 'utf8'), f)).toEqual([])
    }
    expect(findPricingSortViolations('function sortByReviews(l) {\n  return l.sort((a, b) => b.review_count - a.review_count)\n}')).toHaveLength(1)
    expect(findPricingSortViolations('const rankFeed = (xs) => {\n  return xs.filter(x => x.visibility === "public")\n}')).toHaveLength(1)
    expect(findPricingSortViolations(readFileSync('src/lib/reviewRules.js', 'utf8'), 'reviewRules.js')).toEqual([])
  })
})

async function base(page, { login = true, deviceId = 'buyer-dev', profile = { category: 'startup' }, listing = LISTING, reviews = [], appeals = [] } = {}) {
  await mockGemini(page); await mockMarketData(page)
  if (login) await seedSession(page, { id: profile.uid ?? 'test-user' })
  await page.addInitScript(([d, p]) => { localStorage.setItem('modu_device_id', d); localStorage.setItem('modu_user_profile', JSON.stringify(p)) }, [deviceId, profile])
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().url().includes('listing_type=eq.business') ? VENDOR : listing) }))
  const state = { reviews: [...reviews], posted: [], patched: [], appeals: [...appeals], notifs: [] }
  await page.route(`${REST}/reviews*`, r => {
    const m = r.request().method()
    if (m === 'POST') { const b = JSON.parse(r.request().postData()); state.posted.push(b); state.reviews.push({ id: `new-${state.posted.length}`, ...b, created_at: new Date().toISOString() }); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    if (m === 'PATCH') { const b = JSON.parse(r.request().postData()); state.patched.push(b); const id = r.request().url().match(/id=eq\.([^&]+)/)?.[1]; state.reviews = state.reviews.map(x => x.id === id ? { ...x, ...b } : x); return r.fulfill({ status: 204, body: '' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.reviews) })
  })
  await page.route(`${REST}/review_appeals*`, r => {
    if (r.request().method() === 'POST') { state.appeals.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.appeals) })
  })
  await page.route(`${REST}/notifications*`, r => {
    if (r.request().method() === 'POST') { state.notifs.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  return state
}

test('① 비로그인: 매물 상세에 후기 숫자·본문 없음, 안내 1줄만', async ({ page }) => {
  await base(page, { login: false, reviews: [R('a'), R('b')] })
  await page.goto('/e2/rv-1')
  const sec = page.getByTestId('review-section')
  await expect(sec).toHaveAttribute('data-state', 'login')
  await expect(sec.getByTestId('review-login-notice')).toHaveText('로그인하면 볼 수 있어요')
  await expect(sec).not.toContainText(/\d건|본문/)
  await expect(page.getByTestId('review-write-open')).toHaveCount(0)
})

test('②·④ 양도인 본인: [방문 후기 남기기] 없음, [지우기] → 즉시 비노출 + 작성자 알림 1건 + 흔적 없음', async ({ page }) => {
  const st = await base(page, { deviceId: 'seller-dev', profile: { category: 'seller', uid: 'seller-user' }, reviews: [R('a'), R('b')] })
  await page.goto('/e2/rv-1')
  const sec = page.getByTestId('review-section')
  await expect(sec.getByTestId('review-count')).toHaveText('방문 후기 2건')
  await expect(sec.getByTestId('review-write-open')).toHaveCount(0)
  await expect(sec.getByTestId('review-appeal')).toHaveCount(0)
  await sec.getByTestId('review-delete').first().click()
  await expect(sec).toContainText('지운 후기는 되돌릴 수 없어요')
  await sec.getByTestId('review-delete-confirm').click()
  await expect(sec.getByTestId('review-item')).toHaveCount(1)
  await expect(sec.getByTestId('review-count')).toHaveText('방문 후기 1건')
  expect(st.patched[0]).toMatchObject({ deleted_by: 'seller' }); expect(st.patched[0].deleted_at).toBeTruthy()
  await expect.poll(() => st.notifs.length).toBe(1)
  expect(st.notifs[0]).toMatchObject({ user_id: 'u-a', type: 'review_deleted', title: '남기신 후기가 양도인에 의해 지워졌어요' })
  await expect(sec.getByTestId('review-deleted-trace')).toHaveCount(0) // SHOW_DELETED_TRACE=false
  expect(REVIEWS.SHOW_DELETED_TRACE).toBe(false)
})

test('③ 창업준비: 달랐어요 선택 후 항목 칩 없이 제출 → 막힘, 채우면 저장(별점·평가 요소 없음)', async ({ page }) => {
  const st = await base(page, { reviews: [] })
  await page.goto('/e2/rv-1')
  await page.getByTestId('review-write-open').click()
  const sheet = page.getByTestId('review-write-sheet')
  await expect(sheet.getByTestId('review-write-notice')).toHaveText('가서 보신 것만 적어 주세요 · 양도인이 지울 수 있어요')
  await expect(sheet).not.toContainText(/별점|평점|추천|좋아요/)
  await sheet.getByTestId('rv-when-평일 점심').click()
  await sheet.getByTestId('rv-seen-외관').click()
  await sheet.getByTestId('rv-match-달랐어요').click()
  await sheet.getByTestId('review-submit').click()
  await expect(sheet.getByTestId('review-sec-differs')).toHaveAttribute('data-error', '1')
  expect(st.posted).toHaveLength(0)
  await sheet.getByTestId('rv-diff-면적').click()
  await sheet.getByTestId('review-body').fill('실제 면적이 더 작아 보였어요')
  await sheet.getByTestId('review-submit').click()
  await expect.poll(() => st.posted.length).toBe(1)
  expect(st.posted[0]).toMatchObject({ target_type: 'listing', target_id: 'rv-1', author_user_id: 'test-user', author_axis: 'prep', chips: { when: '평일 점심', seen: ['외관'], match: '달랐어요', differs: ['면적'] }, body: '실제 면적이 더 작아 보였어요' })
  expect(st.posted[0]).not.toHaveProperty('rating')
  await expect(page.getByTestId('review-count')).toHaveText('방문 후기 1건')
})

test('⑤·⑥ 기업회원 화면: [지우기] 없음·[이의신청] 있음 → 제출 즉시 비노출·건수 감소·작성자 알림', async ({ page }) => {
  const vr = (id) => ({ ...R(id), target_type: 'vendor', target_id: 'v-1', chips: { what: '인테리어', progress: '완료까지' } })
  const st = await base(page, { deviceId: 'vendor-dev', profile: { category: 'business', uid: 'vendor-user' }, reviews: [vr('a'), vr('b')] })
  await page.goto('/e2b/v-1')
  await expect(page.getByTestId('vendor-name')).toHaveText('서교 인테리어')
  const sec = page.getByTestId('review-section')
  await expect(sec.getByTestId('review-count')).toHaveText('후기 2건')
  await expect(sec.getByTestId('review-foot')).toHaveText('모두 회원이 남긴 후기 · 업체가 고르지 않아요')
  await expect(sec.getByTestId('review-delete')).toHaveCount(0)
  await sec.getByTestId('review-appeal').first().click()
  await page.getByTestId('appeal-not_customer').click()
  await page.getByTestId('appeal-submit').click()
  await expect(sec.getByTestId('review-count')).toHaveText('후기 1건')
  expect(st.appeals[0]).toMatchObject({ review_id: 'a', vendor_user_id: 'vendor-user', reason_chip: 'not_customer' })
  expect(st.patched[0].blinded_until).toBeTruthy(); expect(st.patched[0].blind_reason).toBe('vendor_appeal')
  await expect.poll(() => st.notifs.length).toBe(1)
  expect(st.notifs[0]).toMatchObject({ user_id: 'u-a', type: 'review_appealed', title: `남기신 후기에 업체가 이의신청해서 ${REVIEWS.BLIND_DAYS}일간 보이지 않아요` })
})

test('⑨ 거래 완료 매물 → 소유자 뷰에서도 후기 섹션 비노출', async ({ page }) => {
  await base(page, { deviceId: 'seller-dev', profile: { category: 'seller', uid: 'seller-user' }, listing: { ...LISTING, status: 'sold' }, reviews: [R('a')] })
  await page.goto('/e2/rv-1')
  await expect(page.getByTestId('owner-notice-bar')).toBeVisible()
  await expect(page.getByTestId('review-section')).toHaveCount(0)
})
