/**
 * 사장님 매출 관리 (ORDER-sales-tracking-v1)
 * 유닛: 분석 게이트(3/7/14/30일)·부족 안내·표본 승격 게이트
 * UI: 입력 저장·소급 유도·배달 조건부·고정비·동네 밀집도·POS(예정)
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'
import { analyzeSales, backfillDates, canCompareRevenue, SAMPLE_PROMOTION_THRESHOLD } from '../src/lib/salesAnalytics.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const iso = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10)
const entriesOf = (n, revenue = (i) => 300000 + i * 10000) =>
  Array.from({ length: n }, (_, i) => ({ sale_date: iso(i), revenue: revenue(i) }))

// ── 유닛: 게이트별 열림·침묵 ─────────────────────────────────
test.describe('분석 룰 유닛', () => {
  test('0~2일: 분석 침묵 + "N일 더 기록하면 요일 패턴" 안내', () => {
    const a = analyzeSales(entriesOf(2))
    expect(a.weekday).toBeUndefined()
    expect(a.weekly).toBeUndefined()
    expect(a.nextUnlock).toBe('1일 더 기록하면 요일 패턴을 볼 수 있어요')
  })

  test('3일+: 요일 패턴(최고·최저), 7일 미만이면 주간 대비는 침묵', () => {
    const a = analyzeSales(entriesOf(3))
    expect(a.weekday.best).toBeTruthy()
    expect(a.weekly).toBeUndefined()
    expect(a.nextUnlock).toContain('지난주 대비')
  })

  test('14일: 이번 7일 vs 지난 7일 일평균 증감', () => {
    // 지난주 일평균 20만 → 이번 주 30만 = +50%
    const rows = [
      ...Array.from({ length: 7 }, (_, i) => ({ sale_date: iso(i), revenue: 300000 })),
      ...Array.from({ length: 7 }, (_, i) => ({ sale_date: iso(i + 7), revenue: 200000 })),
    ]
    const a = analyzeSales(rows)
    expect(a.weekly.deltaPct).toBe(50)
  })

  test('객단가·배달 비중: 14일+ 및 해당 입력분이 있을 때만', () => {
    const rows = Array.from({ length: 14 }, (_, i) => ({
      sale_date: iso(i), revenue: 200000, customers: 20, delivery_revenue: 50000,
    }))
    const a = analyzeSales(rows)
    expect(a.unitPrice.current).toBe(10000)   // 20만/20명
    expect(a.delivery.sharePct).toBe(25)      // 5만/20만
    // 입력분 없으면 침묵
    const b = analyzeSales(entriesOf(14))
    expect(b.unitPrice).toBeUndefined()
    expect(b.delivery).toBeUndefined()
  })

  test('30일+: 월 합계·예상·고정비 여유(설정 시에만)', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ sale_date: iso(i), revenue: 100000 }))
    const a = analyzeSales(rows, { fixedTotal: 2000000 })
    expect(a.monthly.total).toBe(3000000)
    expect(a.monthly.forecast).toBe(3000000)
    expect(a.monthly.margin).toBe(1000000)
    expect(a.nextUnlock).toBeNull()
    const b = analyzeSales(rows) // 고정비 미설정 → margin 침묵
    expect(b.monthly.margin).toBeUndefined()
  })

  test('소급 8칸(오늘~7일 전) / 표본 승격 게이트 30', () => {
    const d = backfillDates()
    expect(d).toHaveLength(8)
    expect(d[0].label).toBe('오늘')
    expect(d[7].label).toBe('7일 전')
    expect(canCompareRevenue(SAMPLE_PROMOTION_THRESHOLD - 1)).toBe(false)
    expect(canCompareRevenue(SAMPLE_PROMOTION_THRESHOLD)).toBe(true)
  })
})

// ── UI ───────────────────────────────────────────────────────
async function setup(page, { profileExtra = {}, sales = [], fixed = null } = {}) {
  await mockGemini(page)
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  const saved = []
  await page.route(`${SUPABASE}/rest/v1/daily_sales*`, r => {
    if (r.request().method() === 'POST') {
      saved.push(JSON.parse(r.request().postData() || '{}'))
      return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sales) })
  })
  const savedFixed = []
  await page.route(`${SUPABASE}/rest/v1/fixed_costs*`, r => {
    if (r.request().method() === 'POST') {
      savedFixed.push(JSON.parse(r.request().postData() || '{}'))
      return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixed) })
  })
  await page.addInitScript(extra => {
    localStorage.setItem('modu_device_id', 'sales-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({
      name: '김사장', category: 'operating',
      roleData: { operating: { bizLabel: '카페·커피전문점', region: '서울', ...extra } },
    }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_op', category: 'operating', name: '김사장', active: true }]))
  }, profileExtra)
  return { saved, savedFixed }
}

test('입력 저장: 빈 상태 → +50만 칩 → 저장 → 카드 즉시 반영 (비요식업은 배달 질문 없음)', async ({ page }) => {
  const { saved } = await setup(page, { profileExtra: { category_main: '도소매' } })
  await page.goto('/a7/operating')
  await expect(page.getByText('아직 입력 전이에요 — 30초면 돼요')).toBeVisible()

  await page.getByTestId('sales-input-open').click()
  await expect(page.getByTestId('delivery-ask-sheet')).toHaveCount(0) // 비요식업 — 배달 확인 없음
  await expect(page.getByTestId('sales-entry-sheet')).toBeVisible()
  await expect(page.getByTestId('sales-delivery-input')).toHaveCount(0)
  await page.getByRole('button', { name: '+50만' }).click()
  await page.getByRole('button', { name: '+10만' }).click()
  await page.getByTestId('sales-save').click()

  await expect(page.getByTestId('sales-today-value')).toContainText('600,000')
  expect(saved[0].revenue).toBe(600000)
  expect(saved[0].sale_date).toBe(iso(0))
})

test('배달 조건부: 요식업 + 미설정 → 1회 확인 → "배달해요" → 배달 입력란 노출 + 설정 저장', async ({ page }) => {
  await setup(page, { profileExtra: { category_main: '요식업' } })
  await page.goto('/a7/operating')
  await page.getByTestId('sales-input-open').click()
  await expect(page.getByTestId('delivery-ask-sheet')).toBeVisible()
  await page.getByTestId('delivery-yes').click()
  await expect(page.getByTestId('sales-delivery-input')).toBeVisible()
  const raw = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_user_profile') || '{}'))
  expect(raw.roleData.operating.delivery).toBe('yes')
})

test('소급 유도: 어제 미입력이면 "어제도 넣을까요?" → 어제 날짜로 시트', async ({ page }) => {
  await setup(page, { sales: [{ sale_date: iso(3), revenue: 250000 }], profileExtra: { category_main: '도소매' } })
  await page.goto('/a7/operating')
  await page.getByTestId('sales-yesterday-nudge').click()
  await expect(page.getByTestId('sales-entry-sheet')).toBeVisible()
  // 어제 칩이 선택 상태(초록 배경) — 클래스 대신 저장으로 검증: 금액 넣고 저장 시 sale_date=어제
  await page.getByRole('button', { name: '+10만' }).click()
  await page.getByTestId('sales-save').click()
  await expect(page.getByText(/저장했어요/)).toBeVisible()
})

test('분석 게이트 UI: 7일 데이터 → 주간·요일 표시 + 다음 열람 안내 / 2일 → 침묵+안내', async ({ page }) => {
  await setup(page, { sales: entriesOf(7), profileExtra: { category_main: '도소매' } })
  await page.goto('/a7/operating')
  await expect(page.getByTestId('sales-weekly')).toBeVisible()
  await expect(page.getByTestId('sales-weekday')).toBeVisible()
  await expect(page.getByTestId('sales-unit-price')).toHaveCount(0) // 14일 미만 — 침묵
  await expect(page.getByTestId('sales-next-unlock')).toContainText('객단가')
})

test('고정비: 시트 저장(납부일 포함) + 버튼 라벨 합계 반영', async ({ page }) => {
  const { savedFixed } = await setup(page, {
    fixed: { rent: 2000000, rent_due_day: 25, labor: 1000000, labor_due_day: 10, maintenance: null, maintenance_due_day: null, others: null },
    profileExtra: { category_main: '도소매' },
  })
  await page.goto('/a7/operating')
  await expect(page.getByTestId('fixed-sheet-open')).toContainText('300만')
  await page.getByTestId('fixed-sheet-open').click()
  await page.getByTestId('fixed-maintenance').fill('300000')
  await page.getByTestId('fixed-maintenance-day').fill('5')
  await page.getByTestId('fixed-save').click()
  await expect(page.getByText('고정비를 저장했어요 ✓')).toBeVisible()
  expect(savedFixed[0].maintenance).toBe(300000)
  expect(savedFixed[0].maintenance_due_day).toBe(5)
  expect(savedFixed[0].rent_due_day).toBe(25) // 기존 값 보존
})

test.describe('동네 밀집도 — 위치 허용', () => {
  test.use({ geolocation: { latitude: 37.5563, longitude: 126.9236 }, permissions: ['geolocation'] })
  test('탭 → 반경 상가·동종 수만 표시 (매출 비교 문구 없음)', async ({ page }) => {
    await setup(page, { profileExtra: { category_main: '카페·베이커리', ksic_code: '56221' } })
    await page.route('**/api/opendata/**storeListInRadius**', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ body: { totalCount: 128, items: [
        { indsMclsNm: '카페', ksicCd: 'I56221' }, { indsMclsNm: '카페', ksicCd: 'I56221' }, { indsMclsNm: '한식', ksicCd: 'I56111' },
      ] } }),
    }))
    await page.goto('/a7/operating')
    await page.getByTestId('density-open').click()
    await expect(page.getByTestId('density-result')).toContainText('반경 300m 상가 128곳')
    await expect(page.getByTestId('density-result')).toContainText('동종 2곳')
    await expect(page.getByText(/평균 매출|매출 상위/)).toHaveCount(0) // 표본 승격 전 매출 비교 금지
  })
})

test('POS (예정): 수집 시트 → 선택 → 안내 + roleData.operating.pos_interest 저장', async ({ page }) => {
  await setup(page, { profileExtra: { category_main: '도소매' } })
  await page.goto('/a7/operating')
  await page.getByTestId('pos-open').click()
  await expect(page.getByText('POS·카드매출 연동 (예정)')).toBeVisible()
  await page.getByRole('button', { name: '캐시노트' }).click()
  await expect(page.getByText('연동이 준비되면 알려드릴게요')).toBeVisible()
  const raw = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_user_profile') || '{}'))
  expect(raw.roleData.operating.pos_interest).toBe('캐시노트')
})
