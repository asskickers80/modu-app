/**
 * 주소·상세주소 분리 저장·복원
 *
 * 1. 상세주소 입력 후 제출 → address_detail 분리 저장 + address 합본 유지(읽는 쪽 호환)
 * 2. 수정 진입(새 컬럼 보유 매물) → 기본주소/상세주소 칸에 분리 복원
 * 3. 옛 매물(address_detail null) → 기존 폴백: 통주소 + 상세 빈칸
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedInteriorPhotos } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const MY_DEVICE = 'address-split-device'

const EDIT_ROW = {
  id: 'bbbbbbbb-cccc-dddd-eeee-000000000002',
  shop_name: '주소 분리 카페',
  address: '서울 마포구 서교동 400-1 2층 201호',
  address_detail: '2층 201호',
  floor: '2층', area: '33', deposit: '3000', monthly_rent: '200',
  maintenance: '10', transfer_fee: '2500', transfer_type: 'full', monthly_sales: '2800',
  ai_draft: { description: '기존 설명.', facility: '기존 시설.', salesAnalysis: null },
  review_choices: { description: 'keep', location: 'keep', facility: 'keep' },
  edited_texts: {}, photos_added: false, image_urls: [], sales_proof: false, facilities: [],
  device_id: MY_DEVICE, status: 'published', created_at: new Date().toISOString(),
}

const DETAIL_INPUT = /상세주소 입력/

async function gotoEditStep1(page, row) {
  await page.route(SUPABASE_LISTINGS, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) })
  })
  await page.goto(`/e1/1?edit=${row.id}`)
  await expect(page.locator('input[placeholder="예) 고양이 카페 서교점"]')).toHaveValue(row.shop_name)
}

test.describe('주소·상세주소 분리 저장·복원', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await page.addInitScript(id => localStorage.setItem('modu_device_id', id), MY_DEVICE)
  })

  test('신규 저장: 상세주소 → address_detail 분리 + address 합본 유지', async ({ page }) => {
    let savedBody = null
    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() === 'POST') {
        savedBody = JSON.parse(route.request().postData())
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'new-id' }]) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      }
    })

    // E1/1: 예시 채움(기본주소 '서울 마포구 서교동 332-4') + 상세주소 직접 입력
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByPlaceholder(DETAIL_INPUT).fill('2층 201호')

    // 제출까지 진행
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
    await seedInteriorPhotos(page) // 내부 3장 필수 정책 통과
    await page.getByRole('button', { name: /다음.*완성도/ }).click()
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await expect(page.getByText('매물이 공개됐어요!')).toBeVisible()

    // 저장 payload 단언: 상세 분리 + 합본 유지
    expect(savedBody, 'listings insert가 호출되지 않음').not.toBeNull()
    const row = Array.isArray(savedBody) ? savedBody[0] : savedBody
    expect(row.address_detail).toBe('2층 201호')
    expect(row.address).toBe('서울 마포구 서교동 332-4 2층 201호')
  })

  test('수정 진입: address_detail 보유 매물 → 기본주소/상세주소 분리 복원', async ({ page }) => {
    await gotoEditStep1(page, EDIT_ROW)

    // 주소 칩엔 기본주소만 (합본 텍스트는 미노출), 상세 칸엔 상세주소
    await expect(page.getByText('서울 마포구 서교동 400-1', { exact: true })).toBeVisible()
    await expect(page.getByText('서울 마포구 서교동 400-1 2층 201호')).not.toBeVisible()
    await expect(page.getByPlaceholder(DETAIL_INPUT)).toHaveValue('2층 201호')
  })

  test('옛 매물(address_detail null): 통주소 + 상세 빈칸 폴백', async ({ page }) => {
    await gotoEditStep1(page, {
      ...EDIT_ROW,
      address: '서울 마포구 서교동 400-1 1층',
      address_detail: null,
    })

    await expect(page.getByText('서울 마포구 서교동 400-1 1층', { exact: true })).toBeVisible()
    await expect(page.getByPlaceholder(DETAIL_INPUT)).toHaveValue('')
  })
})
