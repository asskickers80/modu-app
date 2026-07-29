/**
 * 양도인(E1) 스냅샷 — 보호장치 1 (ORDER-e1-district-draft-v2)
 *
 * 목적: E1을 건드리는 작업 전후로 "무변경 수정 저장 = 무손실"을 고정한다.
 * 기존 커버리지(등록 완주 seller/listing·e1-flow-4screens / 생성·편집 e1-step2-redesign·
 * e1-draft-edit / 공개 게이트 seller/listing / E2 표시 e2detail / 수정 값 로드 e1-edit /
 * 사진 분리 복원 photo-split / 공개 유지·상태 listing-status)에서 비어 있던 구간:
 * 수정 진입 → 아무것도 안 바꾸고 저장 → PATCH payload에 사진 3컬럼·소개글 보존 + status 미포함.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, passPublishGate, agreeListingTerms } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const MY_DEVICE = 'snap-device'

const ROW = {
  id: 'aaaaaaaa-1111-2222-3333-444444444444',
  shop_name: '스냅샷 카페',
  address: '서울 마포구 서교동 400-1 1층',
  floor: '1', area: '33', deposit: '3000', monthly_rent: '200', maintenance: '10',
  transfer_fee: '2500', transfer_type: 'full', monthly_sales: '2800',
  ai_draft: { description: '기존 저장된 설명문입니다.', facility: '기존 시설 설명.', salesAnalysis: null },
  review_choices: { confirmedAt: '2026-07-01T00:00:00Z' },
  edited_texts: { description: '사장님이 다듬은 설명문.' },
  photos_added: true,
  image_urls: ['https://x.test/in1.jpg', 'https://x.test/in2.jpg', 'https://x.test/in3.jpg', 'https://x.test/out1.jpg'],
  interior_image_urls: ['https://x.test/in1.jpg', 'https://x.test/in2.jpg', 'https://x.test/in3.jpg'],
  exterior_image_urls: ['https://x.test/out1.jpg'],
  sales_proof: false, facilities: [], item_visibility: {},
  device_id: MY_DEVICE, status: 'published', created_at: new Date().toISOString(),
}

test('E1 무변경 수정 저장: 사진 3컬럼·소개글 보존 + status 미포함(공개 유지)', async ({ page }) => {
  await mockGemini(page)
  await mockMarketData(page)
  await page.addInitScript(id => localStorage.setItem('modu_device_id', id), MY_DEVICE)

  let patched = null
  await page.route(SUPABASE_LISTINGS, async route => {
    if (route.request().method() === 'PATCH') {
      patched = JSON.parse(route.request().postData() || '{}')
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) })
  })

  await page.goto(`/e1/1?edit=${ROW.id}`)
  await expect(page.locator('input[placeholder="예) 고양이 카페 서교점"]')).toHaveValue('스냅샷 카페')

  // 아무것도 바꾸지 않고 끝까지
  await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
  await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
  await expect(page.getByText('내부 사진 (3장)')).toBeVisible() // 기존 사진 복원 확인
  await page.getByRole('button', { name: /다음.*완성도/ }).click()
  await agreeListingTerms(page)
  await page.getByRole('button', { name: '수정 완료하기' }).click()
  await passPublishGate(page)
  await expect(page.getByText('매물이 수정됐어요!')).toBeVisible()
  await expect.poll(() => patched).not.toBeNull()

  // 무손실: 사진 3컬럼 그대로
  expect(patched.image_urls).toEqual(ROW.image_urls)
  expect(patched.interior_image_urls).toEqual(ROW.interior_image_urls)
  expect(patched.exterior_image_urls).toEqual(ROW.exterior_image_urls)
  // 소개글·수정문 그대로
  expect(patched.ai_draft).toEqual(ROW.ai_draft)
  expect(patched.edited_texts).toEqual(ROW.edited_texts)
  // 공개 상태 유지: 수정 UPDATE에 status를 싣지 않는다
  expect('status' in patched).toBe(false)
})
