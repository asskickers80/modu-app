/**
 * 모두 화법 카피 회귀 (ORDER-ai-label-modu-voice + 필독·조언 정리)
 *
 * 1. 홈 정보 섹션 라벨이 모두 화법으로 렌더
 * 2. 사용자 노출 문자열에 "AI"·"필독"·"조언" 0건 (역할별 홈 전수)
 * 3. 시장 동향 우측 라벨은 소분류만
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const ME = 'voice-device'

const LISTING = {
  id: 'l1', device_id: ME, status: 'published',
  shop_name: '모두카페', shop_name_public: true,
  address: '서울 마포구 서교동 332-4', transfer_fee: '3000', transfer_type: 'full',
  biz_type: '피자·버거·샌드위치',
  category_main: '요식업', category_sub: '피자·버거·샌드위치',
  ai_draft: {}, review_choices: {}, edited_texts: {}, item_visibility: {},
  image_urls: [], interior_image_urls: [], facilities: [],
  created_at: '2026-07-19T00:00:00Z',
}

function seed(page) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
  }, ME)
}

test.describe('모두 화법 — 홈 정보 섹션', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await seed(page)
    await page.route(`${SUPABASE}/listings*`, r => {
      const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? LISTING : [LISTING]) })
    })
  })

  test('구분선 라벨: "모두가 찾아온 알짜 정보" (✨ AI 맞춤 정보 사멸)', async ({ page }) => {
    await page.goto('/a7/seller')

    await expect(page.getByText('모두가 찾아온 알짜 정보')).toBeVisible()
    await expect(page.getByText('AI 맞춤 정보')).toHaveCount(0)
    await expect(page.getByText('✨ AI 맞춤 정보')).toHaveCount(0)
  })

  test('필독 섹션명: "이것만은 꼭" + 버튼 "하나 더 보기"', async ({ page }) => {
    await page.goto('/a7/seller')

    await expect(page.getByText('📝 이것만은 꼭!')).toBeVisible()
    await expect(page.getByText('양도인 필독')).toHaveCount(0)
    await expect(page.getByText('다른 조언 보기')).toHaveCount(0)
  })

  test('시장 동향 우측 라벨은 소분류만 (업종 재고지 없음)', async ({ page }) => {
    await page.route(`${SUPABASE}/market_news*`, r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{ id: 'n1', title: '뉴스 제목', description: '설명', link: 'https://x', pub_date: '' }]),
    }))
    await page.goto('/a7/seller')

    await expect(page.getByText('📈 동종 시장 동향')).toBeVisible()
    await expect(page.getByText('피자·버거·샌드위치', { exact: true })).toBeVisible()
    // 대분류 재고지·"최신 뉴스" 꼬리표 사멸
    await expect(page.getByText('요식업 > 피자·버거·샌드위치 최신 뉴스')).toHaveCount(0)
  })

  test('오늘의 한 마디 — AI 텍스트 뱃지 사멸', async ({ page }) => {
    await page.goto('/a7/seller')

    await expect(page.getByText('오늘의 한 마디')).toBeVisible()
    await expect(page.getByText('AI', { exact: true })).toHaveCount(0)
  })
})

test.describe('사용자 노출 금지어 — 역할별 홈 전수', () => {
  const ROUTES = ['/a7/seller', '/a7/landlord', '/a7/operating', '/a7/business']

  for (const route of ROUTES) {
    test(`${route} 화면에 "AI"·"필독"·"조언" 없음`, async ({ page }) => {
      await mockGemini(page)
      await mockMarketData(page)
      await seed(page)
      await page.route(`${SUPABASE}/**`, r => r.fulfill({
        status: 200, contentType: 'application/json', body: '[]',
      }))

      await page.goto(route)
      await page.waitForTimeout(600)

      const text = await page.locator('body').innerText()
      expect(text, `${route}에 "AI" 잔존`).not.toContain('AI')
      expect(text, `${route}에 "필독" 잔존`).not.toContain('필독')
      expect(text, `${route}에 "조언" 잔존`).not.toContain('조언')
    })
  }
})
