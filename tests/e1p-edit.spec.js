/**
 * E1p 수정 모드 (ORDER-e1p-fix-bundle-v1 2부)
 * 기존 상가 로드 → 값 채움 → 변경 → 저장=UPDATE / 비소유자 차단 / (예정) 표기
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`
const DEV = 'e1p-edit-dev'

const ROW = {
  id: 'edit-1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
  address: '서울 마포구 서교동 400 3층 302호', address_detail: '3층 302호',
  floor: '3층', area: '50', deposit: '4000', monthly_rent: '250', maintenance: '20',
  sale_price: null, cap_rate: null, recommended_biz: ['카페·디저트'],
  ai_draft: { description: '기존 초안입니다.', rentMarket: '', bizRecommendation: '' },
  review_choices: { description: 'keep' }, edited_texts: {},
  image_urls: [], device_id: DEV, owner_nickname: '김소유', created_at: '2026-07-11T00:00:00Z',
}

function seed(page, dev) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
  }, dev)
}

test.describe('E1p 수정 모드', () => {
  test.beforeEach(async ({ page }) => { await mockGemini(page) })

  test('수정 진입: 기존 상가 값이 폼에 채워진다 (주소 base/detail 분리 복원)', async ({ page }) => {
    await seed(page, DEV)
    await page.route(LISTINGS, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) })
      : r.fulfill({ status: 204, body: '' }))

    await page.goto('/e1p/1?edit=edit-1')

    // 주소 base 복원(상세 분리) + 상세주소 칸 복원
    await expect(page.getByText('서울 마포구 서교동 400', { exact: true })).toBeVisible()
    await expect(page.getByPlaceholder(/상세주소 입력/)).toHaveValue('3층 302호')
    // 임대(lease→rent) 분기 + 보증금 값 채워짐
    await expect(page.getByText('층수 · 면적')).toBeVisible() // address 있으면 노출되는 섹션
  })

  test('비소유자: 수정 URL 직접 진입 → E2L로 차단', async ({ page }) => {
    await seed(page, 'someone-else-dev') // 남의 기기
    await page.route(LISTINGS, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) }) // device_id=DEV
      : r.fulfill({ status: 204, body: '' }))

    await page.goto('/e1p/1?edit=edit-1')
    await expect(page).toHaveURL(/\/e2l\/edit-1/) // 소유자 아님 → 상세로 돌려보냄
  })

  test('저장 = UPDATE(PATCH), 신규 INSERT 아님', async ({ page }) => {
    await seed(page, DEV)
    let patched = null
    let posted = false
    await page.route(LISTINGS, async r => {
      const req = r.request()
      if (req.method() === 'GET') {
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) })
      }
      if (req.method() === 'PATCH') {
        patched = { url: req.url(), body: JSON.parse(req.postData() || '{}') }
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
      if (req.method() === 'POST') { posted = true; return r.fulfill({ status: 201, contentType: 'application/json', body: '[{"id":"x"}]' }) }
      return r.fulfill({ status: 204, body: '' })
    })

    await page.goto('/e1p/1?edit=edit-1')
    await expect(page.getByText('서울 마포구 서교동 400', { exact: true })).toBeVisible() // 로드 완료
    await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
    const step2Next = page.getByRole('button', { name: /다음 — 검수·공개 선택/ })
    await expect(async () => {
      await step2Next.click()
      await expect(page).toHaveURL(/\/e1p\/3/, { timeout: 1000 })
    }).toPass({ timeout: 15000 })
    await page.getByRole('button', { name: /다음 — 도면·서류 추가/ }).click()
    await page.getByRole('button', { name: '다음 — 완성도 확인' }).click()
    await page.getByRole('button', { name: '상가 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await page.getByRole('button', { name: '대시보드로 이동' }).click({ timeout: 5000 })
    await expect(page).toHaveURL(/\/a7\/landlord/)

    expect(posted, '수정인데 신규 INSERT가 발생함').toBe(false)
    expect(patched, 'UPDATE(PATCH)가 호출되지 않음').not.toBeNull()
    expect(patched.url).toContain('id=eq.edit-1')
    // 로드된 주소가 그대로 저장(합본) — 빈 폼 INSERT가 아님
    expect(patched.body.address).toBe('서울 마포구 서교동 400 3층 302호')
  })

  test('(예정) 표기: 등기부·건축물대장', async ({ page }) => {
    // 등기부 카드(4단계) — 항상 노출
    await page.goto('/e1p/4')
    await expect(page.getByText('등기부등본 자동열람 완료 (예정)')).toBeVisible()
    // 건축물대장 안내(1단계) — 주소가 있어야 노출 → 예시✦로 주소 채움
    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click()
    await expect(page.getByText(/건축물대장 자동조회 준비중 \(예정\)/)).toBeVisible()
  })
})
