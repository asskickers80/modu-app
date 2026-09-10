/**
 * 정부 지원 연결 카드 (ORDER 2026-09-10 파트 D)
 * ① sbiz365_ai 비활성 → 버튼 sbiz24 1개 ② 전부 비활성 → 카드 없음 ③ 클릭 → 이벤트 1건, URL에 사용자 파라미터 없음
 * ④ 상권 섹션 링크 1줄 존재·소개글 본문엔 없음 ⑤ "AI" 단어 lint
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import { activeGovLinks, GOV_LINKS } from '../config/govLinks.ts'
import { findCopyViolations } from '../scripts/lint-copy.mjs'
import { kstToday, addDays } from '../src/lib/weekUtil.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const TODAY = kstToday()
const back = (n) => addDays(TODAY, -n)
const salesDrop = Array.from({ length: 56 }, (_, i) => ({ sale_date: back(i), revenue: i < 30 ? 780000 : 1000000 }))

test.describe('유닛', () => {
  test('② 참조 키가 전부 비활성이면 빈 배열(카드 미렌더) / 기본 config는 sbiz365_ai 비활성', () => {
    expect(GOV_LINKS.sbiz365_ai.active).toBe(false)
    expect(activeGovLinks(['sbiz365_ai', 'sbiz24']).map(l => l.key)).toEqual(['sbiz24'])
    const allOff = { a: { key: 'a', label: 'A', url: 'https://a', active: false }, b: { key: 'b', label: 'B', url: 'https://b', active: false } }
    expect(activeGovLinks(['a', 'b'], allOff)).toEqual([])
    expect(activeGovLinks(['없는키'])).toEqual([])
  })

  test('⑤ 문안 lint — "AI"·효능 문구 위반 검출, 실제 config·카드 파일은 위반 0', () => {
    expect(findCopyViolations('<p>AI가 골라드려요</p>')).toHaveLength(1)
    expect(findCopyViolations("label: '지원금 받으세요'")).toHaveLength(1)
    expect(findCopyViolations('문의가 2배 늘어요')).toHaveLength(2)
    expect(findCopyViolations('// AI 호출 없음 — 주석은 통과')).toHaveLength(0)
    for (const f of ['config/govLinks.ts', 'config/completeness.ts', 'src/components/GovLinkCard.jsx', 'src/components/CompletenessNextCard.jsx']) {
      expect(findCopyViolations(readFileSync(f, 'utf8'), f)).toEqual([])
    }
  })
})

async function setupSalesSheet(page) {
  await mockGemini(page)
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/rest/v1/daily_sales*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(salesDrop) }))
  const events = []
  await page.route(`${SUPABASE}/rest/v1/events*`, r => {
    if (r.request().method() === 'POST') events.push(JSON.parse(r.request().postData() || '{}'))
    return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
  })
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'gov-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ name: '김사장', category: 'operating',
      roleData: { operating: { bizLabel: '카페', region: '서울', region_sub: '마포구' } } }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_op', category: 'operating', name: '김사장', active: true }]))
  })
  await page.goto('/a7/operating')
  await page.getByTestId('sales-service-cta').click()
  return { events }
}

test('① 매출 시트 맨 아래 회색 링크 → 카드에 소상공인24 버튼 1개 (도우미는 비활성이라 없음)', async ({ page }) => {
  await setupSalesSheet(page)
  const sheet = page.getByTestId('sales-service-sheet')
  await expect(sheet.getByTestId('sales-chip-transfer')).toBeVisible()
  await sheet.getByTestId('gov-link-toggle').click()
  const card = sheet.getByTestId('gov-link-card')
  await expect(card).toBeVisible()
  await expect(card.getByTestId('gov-link-sbiz24')).toHaveText('소상공인24 ↗')
  await expect(card.getByTestId('gov-link-sbiz365_ai')).toHaveCount(0)
  await expect(card.locator('a')).toHaveCount(1)
  await expect(card).toContainText('정부 사이트로 이동해요 · 모두는 입력 내용을 저장하지 않아요')
  await expect(card).not.toContainText('AI')
})

test('③ 링크 클릭 → gov_link_click 이벤트 1건, href 는 config 값 그대로(사용자 파라미터 없음)', async ({ page }) => {
  const { events } = await setupSalesSheet(page)
  await page.getByTestId('gov-link-toggle').click()
  const link = page.getByTestId('gov-link-sbiz24')
  await expect(link).toHaveAttribute('href', 'https://www.sbiz24.kr')
  await expect(link).toHaveAttribute('target', '_blank')
  // 새 창 이동은 막고 클릭 핸들러만 실행
  await link.evaluate(a => { a.addEventListener('click', e => e.preventDefault(), { once: true }); a.click() })
  await expect.poll(() => events.filter(e => e.event_name === 'gov_link_click').length).toBe(1)
  const click = events.find(e => e.event_name === 'gov_link_click')
  expect(click.payload).toMatchObject({ place: 'sales_sheet', key: 'sbiz24' })
  expect(events.filter(e => e.event_name === 'gov_link_shown')).toHaveLength(1)
  const href = await link.getAttribute('href')
  expect(href).not.toMatch(/[?&]/) // 파라미터 자체가 없다
})

test('④ 매물 상세 상권 섹션 끝에 소상공인365 링크 1줄, 소개글 본문에는 없음', async ({ page }) => {
  await mockGemini(page)
  await mockMarketData(page)
  await seedSession(page)
  const listing = {
    id: 'gov-l1', device_id: 'other-dev', status: 'published', shop_name: '상권 카페', shop_name_public: true,
    address: '서울 마포구 서교동 332-4 1층', deposit: '3000', monthly_rent: '200', transfer_fee: '2500', transfer_type: 'full',
    area: '33', category_main: '카페·베이커리', ai_draft: { intro: '조용한 골목 카페입니다.' }, review_choices: {}, edited_texts: {},
    image_urls: [], facilities: [], created_at: new Date().toISOString(),
  }
  await page.route(`${SUPABASE}/rest/v1/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listing) }))
  await page.addInitScript(() => localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup' })))
  await page.goto('/e2/gov-l1')
  await expect(page.getByText('📊 주변 실거래 참고')).toBeVisible()
  const link = page.getByTestId('gov-text-link')
  await expect(link).toHaveCount(1)
  await expect(link).toHaveAttribute('data-place', 'listing_market')
  await expect(link.getByTestId('gov-link-sbiz365_home')).toHaveAttribute('href', 'https://bigdata.sbiz.or.kr')
  await expect(link).toContainText('이 동네 상권을 더 자세히 보려면 소상공인365')
  // 소개글 본문(ad-body)에는 없다
  const bodies = await page.locator('.ad-body').allTextContents()
  expect(bodies.join(' ')).not.toContain('소상공인365')
})
