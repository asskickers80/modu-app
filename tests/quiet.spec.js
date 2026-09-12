/**
 * 매물 quiet 공개 단계 (ORDER 2026-09-12 파트 B)
 * ① quiet 등록 → 목록 카드 아이콘, 상세 라벨 ② 마스킹 뷰: 상호·좌표·사진 null ③ 문의 → ledger stage=quiet ④ [이 분께 공개] → reveals 1행(기기 기준)
 * ⑤ 동시 quiet 2건 → 카드 비활성 ⑥ 비교 표본 2 → 없음, 3 → 있음 ⑦ 31일 경과 배치 → 보류(공개 아님) ⑧ 공개 전환 → 찜 info 알림·visibility public
 * ⑨ 정렬 함수 visibility lint ⑩ 등록 화면 좋은 점·대신 3줄 항상 ⑪ masked 소개글에 상호 문자열 없음
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession, passPublishGate, agreeListingTerms } from './helpers.js'
import { readFileSync } from 'node:fs'
import { maskDraft, containsSecret, canStartQuiet, compareAvg, compareLine, reactionLine, quietDeadline, daysLeft, reminderDue, prosLines, consLines, industryIcon } from '../src/lib/quietRules.js'
import { quietDue } from '../api/_quietBatch.js'
import { QUIET, HIDDEN_FIELDS } from '../config/quiet.ts'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'
import { findCopyViolations } from '../scripts/lint-copy.mjs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const OWNER = 'quiet-owner'
const FULL = { id: 'q-1', device_id: OWNER, user_id: 'owner-user', status: 'published', listing_type: 'seller', visibility: 'quiet', quiet_started_at: new Date(Date.now() - 5 * 864e5).toISOString(), quiet_deadline_at: new Date(Date.now() + 25 * 864e5).toISOString(),
  shop_name: '비밀 카페', shop_name_public: true, address: '서울 마포구 서교동 332-4 1층', floor: '1', area: '33', deposit: '3000', monthly_rent: '200', transfer_fee: '2500', transfer_type: 'full', category_main: '카페·베이커리', is_franchise: false,
  ai_draft: { intro: '비밀 카페는 서교동 332-4 골목에 있어요.' }, review_choices: {}, edited_texts: {}, image_urls: ['a.jpg'], facilities: [], latitude: 37.55, longitude: 126.92, views: 12, created_at: new Date().toISOString(), published_at: null }
/** DB 뷰가 방문자에게 돌려주는 모양(마스킹) */
const MASKED = { ...FULL, shop_name: null, shop_name_public: false, title: null, address: '서울 마포구 서교동', address_detail: null, building_name: null, latitude: null, longitude: null, image_urls: [], interior_image_urls: [], exterior_image_urls: [], franchise_brand_name: null, autofill: null, ai_draft: { intro: '이 매물은 이 동네 골목에 있어요.' }, edited_texts: {} }

