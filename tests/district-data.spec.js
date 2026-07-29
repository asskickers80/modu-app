/**
 * 소진공 상권(상가업소) 실데이터 연동 (ORDER — 상권분석 API 키)
 * 1. E1p 임대인 초안 프롬프트에 상권 실값(반경 상가 수·업종 구성) 주입
 * 2. E1 양도인 market_data 블록 — 실값 표시 + 가짜 상권 수치(유동인구·공실률·생존율) 사망
 * 3. 실데이터 없으면(전역 차단 기본) 상권 줄 자체가 없음 — 가짜 숫자 금지
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, mockDistrictData } from './helpers.js'
import fs from 'fs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`

// 반경 300m 표본: 카페 2(동종 ksic 56221) + 한식 1
const ITEMS = [
  { indsMclsNm: '비알코올 ', indsSclsNm: '카페', ksicCd: 'I56221' },
  { indsMclsNm: '비알코올 ', indsSclsNm: '카페', ksicCd: 'I56221' },
  { indsMclsNm: '한식', indsSclsNm: '백반/한정식', ksicCd: 'I56111' },
]

test('소스 회귀: 가짜 상권 수치(유동인구·공실률·생존율·경쟁도) 사망', () => {
  const blocks = fs.readFileSync('src/screens/e1/buildListingBlocks.js', 'utf8')
  expect(blocks.includes('footTraffic')).toBe(false)
  expect(blocks.includes('vacancyRate')).toBe(false)
  expect(blocks.includes('survivalRate')).toBe(false)
  expect(blocks.includes('competitionLevel')).toBe(false)
  const md = fs.readFileSync('src/lib/marketData.js', 'utf8')
  expect(md.includes('footTraffic')).toBe(false) // 더미 상권 수치 자체가 코드에 없음
})

test('E1p 임대인: 초안 프롬프트에 상권 실값 주입 (반경 상가 수·업종 구성)', async ({ page }) => {
  await mockDistrictData(page, { totalCount: 3, items: ITEMS })
  const captured = []
  await page.route('https://generativelanguage.googleapis.com/**', r => {
    captured.push(JSON.parse(r.request().postData() || '{}'))
    return r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ description: '상권 실데이터 기반 초안.', rentMarket: '해석.', saleMarket: null }) }] } }] }),
    })
  })
  await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await page.goto('/e1p/1')
  await page.getByRole('button', { name: '예시 ✦' }).click()
  await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
  await expect(page.getByText('모두가 써본 소개예요')).toBeVisible({ timeout: 15000 })

  const req = captured.find(b => JSON.stringify(b).includes('확인된 상권 실데이터'))
  expect(req).toBeTruthy()
  const prompt = req.contents[0].parts[0].text
  expect(prompt).toContain('반경 300m 상가: 3곳')
  expect(prompt).toContain('주요 업종 구성')
  expect(prompt).toContain('확정 사실로')
})

test('E1 양도인: 초안 프롬프트 상권 실값+그라운딩, 블록 수정 요청은 그라운딩 없음 (district-draft-v2)', async ({ page }) => {
  await mockMarketData(page)
  await mockDistrictData(page, { totalCount: 3, items: ITEMS })
  const captured = []
  await page.route('https://generativelanguage.googleapis.com/**', r => {
    const body = JSON.parse(r.request().postData() || '{}')
    captured.push(body)
    const prompt = body.contents?.[0]?.parts?.[0]?.text ?? ''
    const text = prompt.includes('카피라이터')
      ? JSON.stringify({ description: '실값 기반 초안.', facility: '시설 추정.', salesAnalysis: null })
      : prompt.includes('수정 요청') ? '짧게 고친 글.' : '해석 문장.'
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) })
  })
  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
  await expect(page.getByTestId('block-description')).toBeVisible({ timeout: 15000 })

  // 초안 요청: 상권 실값 주입 + 확정 사실 지시 + 그라운딩
  const draftReq = captured.find(b => (b.contents?.[0]?.parts?.[0]?.text ?? '').includes('카피라이터'))
  expect(draftReq).toBeTruthy()
  const prompt = draftReq.contents[0].parts[0].text
  expect(prompt).toContain('확인된 상권 실데이터')
  expect(prompt).toContain('반경 300m 상가: 3곳')
  expect(prompt).toContain('확정 사실로')
  expect(prompt).toContain('날조 금지')
  expect(draftReq.tools?.[0]?.google_search).toBeTruthy()

  // 블록 수정 요청: 그라운딩 제외
  await page.getByTestId('rewrite-btn-description').click()
  await page.getByTestId('rewrite-request-input-description').fill('더 짧게')
  await page.getByTestId('rewrite-request-send-description').click()
  await expect(page.getByTestId('rewrite-compare-description')).toBeVisible()
  const rewriteReq = captured.find(b => (b.contents?.[0]?.parts?.[0]?.text ?? '').includes('수정 요청'))
  expect(rewriteReq).toBeTruthy()
  expect(rewriteReq.tools).toBeUndefined()
})

test('E1 양도인: market_data 블록에 소진공 실값 표시 + 표본 라벨', async ({ page }) => {
  await mockGemini(page)
  await mockMarketData(page)
  // totalCount 1200 > 표본 3 → 표본 기준 라벨
  await mockDistrictData(page, { totalCount: 1200, items: ITEMS })

  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
  await expect(page.getByTestId('block-market_data')).toBeVisible({ timeout: 15000 })

  const block = page.getByTestId('block-market_data')
  await expect(block).toContainText('반경 300m 상가: 1,200곳')
  await expect(block).toContainText('표본 3곳 기준')
  await expect(block).toContainText('주요 업종')
  await expect(block).toContainText('소상공인시장진흥공단')
  // 가짜 수치 미표시
  await expect(block).not.toContainText('유동인구')
  await expect(block).not.toContainText('공실률')
})

test('E1 양도인: 상권 실데이터 없으면(기본 차단) 상권 줄 없음 — 가짜 숫자 금지', async ({ page }) => {
  await mockGemini(page)
  await mockMarketData(page)
  // mockDistrictData 미호출 → fixtures 전역 차단(지오코딩 null) → dataSource 'none'

  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
  await expect(page.getByTestId('block-market_data')).toBeVisible({ timeout: 15000 })

  const block = page.getByTestId('block-market_data')
  await expect(block).not.toContainText('반경 300m')
  await expect(block).not.toContainText('유동인구')
  await expect(block).not.toContainText('동종 업체')
})
