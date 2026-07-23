/**
 * 매각 상가 수익률 필수화 — 임차 현황 분기 (ORDER-e1p-yield-required-v1)
 * 임차 있음(occupied)/공실(vacant) × 임대/매각/둘다 — 필수 차단·자동계산·라벨 구분.
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`

test.describe('E1p 매각 수익률 필수·계산·라벨', () => {
  test.beforeEach(async ({ page }) => { await mockGemini(page) })

  // 예시✦로 주소·기본값 채운 뒤 목적을 매각으로 전환 (Daum 외부호출 없이 폼 채움)
  async function seedSaleForm(page) {
    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click()
    await page.getByRole('button', { name: '매각 상가 자체 매매' }).click() // 매각(둘다와 구분)
  }

  test('매각 필수 차단: 매매가·임차현황 없으면 다음 불가 → 채우면 가능', async ({ page }) => {
    await seedSaleForm(page)
    const next = page.getByRole('button', { name: /다음 — 모두가 초안 작성/ })
    await expect(next).toBeDisabled() // 매매가·occupancy 없음
    await page.getByTestId('sale-price').fill('80000')
    await expect(next).toBeDisabled() // 아직 임차현황 미선택
    await page.getByTestId('occ-occupied').click()
    await expect(next).toBeEnabled() // 매매가+임차현황+보증금/월세(예시값) 모두 충족
  })

  test('임차 있음(occupied): 수익률 자동계산 + "수익률" 라벨', async ({ page }) => {
    await seedSaleForm(page)
    await page.getByTestId('sale-price').fill('80000')
    await page.getByTestId('sale-rent').fill('250')
    await page.getByTestId('occ-occupied').click()
    // 250×12 ÷ 80000 × 100 = 3.75 → 3.8%
    await expect(page.getByTestId('yield-label')).toHaveText('수익률')
    await expect(page.getByTestId('yield-value')).toHaveText('3.8%')
  })

  test('공실(vacant): "예상 수익률" 라벨 + 예상 보증금/월세 표기', async ({ page }) => {
    await seedSaleForm(page)
    await page.getByTestId('occ-vacant').click()
    await expect(page.getByTestId('yield-label')).toHaveText('예상 수익률')
    await expect(page.getByText('예상 보증금')).toBeVisible()
    await expect(page.getByText('예상 월세')).toBeVisible()
  })

  test('임대 단독: 임차현황 선택 없이도 다음 진행(비필수)', async ({ page }) => {
    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click() // rent 데모(보증금·월세 채움)
    await expect(page.getByRole('button', { name: /다음 — 모두가 초안 작성/ })).toBeEnabled()
  })

  test('저장 payload: occupancy + 자동 cap_rate 기록', async ({ page }) => {
    let inserted = null
    await page.route(LISTINGS, async r => {
      if (r.request().method() === 'POST') {
        inserted = JSON.parse(r.request().postData())
        await r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'y1' }]) })
      } else if (r.request().method() === 'PATCH') {
        await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      } else {
        await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
    })
    await seedSaleForm(page)
    await page.getByTestId('sale-price').fill('80000')
    await page.getByTestId('sale-rent').fill('250')
    await page.getByTestId('occ-occupied').click()

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

    const row = Array.isArray(inserted) ? inserted[0] : inserted
    expect(row.occupancy).toBe('occupied')
    expect(row.deal_type).toBe('sale')
    expect(row.cap_rate).toBe(3.8) // 250×12÷80000×100
  })
})

test.describe('E2L 수익률 라벨 구분', () => {
  const base = {
    id: 'e2l-y', listing_type: 'landlord', deal_type: 'sale', status: 'published',
    address: '서울 마포구 서교동 5', floor: '1층', area: '40',
    sale_price: '80000', cap_rate: 3.8, review_choices: {}, image_urls: [], device_id: 'x',
  }
  function mockOne(page, row) {
    return page.route(LISTINGS, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) })
      : r.fulfill({ status: 204, body: '' }))
  }

  test('occupied → "수익률"', async ({ page }) => {
    await mockOne(page, { ...base, occupancy: 'occupied' })
    await page.goto('/e2l/e2l-y')
    await expect(page.getByTestId('e2l-yield-label')).toHaveText('수익률')
    await expect(page.getByText('현 임차인 계약 기준 수익률이에요')).toBeVisible()
  })

  test('vacant → "예상 수익률"', async ({ page }) => {
    await mockOne(page, { ...base, occupancy: 'vacant' })
    await page.goto('/e2l/e2l-y')
    await expect(page.getByTestId('e2l-yield-label')).toHaveText('예상 수익률')
    await expect(page.getByText('공실 · 예상(시세) 기준 수익률이에요')).toBeVisible()
  })
})
