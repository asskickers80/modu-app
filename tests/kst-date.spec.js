/**
 * KST 날짜 기준 (ORDER-key-proxy-account-deletion 결정 2)
 * 결함: 앱이 toISOString()(UTC)으로 '오늘'을 만들어, 00~09시 KST에 하루가 밀렸다.
 *       마감 후 새벽에 매출을 넣는 사장님이 상시 밟는 경로 — 어제 칸에 저장됐다.
 * 이 스펙은 시스템 시각을 새벽 3시(KST)로 고정한 상태에서 입력·조회·집계가
 * 같은 날짜를 가리키는지 고정한다.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { kstToday, addDays, weekStartOf, weekdayOf } from '../src/lib/weekUtil.js'
import { backfillDates, analyzeSales } from '../src/lib/salesAnalytics.js'

// 2026-09-10 03:00 KST = 2026-09-09 18:00 UTC — UTC로 읽으면 하루 전이 된다
const DAWN_KST = new Date('2026-09-09T18:00:00Z')
const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'

test.describe('새벽 3시 KST — 날짜 유닛', () => {
  test('kstToday는 UTC가 아니라 KST 달력 날짜를 준다', () => {
    expect(DAWN_KST.toISOString().slice(0, 10)).toBe('2026-09-09') // 옛 방식(결함)
    expect(kstToday(DAWN_KST)).toBe('2026-09-10')                  // 고친 방식
  })

  test('소급 7일 칩이 KST 오늘부터 시작한다', () => {
    const d = backfillDates(DAWN_KST)
    expect(d).toHaveLength(8)
    expect(d[0].iso).toBe('2026-09-10')
    expect(d[0].label).toBe('오늘')
    expect(d[1].iso).toBe('2026-09-09')
    expect(d[7].iso).toBe('2026-09-03')
    // 요일도 KST 날짜 기준 — 2026-09-10은 목요일
    expect(d[0].weekday).toBe(weekdayOf('2026-09-10'))
  })

  test('주 경계도 KST 기준 (새벽에 주가 밀리지 않는다)', () => {
    // 2026-09-10(목)이 속한 주의 월요일 = 2026-09-07
    expect(weekStartOf(DAWN_KST)).toBe('2026-09-07')
  })

  test('30일 집계가 KST 오늘 기준으로 30일을 센다', () => {
    const today = kstToday(DAWN_KST)
    const rows = Array.from({ length: 30 }, (_, i) => ({ sale_date: addDays(today, -i), revenue: 100000 }))
    const a = analyzeSales(rows, { today: DAWN_KST })
    expect(a.days).toBe(30)
    expect(a.monthly.total).toBe(3000000) // 옛 방식이면 1행이 창 밖으로 밀려 290만
  })

  test('주간 대비도 KST 창으로 잘린다', () => {
    const today = kstToday(DAWN_KST)
    const rows = [
      ...Array.from({ length: 7 }, (_, i) => ({ sale_date: addDays(today, -i), revenue: 300000 })),
      ...Array.from({ length: 7 }, (_, i) => ({ sale_date: addDays(today, -(i + 7)), revenue: 200000 })),
    ]
    expect(analyzeSales(rows, { today: DAWN_KST }).weekly.deltaPct).toBe(50) // 옛 방식이면 40
  })
})

test('새벽 3시 입력 → 오늘(KST) 날짜로 저장된다', async ({ page }) => {
  await mockGemini(page)
  await mockMarketData(page)
  await page.clock.install({ time: DAWN_KST })

  const saved = []
  await page.route(`${SUPABASE}/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/daily_sales*`, r => {
    if (r.request().method() === 'POST') {
      saved.push(JSON.parse(r.request().postData() || '{}'))
      return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'kst-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({
      name: '김새벽', category: 'operating',
      roleData: { operating: { bizLabel: '요식업', category_main: '도소매', region: '서울' } },
    }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_op', category: 'operating', name: '김새벽', active: true }]))
  })

  await page.goto('/a7/operating')
  await page.getByTestId('sales-input-open').click()
  await page.getByRole('button', { name: '+10만' }).click()
  await page.getByTestId('sales-save').click()

  await expect(page.getByTestId('sales-today-value')).toBeVisible()
  expect(saved[0].sale_date).toBe('2026-09-10') // UTC 기준이면 2026-09-09로 저장됐다
})
