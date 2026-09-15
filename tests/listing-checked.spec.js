/**
 * 최근 확인일 — [아직 있어요] (2026-09-15 후속 조각)
 * ① 본인 매물: 버튼 노출 → 누르면 last_checked_at 저장 + 문구가 확인일로 바뀜
 * ② 쿨다운(7일 이내): 버튼 비활성 + "n일 뒤에 다시" 안내, 재촉·경고 문구 없음
 * ③ 컬럼 미실행(저장 400): 조용히 실패 안내 1줄, 화면은 그대로 (등록일로 대체하지 않는다)
 * ④ 방문자: 확인 기록이 있으면 "M월 D일 확인된 매물"만, 버튼·등록일 없음
 * ⑤ 문안 규칙: 오래됨·경고·독촉 표현 없음 / lint 통과
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import { checkedLabel, daysSinceChecked, canCheckAgain } from '../src/lib/listingDates.js'
import { FRESHNESS, FRESHNESS_COPY } from '../config/freshness.ts'
import { findSellerFirstViolations } from '../scripts/lint-seller-first.mjs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const D = n => new Date(Date.now() - n * 864e5).toISOString()
const L = (over = {}) => ({
  id: 'ck-1', device_id: 'seller-dev', user_id: 'seller-user', listing_type: 'seller', status: 'published',
  shop_name: '확인 카페', shop_name_public: true, address: '서울 마포구 서교동 332-4 1층', category_main: '카페·베이커리',
  deposit: '3000', monthly_rent: '200', transfer_fee: '3500', transfer_type: 'full', area: '33', floor: '1',
  ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], facilities: [], created_at: D(200), ...over,
})

test.describe('룰 유닛', () => {
  test('②⑤ 쿨다운 판정과 문안: 재촉·경고·등록 경과일 표현 없음', () => {
    expect(FRESHNESS.COOLDOWN_DAYS).toBe(7)
    expect(canCheckAgain(L(), FRESHNESS.COOLDOWN_DAYS)).toBe(true)                       // 한 번도 안 눌렀으면 가능
    expect(canCheckAgain(L({ last_checked_at: D(1) }), FRESHNESS.COOLDOWN_DAYS)).toBe(false)
    expect(canCheckAgain(L({ last_checked_at: D(8) }), FRESHNESS.COOLDOWN_DAYS)).toBe(true)
    expect(daysSinceChecked(L({ last_checked_at: D(3) }))).toBe(3)
    expect(daysSinceChecked(L())).toBeNull()
    expect(checkedLabel(L({ last_checked_at: '2026-09-15T01:00:00Z' }))).toBe('9월 15일 확인된 매물')
    for (const text of Object.values(FRESHNESS_COPY)) {
      for (const bad of ['오래', '방치', '확인 안', '늦', '경고', '손해', '등록한 지', '올라온 지']) {
        expect(text, `${text} / ${bad}`).not.toContain(bad)
      }
    }
    for (const f of ['src/components/ListingCheckButton.jsx', 'config/freshness.ts', 'src/lib/listingDates.js']) {
      expect(findSellerFirstViolations(readFileSync(f, 'utf8'), f), f).toEqual([])
    }
    // 스키마는 SQL 로만 제시한다(대표 실행) — 뷰 갱신까지 포함해야 방문자에게 보인다
    const sql = readFileSync('docs/SQL-last-checked.sql', 'utf8')
    expect(sql).toContain('add column if not exists last_checked_at')
    expect(sql).toContain('create or replace view listings_visible')
    expect(sql).toContain('l.last_checked_at,')
  })
})

async function base(page, { listing = L(), device = 'seller-dev', profile = { category: 'seller' }, uid = 'seller-user', patchStatus = 204 } = {}) {
  await mockGemini(page); await mockMarketData(page)
  await seedSession(page, { id: uid })
  await page.addInitScript(([d, p]) => { localStorage.setItem('modu_device_id', d); localStorage.setItem('modu_user_profile', JSON.stringify(p)) }, [device, profile])
  const st = { patched: [] }
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  const one = url => /[?&]id=eq\./.test(url)
  const handler = r => {
    const m = r.request().method()
    if (m === 'PATCH') {
      const body = JSON.parse(r.request().postData() || '{}')
      if (body.last_checked_at) {
        st.patched.push(body)
        if (patchStatus !== 204) return r.fulfill({ status: patchStatus, contentType: 'application/json', body: JSON.stringify({ code: '42703', message: 'column listings.last_checked_at does not exist' }) })
      }
      return r.fulfill({ status: 204, body: '' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(one(r.request().url()) ? listing : [listing]) })
  }
  await page.route(`${REST}/listings*`, handler)
  await page.route(`${REST}/listings_visible*`, handler)
  return st
}

test('① 본인 매물: [아직 있어요] → 저장되고 문구가 확인일로 바뀐다', async ({ page }) => {
  const st = await base(page)
  await page.goto('/e2/ck-1')
  const box = page.getByTestId('listing-check')
  await expect(box.getByTestId('listing-check-button')).toHaveText(FRESHNESS_COPY.button)
  await expect(box.getByTestId('listing-check-hint')).toContainText('확인된 매물')  // 누르면 이렇게 보인다는 안내
  await box.getByTestId('listing-check-button').click()
  await expect.poll(() => st.patched.length).toBe(1)
  expect(st.patched[0].last_checked_at).toBeTruthy()
  await expect(box.getByTestId('listing-check-button')).toHaveText(FRESHNESS_COPY.buttonDone)
  await expect(box.getByTestId('listing-check-hint')).toContainText('확인된 매물')
  await expect(box.getByTestId('listing-check-button')).toBeDisabled()               // 바로 또 누를 이유 없음
})

test('② 최근에 눌렀으면: 비활성 + "n일 뒤에 다시" 안내만 (경고·독촉 없음)', async ({ page }) => {
  await base(page, { listing: L({ last_checked_at: D(2) }) })
  await page.goto('/e2/ck-1')
  const box = page.getByTestId('listing-check')
  await expect(box.getByTestId('listing-check-button')).toBeDisabled()
  await expect(box.getByTestId('listing-check-hint')).toContainText('확인된 매물')   // 사실만 보여준다
  await expect(box).not.toContainText(/오래|방치|늦|경고|다시 확인/)                   // 남은 날짜 카운트다운·재촉 없음
})

test('③ 컬럼이 아직 없으면(400): 안내 1줄만, 화면은 그대로', async ({ page }) => {
  const st = await base(page, { patchStatus: 400 })
  await page.goto('/e2/ck-1')
  await page.getByTestId('listing-check-button').click()
  await expect.poll(() => st.patched.length).toBe(1)
  await expect(page.getByTestId('listing-check-button')).toHaveText(FRESHNESS_COPY.button)   // 상태가 바뀌지 않는다
  await expect(page.getByTestId('owner-notice-bar')).toBeVisible()                            // 화면은 멀쩡
  await expect(page.locator('main')).not.toContainText('올라온 지')
})

test('④ 방문자: 확인일만 보이고 버튼·등록일은 없다', async ({ page }) => {
  await base(page, { listing: L({ last_checked_at: D(1) }), device: 'buyer-dev', profile: { category: 'startup' }, uid: 'buyer-user' })
  await page.goto('/e2/ck-1')
  await expect(page.getByTestId('listing-checked-at')).toContainText('확인된 매물')
  await expect(page.getByTestId('listing-check-button')).toHaveCount(0)
  await expect(page.getByTestId('owner-registered-at')).toHaveCount(0)
})
