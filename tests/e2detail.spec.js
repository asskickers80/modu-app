/**
 * E2PropertyDetail — 실데이터 연결 검증
 *
 * 1. mock 매물 id 진입 → shop_name·주소·권리금 실데이터 표시
 * 2. 없는 id 진입 → "매물을 찾을 수 없어요" 안내, 크래시 없음
 */
import { test, expect } from '@playwright/test'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

const MOCK_ROW = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  shop_name: '실연결 테스트 카페',
  address: '서울 마포구 서교동 332-4 1층',
  floor: 'B1',
  area: '33',
  deposit: '3000',
  monthly_rent: '200',
  maintenance: '10',
  transfer_fee: '2500',
  transfer_type: 'full',
  monthly_sales: '2800',
  ai_draft: { description: '서교동 카페 설명문입니다.', facility: '에스프레소 머신 구비.', salesAnalysis: null },
  review_choices: {},
  edited_texts: {},
  image_urls: [],
  sales_proof: false,
  facilities: ['에스프레소 머신'],
  status: 'published',
  device_id: 'someone-else',
  created_at: new Date().toISOString(),
}

test.describe('E2 매물 상세 실데이터', () => {
  test('존재하는 id: shop_name·주소·권리금 실데이터 표시', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() === 'GET') {
        // .single() 요청 → 단일 객체 응답
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_ROW),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/e2/${MOCK_ROW.id}`)

    // 실데이터 표시 단언
    await expect(page.getByText('실연결 테스트 카페')).toBeVisible()
    await expect(page.getByText('서울 마포구 서교동 332-4 1층')).toBeVisible()
    await expect(page.getByText('2,500만원')).toBeVisible()

    // AI 설명문 (검수 통과 본문)
    await expect(page.getByText('서교동 카페 설명문입니다.')).toBeVisible()

    // 더미 잔재가 없어야 함
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()
  })

  test('없는 id(옛 더미 t1 포함): "매물을 찾을 수 없어요" 안내', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() === 'GET') {
        // .single()에서 행이 없으면 PostgREST가 406 반환
        await route.fulfill({
          status: 406,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'PGRST116', message: 'The result contains 0 rows' }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/e2/t1')

    // 크래시 없이 not-found 안내
    await expect(page.getByText('매물을 찾을 수 없어요')).toBeVisible()
    await expect(page.getByRole('button', { name: '돌아가기' })).toBeVisible()

    // 옛 더미 fallback(t1 → 홍대 고양이 카페)이 사라졌는지
    await expect(page.getByText('홍대 고양이 카페')).not.toBeVisible()
  })
})
