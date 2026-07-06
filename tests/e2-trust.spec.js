/**
 * E2 상세 신뢰 신호
 *
 * 1. 완성도 80%+ 매물 → 상세 상단에 "충실한 매물" 뱃지
 * 2. 검수된 설명 블록 → "AI 작성 · 양도자 검수 완료" 캡션
 * 3. 실거래 API 실패 → "주변 실거래 참고" 카드 자체가 없음 (더미 표시 금지)
 */
import { test, expect } from './fixtures.js'
import { mockMarketData } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

// 80점: 주소20+상호10+면적5+보증·월세15+권리금10+방식5+검수3개15
const TRUSTED_ROW = {
  id: 'dddddddd-eeee-ffff-0000-111111111111',
  shop_name: '상세 신뢰 카페',
  address: '서울 마포구 서교동 7-7 1층',
  floor: '1',
  area: '33',
  deposit: '3000',
  monthly_rent: '200',
  transfer_fee: '2500',
  transfer_type: 'full',
  ai_draft: { description: '검수를 거친 설명문입니다.', facility: null, salesAnalysis: null },
  review_choices: { description: 'keep', location: 'keep', facility: 'keep' },
  edited_texts: {},
  image_urls: [],
  facilities: [],
  status: 'published',
  device_id: 'someone-device',
  created_at: new Date().toISOString(),
}

function mockListing(page, row) {
  return page.route(SUPABASE_LISTINGS, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(row),
    })
  })
}

test.describe('E2 상세 신뢰 신호', () => {
  test('완성도 80%+ 매물: 상단 뱃지 + 실거래 카드(성공 시)', async ({ page }) => {
    await mockListing(page, TRUSTED_ROW)
    await mockMarketData(page) // 고정 성공 XML — 월 2건 × 3개월 = 6건

    await page.goto(`/e2/${TRUSTED_ROW.id}`)

    await expect(page.getByText('상세 신뢰 카페')).toBeVisible()
    await expect(page.getByText('충실한 매물')).toBeVisible()
    await expect(page.getByText('AI 검수 완료')).toBeVisible()

    // 실거래 카드 — 접혀 있다가 펼치면 요약 표시
    await expect(page.getByText('주변 실거래 참고')).toBeVisible()
    await page.getByText('주변 실거래 참고').click()
    await expect(page.getByText('6건')).toBeVisible()
  })

  test('검수된 설명 블록: "AI 작성 · 양도자 검수 완료" 캡션', async ({ page }) => {
    await mockListing(page, TRUSTED_ROW)
    await mockMarketData(page)

    await page.goto(`/e2/${TRUSTED_ROW.id}`)

    await expect(page.getByText('검수를 거친 설명문입니다.')).toBeVisible()
    await expect(page.getByText('AI 작성 · 양도자 검수 완료')).toBeVisible()
  })

  test('실거래 API 실패: 시세 카드 자체가 없음 (더미 금지)', async ({ page }) => {
    await mockListing(page, TRUSTED_ROW)
    await page.route('**/RTMSDataSvcNrgTrade/**', async route => {
      await route.fulfill({ status: 500, body: 'error' })
    })

    await page.goto(`/e2/${TRUSTED_ROW.id}`)

    await expect(page.getByText('상세 신뢰 카페')).toBeVisible()
    // 카드 부재 — 더미 수치도 노출되면 안 됨
    await expect(page.getByText('주변 실거래 참고')).not.toBeVisible()
  })
})
