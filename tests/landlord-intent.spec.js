/**
 * 임대인 홈 의도 개인화 (ORDER-landlord-intent-align-v1)
 * 의도 3종(공실=vacant/매각=sale/둘다=both) × 등록 전(A3 답변)/후(실 deal_type 승격)
 * — 헤더·가이드 문의 어휘·빈 상태 CTA가 의도를 따른다.
 */
import { test, expect } from './fixtures.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`
const CONVERSATIONS = `${SUPABASE}/conversations*`
const MESSAGES = `${SUPABASE}/messages*`
const DEV = 'landlord-intent-dev'

function seedStatus(page, status) {
  return page.addInitScript(([id, st]) => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord', region: '서울', status: st }))
  }, [DEV, status])
}
function mockListings(page, rows) {
  return page.route(LISTINGS, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    : r.fulfill({ status: 204, body: '' }))
}
function mockEmpty(page) {
  page.route(CONVERSATIONS, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  page.route(MESSAGES, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
}
const L = (deal) => ({
  id: 'L1', listing_type: 'landlord', deal_type: deal, status: 'published',
  address: '서울 마포구 서교동 331', deposit: '3000', monthly_rent: '200', sale_price: '80000',
  review_choices: {}, image_urls: [], device_id: DEV, created_at: '2026-07-11T00:00:00Z',
})

test.describe('임대인 홈 의도 — 등록 전 (A3 답변 기준)', () => {
  test.beforeEach(async ({ page }) => { mockEmpty(page); await mockListings(page, []) })

  test('공실(vacant): 임차인 찾는 중 · 임차 문의받기 · 임차인 찾기 CTA', async ({ page }) => {
    await seedStatus(page, 'vacant')
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-headline')).toHaveText('서울 상가 임차인 찾는 중')
    await expect(page.getByTestId('landlord-cta-label')).toHaveText('상가 등록하고 임차인 찾기')
    await expect(page.getByTestId('guide-inquiry')).toContainText('임차 문의받기')
  })

  test('매각(sale): 매각 준비 중 · 매수 문의받기 · 매수자 찾기 CTA', async ({ page }) => {
    await seedStatus(page, 'sale')
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-headline')).toHaveText('서울 상가 매각 준비 중')
    await expect(page.getByTestId('landlord-cta-label')).toHaveText('상가 등록하고 매수자 찾기')
    await expect(page.getByTestId('guide-inquiry')).toContainText('매수 문의받기')
  })

  test('둘 다(both): 임대·매매 준비 중 · 문의받기(중립) · 등록하기 CTA', async ({ page }) => {
    await seedStatus(page, 'both')
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-headline')).toHaveText('상가 임대·매매 준비 중')
    await expect(page.getByTestId('landlord-cta-label')).toHaveText('상가 등록하기')
    await expect(page.getByTestId('guide-inquiry')).toContainText('문의받기')
    await expect(page.getByTestId('guide-inquiry')).not.toContainText('임차')
    await expect(page.getByTestId('guide-inquiry')).not.toContainText('매수')
  })
})

test.describe('임대인 홈 의도 — 등록 후 (실 deal_type 승격)', () => {
  test.beforeEach(async ({ page }) => { mockEmpty(page) })

  test('실상가 매각이 A3 공실답변을 덮어쓴다: 상가 1개 · 매각 + 매수 문의받기', async ({ page }) => {
    await seedStatus(page, 'vacant')          // A3는 공실이라 답했지만
    await mockListings(page, [L('sale')])     // 실제 등록은 매각 상가
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-headline')).toHaveText('매매 1개 진행 중') // 실상가 매각 승격
    await expect(page.getByTestId('guide-inquiry')).toContainText('매수 문의받기')
  })

  test('실상가 임대: 상가 1개 · 임대 + 임차 문의받기', async ({ page }) => {
    await seedStatus(page, 'both')
    await mockListings(page, [L('lease')])
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-headline')).toHaveText('임대 1개 진행 중')
    await expect(page.getByTestId('guide-inquiry')).toContainText('임차 문의받기')
  })
})
