/**
 * 상가 설명문 품질 강화 + 단계 통합 (ORDER-e1p-draft-quality-v1)
 * 그라운딩 요청·리치 프롬프트 / 더미 사망 / 권장업종 본문 통합 / 초안+검수 1화면(4단계) / 검수 저장 보존.
 */
import { test, expect } from './fixtures.js'
import { agreeListingTerms } from './helpers.js'
import fs from 'fs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`

const DRAFT = { description: '홍대 상권 초입의 1층 상가로, 배후 주거 수요가 탄탄합니다. 카페·디저트 업종이 적합해 보입니다.', rentMarket: '보증금 대비 월세가 합리적인 수준으로 보입니다.', saleMarket: null }

function mockGeminiCapture(page, captured) {
  return page.route('https://generativelanguage.googleapis.com/**', r => {
    captured.push(JSON.parse(r.request().postData() || '{}'))
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(DRAFT) }] } }] }) })
  })
}

test('소스: 옛 하드코딩 상권 더미·가짜 시세 폴백·권장업종 블록 사망', () => {
  const src = fs.readFileSync('src/screens/e1p/E1pStep2.jsx', 'utf8')
  expect(src.includes('홍대입구역')).toBe(false)        // 고정 상권 문구 사망
  expect(src.includes('유동인구 15만')).toBe(false)
  expect(src.includes('인근 동일 면적 기준 보증금')).toBe(false) // 가짜 범위 수치 폴백 사망
  expect(src.includes('biz_rec')).toBe(false)           // 권장업종 별도 블록 삭제(본문 통합)
})

test.describe('그라운딩·리치 프롬프트 + 초안·검수 1화면', () => {
  test('생성 요청: google_search 그라운딩 + 상권·유동인구·배후세대·추천업종 본문 지시', async ({ page }) => {
    const captured = []
    await mockGeminiCapture(page, captured)
    await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click()
    await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
    await expect(page.getByText('모두가 써본 소개예요')).toBeVisible({ timeout: 15000 })

    const req = captured.find(b => JSON.stringify(b).includes('상가'))
    expect(req.tools?.[0]?.google_search).toBeTruthy() // 검색 그라운딩 켜짐
    const prompt = req.contents[0].parts[0].text
    expect(prompt).toContain('상권')
    expect(prompt).toContain('유동인구')
    expect(prompt).toContain('배후')
    expect(prompt).toContain('추천 업종')          // 본문 통합 지시
    expect(prompt.includes('bizRecommendation')).toBe(false) // 별도 필드 폐지

    // 초안+검수 1화면: 블록 카드에 수정하기·공개 토글 존재(검수 기능 흡수)
    await expect(page.getByTestId('block-description')).toContainText('홍대 상권 초입')
    await expect(page.getByTestId('edit-btn-description')).toBeVisible()
    await expect(page.getByTestId('visibility-toggle-rent_market')).toBeVisible()
  })

  test('검수 보존: 수정+비공개 → 4단계 완주 저장 payload에 edited_texts·item_visibility·confirmedAt', async ({ page }) => {
    const captured = []
    await mockGeminiCapture(page, captured)
    let inserted = null
    await page.route(LISTINGS, async r => r.request().method() === 'POST'
      ? (inserted = JSON.parse(r.request().postData()), r.fulfill({ status: 201, contentType: 'application/json', body: '[{"id":"q"}]' }))
      : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click()
    await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
    await expect(page.getByText('모두가 써본 소개예요')).toBeVisible({ timeout: 15000 })

    // 설명문 수정
    await page.getByTestId('edit-btn-description').click()
    await page.getByTestId('edit-textarea-description').fill('소유주가 직접 고친 설명문입니다.')
    await page.getByTestId('save-btn-description').click()
    // 임대 해석 비공개
    await page.getByTestId('visibility-toggle-rent_market').click()

    await page.getByRole('button', { name: /다음 — 도면·서류 추가/ }).click()
    await page.getByRole('button', { name: '다음 — 완성도 확인' }).click()
    await agreeListingTerms(page)
    await page.getByRole('button', { name: '상가 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await page.getByRole('button', { name: '대시보드로 이동' }).click({ timeout: 5000 })
    await expect(page).toHaveURL(/\/a7\/landlord/)

    const row = Array.isArray(inserted) ? inserted[0] : inserted
    expect(row.edited_texts.description).toBe('소유주가 직접 고친 설명문입니다.')
    expect(row.item_visibility.rent_market).toBe(false)
    expect(typeof row.review_choices.confirmedAt).toBe('string') // E1 방식 확정 기록
  })
})

test('E2L: 수정본(edited_texts) 우선 표시 — 검수 결과 실반영', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('modu_device_id', 'dq-dev'))
  await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    id: 'dq-1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
    address: '서울 마포구 서교동 900', floor: '1층', area: '40', deposit: '3000', monthly_rent: '200',
    ai_draft: { description: '원래 초안 글' }, edited_texts: { description: '고친 최종 글' },
    review_choices: {}, image_urls: [], device_id: 'x',
  }) }))
  await page.goto('/e2l/dq-1')
  await expect(page.getByText('고친 최종 글')).toBeVisible()
  await expect(page.getByText('원래 초안 글')).toHaveCount(0)
})
