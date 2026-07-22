/**
 * 닉네임 최소 루프 (A안: localStorage 프로필 → DM sender_name)
 *
 * 1. /my/name 저장 → 마이 헤더에 반영
 * 2. 닉네임 저장 후 문의 → conversations insert의 sender_name = 닉네임
 * 3. 닉네임 없이 문의 → sender_name = '문의자' 폴백
 */
import { test, expect } from './fixtures.js'
import { mockMarketData, seedSession } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'
const SUPABASE_MESSAGES = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/messages*'

const LISTING = {
  id: 'eeeeeeee-ffff-0000-1111-222222222222',
  shop_name: '닉네임 테스트 카페',
  address: '서울 마포구 서교동 9-9',
  deposit: '3000',
  monthly_rent: '200',
  transfer_fee: '2500',
  transfer_type: 'full',
  ai_draft: {},
  review_choices: {},
  edited_texts: {},
  image_urls: [],
  facilities: [],
  status: 'published',
  device_id: 'seller-device-x',
  created_at: new Date().toISOString(),
}

// E2 문의 흐름 공용 mock — POST된 conversations insert body를 돌려준다
function mockDmFlow(page) {
  const captured = { body: null }
  page.route(SUPABASE_LISTINGS, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTING) })
  })
  page.route(SUPABASE_CONVERSATIONS, async route => {
    const req = route.request()
    if (req.method() === 'POST') {
      captured.body = JSON.parse(req.postData())
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'conv-nick', ...captured.body }),
      })
    } else if (req.url().includes('sender_id=eq.')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'conv-nick', listing_name: LISTING.shop_name, sender_name: '문의자', receiver_name: '양도자' }),
      })
    }
  })
  page.route(SUPABASE_MESSAGES, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  return captured
}

async function startDm(page) {
  await page.goto(`/e2/${LISTING.id}`)
  await page.getByRole('button', { name: 'DM으로 문의하기' }).click()
  await page.getByRole('button', { name: 'DM 대화 시작하기' }).click()
  await expect(page).toHaveURL(/\/d4\/chat\/conv-nick/)
}

test.describe('닉네임 최소 루프', () => {
  test.beforeEach(async ({ page }) => {
    await mockMarketData(page)
    await seedSession(page) // 문의 흐름은 로그인 필요(행동 게이트 = 세션 판정, IDENTITY-MODEL)
  })

  test('/my/name 저장 → 마이 헤더에 반영', async ({ page }) => {
    await page.goto('/my/name')

    await page.getByPlaceholder('문의 상대에게 보여질 이름').fill('카페사장 김모두')
    await page.getByRole('button', { name: '저장' }).click()
    await expect(page.getByText('이름이 저장됐어요 ✓')).toBeVisible()

    await page.goto('/my')
    // 헤더에 실명 반영 (계정 정보 행에도 떠서 헤더로 스코프)
    await expect(page.getByRole('banner').getByText('카페사장 김모두')).toBeVisible()
    await expect(page.getByText('이름을 설정해주세요')).not.toBeVisible()
  })

  test('닉네임 저장 후: ⑥ 계정 정보 이름 행에도 반영 (하드코딩 홍길동 제거)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', name: '계정정보 김모두' }))
    })

    await page.goto('/my')

    // ⑥ 계정 정보 > 이름 행(Row 버튼)에 실명 반영 + 하드코딩 부재
    await expect(page.getByRole('button', { name: /이름 계정정보 김모두/ })).toBeVisible()
    await expect(page.getByText('홍길동')).toHaveCount(0)
  })

  test('닉네임 저장 후 문의: sender_name = 닉네임', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup', name: '김모두' }))
    })
    const captured = mockDmFlow(page)

    await startDm(page)

    expect(captured.body).not.toBeNull()
    expect(captured.body.sender_name).toBe('김모두')
  })

  test('닉네임 없이 문의: sender_name = 문의자 폴백', async ({ page }) => {
    // 역할은 확정(문의 게이트 통과)하되 이름은 없음 — sender_name 폴백을 검증
    await page.addInitScript(() =>
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller' })))
    const captured = mockDmFlow(page)

    await startDm(page)

    expect(captured.body.sender_name).toBe('문의자')
  })
})
