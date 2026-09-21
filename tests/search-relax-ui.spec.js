/**
 * 탐색 0건·소수건 '조건 풀기' 카드 (ORDER 2026-09-21 파트 B5)
 * ① 필터로 0건 → 카드 1장, 칩 ≤3, 각 칩에 숫자 ② 칩 탭 → 재검색·상단 1줄·필터 패널 값 변경·[되돌리기]
 * ③ 단일 전부 0건 → 조합 칩 ④ 완화 후보 0개 → 칩 없이 알림 버튼만 ⑤ 결과 2건 → 목록 아래 카드 / 5건 → 카드 없음
 * ⑥ 로그아웃 상태 알림 → 로그인 유도 + 조건 보관 ⑧ 6번째 저장 → 상한 안내
 * ⑨ 문안 lint ⑩ 정렬 함수 불변
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import { RELAX, RELAX_COPY } from '../config/searchRelax.ts'
import { findCopyViolations } from '../scripts/lint-copy.mjs'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const L = (id, over = {}) => ({
  id, device_id: 'seller-dev', status: 'published', listing_type: 'seller', shop_name: `매물${id}`, shop_name_public: true,
  address: '서울 마포구 서교동 1', transfer_fee: '3500', deposit: '3000', monthly_rent: '200', transfer_type: 'full',
  area: '33', floor: '1', biz_type: null, category_main: '요식업', category_sub: '카페·디저트',
  image_urls: [], interior_image_urls: [], ai_draft: {}, review_choices: {}, edited_texts: {}, item_visibility: {},
  visibility: 'public', created_at: new Date().toISOString(), ...over,
})

async function explore(page, rows, { login = true } = {}) {
  await mockGemini(page); await mockMarketData(page)
  if (login) await seedSession(page, { id: 'buyer-user' })
  await page.addInitScript(() => { localStorage.setItem('modu_device_id', 'buyer-dev'); localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup' })) })
  const st = { saved: [], posted: [] }
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/listings_visible*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) }))
  await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) }))
  await page.route(`${REST}/saved_searches*`, r => {
    if (r.request().method() === 'POST') { const b = JSON.parse(r.request().postData()); st.posted.push(b); st.saved.push({ id: `s${st.saved.length + 1}`, ...b }); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(st.saved) })
  })
  await page.goto('/explore')
  await page.waitForTimeout(400)
  return st
}

test('① 필터로 0건 → 카드 1장, 칩은 3개 이하이고 각 칩에 실제 건수가 붙는다', async ({ page }) => {
  await explore(page, [L('a', { address: '서울 강남구 역삼동 1' }), L('b', { address: '서울 강남구 역삼동 2' }), L('c', { transfer_type: 'empty' })])
  await page.getByPlaceholder(/검색/).fill('없는상호')
  await page.waitForTimeout(300)
  const card = page.getByTestId('relax-card')
  await expect(card).toHaveCount(1)
  await expect(card.getByTestId('relax-count')).toHaveText(RELAX_COPY.countLine.replace('{n}', '0'))
  const chips = card.getByTestId('relax-chip')
  const n = await chips.count()
  expect(n).toBeGreaterThan(0)
  expect(n).toBeLessThanOrEqual(RELAX.MAX_OPTIONS)
  for (let i = 0; i < n; i++) await expect(chips.nth(i)).toContainText(/\d+건/)
})

test('② 칩 탭 → 결과 재검색 + 상단 1줄 + 필터 패널 값 변경 + [되돌리기]로 복귀', async ({ page }) => {
  await explore(page, [L('a', { address: '서울 강남구 역삼동 1' }), L('b', { address: '서울 강남구 역삼동 2' })])
  await page.getByText('필터 ▾').click()
  await page.getByRole('button', { name: '마포', exact: true }).click()
  await page.waitForTimeout(300)
  await expect(page.getByTestId('relax-card')).toBeVisible()
  await page.getByTestId('relax-chip').first().click()
  await page.waitForTimeout(300)
  // 결과가 나오고, 왜 이 화면인지 1줄이 뜬다
  await expect(page.getByTestId('relax-applied')).toContainText('넓혔어요')
  await expect(page.getByTestId('relax-applied')).toContainText('마포')
  // 필터 패널 값도 실제로 바뀐다(화면만 바꾸는 구현 금지)
  await expect(page.getByRole('button', { name: '전체 지역', exact: true })).toHaveCSS('color', 'rgb(255, 255, 255)')
  await page.getByTestId('relax-undo').click()
  await page.waitForTimeout(300)
  await expect(page.getByTestId('relax-applied')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '마포', exact: true })).toHaveCSS('color', 'rgb(255, 255, 255)')
})

test('④ 완화 후보가 없으면(필터를 안 걸었는데 0건) 칩 없이 알림 버튼만', async ({ page }) => {
  await explore(page, [])
  const card = page.getByTestId('relax-card')
  await expect(card).toBeVisible()
  await expect(card.getByTestId('relax-chip')).toHaveCount(0)
  await expect(card.getByTestId('relax-save-open')).toBeVisible()
})

test('⑤ 결과 2건 → 목록 아래 카드 / 5건 → 카드 없음', async ({ page }) => {
  await explore(page, [L('a'), L('b')])
  await expect(page.getByTestId('relax-card')).toHaveCount(1)
  await expect(page.getByTestId('relax-count')).toHaveText(RELAX_COPY.countLine.replace('{n}', '2'))
  await explore(page, ['a', 'b', 'c', 'd', 'e'].map(id => L(id)))
  await expect(page.getByTestId('relax-card')).toHaveCount(0)
})

test('⑥⑧ 알림 버튼: 로그아웃이면 로그인으로(조건 보관) / 상한을 넘기면 안내', async ({ page }) => {
  await explore(page, [], { login: false })
  await page.getByTestId('relax-save-open').click()
  await expect(page.getByTestId('saved-search-summary')).toBeVisible()
  await page.getByTestId('saved-search-confirm').click()
  await expect(page).toHaveURL(/\/a4/)
  const pending = await page.evaluate(() => localStorage.getItem('modu_pending_saved_search'))
  expect(pending).toBeTruthy()

  // 상한: 이미 5개 저장된 상태
  const st = await explore(page, [])
  st.saved.push(...Array.from({ length: RELAX.MAX_SAVED_SEARCHES }, (_, i) => ({ id: `p${i}`, filters: {}, created_at: new Date().toISOString() })))
  await page.getByTestId('relax-save-open').click()
  await page.getByTestId('saved-search-confirm').click()
  await expect(page.getByText(RELAX_COPY.savedMax.replace('{n}', String(RELAX.MAX_SAVED_SEARCHES)))).toBeVisible()
  expect(st.posted).toHaveLength(0)
})

test('⑨⑩ lint: 완화 문안에 "AI"·"추천"·정도 부사·판정 문구 금지 / 정렬·노출 코드 무변경', () => {
  for (const f of ['config/searchRelax.ts', 'src/lib/searchRelax.js', 'src/lib/searchFilters.js', 'src/lib/savedSearch.js', 'src/components/SearchRelaxCard.jsx']) {
    const src = readFileSync(f, 'utf8')
    expect(findCopyViolations(src, f), f).toEqual([])
    expect(findPricingSortViolations(src, f), f).toEqual([])
  }
  // 라벨 틀에 정도 부사·판정 문구가 없다
  const cfg = readFileSync('config/searchRelax.ts', 'utf8')
  for (const bad of ['조금', '약간', '넓게', '까다로', '아쉽', '인기', '추천']) expect(cfg, bad).not.toContain(`'${bad}`)
  // 결과 정렬은 기존 코드 그대로 — 카드가 정렬을 건드리지 않는다
  const explore = readFileSync('src/screens/ExplorePage.jsx', 'utf8')
  expect(explore).toContain("if (sort === '완성도순')")
  expect(readFileSync('src/components/SearchRelaxCard.jsx', 'utf8')).not.toContain('sort')
})

test('⑨ lint 규칙 자체: 금지어·기업회원 참조를 실제로 잡는다', async () => {
  const { findCopyViolations } = await import('../scripts/lint-copy.mjs')
  const { findVendorDemandViolations } = await import('../scripts/lint-seller-first.mjs')
  for (const bad of ['조금 넓혀보세요', '조건이 까다로워요', '인기 지역이에요', '아쉽네요']) {
    expect(findCopyViolations(`const t = "${bad}"`, 'src/components/SearchRelaxCard.jsx').length, bad).toBeGreaterThan(0)
  }
  for (const bad of ['AI가 찾아줘요', '추천 조건이에요']) {
    expect(findCopyViolations(`const t = "${bad}"`, 'src/components/SearchRelaxCard.jsx').length, bad).toBeGreaterThan(0)
  }
  // 기업회원 축 모듈이 저장 조건·수요 집계를 읽으면 실패
  expect(findVendorDemandViolations("supabase.from('saved_searches')", 'src/screens/A7BusinessDashboard.jsx').length).toBe(1)
  expect(findVendorDemandViolations("supabase.from('saved_searches')", 'src/screens/VendorOpsPage.jsx')).toEqual([])   // 운영 화면은 예외
  expect(findVendorDemandViolations("supabase.from('saved_searches')", 'src/screens/ExplorePage.jsx')).toEqual([])
})
