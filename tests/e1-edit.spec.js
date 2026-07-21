/**
 * E1 수정 모드 — 기존 매물 로드 → 수정 → UPDATE
 *
 * 1. ?edit= 진입 → 1단계 폼에 기존 값 복원
 * 2. 수정 제출 → update(PATCH) 호출 + eq id (insert 아님)
 * 3. draft 오염 방지: 신규 draft 있는 상태에서 ?edit= 진입 → DB 값이 이김
 * 4. 남의 매물 id → 차단 + 신규 모드 전환
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, passPublishGate } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const MY_DEVICE = 'my-test-device'

const EDIT_ROW = {
  id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
  shop_name: '수정 대상 카페',
  address: '서울 마포구 서교동 400-1 1층',
  floor: '1',
  area: '33',
  deposit: '3000',
  monthly_rent: '200',
  maintenance: '10',
  transfer_fee: '2500',
  transfer_type: 'full',
  monthly_sales: '2800',
  ai_draft: { description: '기존 저장된 설명문입니다.', facility: '기존 시설 설명.', salesAnalysis: null },
  review_choices: { description: 'keep', location: 'keep', facility: 'keep' },
  edited_texts: {},
  // 사진 정책(내부 3장 필수) — 수정 모드는 draft 미사용이라 매물 데이터에 사진 포함
  photos_added: true,
  image_urls: [
    'https://edcqvmgqskeoegpqxlzy.supabase.co/storage/v1/object/public/Modu%20Apps/listings/edit_1.jpg',
    'https://edcqvmgqskeoegpqxlzy.supabase.co/storage/v1/object/public/Modu%20Apps/listings/edit_2.jpg',
    'https://edcqvmgqskeoegpqxlzy.supabase.co/storage/v1/object/public/Modu%20Apps/listings/edit_3.jpg',
  ],
  interior_image_urls: [
    'https://edcqvmgqskeoegpqxlzy.supabase.co/storage/v1/object/public/Modu%20Apps/listings/edit_1.jpg',
    'https://edcqvmgqskeoegpqxlzy.supabase.co/storage/v1/object/public/Modu%20Apps/listings/edit_2.jpg',
    'https://edcqvmgqskeoegpqxlzy.supabase.co/storage/v1/object/public/Modu%20Apps/listings/edit_3.jpg',
  ],
  exterior_image_urls: [],
  sales_proof: false,
  facilities: [],
  device_id: MY_DEVICE,
  status: 'published',
  created_at: new Date().toISOString(),
}

const SHOP_INPUT = 'input[placeholder="예) 고양이 카페 서교점"]'

test.describe('E1 수정 모드', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    // 소유권 검사(device_id 일치)를 위해 기기 ID 고정
    await page.addInitScript(id => localStorage.setItem('modu_device_id', id), MY_DEVICE)
  })

  test('?edit= 진입: 1단계 폼에 기존 매물 값 복원', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EDIT_ROW),
      })
    })

    await page.goto(`/e1/1?edit=${EDIT_ROW.id}`)

    // 기존 값 복원 단언
    await expect(page.locator(SHOP_INPUT)).toHaveValue('수정 대상 카페')
    await expect(page.getByText('서울 마포구 서교동 400-1 1층')).toBeVisible()

    // 수정 모드 문구
    await expect(page.getByText('매물 수정')).toBeVisible()
  })

  test('수정 제출: update(PATCH) + eq id 호출, insert 없음', async ({ page }) => {
    let insertCount = 0
    let patchUrl = null

    await page.route(SUPABASE_LISTINGS, async route => {
      const req = route.request()
      if (req.method() === 'PATCH') {
        patchUrl = req.url()
        await route.fulfill({ status: 204, body: '' })
      } else if (req.method() === 'POST') {
        insertCount++
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'should-not-happen' }]),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(EDIT_ROW),
        })
      }
    })

    await page.goto(`/e1/1?edit=${EDIT_ROW.id}`)
    await expect(page.locator(SHOP_INPUT)).toHaveValue('수정 대상 카페')

    // 5단계까지 순차 진행 (기존 aiDraft 보유 → 2단계 재생성 스킵)
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
    // EDIT_ROW의 내부 사진 3장이 복원됨 → 다음 활성 (내부 3장 필수 정책)
    await expect(page.getByText('내부 사진 (3장)')).toBeVisible()
    await page.getByRole('button', { name: /다음.*완성도/ }).click()
    await expect(page).toHaveURL(/\/e1\/4/)

    // 수정 모드 버튼 문구 + 제출
    await page.getByRole('button', { name: '수정 완료하기' }).click()
    await passPublishGate(page)

    // 성공 화면 (수정 문구)
    await expect(page.getByText('매물이 수정됐어요!')).toBeVisible()

    // update 호출 단언: PATCH + eq id, insert 0회
    expect(patchUrl, 'update(PATCH)가 호출되지 않음').not.toBeNull()
    expect(patchUrl).toContain(`id=eq.${EDIT_ROW.id}`)
    expect(insertCount, '수정 모드인데 insert가 호출됨').toBe(0)
  })

  test('draft 오염 방지: 신규 draft가 있어도 ?edit= 진입 시 DB 값이 뜸', async ({ page }) => {
    // 신규 등록을 하다 만 draft를 미리 심는다
    await page.addInitScript(() => {
      sessionStorage.setItem('modu_e1_draft', JSON.stringify({
        shopName: '오염된 draft 카페',
        address: '오염된 주소 123',
      }))
    })

    await page.route(SUPABASE_LISTINGS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EDIT_ROW),
      })
    })

    await page.goto(`/e1/1?edit=${EDIT_ROW.id}`)

    // DB 값이 이겨야 함 — draft 값은 어디에도 안 뜸
    await expect(page.locator(SHOP_INPUT)).toHaveValue('수정 대상 카페')
    await expect(page.getByText('오염된 주소 123')).not.toBeVisible()
  })

  test('남의 매물 id로 진입: 수정 폼 안 열고 매물 상세(E2)로 차단', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...EDIT_ROW, device_id: 'someone-else-device' }),
      })
    })

    await page.goto(`/e1/1?edit=${EDIT_ROW.id}`)

    // 소유자 아님 → 남의 데이터를 폼에 채우지 않고 상세로 돌려보냄 (E2 소유자 모드와 같은 isOwnerOf 판정)
    await expect(page).toHaveURL(new RegExp(`/e2/${EDIT_ROW.id}`))
    await expect(page.locator(SHOP_INPUT)).toHaveCount(0)
  })
})
