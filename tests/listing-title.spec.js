/**
 * 매물 제목 — 소유주 직접 편집 (ORDER-listing-title-v1)
 * 초안 규칙(공개/비공개/프랜차이즈/임대) · 편집·왕복 보존 · 표시 단일 소스 · 자리 채움 부재
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, agreeListingTerms, passPublishGate } from './helpers.js'
import { buildSellerTitleDraft, buildLandlordTitleDraft, displayTitle } from '../src/lib/listingTitle.js'
import { listingToContext, listingToLandlordContext } from '../src/lib/completeness.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'

// ── 초안 규칙 유닛 ───────────────────────────────────────────
test.describe('제목 초안 규칙', () => {
  test('임대인: 구·동·층·면적 조합', () => {
    expect(buildLandlordTitleDraft({ address: '경기 수원시 팔달구 인계동 8', floor: '1', area: '54' }))
      .toBe('팔달구 인계동 1층 54㎡ 상가')
    expect(buildLandlordTitleDraft({ address: '경기 수원시 팔달구 인계로138번길 8', floor: 'B1', area: '' }))
      .toBe('팔달구 B1 상가') // 도로명뿐이면 구까지만 — 날조 없음
  })

  test('양도인: 상호 공개 ON → 상호 / OFF → 상호·브랜드 미포함', () => {
    const base = { address: '서울 마포구 서교동 447-5', floor: '1', categorySub: '카페·커피전문점' }
    expect(buildSellerTitleDraft({ ...base, shopName: '고양이 카페', shopNamePublic: true })).toBe('고양이 카페')
    const hidden = buildSellerTitleDraft({ ...base, shopName: '고양이 카페', shopNamePublic: false })
    expect(hidden).toBe('서교동 1층 카페·커피전문점 매물')
    expect(hidden.includes('고양이')).toBe(false)
  })

  test('displayTitle: 저장 title 우선, 비공개 프랜차이즈도 브랜드 미노출 (기존 구멍 봉인)', () => {
    expect(displayTitle({ title: '소유주가 정한 제목', shop_name: 'X' })).toBe('소유주가 정한 제목')
    // 비공개 + 프랜차이즈 — 옛 displayShopName은 브랜드를 노출했다
    const t = displayTitle({
      listing_type: 'seller', shop_name: '왓더버거 원주일산점', shop_name_public: false,
      is_franchise: true, franchise_brand_name: '왓더버거',
      address: '강원 원주시 무실동 1', floor: '1', category_sub: '피자·버거·샌드위치',
    })
    expect(t.includes('왓더버거')).toBe(false)
    expect(t).toContain('무실동')
    // 자리 채움 문구 없음
    expect(displayTitle({ listing_type: 'landlord', address: '인천 영종구 중산동 1' })).not.toContain('이름 미정')
  })

  test('역매핑: title 왕복 (양축)', () => {
    expect(listingToContext({ title: '내 제목' }).title).toBe('내 제목')
    expect(listingToLandlordContext({ title: '내 상가 제목' }).title).toBe('내 상가 제목')
    expect(listingToContext({}).title).toBe('')
  })
})

// ── 편집·저장 ────────────────────────────────────────────────
test('E1p: 제목 입력창에 초안 자동 채움 → 수정 → INSERT payload에 저장', async ({ page }) => {
  await mockGemini(page)
  let inserted = null
  await page.route(`${SUPABASE}/listings*`, async r => r.request().method() === 'POST'
    ? (inserted = JSON.parse(r.request().postData()), r.fulfill({ status: 201, contentType: 'application/json', body: '[{"id":"t1"}]' }))
    : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await page.goto('/e1p/1')
  await page.getByRole('button', { name: '예시 ✦' }).click()
  await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
  const next = page.getByRole('button', { name: /다음 — 도면·서류 추가/ })
  await expect(next).toBeEnabled({ timeout: 15000 })
  await next.click()
  await page.getByRole('button', { name: '다음 — 완성도 확인' }).click()

  const input = page.getByTestId('title-input')
  await expect(input).not.toHaveValue('') // 초안 자동 채움
  await input.fill('역세권 코너 1층 상가')
  await expect(page.getByText('제목에도 등록 확인사항이 적용돼요', { exact: false })).toBeVisible() // 4조 고지

  await agreeListingTerms(page)
  await page.getByRole('button', { name: '상가 공개하기' }).click()
  await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
  await page.getByRole('button', { name: '대시보드로 이동' }).click({ timeout: 5000 })
  await expect(page).toHaveURL(/\/a7\/landlord/)
  await expect.poll(() => inserted).not.toBeNull()
  const row = Array.isArray(inserted) ? inserted[0] : inserted
  expect(row.title).toBe('역세권 코너 1층 상가')
})

// ── 표시 단일 소스 ───────────────────────────────────────────
test('E2L 헤드라인: 저장된 title 표시 — "이름 미정 상가" 사망', async ({ page }) => {
  const ROW = {
    id: 'tt-1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
    title: '인계동 대로변 1층 상가', address: '경기 수원시 팔달구 인계동 8',
    deposit: '3000', monthly_rent: '250', show_map: false,
    ai_draft: {}, edited_texts: {}, item_visibility: {}, image_urls: [], device_id: 'x',
    created_at: '2026-08-04T00:00:00Z',
  }
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) }))
  await page.goto(`/e2l/${ROW.id}`)
  await expect(page.getByRole('heading', { name: '인계동 대로변 1층 상가' })).toBeVisible()
  await expect(page.getByText('이름 미정 상가')).toHaveCount(0)
})

test('E2L 헤드라인: title 없는 옛 상가는 초안 규칙 즉석 조합 (자리 채움 아님)', async ({ page }) => {
  const ROW = {
    id: 'tt-2', listing_type: 'landlord', deal_type: 'lease', status: 'published',
    title: null, address: '경기 수원시 팔달구 인계동 8', floor: '1', area: '54',
    deposit: '3000', monthly_rent: '250', show_map: false,
    ai_draft: {}, edited_texts: {}, item_visibility: {}, image_urls: [], device_id: 'x',
    created_at: '2026-08-04T00:00:00Z',
  }
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) }))
  await page.goto(`/e2l/${ROW.id}`)
  await expect(page.getByRole('heading', { name: '팔달구 인계동 1층 54㎡ 상가' })).toBeVisible()
})

// ── 소스 회귀 — 표시 지점이 displayTitle 단일 참조 ──────────
test('소스 회귀: 제목 표시 지점 전부 displayTitle 참조, 이름 미정 폴백 부재', async () => {
  const fs = await import('fs')
  const spots = ['src/screens/E2PropertyDetail.jsx', 'src/screens/E2LPropertyDetail.jsx',
    'src/screens/ExplorePage.jsx', 'src/screens/MyListingsPage.jsx',
    'src/components/ListingCardRow.jsx', 'src/screens/A7LandlordDashboard.jsx']
  for (const f of spots) {
    const src = fs.readFileSync(f, 'utf8')
    expect(src.includes('displayTitle'), `${f}: displayTitle 미참조`).toBe(true)
    expect(src.includes('이름 미정'), `${f}: 자리 채움 문구 잔존`).toBe(false)
  }
})
