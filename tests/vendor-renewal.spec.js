/**
 * 기업회원 갱신 리포트 (ORDER 2026-09-13 파트 B5)
 * ① 문의 0건 → 0으로 표시하고 카드 숨기지 않음 ② 성사 2건 → 성사 줄만 숨김 ③ 리포트에 사용자 이름·연락처 없음
 * ④ D-7 1회만 발송 ⑤ 할인·만류 문구 lint 금지어 → 실패
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import { metrics, sourceBreakdown, reportLines, reportDue, opsWatchList, renewalRate, daysUntil } from '../src/lib/vendorRenewalRules.js'
import { RENEWAL, RENEWAL_COPY } from '../config/vendorRenewal.ts'
import { findCopyViolations } from '../scripts/lint-copy.mjs'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const VENDOR = { id: 'v-1', device_id: 'vendor-dev', user_id: 'vendor-user', listing_type: 'business', status: 'published', shop_name: '서교 인테리어', biz_tags: [], address: '서울 마포구 서교동 1' }
const D = n => new Date(Date.now() + n * 864e5).toISOString()
const SUB = (over = {}) => ({ id: 's1', vendor_id: 'v-1', vendor_user_id: 'vendor-user', tier: 'vendor_paid', renews_at: D(5), canceled_at: null, last_report_sent_at: null, ...over })
const ROW = (over = {}) => ({ id: 'i1', vendor_id: 'v-1', source: 'demand_signal', status: 'sent', channel: 'app', conversation_id: null, created_at: new Date().toISOString(), ...over })

test.describe('룰 유닛', () => {
  test('①② 지표·문안: 0건도 그대로 표시, 성사 3건 미만이면 성사 줄만 숨김, 출처 내역은 있는 것만', () => {
    const zero = reportLines([], { renewsAt: D(5) })
    expect(zero.lines[0]).toBe(RENEWAL_COPY.line.replace('{months}', '3').replace('{n}', '0').replace('{m}', '0').replace('{k}', '0').replace('{p}', '0'))
    expect(zero.due).toBe(true)                       // 0건이어도 카드는 뜬다
    expect(zero.lines.some(l => l.includes('성사'))).toBe(false)
    const rows = [ROW(), ROW({ id: 'i2', status: 'replied' }), ROW({ id: 'i3', status: 'opened', conversation_id: 'c1', source: 'listing_ask' }), ROW({ id: 'i4', channel: 'phone', source: 'sales_card' }), ROW({ id: 'i5', status: 'closed' }), ROW({ id: 'i6', status: 'closed' })]
    const m = metrics(rows)
    expect(m).toMatchObject({ received: 6, replied: 4, opened: 1, phone: 1, deals: 2 })
    const r = reportLines(rows, { renewsAt: D(3) })
    expect(r.lines[0]).toContain('받은 문의 6건')
    expect(r.lines[1]).toContain('모두에 질문하기 1')
    expect(r.lines.some(l => l.includes('성사'))).toBe(false)   // ② 성사 2건 → 숨김
    const withDeals = reportLines([...rows, ROW({ id: 'i7', status: 'closed' })], { renewsAt: D(3) })
    expect(withDeals.lines.at(-1)).toBe(RENEWAL_COPY.dealLine.replace('{d}', '3'))
    expect(RENEWAL.MIN_DEALS_TO_SHOW).toBe(3)
    expect(sourceBreakdown(rows)[0].n).toBeGreaterThanOrEqual(1)
  })

  test('④ D-7 1회만 발송 / D-14 운영 목록은 문의 0건·응답 0% / 갱신율', () => {
    expect(daysUntil(D(5))).toBe(5)
    expect(reportDue([SUB()]).length).toBe(1)
    expect(reportDue([SUB({ last_report_sent_at: new Date().toISOString() })]).length).toBe(0)  // 이미 보냄
    expect(reportDue([SUB({ renews_at: D(20) })]).length).toBe(0)                                // 아직 이름
    expect(reportDue([SUB({ tier: 'vendor_free' })]).length).toBe(0)                             // 유료 입점만
    expect(reportDue([SUB({ canceled_at: new Date().toISOString() })]).length).toBe(0)
    const subs = [SUB({ renews_at: D(10) }), SUB({ id: 's2', vendor_id: 'v-2', renews_at: D(10) }), SUB({ id: 's3', vendor_id: 'v-3', renews_at: D(10) })]
    const rowsBy = { 'v-1': [], 'v-2': [ROW({ vendor_id: 'v-2' })], 'v-3': [ROW({ vendor_id: 'v-3', status: 'replied' })] }
    const ops = opsWatchList(subs, rowsBy).map(x => x.sub.vendor_id)
    expect(ops).toEqual(['v-1', 'v-2'])   // 문의 0건 / 응답률 0%
    const now = new Date()
    const rate = renewalRate([{ tier: 'vendor_paid', renews_at: now.toISOString() }, { tier: 'vendor_paid', renews_at: now.toISOString(), canceled_at: now.toISOString() }], now)
    expect(rate).toMatchObject({ due: 2, renewed: 1 })
    expect(renewalRate([], now)).toBeNull()
  })

  test('⑤ lint: 할인·만류·성사 약속 문구 → 실패, 실제 파일 위반 0', () => {
    for (const bad of ['지금 해지하면 손해예요', '문의가 3배 늘어요', '진성 문의예요']) {
      expect(findCopyViolations(`const t = "${bad}"`, 'src/components/VendorRenewalCard.jsx').length, bad).toBeGreaterThan(0)
    }
    for (const f of ['config/vendorRenewal.ts', 'src/lib/vendorRenewalRules.js', 'src/lib/vendorRenewal.js', 'src/components/VendorRenewalCard.jsx', 'src/screens/VendorOpsPage.jsx']) {
      expect(findCopyViolations(readFileSync(f, 'utf8'), f), f).toEqual([])
      expect(findPricingSortViolations(readFileSync(f, 'utf8'), f), f).toEqual([])
    }
  })
})

test('①③ 기업회원 홈 카드: 문의 0건도 숫자로 표시되고, 리포트 DOM 에 사용자 이름·연락처가 없다', async ({ page }) => {
  await mockGemini(page); await mockMarketData(page)
  await seedSession(page, { id: 'vendor-user' })
  await page.addInitScript(() => { localStorage.setItem('modu_device_id', 'vendor-dev'); localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'business' })) })
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([VENDOR]) }))
  await page.route(`${REST}/vendor_subscriptions*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SUB({ renews_at: D(4) })]) }))
  await page.route(`${REST}/inquiry_ledger*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/a7/business')
  const card = page.getByTestId('renewal-card')
  await expect(card).toBeVisible()
  await expect(card.getByTestId('renewal-line')).toContainText('받은 문의 0건')
  await expect(card.getByTestId('renewal-days')).toHaveText('갱신까지 4일')
  const html = await card.innerHTML()
  for (const leak of ['010-', '@', 'device', 'user_id']) expect(html).not.toContain(leak)
  await expect(card).not.toContainText(/할인|지금 해지|놓치지/)
})
