/**
 * 임대인 홈 콘텐츠 블록 (ORDER-landlord-content-v1)
 * 오늘의 한 마디(landlord_coaching) / 임대인 필독(landlord_guide) / 상가 시장 동향(market_news 부동산)
 * — 렌더 + 0건 준비중 폴백.
 */
import { test, expect } from './fixtures.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`
const CONVERSATIONS = `${SUPABASE}/conversations*`
const DAILY = `${SUPABASE}/daily_contents*`
const NEWS = `${SUPABASE}/market_news*`
const DEV = 'landlord-content-dev'

function seed(page) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord', region: '서울' }))
  }, DEV)
}
function baseMocks(page) {
  page.route(LISTINGS, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  page.route(CONVERSATIONS, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
}
// content_type으로 분기해 daily_contents 응답
function mockDaily(page, { coaching = [], guide = [] }) {
  return page.route(DAILY, r => {
    const url = r.request().url()
    const rows = url.includes('landlord_coaching') ? coaching : url.includes('landlord_guide') ? guide : []
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
  })
}
function mockNews(page, rows) {
  return page.route(NEWS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) }))
}
const row = (body, i = 0) => ({ body, content_date: '2026-07-23', display_order: i })

test.describe('임대인 홈 콘텐츠 블록', () => {
  test.beforeEach(async ({ page }) => { await seed(page); baseMocks(page) })

  test('실콘텐츠: 한 마디·필독·뉴스 렌더', async ({ page }) => {
    await mockDaily(page, {
      coaching: [row('오늘 계약서 특약을 한 번 확인해 보세요')],
      guide: [row('상가임대차보호법 갱신요구권을 확인하세요', 0), row('공실 기간에는 관리 상태 사진을 갱신하세요', 1)],
    })
    await mockNews(page, [{ title: '상가 공실률 상승세', link: 'https://ex.com/1', collected_at: '2026-07-23T00:00:00Z' }])

    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-coaching')).toHaveText('오늘 계약서 특약을 한 번 확인해 보세요')
    await expect(page.getByTestId('landlord-guide')).toContainText('갱신요구권')
    await expect(page.getByTestId('landlord-news')).toContainText('상가 공실률 상승세')
  })

  test('0건: 전부 준비중 폴백 (더미 수치 없음)', async ({ page }) => {
    await mockDaily(page, { coaching: [], guide: [] })
    await mockNews(page, [])

    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-coaching')).toHaveCount(0)
    await expect(page.getByTestId('landlord-guide')).toHaveCount(0)
    await expect(page.getByTestId('landlord-news')).toHaveCount(0)
    await expect(page.getByText('임대인 맞춤 코칭을 준비 중이에요')).toBeVisible()
    await expect(page.getByText('임대 노하우 콘텐츠를 준비하고 있어요')).toBeVisible()
    await expect(page.getByText('상가 시장 동향 뉴스를 수집하고 있어요')).toBeVisible()
  })
})