test.describe('룰 유닛', () => {
  test('⑪ masked 소개글: 상호·지번·건물명 치환, 남으면 문장 제거 — 상호 문자열 없음', () => {
    const m = maskDraft(FULL.ai_draft, { shopName: '비밀 카페', jibun: '서교동 332-4', buildingName: '', brandName: '', dong: '서교동' })
    expect(JSON.stringify(m)).not.toContain('비밀 카페'); expect(JSON.stringify(m)).not.toContain('332-4')
    expect(containsSecret(m, ['비밀 카페', '332-4'])).toBe(false)
    expect(containsSecret(FULL.ai_draft, ['비밀 카페'])).toBe(true)
    const m2 = maskDraft({ a: '비밀 카페 옆 건물 101동. 역까지 5분.' }, { shopName: '비밀 카페', jibun: '' })
    expect(m2.a).toBe('이 매물 옆 건물 101동. 역까지 5분.')
  })
  test('⑤·⑥·⑦ 상한·비교 표본·기한: quiet 2건이면 불가 / 표본 2 → null, 3 → 평균 / 31일 경과 → 보류 대상, 자동 공개 아님', () => {
    expect(canStartQuiet([{ visibility: 'quiet', status: 'published' }])).toBe(true)
    expect(canStartQuiet([{ visibility: 'quiet', status: 'published' }, { visibility: 'quiet', status: 'negotiating' }])).toBe(false)
    expect(canStartQuiet([{ visibility: 'quiet', status: 'sold' }, { visibility: 'quiet', status: 'published' }])).toBe(true)
    expect(QUIET.MAX_QUIET_PER_USER).toBe(2)
    expect(compareAvg([3, 5])).toBeNull(); expect(compareAvg([3, 5, 4])).toBe(4); expect(compareLine('카페·베이커리', null)).toBeNull()
    expect(compareLine('카페·베이커리', 4)).toBe('같은 동 카페·베이커리 공개 매물의 첫 14일 평균 찜 4')
    expect(reactionLine({ d: 5, v: 12, w: 3, q: 1 })).toBe('조용히 본 지 5일 · 조회 12 · 찜 3 · 문의 1')
    const old = { id: 'x', visibility: 'quiet', status: 'published', quiet_deadline_at: new Date(Date.now() - 864e5).toISOString() }
    const due = quietDue([old, { ...old, id: 'y', quiet_deadline_at: new Date(Date.now() + 7 * 864e5 - 36e5).toISOString() }, { ...old, id: 'z', visibility: 'public' }])
    expect(due.expire.map(l => l.id)).toEqual(['x']); expect(due.remind.map(r => [r.listing.id, r.d])).toEqual([['y', 7]])
    expect(readFileSync('api/_quietBatch.js', 'utf8')).not.toMatch(/visibility:\s*'public'/) // 배치는 자동 공개하지 않는다
    expect(daysLeft(quietDeadline())).toBe(QUIET.QUIET_DAYS); expect(reminderDue(new Date(Date.now() + 864e5 - 1e3).toISOString())).toBe(1)
  })
  test('②·⑨·⑩ 마스킹 뷰 정의에 숨김 필드 null, 정렬 함수 visibility 참조 lint, 문안 3줄·판단 문구 없음', () => {
    const sql = readFileSync('docs/SQL-reviews-quiet-takes.sql', 'utf8')
    for (const col of ['shop_name', 'latitude', 'longitude', 'address_detail', 'building_name', 'franchise_brand_name']) expect(sql).toMatch(new RegExp(`case when m\\.masked then null else l\\.${col} end`))
    expect(sql).toMatch(/case when m\.masked then '\[\]'::jsonb else to_jsonb\(l\.image_urls\) end/)
    expect(sql).toMatch(/x-device-id/) // 기기 기준 소유자·개별 공개 판정
    expect(HIDDEN_FIELDS).toEqual(expect.arrayContaining(['shop_name', 'image_urls', 'latitude', 'longitude', 'franchise_brand_name']))
    expect(findPricingSortViolations('function sortFeed(l) {\n  return l.sort((a, b) => (a.visibility === "public") - (b.visibility === "public"))\n}')).toHaveLength(1)
    expect(findPricingSortViolations(readFileSync('src/lib/quietRules.js', 'utf8'), 'quietRules.js')).toEqual([])
    expect(prosLines('seller')).toHaveLength(3); expect(consLines()).toHaveLength(3); expect(consLines()[1]).toContain('30일')
    expect(prosLines('landlord')[0]).toBe('세입자·이웃이 매각 사실을 알아보기 어려워요')
    for (const l of [...prosLines('seller'), ...consLines()]) expect(l).not.toMatch(/\d+%|\d+배/) // 효능 숫자 없음
    for (const f of ['config/quiet.ts', 'src/lib/quietRules.js', 'src/components/QuietReactionCard.jsx', 'src/components/PublishModeChoice.jsx']) expect(findCopyViolations(readFileSync(f, 'utf8'), f)).toEqual([])
    expect(industryIcon('카페·베이커리')).toBe('☕')
  })
})

// ── UI ───────────────────────────────────────────────────────
async function base(page, { deviceId = 'visitor-dev', login = true, uid = 'test-user', profile = { category: 'startup' } } = {}) {
  await mockGemini(page); await mockMarketData(page)
  if (login) await seedSession(page, { id: uid })
  await page.addInitScript(([d, p]) => { localStorage.setItem('modu_device_id', d); localStorage.setItem('modu_user_profile', JSON.stringify(p)) }, [deviceId, profile])
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  const st = { inserted: [], patched: [], ledger: [], reveals: [], notifs: [], convs: [] }
  await page.route(`${REST}/inquiry_ledger*`, r => { if (r.request().method() === 'POST') { st.ledger.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'l1' }) }) } return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) })
  await page.route(`${REST}/listing_reveals*`, r => { if (r.request().method() === 'POST') { st.reveals.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) } return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) })
  await page.route(`${REST}/notifications*`, r => { if (r.request().method() === 'POST') { st.notifs.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'n1' }) }) } return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) })
  await page.route(`${REST}/conversations*`, r => { const m = r.request().method(); if (m === 'POST') { st.convs.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'conv-q' }) }) } return r.fulfill({ status: 200, contentType: 'application/json', body: r.request().headers()['accept']?.includes('object') ? JSON.stringify({ id: 'conv-q', listing_id: 'q-1', sender_id: deviceId, receiver_id: OWNER, sender_name: '나', receiver_name: '양도인' }) : '[]' }) })
  return st
}

