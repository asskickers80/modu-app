/**
 * 수정 플로우 통일 (ORDER-edit-flow-unify-v1)
 * 1부: E1p 수정 진입 = 편집 기본(Gemini 0회·로딩 극장 부재) / 단계 자유 이동 탭 / Step5 수정 라벨·공개 유지
 * 2부: E2·E2L "내리기(삭제하기)" 단일 파괴 액션 / E1 회귀(수정 진입 편집 기본·재생성 명시 버튼)
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, agreeListingTerms } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`
const DEV = 'editflow-dev'

const LROW = {
  id: 'ef-1', listing_type: 'landlord', deal_type: 'lease', status: 'hidden', // 숨김 상태로 수정 → 공개 유지 검증
  address: '서울 마포구 서교동 700', floor: '1층', area: '40', deposit: '3000', monthly_rent: '200',
  ai_draft: { description: '저장된 초안입니다.' }, review_choices: { description: 'keep' }, edited_texts: {},
  image_urls: [], device_id: DEV, terms_version: 'v1-2026-07', terms_agreed_at: '2026-07-27T00:00:00Z',
}
function seed(page) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
  }, DEV)
}

test.describe('1부: E1p 수정 = 편집 기본', () => {
  test.beforeEach(async ({ page }) => { await seed(page); await mockMarketData(page) })

  test('수정 진입 Step2: Gemini 0회 + 로딩 극장 부재 + 저장된 초안 즉시 표시', async ({ page }) => {
    let geminiCalls = 0
    await page.route('https://generativelanguage.googleapis.com/**', r => {
      geminiCalls++
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"candidates":[{"content":{"parts":[{"text":"{}"}]}}]}' })
    })
    await page.route(LISTINGS, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LROW) })
      : r.fulfill({ status: 204, body: '' }))

    await page.goto('/e1p/2?edit=ef-1') // 직접 진입도 안전(editLoading 소비)
    // 극장 없이 즉시 결과 화면 — 저장된 초안 표시
    await expect(page.getByText('모두가 써본 초안이에요')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('저장된 초안입니다.')).toBeVisible()
    await expect(page.getByText('모두가 상가 설명을 쓰고 있어요')).toHaveCount(0) // 로딩 극장 부재
    expect(geminiCalls).toBe(0) // Gemini 재호출 금지
  })

  test('수정 모드: 단계 자유 이동 탭 노출·이동 (신규 등록엔 없음)', async ({ page }) => {
    await page.route(LISTINGS, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LROW) })
      : r.fulfill({ status: 204, body: '' }))
    await page.goto('/e1p/1?edit=ef-1')
    await expect(page.getByTestId('edit-step-tabs')).toBeVisible()
    await page.getByTestId('edit-step-tabs').getByRole('button', { name: '저장' }).click()
    await expect(page).toHaveURL(/\/e1p\/5\?edit=ef-1/) // 강제 완주 없이 저장 단계 직행
    // 신규 등록(edit 없음)엔 탭 없음
    await page.goto('/e1p/1')
    await expect(page.getByTestId('edit-step-tabs')).toHaveCount(0)
  })

  test('Step5 수정 모드: "수정 완료하기" 라벨 + 저장 payload에 status 없음(공개 상태 유지)', async ({ page }) => {
    await mockGemini(page)
    let patched = null
    await page.route(LISTINGS, async r => {
      if (r.request().method() === 'PATCH') {
        patched = JSON.parse(r.request().postData() || '{}')
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LROW) })
    })
    await page.goto('/e1p/5?edit=ef-1')
    const btn = page.getByRole('button', { name: '수정 완료하기' })
    await expect(btn).toBeEnabled() // 동의 버전 동일 → 재동의 스킵
    await expect(page.getByText('저장해도 공개 상태는 바뀌지 않아요')).toBeVisible()
    await btn.click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await expect(page.getByText('상가가 수정됐어요!')).toBeVisible()
    await page.getByRole('button', { name: '대시보드로 이동' }).click()
    await expect(page).toHaveURL(/\/a7\/landlord/)
    expect(patched).not.toBeNull()
    expect('status' in patched).toBe(false) // hidden 상태 유지 — 재공개 강제 없음
  })
})

test.describe('2부: 내리기 단일 액션', () => {
  test('E2L: 잠깐 숨기기(복구) vs 내리기(삭제) 라벨 구분 + 레드 스타일', async ({ page }) => {
    await seed(page)
    await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...LROW, status: 'published' }) }))
    await page.goto('/e2l/ef-1')
    await expect(page.getByTestId('owner-status-hide')).toContainText('잠깐 숨기기')
    await expect(page.getByTestId('owner-delete')).toContainText('상가 내리기 (삭제하기)')
  })

  test('E2(양도인): 내리기 버튼 → 다이얼로그 → deleted PATCH → 홈', async ({ page }) => {
    await mockMarketData(page)
    await page.addInitScript(id => {
      localStorage.setItem('modu_device_id', id)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller' }))
    }, DEV)
    let patched = null
    await page.route(LISTINGS, async r => {
      if (r.request().method() === 'PATCH') {
        patched = JSON.parse(r.request().postData() || '{}')
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
      const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
      const row = { id: 'se-1', shop_name: '내 카페', address: '서울 마포구', status: 'published', device_id: DEV, ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], deposit: '1000', monthly_rent: '100', transfer_type: 'full' }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? row : [row]) })
    })
    await page.route(`${SUPABASE}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route(`${SUPABASE}/messages*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/e2/se-1')
    await page.getByTestId('owner-delete').click()
    await expect(page.getByTestId('delete-confirm')).toBeVisible()
    await expect(page.getByText('되돌릴 수 없어요')).toBeVisible() // 정직 고지
    expect(patched).toBeNull() // 확인 전 저장 없음
    await page.getByTestId('delete-confirm-yes').click()
    await expect(page).toHaveURL(/\/a7\/seller/)
    expect(patched.status).toBe('deleted')
  })
})

test.describe('E1 회귀: 생성 vs 편집 분리 원칙 유지', () => {
  test('E1 수정 진입: 편집 기본(재생성 없음) + "모두가 새로 써드릴까요?" 명시 버튼', async ({ page }) => {
    await mockMarketData(page)
    let geminiCalls = 0
    await page.route('https://generativelanguage.googleapis.com/**', r => {
      geminiCalls++
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"candidates":[{"content":{"parts":[{"text":"{}"}]}}]}' })
    })
    await page.addInitScript(id => localStorage.setItem('modu_device_id', id), DEV)
    const row = {
      id: 'er-1', shop_name: '회귀 카페', address: '서울 마포구 서교동 1', status: 'published', device_id: DEV,
      ai_draft: { description: '기존 소개글.', facility: '기존 시설.', salesAnalysis: null },
      review_choices: { description: 'keep' }, edited_texts: {}, image_urls: [], deposit: '1000', monthly_rent: '100',
    }
    await page.route(LISTINGS, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) })
      : r.fulfill({ status: 204, body: '' }))

    await page.goto('/e1/2?edit=er-1')
    await expect(page.getByText('기존 소개글.')).toBeVisible({ timeout: 5000 }) // 편집 기본
    await expect(page.getByTestId('rewrite-button')).toBeVisible() // 재생성은 명시 버튼으로만
    expect(geminiCalls).toBe(0) // 진입만으로 재생성 없음
    // 수정 모드 단계 탭도 노출(자유 이동 통일)
    await expect(page.getByTestId('edit-step-tabs')).toBeVisible()
  })
})
