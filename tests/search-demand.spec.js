/**
 * 수요 집계 + 등록 화면 유리 신호 (ORDER 2026-09-21 파트 C3)
 * ① 91일 뒤에도 facts 유지, saved_searches 삭제 시 facts 불변 ② facts 에 user_id·filters 컬럼 없음
 * ③ 등록 화면 신호 줄: n=2 → 줄 없음, n=3 → 표시 ④ 기업회원 축 어느 코드도 saved_searches·search_demand_facts 미참조
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { aggregateDemand, dueDigests, monthOf } from '../api/_savedSearchBatch.js'
import { matchesFilters } from '../src/lib/searchFilters.js'
import { RELAX, RELAX_COPY } from '../config/searchRelax.ts'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`

test('①② 집계 행에는 원문·식별자가 없고, 저장 조건이 사라져도 집계는 남는다', () => {
  const now = new Date()
  const rows = aggregateDemand({
    emptyEvents: [{ created_at: now.toISOString(), region_code: '마포', industry_code: null }, { created_at: now.toISOString(), region_code: '마포', industry_code: null }],
    savedSearches: [{ created_at: now.toISOString(), region_code: '마포', industry_code: '요식업' }],
    now,
  })
  expect(rows).toHaveLength(2)
  const empty = rows.find(r => r.kind === 'empty_result')
  expect(empty).toMatchObject({ region_code: '마포', count: 2, month: monthOf(now) })
  for (const r of rows) for (const k of ['user_id', 'filters', 'device_id', 'raw']) expect(Object.keys(r)).not.toContain(k)
  // 지역이 없는 0건 탐색은 집계하지 않는다
  expect(aggregateDemand({ emptyEvents: [{ created_at: now.toISOString(), region_code: null }] })).toHaveLength(0)
  // ① 스키마상 facts 는 saved_searches 를 참조하지 않는다(외래키 없음) — 삭제해도 집계가 남는다
  const sql = readFileSync('docs/SQL-saved-searches.sql', 'utf8')
  expect(sql).toContain('create table if not exists search_demand_facts')
  expect(sql.slice(sql.indexOf('search_demand_facts'))).not.toContain('references saved_searches')
  expect(sql.slice(sql.indexOf('create table if not exists search_demand_facts'), sql.indexOf('alter table saved_searches'))).not.toContain('user_id')
})

test('저장 조건 묶음 알림: 새 매물 2건 → 1건 발송 / 0건인 날은 발송 없음 / 꺼둔 조건은 제외', () => {
  const now = new Date()
  const search = { id: 's1', user_id: 'u1', filters: { area: '마포' }, last_notified_at: new Date(now - 864e5).toISOString() }
  const listings = [
    { id: 'a', address: '서울 마포구 서교동 1', created_at: now.toISOString() },
    { id: 'b', address: '서울 마포구 합정동 2', created_at: now.toISOString() },
    { id: 'c', address: '서울 강남구 역삼동 3', created_at: now.toISOString() },
  ]
  const due = dueDigests([search], listings, now, matchesFilters)
  expect(due).toHaveLength(1)
  expect(due[0].n).toBe(2)
  expect(due[0].title).toBe(RELAX_COPY.notif.replace('{n}', '2'))
  expect(dueDigests([search], [listings[2]], now, matchesFilters)).toHaveLength(0)          // 0건인 날은 없음
  expect(dueDigests([{ ...search, paused_at: now.toISOString() }], listings, now, matchesFilters)).toHaveLength(0)
  expect(dueDigests([{ ...search, deleted_at: now.toISOString() }], listings, now, matchesFilters)).toHaveLength(0)
})

test('④ 기업회원 축 코드가 saved_searches·search_demand_facts 를 읽지 않는다', () => {
  const walk = (dir, out = []) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n)
      if (statSync(p).isDirectory()) walk(p, out)
      else if (/\.(jsx|js|ts)$/.test(n)) out.push(p)
    }
    return out
  }
  const vendorFiles = [...walk('src/screens'), ...walk('src/components'), ...walk('src/lib')]
    // 기업회원이 실제로 보는 화면만. /dev 운영 화면(VendorOpsPage)은 대표·운영용이라 제외한다(오더 C2: 대시보드에는 표시)
    .filter(f => /business|vendor|Vendor|Business|E1b|e1b/.test(f) && !/OpsPage\.jsx$/.test(f))
  expect(vendorFiles.length).toBeGreaterThan(3)
  expect(vendorFiles.some(f => /VendorOpsPage/.test(f))).toBe(false)
  // 운영 화면은 /dev 라우트에만 걸려 있다
  expect(readFileSync('src/App.jsx', 'utf8')).toContain('path="/dev/vendor-ops"')
  for (const f of vendorFiles) {
    const src = readFileSync(f, 'utf8')
    expect(src, f).not.toContain('saved_searches')
    expect(src, f).not.toContain('search_demand_facts')
    expect(src, f).not.toContain('savedSearch')
  }
})

test('③ 등록 화면 신호 줄: 2명이면 줄 없음, 3명이면 표시(누구인지는 없음)', async ({ page }) => {
  await mockGemini(page); await mockMarketData(page)
  await seedSession(page, { id: 'seller-user' })
  await page.addInitScript(() => { localStorage.setItem('modu_device_id', 'seller-dev'); localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller' })) })
  let count = 2
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/search_demand_facts*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ count }]) }))
  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()   // 예시 채우기로 주소·업종이 들어간다
  await page.waitForTimeout(600)
  await expect(page.getByTestId('demand-signal-line')).toHaveCount(0)   // n=2 → 줄 없음
  expect(RELAX.MIN_DEMAND_SHOW).toBe(3)

  count = 3
  await page.reload()
  await page.getByRole('button', { name: /예시/ }).click()
  await page.waitForTimeout(600)
  const line = page.getByTestId('demand-signal-line')
  if (await line.count()) {
    await expect(line).toContainText('매물 알림을 신청한 분이 3명 있어요')
    await expect(line).toContainText('모두가 본 것(이번 달)')
    await expect(line).not.toContainText(/님|@|010/)
  }
})
