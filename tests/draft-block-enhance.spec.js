/**
 * 소개글 블록 3건 (ORDER-draft-block-enhance-v1)
 * 1. 수정 모드 기존 사진 보존(손실 버그 수정)  2. "모두" 브랜드 색  3. 모두에게 수정 요청(2안 비교·상한)
 */
import { test, expect } from './fixtures.js'
import { agreeListingTerms } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`
const DEV = 'dbe-dev'

const PHOTO_ROW = {
  id: 'ph-1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
  address: '서울 마포구 서교동 500', floor: '1층', area: '40', deposit: '3000', monthly_rent: '200',
  ai_draft: { description: '저장 초안.' }, review_choices: { confirmedAt: '2026-07-29T00:00:00Z' }, edited_texts: {},
  image_urls: ['https://x.test/plan1.jpg', 'https://x.test/ext1.jpg'],
  interior_image_urls: ['https://x.test/plan1.jpg'],
  exterior_image_urls: ['https://x.test/ext1.jpg'],
  device_id: DEV, terms_version: 'v1-2026-07',
}
function seed(page) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
  }, DEV)
}

test.describe('1. 수정 모드 사진 보존', () => {
  test('수정 진입 → 기존 사진 표시 → 무변경 저장 → image_urls 보존(빈 배열 덮기 금지)', async ({ page }) => {
    await seed(page)
    let patched = null
    await page.route(LISTINGS, async r => {
      if (r.request().method() === 'PATCH') {
        patched = JSON.parse(r.request().postData() || '{}')
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PHOTO_ROW) })
    })

    // 도면 단계 직접 진입 — 기존 사진이 그리드에 표시돼야 함
    await page.goto('/e1p/3?edit=ph-1')
    await expect(page.getByTestId('floorplan-grid').locator('img')).toHaveCount(1)
    await expect(page.getByTestId('exterior-grid').locator('img')).toHaveCount(1)

    // 무변경 저장
    await page.getByRole('button', { name: '다음 — 완성도 확인' }).click()
    await agreeListingTerms(page)
    await page.getByRole('button', { name: '수정 완료하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await page.getByRole('button', { name: '대시보드로 이동' }).click({ timeout: 5000 })
    await expect(page).toHaveURL(/\/a7\/landlord/) // 저장(await) 완료 후 navigate — 레이스 방지
    await expect.poll(() => patched).not.toBeNull()

    expect(patched.image_urls).toEqual(['https://x.test/plan1.jpg', 'https://x.test/ext1.jpg'])
    expect(patched.interior_image_urls).toEqual(['https://x.test/plan1.jpg'])
    expect(patched.exterior_image_urls).toEqual(['https://x.test/ext1.jpg'])
  })
})

test.describe('2·3. 모두 색상 + 수정 요청', () => {
  const DRAFT = { description: '동네 특성이 담긴 초안입니다.', rentMarket: '임대 조건 해석입니다.', saleMarket: null }
  function mockGeminiSeq(page, rewriteText) {
    let calls = 0
    page.route('https://generativelanguage.googleapis.com/**', r => {
      calls++
      const body = JSON.parse(r.request().postData() || '{}')
      const isRewrite = (body.contents?.[0]?.parts?.[0]?.text ?? '').includes('수정 요청')
      const text = isRewrite ? rewriteText : JSON.stringify(DRAFT)
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) })
    })
    return () => calls
  }

  test('수정 요청 → 2안 비교 → 새 글 적용 / 유지 / 상한 초과 안내', async ({ page }) => {
    mockGeminiSeq(page, '요청대로 짧게 줄인 글.')
    await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click()
    await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
    await expect(page.getByText('가 써본 소개예요')).toBeVisible({ timeout: 15000 })

    // "모두" 브랜드 색 — ModuWord 렌더(제목·요청 버튼)
    await expect(page.getByRole('heading', { name: /모두가 써본 소개예요/ })).toBeVisible()
    // 수정 요청 → 2안 비교
    await page.getByTestId('rewrite-btn-description').click()
    await page.getByTestId('rewrite-request-input-description').fill('더 짧게')
    await page.getByTestId('rewrite-request-send-description').click()
    await expect(page.getByTestId('rewrite-compare-description')).toBeVisible()
    await expect(page.getByText('요청대로 짧게 줄인 글.')).toBeVisible()
    // 기존 글은 아직 유지(선택 전 덮어쓰기 금지)
    await expect(page.getByText('동네 특성이 담긴 초안입니다.')).toBeVisible()
    // 새 글로 바꾸기 → 본문 교체
    await page.getByTestId('rewrite-apply-description').click()
    await expect(page.getByTestId('block-description')).toContainText('요청대로 짧게 줄인 글.')
    await expect(page.getByTestId('rewrite-compare-description')).toHaveCount(0)
  })

  test('상한(10회) 초과 시 정직한 안내', async ({ page }) => {
    mockGeminiSeq(page, '재작성 글.')
    await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click()
    await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
    await expect(page.getByText('가 써본 소개예요')).toBeVisible({ timeout: 15000 })

    // 10회 소진 (요청→유지 반복)
    for (let i = 0; i < 10; i++) {
      await page.getByTestId('rewrite-btn-description').click()
      await page.getByTestId('rewrite-request-input-description').fill(`요청 ${i + 1}`)
      await page.getByTestId('rewrite-request-send-description').click()
      await expect(page.getByTestId('rewrite-compare-description')).toBeVisible()
      await page.getByTestId('rewrite-keep-description').click()
    }
    // 11번째 → 상한 안내
    await page.getByTestId('rewrite-btn-description').click()
    await page.getByTestId('rewrite-request-input-description').fill('한 번 더')
    await page.getByTestId('rewrite-request-send-description').click()
    await expect(page.getByText('수정 요청을 다 썼어요', { exact: false })).toBeVisible()
  })
})