test('①·③ 방문자: 목록 카드 아이콘(사진 없음) + 상세 라벨 1줄 + 상호·사진 없음 → 문의 시 첨부 1줄·ledger stage=quiet', async ({ page }) => {
  const st = await base(page)
  await page.route(`${REST}/listings_visible*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().headers()['accept']?.includes('object') ? MASKED : [MASKED]) }))
  await page.goto('/explore')
  await expect(page.getByTestId('quiet-thumb')).toBeVisible()
  await expect(page.locator('img[src="a.jpg"]')).toHaveCount(0)
  await page.goto('/e2/q-1')
  await expect(page.getByTestId('quiet-label')).toHaveText('양도인이 아직 조용히 알아보는 중 · 상호·사진·정확한 위치는 문의 후 양도인이 공개해요')
  await expect(page.locator('body')).not.toContainText('비밀 카페')
  await expect(page.locator('body')).not.toContainText('332-4')
  await page.getByRole('button', { name: 'DM으로 문의하기' }).click()
  await expect(page.getByTestId('quiet-inquiry-attach')).toHaveText('이 매물은 조건만 공개된 상태예요')
  await page.getByRole('button', { name: 'DM 대화 시작하기' }).click()
  await expect(page).toHaveURL(/\/d4\/chat\/conv-q/)
  await expect.poll(() => st.ledger.length).toBe(1)
  expect(st.ledger[0]).toMatchObject({ stage: 'quiet', channel: 'app', status: 'sent' })
})

test('⑧·⑥ 양도인(소유자): 반응 카드 → [공개로 바꾸기] → PATCH visibility=public + 찜 info 알림 1건 / 비교 표본 2건이면 비교 줄 없음', async ({ page }) => {
  const st = await base(page, { deviceId: OWNER, uid: 'owner-user', profile: { category: 'seller', region: '서울' } })
  await page.route(`${REST}/listings_visible*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FULL) }))
  await page.route(`${REST}/listings*`, r => {
    const u = r.request().url(); const m = r.request().method()
    if (m === 'PATCH') { st.patched.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 204, body: '' }) }
    if (u.includes('listings_visible')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FULL) })
    // 같은 동·업종 공개 매물 2건(표본 미달)
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'p1', published_at: new Date().toISOString() }, { id: 'p2', published_at: new Date().toISOString() }]) })
  })
  await page.route(`${REST}/watchlist*`, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/3', 'access-control-expose-headers': 'content-range' },
    body: JSON.stringify([{ id: 'w1', device_id: 'fan-1', user_id: null, muted_at: null, created_at: new Date().toISOString(), target_id: 'p1' }, { id: 'w2', device_id: 'fan-2', user_id: null, muted_at: null, created_at: new Date().toISOString(), target_id: 'p1' }, { id: 'w3', device_id: 'fan-3', user_id: null, muted_at: null, created_at: new Date().toISOString(), target_id: 'p2' }]) }))
  await page.goto('/e2/q-1')
  const card = page.getByTestId('quiet-reaction-card')
  await expect(card.getByTestId('quiet-reaction-line')).toHaveText('조용히 본 지 5일 · 조회 12 · 찜 3 · 문의 0')
  await expect(card.getByTestId('quiet-reaction-compare')).toHaveCount(0) // ⑥ 표본 2건
  await expect(card).not.toContainText(/비싸|싸요|좋은 자리|추천/)
  await card.getByTestId('quiet-to-public').click()
  await page.getByTestId('quiet-to-public-confirm').click()
  await expect(page.getByText('공개로 바꿨어요')).toBeVisible()
  expect(st.patched.some(p => p.visibility === 'public' && p.published_at)).toBe(true)
  await expect.poll(() => st.notifs.filter(n => n.type === 'watch_info').length).toBe(3)
  expect(st.notifs.find(n => n.type === 'watch_info').title).toBe('찜한 매물의 상호·사진이 공개됐어요')
  await expect(page.getByTestId('quiet-reaction-card')).toHaveCount(0)
})

