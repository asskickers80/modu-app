/**
 * 매물 복제 등록 수정 (ORDER-listing-duplicate-fix-v1, 급함)
 * 실증: E1p 공개 저장의 '대시보드로 이동' 더블탭 → 지오코딩 await 사이 두 번째 실행 → INSERT 2행.
 * 원칙: 매물은 하나, 노출은 여럿 — 홈은 자기 축 매물만(listing_type 필터).
 */
import { test, expect } from './fixtures.js'
import { mockGemini, agreeListingTerms } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`

async function runE1pToGate(page) {
  await page.goto('/e1p/1')
  await page.getByRole('button', { name: '예시 ✦' }).click()
  await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
  const next = page.getByRole('button', { name: /다음 — 도면·서류 추가/ })
  await expect(next).toBeEnabled({ timeout: 15000 })
  await next.click()
  await page.getByRole('button', { name: '다음 — 완성도 확인' }).click()
  await agreeListingTerms(page)
  await page.getByRole('button', { name: '상가 공개하기' }).click()
  await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
}

test('E1p 공개 저장: "대시보드로 이동" 더블탭에도 INSERT 1회 (행 복제 금지)', async ({ page }) => {
  await mockGemini(page)
  let inserts = 0
  await page.route(LISTINGS, async r => {
    if (r.request().method() === 'POST') {
      inserts++
      await new Promise(res => setTimeout(res, 250)) // 저장 지연 — 더블탭 틈을 재현
      return r.fulfill({ status: 201, contentType: 'application/json', body: '[{"id":"dup-1"}]' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  // 지오코딩 지연 — 실기기에서 더블탭이 끼던 구간
  await page.route('**/api/geocode', async r => {
    await new Promise(res => setTimeout(res, 300))
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lat: 37.5, lng: 126.9 }) })
  })

  await runE1pToGate(page)
  const goBtn = page.getByRole('button', { name: '대시보드로 이동' })
  // 더블탭 재현 — 첫 클릭 직후 연타 (비활성·언마운트여도 짧게 강제 시도)
  await goBtn.click()
  await goBtn.click({ force: true, timeout: 300 }).catch(() => {})
  await goBtn.click({ force: true, timeout: 300 }).catch(() => {})
  await expect(page).toHaveURL(/\/a7\/landlord/, { timeout: 10000 })
  await page.waitForTimeout(500) // 늦은 두 번째 INSERT가 있다면 잡히게
  expect(inserts, `INSERT ${inserts}회 — 행 복제 발생`).toBe(1)
})

test('양도인 홈 조회: listing_type=seller 필터 필수 (landlord 행 미노출)', async ({ page }) => {
  await mockGemini(page)
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'dup-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', bizType: '카페' }))
  })
  let listQuery = null
  await page.route(LISTINGS, r => {
    const url = r.request().url()
    if (r.request().method() === 'GET' && url.includes('device_id=eq.dup-dev')) listQuery = url
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route(`${SUPABASE}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route(`${SUPABASE}/daily_contents*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route(`${SUPABASE}/market_news*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await page.goto('/a7/seller')
  await expect.poll(() => listQuery).not.toBeNull()
  expect(listQuery).toContain('listing_type=eq.seller')
})

test('임대인 홈 조회: listing_type=landlord 필터 유지 (seller 행 미노출)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'dup-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
  })
  let listQuery = null
  await page.route(LISTINGS, r => {
    const url = r.request().url()
    if (r.request().method() === 'GET' && url.includes('device_id=eq.dup-dev')) listQuery = url
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  for (const t of ['conversations', 'daily_contents', 'market_news']) {
    await page.route(`${SUPABASE}/${t}*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  }
  await page.goto('/a7/landlord')
  await expect.poll(() => listQuery).not.toBeNull()
  expect(listQuery).toContain('listing_type=eq.landlord')
})
