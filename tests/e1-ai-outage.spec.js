/**
 * AI 장애(Gemini 5xx) 시 등록 완주 경로 — "AI가 죽어도 등록은 완주 가능해야 한다"
 *
 * 1. E1/2 Gemini 502 → 정직한 실패 안내 + 'AI 없이 계속 진행' 수동 경로
 * 2. E1/5 aiDraft 없음 + 상호·주소 있음 → 차단 없이 제출 완료 (ai_draft: null 저장)
 * 3. E1/5 상호명 없음 → 빈 매물 방지 가드 유지 (7/1 빈 행 사고 회귀 방지)
 */
import { test, expect } from '@playwright/test'
import { mockMarketData } from './helpers.js'

const DRAFT_KEY = 'modu_e1_draft'
const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'

const DRAFT_NO_AI = {
  address: '서울 마포구 서교동 1-1', detailAddress: '',
  shopName: '무초안 카페', floor: '1층', area: '33',
  deposit: '3000', monthlyRent: '200', maintenance: '',
  transferFee: '2500', transferType: 'full', monthlySales: '',
  autoFilled: false, reviewChoices: {}, editedTexts: {},
  photosAdded: false, salesProof: false, facilities: [],
  interiorPhotos: [], exteriorPhotos: [],
  aiDraft: null,
}

async function injectDraft(page, draft) {
  await page.goto('/e1/1') // 동일 오리진 확보 후 draft 주입
  await page.evaluate(([k, d]) => sessionStorage.setItem(k, JSON.stringify(d)), [DRAFT_KEY, draft])
}

test.describe('AI 장애 시 완주 경로', () => {
  test('E1/2 Gemini 502: 정직한 실패 안내 + AI 없이 진행 버튼 → 4단계 이동', async ({ page }) => {
    await page.route('https://generativelanguage.googleapis.com/**', route =>
      route.fulfill({ status: 502, contentType: 'text/plain', body: 'Bad Gateway' }))
    await mockMarketData(page)

    await injectDraft(page, DRAFT_NO_AI)
    await page.goto('/e1/2')

    await expect(page.getByText('AI 초안 생성이 지금 안 돼요')).toBeVisible()
    await expect(page.getByText('잠시 후 다시 시도하거나, AI 초안 없이 등록을 끝낼 수 있어요')).toBeVisible()
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible()

    await page.getByRole('button', { name: /AI 없이 계속 진행/ }).click()
    await expect(page).toHaveURL(/\/e1\/4/)
  })

  test('E1/5 aiDraft 없음 + 상호·주소 있음: 차단 없이 제출 완료, ai_draft null 저장', async ({ page }) => {
    const captured = { body: null }
    await page.route(SUPABASE_LISTINGS, async route => {
      const req = route.request()
      if (req.method() === 'POST') {
        captured.body = JSON.parse(req.postData())
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'new-1' }]) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
    })

    await injectDraft(page, DRAFT_NO_AI)
    await page.goto('/e1/5')

    // 가드에 막히지 않고 체크리스트가 떠야 함
    await expect(page.getByText('아직 매물 작성이 완료되지 않았어요')).toHaveCount(0)
    await expect(page.getByText('입력 현황')).toBeVisible()

    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await expect(page.getByText('매물이 공개됐어요!')).toBeVisible()

    expect(captured.body.shop_name).toBe('무초안 카페')
    expect(captured.body.ai_draft).toBeNull()
    expect(captured.body.status).toBe('published')
  })

  test('E1/5 상호명 없음: 빈 매물 방지 가드 유지', async ({ page }) => {
    await injectDraft(page, { ...DRAFT_NO_AI, shopName: '' })
    await page.goto('/e1/5')

    await expect(page.getByText('아직 매물 작성이 완료되지 않았어요')).toBeVisible()
    await expect(page.getByText('입력 현황')).toHaveCount(0)
  })
})