test('④ 양도인 문의함: [이 분께 공개] → listing_reveals 1행(문의자 기기) + 알림, 두 번째부터는 "공개함"', async ({ page }) => {
  const st = await base(page, { deviceId: OWNER, uid: 'owner-user', profile: { category: 'seller' } })
  await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'q-1', address: FULL.address, category_main: FULL.category_main, shop_name: FULL.shop_name, visibility: 'quiet' }]) }))
  await page.route(`${REST}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'c1', listing_id: 'q-1', listing_name: '서교동 카페 매물', sender_id: 'buyer-dev', receiver_id: OWNER, sender_name: '문의자', receiver_name: '양도인', last_message: '조건 문의드려요', last_message_at: new Date().toISOString(), created_at: new Date().toISOString() }]) }))
  await page.goto('/d4/inbox')
  await page.getByTestId('quiet-reveal').click()
  await expect(page.getByText('양도인이 상호·사진·위치를 공개했어요').first()).toBeVisible()
  await expect.poll(() => st.reveals.length).toBe(1)
  expect(st.reveals[0]).toMatchObject({ listing_id: 'q-1', revealed_to_device_id: 'buyer-dev', via: 'inquiry' })
  expect(st.notifs[0]).toMatchObject({ device_id: 'buyer-dev', type: 'quiet_revealed' })
  await expect(page.getByTestId('quiet-revealed-label')).toHaveText('공개함')
  await expect(page.getByTestId('quiet-reveal')).toHaveCount(0)
})

async function seedDraft(page, deviceId = 'pub-dev') {
  await page.addInitScript((d) => {
    localStorage.setItem('modu_device_id', d)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', name: '김양도' }))
    sessionStorage.setItem('modu_e1_draft', JSON.stringify({
      address: '서울 마포구 서교동 447-5', jibunAddress: '서울 마포구 서교동 447-5', shopName: '조용 카페', bizType: '카페', categoryMain: '카페·베이커리', area: '40',
      deposit: '3000', monthlyRent: '200', transferType: 'full', transferFee: '4500', isFranchise: false,
      aiDraft: { intro: '조용 카페는 서교동 447-5에 있어요. 조용한 골목이에요.' },
    }))
  }, deviceId)
}

test('⑩·①(등록) 등록 마지막 화면: 두 카드 + 좋은 점·대신 3줄 항상 노출(접힘 없음) → 조용히 선택 → 저장 payload visibility=quiet·masked 소개글', async ({ page }) => {
  await mockGemini(page); await mockMarketData(page); await seedDraft(page)
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  let inserted = null
  await page.route(`${REST}/listings*`, r => {
    const m = r.request().method()
    if (m === 'POST') { inserted = JSON.parse(r.request().postData() || '{}'); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    if (m === 'HEAD' || r.request().headers()['prefer']?.includes('count')) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' }, body: '[]' })
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.goto('/e1/4')
  const pm = page.getByTestId('publish-mode')
  await expect(pm.getByTestId('publish-public')).toHaveAttribute('aria-pressed', 'true')
  await expect(pm.getByTestId('publish-pros').locator('p')).toHaveCount(4) // 제목 1 + 3줄
  await expect(pm.getByTestId('publish-cons').locator('p')).toHaveCount(4)
  await expect(pm.locator('details, [aria-expanded]')).toHaveCount(0)
  await expect(pm.getByTestId('publish-cons')).toContainText("'충실한 매물' 배지가 붙지 않아요")
  await expect(pm.getByTestId('publish-quiet-max')).toHaveCount(0)
  await pm.getByTestId('publish-quiet').click()
  await expect(page.getByRole('button', { name: '조용히 올리기' })).toBeVisible()
  await agreeListingTerms(page)
  await page.getByRole('button', { name: '조용히 올리기' }).click()
  await passPublishGate(page)
  await expect.poll(() => inserted).not.toBeNull()
  expect(inserted.visibility).toBe('quiet'); expect(inserted.quiet_started_at).toBeTruthy(); expect(inserted.quiet_deadline_at).toBeTruthy()
  expect(JSON.stringify(inserted.ai_draft_masked)).not.toContain('조용 카페'); expect(JSON.stringify(inserted.ai_draft_masked)).not.toContain('447-5')
  expect(JSON.stringify(inserted.ai_draft)).toContain('조용 카페') // full 은 그대로
  expect(inserted.status).toBe('published')
})

test('⑤ 동시 quiet 2건인 사용자 → 조용히 카드 비활성 + 안내 1줄', async ({ page }) => {
  await mockGemini(page); await mockMarketData(page); await seedDraft(page)
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'a' }, { id: 'b' }]) }))
  await page.goto('/e1/4')
  await expect(page.getByTestId('publish-quiet')).toBeDisabled()
  await expect(page.getByTestId('publish-quiet-max')).toHaveText('조용히 보는 매물은 2개까지예요')
  await expect(page.getByTestId('publish-pros')).toBeVisible() // 비활성이어도 두 열은 그대로
})
