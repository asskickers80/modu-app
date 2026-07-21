/**
 * 사진 내/외부 분리 저장·복원
 *
 * 1. 내부3+외부1 업로드 후 제출 → interior/exterior_image_urls에 각각 저장 + image_urls 합본 유지
 *    (사진 정책: 내부 3장 필수 — 2장으로는 3단계 진행 불가)
 * 2. 수정 진입(새 컬럼 보유 매물) → E1/4에 내/외부 분리 복원
 * 3. 옛 매물(새 컬럼 null) → 기존 폴백: image_urls 전부 내부로 복원
 *
 * Storage 업로드는 route mock — 실제 버킷에 안 올라감.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, passPublishGate } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const MY_DEVICE = 'photo-split-device'

const PUB = 'https://edcqvmgqskeoegpqxlzy.supabase.co/storage/v1/object/public/Modu%20Apps/listings'
const IN1 = `${PUB}/in1.jpg`
const IN2 = `${PUB}/in2.jpg`
const IN3 = `${PUB}/in3.jpg`
const EX1 = `${PUB}/ex1.jpg`

const EDIT_ROW = {
  id: 'bbbbbbbb-cccc-dddd-eeee-000000000001',
  shop_name: '사진 분리 카페',
  address: '서울 마포구 서교동 400-1 1층',
  floor: '1', area: '33', deposit: '3000', monthly_rent: '200',
  maintenance: '10', transfer_fee: '2500', transfer_type: 'full', monthly_sales: '2800',
  ai_draft: { description: '기존 설명.', facility: '기존 시설.', salesAnalysis: null },
  review_choices: { description: 'keep', location: 'keep', facility: 'keep' },
  edited_texts: {}, photos_added: true, sales_proof: false, facilities: [],
  device_id: MY_DEVICE, status: 'published', created_at: new Date().toISOString(),
}

const fakeImage = name => ({ name, mimeType: 'image/jpeg', buffer: Buffer.from(`fake-${name}`) })

// E1/1?edit= 진입 후 E1/4(사진)까지 이동
async function gotoStep4InEditMode(page, row) {
  await page.route(SUPABASE_LISTINGS, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) })
  })
  await page.goto(`/e1/1?edit=${row.id}`)
  await expect(page.locator('input[placeholder="예) 고양이 카페 서교점"]')).toHaveValue(row.shop_name)
  await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
  await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
  await expect(page).toHaveURL(/\/e1\/3/)
}

test.describe('사진 내/외부 분리 저장·복원', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await page.addInitScript(id => localStorage.setItem('modu_device_id', id), MY_DEVICE)
  })

  test('신규 저장: 내부3+외부1 → interior/exterior 컬럼에 각각 + image_urls 합본', async ({ page }) => {
    // Storage 업로드 mock (getPublicUrl은 클라이언트 로컬 조립 — 요청 없음)
    await page.route('**/storage/v1/object/**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'ok' }) })
    })
    let savedBody = null
    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() === 'POST') {
        savedBody = JSON.parse(route.request().postData())
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'new-id' }]) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      }
    })

    // E1/1 → E1/4
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /예시/ }).click()
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()

    // 내부 3장(필수 하한) + 외부 1장 업로드 (첫 input=내부, 둘째 input=외부)
    const fileInputs = page.locator('input[type="file"]')
    await fileInputs.nth(0).setInputFiles([fakeImage('in1.jpg'), fakeImage('in2.jpg'), fakeImage('in3.jpg')])
    await expect(page.getByText('내부 사진 (3장)')).toBeVisible()
    await fileInputs.nth(1).setInputFiles([fakeImage('ex1.jpg')])
    await expect(page.getByText('외부·간판 사진 (1장)')).toBeVisible()

    // 제출
    await page.getByRole('button', { name: /다음.*완성도/ }).click()
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await passPublishGate(page)
    await expect(page.getByText('매물이 공개됐어요!')).toBeVisible()

    // 저장 payload 단언: 분리 컬럼 각각 + 합본 유지
    expect(savedBody, 'listings insert가 호출되지 않음').not.toBeNull()
    const row = Array.isArray(savedBody) ? savedBody[0] : savedBody
    expect(row.interior_image_urls).toHaveLength(3)
    expect(row.exterior_image_urls).toHaveLength(1)
    expect(row.image_urls).toEqual([...row.interior_image_urls, ...row.exterior_image_urls])
  })

  test('수정 진입: 새 컬럼 보유 매물 → 내/외부 분리 복원', async ({ page }) => {
    await gotoStep4InEditMode(page, {
      ...EDIT_ROW,
      image_urls: [IN1, IN2, EX1],
      interior_image_urls: [IN1, IN2],
      exterior_image_urls: [EX1],
    })

    // 분리 복원: 내부 2 / 외부 1 + 실제 사진 src 렌더
    await expect(page.getByText('내부 사진 (2장)')).toBeVisible()
    await expect(page.getByText('외부·간판 사진 (1장)')).toBeVisible()
    await expect(page.locator(`img[src="${IN1}"]`)).toBeVisible()
    await expect(page.locator(`img[src="${EX1}"]`)).toBeVisible()
  })

  test('옛 매물(새 컬럼 null): image_urls 전부 내부로 폴백 복원', async ({ page }) => {
    await gotoStep4InEditMode(page, {
      ...EDIT_ROW,
      image_urls: [IN1, IN2],
      interior_image_urls: null,
      exterior_image_urls: null,
    })

    await expect(page.getByText('내부 사진 (2장)')).toBeVisible()
    await expect(page.getByText('외부·간판 사진 (0장)')).toBeVisible()
  })
})
