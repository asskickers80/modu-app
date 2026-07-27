/**
 * 매물 등록 확인사항 — 공개 직전 동의 (ORDER-listing-terms-confirm-v1)
 * 미체크 공개 차단 · 체크 후 공개+agreed_at 기록 · 축별 문안 구분 · 재공개 재동의 불요.
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`
const DRAFT_KEY = 'modu_e1_draft'

const READY_DRAFT = {
  address: '서울 마포구 서교동 332-4', shopName: '확인사항 카페',
  floor: 'B1', area: '33', deposit: '3000', monthlyRent: '200',
  transferFee: '3000', transferType: 'full',
  reviewChoices: { description: 'keep', location: 'keep', facility: 'keep' },
  editedTexts: {}, facilities: [], interiorPhotos: [], exteriorPhotos: [],
  aiDraft: { description: '초안', facility: '시설', salesAnalysis: null },
}

test.describe('등록 확인사항 동의', () => {
  test('E1: 미체크 시 공개 버튼 비활성 + 안내, 체크하면 활성 (양도인 문안)', async ({ page }) => {
    await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/e1/1')
    await page.evaluate(([k, d]) => sessionStorage.setItem(k, JSON.stringify(d)), [DRAFT_KEY, READY_DRAFT])
    await page.goto('/e1/4')

    // 양도인 전용 문안(권리금·매출) 렌더
    await expect(page.getByTestId('listing-terms')).toContainText('권리금, 매출 및 사진 등 모든 정보')
    await expect(page.getByTestId('listing-terms')).toContainText('미끼매물')
    // 미체크 → 버튼 비활성 + 안내
    const publish = page.getByRole('button', { name: '매물 공개하기' })
    await expect(publish).toBeDisabled()
    await expect(page.getByTestId('terms-agree-hint')).toBeVisible()
    // 체크 → 활성
    await page.getByTestId('terms-agree-checkbox').check()
    await expect(publish).toBeEnabled()
  })

  test('E1p: 임대인 문안 구분(처분 권한·임대매매) + terms_agreed_at/version 기록', async ({ page }) => {
    await mockGemini(page)
    let inserted = null
    await page.route(LISTINGS, async r => r.request().method() === 'POST'
      ? (inserted = JSON.parse(r.request().postData()), r.fulfill({ status: 201, contentType: 'application/json', body: '[{"id":"t"}]' }))
      : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click()
    await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
    const s2 = page.getByRole('button', { name: /다음 — 검수·공개 선택/ })
    await expect(async () => { await s2.click(); await expect(page).toHaveURL(/\/e1p\/3/, { timeout: 1000 }) }).toPass({ timeout: 15000 })
    await page.getByRole('button', { name: /다음 — 도면·서류 추가/ }).click()
    await page.getByRole('button', { name: '다음 — 완성도 확인' }).click()

    // 임대인 문안: 처분 권한·임대·매매 조건 (양도인의 권리금·매출 문구 아님)
    await expect(page.getByTestId('listing-terms')).toContainText('적법한 처분 권한 보유자')
    await expect(page.getByTestId('listing-terms')).toContainText('임대·매매 조건')
    await expect(page.getByTestId('listing-terms')).not.toContainText('권리금 회수')

    const publish = page.getByRole('button', { name: '상가 공개하기' })
    await expect(publish).toBeDisabled() // 미체크 차단
    await page.getByTestId('terms-agree-checkbox').check()
    await publish.click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await page.getByRole('button', { name: '대시보드로 이동' }).click({ timeout: 5000 })
    await expect(page).toHaveURL(/\/a7\/landlord/)

    const row = Array.isArray(inserted) ? inserted[0] : inserted
    expect(row.terms_version).toBe('v1-2026-07')
    expect(typeof row.terms_agreed_at).toBe('string') // ISO 시각 기록
  })

  test('수정 재공개: 저장된 버전 동일 → 확인사항 미노출·버튼 즉시 활성(재동의 불요)', async ({ page }) => {
    await mockGemini(page)
    const ROW = {
      id: 'tv-1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
      address: '서울 마포구 서교동 400', floor: '1층', area: '40', deposit: '3000', monthly_rent: '200',
      ai_draft: { description: '기존 초안' }, review_choices: { description: 'keep' }, edited_texts: {},
      image_urls: [], device_id: 'terms-dev', terms_version: 'v1-2026-07', terms_agreed_at: '2026-07-27T00:00:00Z',
    }
    await page.addInitScript(() => localStorage.setItem('modu_device_id', 'terms-dev'))
    await page.route(LISTINGS, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) })
      : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    // Provider가 ?edit= 를 읽어 로드 — 5단계 직접 진입(같은 full-load 컨텍스트에서 판정)
    await page.goto('/e1p/5?edit=tv-1')
    const publish = page.getByRole('button', { name: '상가 공개하기' })
    await expect(publish).toBeEnabled() // 로드 후 재동의 불요 → 즉시 활성
    await expect(page.getByTestId('listing-terms')).toHaveCount(0) // 확인사항 미노출
  })
})
