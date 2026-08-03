/**
 * 소개글 품질 종합 (ORDER-draft-quality-v1)
 * ① E2L 표기 버그 수정(rent/sale_market 렌더 + visibility 존중) ② 프랜차이즈 블록 조건부
 * ③ 분량 지시+날조 방지 병기 ④ 시설 연차 ⑤ 심화 블록 잠금 카드·플래그 전환
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { buildListingBlocks } from '../src/screens/e1/buildListingBlocks.js'
import { listingToContext } from '../src/lib/completeness.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const DEV = 'dq-dev'

// ── ① E2L 표기 버그 수정 ─────────────────────────────────────
const E2L_ROW = {
  id: 'dq-e2l-1', listing_type: 'landlord', deal_type: 'both', status: 'published',
  address: '인천 영종구 햇내로14번길 9 101호', deposit: '3000', monthly_rent: '200', sale_price: '169000',
  ai_draft: { description: '상가 설명문.', rentMarket: '임대 조건 해석문.', saleMarket: '수익률 해석문.' },
  edited_texts: {}, item_visibility: {}, review_choices: { confirmedAt: '2026-08-01' },
  image_urls: [], device_id: 'other-owner', show_map: false, created_at: '2026-08-01T00:00:00Z',
}

test.describe('E2L 표기 수정 — 검수 블록이 광고에 실반영', () => {
  test('rent_market·sale_market 렌더 + 수정본(edited) 우선', async ({ page }) => {
    const row = { ...E2L_ROW, edited_texts: { sale_market: '소유주가 고친 수익률 해석.' } }
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) }))
    await page.goto(`/e2l/${row.id}`)
    await expect(page.getByTestId('e2l-rent-market')).toContainText('임대 조건 해석문.')
    await expect(page.getByTestId('e2l-sale-market')).toContainText('소유주가 고친 수익률 해석.') // edited 우선
    await expect(page.getByText('수익률 해석문.')).toHaveCount(0)
  })

  test('비공개(item_visibility=false) 블록은 광고에서 숨김', async ({ page }) => {
    const row = { ...E2L_ROW, item_visibility: { rent_market: false } }
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) }))
    await page.goto(`/e2l/${row.id}`)
    await expect(page.getByTestId('e2l-sale-market')).toBeVisible()
    await expect(page.getByTestId('e2l-rent-market')).toHaveCount(0)
  })
})

// ── ②③④ E1 프롬프트 — 프랜차이즈·분량·시설 연차 ────────────
function seedDraft(page, extra = {}) {
  return page.addInitScript(d => {
    localStorage.setItem('modu_device_id', 'dq-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', bizType: '카페' }))
    sessionStorage.setItem('modu_e1_draft', JSON.stringify({
      address: '서울 마포구 서교동 447-5', shopName: '검증 카페', bizType: '카페',
      area: '40', deposit: '3000', monthlyRent: '200', transferType: 'full', transferFee: '4500',
      isFranchise: false, // 프랜차이즈 선택은 1단계 필수 응답 — 기본 '독립 점포'
      ...d,
    }))
  }, extra)
}
function captureGemini(page) {
  const captured = []
  page.route('https://generativelanguage.googleapis.com/**', r => {
    captured.push(JSON.parse(r.request().postData() || '{}'))
    return r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ description: '초안.', facility: '시설 평가.', salesAnalysis: null, highlights: null, competitiveness: '강점.' }) }] } }] }),
    })
  })
  return captured
}
const draftPrompt = captured => {
  const req = captured.find(b => (b.contents?.[0]?.parts?.[0]?.text ?? '').includes('카피라이터'))
  return req?.contents[0].parts[0].text ?? ''
}

test.describe('E1 프롬프트 — 프랜차이즈·분량·연차', () => {
  test.beforeEach(async ({ page }) => { await mockMarketData(page) })

  test('프랜차이즈 매물: 공정위 확인 정보 주입 + franchise 필드 + 분량·날조 방지 병기', async ({ page }) => {
    await seedDraft(page, { isFranchise: true, franchiseBrandId: 77, franchiseBrandName: '왓더버거', facilities: ['튀김기', 'POS 기기'], facilityAge: '2년' })
    await page.route(`${SUPABASE}/franchise_brands*`, r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ brand_name: '왓더버거', franchisor: '(주)왓더버거컴퍼니', reg_no: '20200123', biz_type: '외식 > 패스트푸드' }),
    }))
    const captured = captureGemini(page)
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await expect(page.getByTestId('block-description')).toBeVisible({ timeout: 15000 })

    const prompt = draftPrompt(captured)
    expect(prompt).toContain('[확인된 프랜차이즈 정보')
    expect(prompt).toContain('왓더버거')
    expect(prompt).toContain('(주)왓더버거컴퍼니')
    expect(prompt).toContain('"franchise"')
    // 분량 강제 + 날조 방지 병기
    expect(prompt).toContain('최소 3~4문장')
    expect(prompt).toContain('사실이 부족하면 짧아도 됩니다')
    expect(prompt).toContain('만들어내지 마세요')
    // 시설·연차 주입
    expect(prompt).toContain('보유 시설·집기: 튀김기, POS 기기')
    expect(prompt).toContain('시설 연차: 2년')
    // 심화 블록 필드는 항상 생성 지시
    expect(prompt).toContain('highlights')
    expect(prompt).toContain('competitiveness')
  })

  test('독립 점포: 프랜차이즈 섹션·필드 없음 + 블록 미표시', async ({ page }) => {
    await seedDraft(page)
    const captured = captureGemini(page)
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await expect(page.getByTestId('block-description')).toBeVisible({ timeout: 15000 })

    const prompt = draftPrompt(captured)
    expect(prompt.includes('[확인된 프랜차이즈 정보')).toBe(false)
    expect(prompt.includes('"franchise"')).toBe(false)
    await expect(page.getByTestId('block-franchise')).toHaveCount(0)
  })
})

// ── ⑤ 심화 블록 — 잠금 카드 + 플래그 전환 ────────────────────
test.describe('특이사항·경쟁력 — 유료 전용 구조', () => {
  test('검수 화면(E1·E1p) 최후미 잠금 카드 — 가격·혜택 약속 없음', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await expect(page.getByTestId('block-description')).toBeVisible({ timeout: 15000 })
    const locked = page.getByTestId('deep-blocks-locked')
    await expect(locked).toContainText('특이사항 · 경쟁력 분석')
    await expect(locked).toContainText('멤버십에서 제공될 예정이에요 (준비 중)')
    await expect(locked).not.toContainText('원') // 가격 약속 금지
    // 잠금 상태에서는 실제 블록 미표시
    await expect(page.getByTestId('block-highlights')).toHaveCount(0)
    await expect(page.getByTestId('block-competitiveness')).toHaveCount(0)
  })

  test('플래그 전환 유닛: deepBlocks=true면 잠금 없이 실제 블록 생성', () => {
    const aiDraft = { description: 'd', facility: 'f', highlights: '24시간 영업권 보유.', competitiveness: '동종 대비 임대료 저렴.' }
    const data = { address: '서울', isFranchise: false }
    const off = buildListingBlocks(aiDraft, null, null, data, { deepBlocks: false })
    expect(off.some(b => b.id === 'highlights' || b.id === 'competitiveness')).toBe(false)
    const on = buildListingBlocks(aiDraft, null, null, data, { deepBlocks: true })
    expect(on.find(b => b.id === 'highlights').body).toBe('24시간 영업권 보유.')
    expect(on.find(b => b.id === 'competitiveness').body).toBe('동종 대비 임대료 저렴.')
    expect(on[on.length - 1].id).toBe('competitiveness') // 최후미 배치
  })

  test('프랜차이즈 블록 유닛: franchise 초안 + isFranchise일 때만, 시설 뒤 배치', () => {
    const aiDraft = { description: 'd', facility: 'f', franchise: '공정위 등록 브랜드입니다.' }
    const on = buildListingBlocks(aiDraft, null, null, { isFranchise: true })
    const ids = on.map(b => b.id)
    expect(ids.indexOf('franchise')).toBe(ids.indexOf('facility') + 1)
    expect(buildListingBlocks(aiDraft, null, null, { isFranchise: false }).some(b => b.id === 'franchise')).toBe(false)
  })
})

// ── ④ 시설 연차 — UI + 역매핑 왕복 ──────────────────────────
test.describe('시설 연차', () => {
  test('연차 칩: 연 선택 / 1년 미만은 개월 입력 전환', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await seedDraft(page)
    await page.goto('/e1/3')
    await page.getByTestId('facility-age-2년').click()
    await expect(page.getByTestId('facility-age-2년')).toHaveCSS('font-weight', '700')
    await page.getByTestId('facility-age-1년 미만').click()
    await page.getByTestId('facility-age-month-3개월').click()
    await expect(page.getByTestId('facility-age-month-3개월')).toHaveCSS('font-weight', '700')
  })

  test('역매핑 유닛: facility_age → facilityAge (수정 모드 왕복 대비)', () => {
    expect(listingToContext({ facility_age: '3개월' }).facilityAge).toBe('3개월')
    expect(listingToContext({}).facilityAge).toBe('') // 컬럼 생성 전 옛 행 안전
  })
})
