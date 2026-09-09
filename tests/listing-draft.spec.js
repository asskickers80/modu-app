/**
 * 등록 초안 서버 저장 (ORDER-key-proxy-account-deletion 작업 D)
 *
 * ★ D-2가 핵심 리스크: 초안이 어디로도 새면 안 된다.
 *   앱 필터 + RLS 두 겹이며, 이 스펙은 앱 필터 쪽을 고정한다
 *   (RLS는 docs/SQL-listing-draft.sql — 별도 저장소 웹까지 막는 진짜 차단막).
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { draftPayload } from '../src/screens/e1/draftPayload.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const DEV = 'draft-dev'

const DRAFT_ROW = {
  id: 'draft-1', device_id: DEV, status: 'draft', listing_type: 'seller',
  address: '서울 마포구 서교동 1-1', shop_name: '초안 카페',
  updated_at: '2026-09-05T09:00:00Z', created_at: '2026-09-05T09:00:00Z',
  image_urls: [], interior_image_urls: [],
  ai_draft: {}, review_choices: {}, edited_texts: {}, item_visibility: {},
}
const PUBLISHED_ROW = {
  ...DRAFT_ROW, id: 'pub-1', status: 'published', shop_name: '공개 카페',
  published_at: '2026-09-01T00:00:00Z',
  deposit: '1000', monthly_rent: '100', transfer_fee: '2000', transfer_type: 'full', area: '33',
  category_main: '카페·베이커리', category_sub: '카페·커피전문점',
}

test('초안 payload는 게시 payload의 부분집합이다 (같은 행을 그대로 게시)', () => {
  const p = draftPayload({ address: '서울 마포구 서교동 1-1', shopName: '초안 카페', area: '33' })
  expect(p.listing_type).toBe('seller')
  expect(p.address).toBe('서울 마포구 서교동 1-1')
  expect(p.shop_name).toBe('초안 카페')
  // 초안 단계에서 없는 값은 null — 지어내지 않는다
  expect(p.transfer_fee).toBeNull()
  expect(p.monthly_sales).toBeNull()
  // status는 payload가 정하지 않는다(저장 계층이 draft로 고정)
  expect('status' in p).toBe(false)
})

async function setup(page, { rows = [], loggedIn = false } = {}) {
  await mockGemini(page)
  await mockMarketData(page)
  await page.route(`${SUPABASE}/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/listings*`, r => {
    if (r.request().method() !== 'GET') {
      return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'draft-1' }]) })
    }
    const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
    const url = r.request().url()
    // status=eq.draft 필터가 붙은 요청은 초안만 돌려준다 (fetchMyDraft)
    const wantDraft = url.includes('status=eq.draft')
    const out = wantDraft ? rows.filter(x => x.status === 'draft') : rows
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? (out[0] ?? null) : out) })
  })
  if (loggedIn) await seedSession(page, { id: 'user-draft-1' })
  await page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ name: '김초안', category: 'seller' }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_s', category: 'seller', name: '김초안', active: true }]))
  }, DEV)
}

test.describe('D-2 노출 차단 — 초안은 어디에도 나오지 않는다', () => {
  test('양도인 홈 매물 목록에 초안이 섞이지 않는다', async ({ page }) => {
    await setup(page, { rows: [DRAFT_ROW, PUBLISHED_ROW] })
    await page.goto('/a7/seller')
    await expect(page.getByTestId('my-listing-card')).toBeVisible()
    await expect(page.getByTestId('my-listing-card')).toContainText('공개 카페')
    await expect(page.getByTestId('my-listing-card')).not.toContainText('초안 카페')
  })

  test('내 매물 목록에도 초안이 없다', async ({ page }) => {
    await setup(page, { rows: [DRAFT_ROW, PUBLISHED_ROW] })
    await page.goto('/my/listings')
    await expect(page.getByText('공개 카페')).toBeVisible()
    await expect(page.getByText('초안 카페')).toHaveCount(0)
  })

  test('초안 상세 URL로 들어가면 등록 이어하기로 보낸다 (상세를 보여주지 않는다)', async ({ page }) => {
    await setup(page, { rows: [DRAFT_ROW] })
    await page.goto('/e2/draft-1')
    await expect(page).toHaveURL('/e1/1?edit=draft-1')
  })

  test('동향 비교군 조회가 draft를 제외한다 (쿼리 단언)', async ({ page }) => {
    await setup(page, { rows: [PUBLISHED_ROW] })
    const urls = []
    await page.route(`${SUPABASE}/listings*`, r => {
      if (r.request().method() === 'GET') urls.push(r.request().url())
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([PUBLISHED_ROW]) })
    })
    await page.goto('/a7/seller')
    await expect(page.getByTestId('my-listing-card')).toBeVisible()
    // 동향 조회는 카드 렌더 이후에 나간다 — 스냅샷을 즉시 읽으면 병렬 부하에서 경합한다.
    // 요청이 도착할 때까지 기다린 뒤 단언한다.
    await expect
      .poll(() => urls.map(decodeURIComponent).find(u => u.includes('status=not.in')),
        { message: '동향 비교군 조회가 일어나지 않음' })
      .toBeTruthy()
    const peerQuery = urls.map(decodeURIComponent).find(u => u.includes('status=not.in'))
    expect(peerQuery).toContain('example')
    expect(peerQuery).toContain('draft') // not.in=(example,draft) — 초안 제외
  })
})

test.describe('D-6 이어하기 진입점', () => {
  test('초안이 있으면 "등록하던 매물" 카드가 뜨고, 완성도 퍼센트는 없다', async ({ page }) => {
    await setup(page, { rows: [DRAFT_ROW, PUBLISHED_ROW], loggedIn: true })
    await page.goto('/a7/seller')
    const card = page.getByTestId('draft-resume-card')
    await expect(card).toBeVisible()
    await expect(card).toContainText('등록하던 매물')
    await expect(card).toContainText('초안 카페')
    await expect(card).toContainText('이어서 마저 하실 수 있어요')
    await expect(card).not.toContainText('%') // 완성도는 게시 매물의 개념
  })

  test('초안 카드를 누르면 등록 이어하기로 간다', async ({ page }) => {
    await setup(page, { rows: [DRAFT_ROW], loggedIn: true })
    await page.goto('/a7/seller')
    await page.getByTestId('draft-resume-card').click()
    await expect(page).toHaveURL('/e1/1?edit=draft-1')
  })

  test('초안이 없으면 카드 자체가 없다 (빈 카드 금지)', async ({ page }) => {
    await setup(page, { rows: [PUBLISHED_ROW], loggedIn: true })
    await page.goto('/a7/seller')
    await expect(page.getByTestId('my-listing-card')).toBeVisible()
    await expect(page.getByTestId('draft-resume-card')).toHaveCount(0)
  })
})

test('비로그인은 서버 초안을 만들지 않는다 (anon 노출 차단 — 승인된 판정)', async ({ page }) => {
  await setup(page, { rows: [] }) // loggedIn: false
  const writes = []
  await page.route(`${SUPABASE}/listings*`, r => {
    if (r.request().method() !== 'GET') writes.push(r.request().method())
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.goto('/e1/1')
  await page.waitForTimeout(500)
  expect(writes, '비로그인인데 서버에 초안을 썼다').toEqual([])
})
