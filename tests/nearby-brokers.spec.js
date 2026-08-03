/**
 * 내 주변 부동산 카드 (ORDER-nearby-brokers-v1)
 * 슬롯 생애주기(입점 우선·3곳 이상 외부 배제) / 위치 폴백 체인(상가→A3→미표시) /
 * 외부 탭=외부 링크·입점 탭=앱 내 상세 / 일 1회 캐시 / 키 미도착 시 미렌더.
 */
import { test, expect } from './fixtures.js'
import { composeBrokerSlots, buildBrokerQuery, distanceKm } from '../src/lib/nearbyBrokers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const DEV = 'nb-dev'

// ── 유닛 ────────────────────────────────────────────────────
test.describe('슬롯·쿼리 유닛', () => {
  const P = n => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `입점${i}` }))
  const E = n => Array.from({ length: n }, (_, i) => ({ name: `외부${i}` }))

  test('생애주기: 입점 0=전부 외부 / N=입점 상단+빈 슬롯 외부 / 3+=외부 완전 배제', () => {
    expect(composeBrokerSlots([], E(5)).map(s => s.type)).toEqual(['external', 'external', 'external'])
    const mixed = composeBrokerSlots(P(1), E(5))
    expect(mixed.map(s => s.type)).toEqual(['partner', 'external', 'external']) // 입점 무조건 상단
    expect(composeBrokerSlots(P(4), E(5)).map(s => s.type)).toEqual(['partner', 'partner', 'partner'])
    expect(composeBrokerSlots(P(4), E(5)).some(s => s.type === 'external')).toBe(false)
  })

  test('쿼리: 시·구(+동)까지만 / 주소 없으면 null', () => {
    expect(buildBrokerQuery('인천 영종구 햇내로14번길 9 101호')).toBe('인천 영종구 부동산')
    expect(buildBrokerQuery('서울 마포구 서교동 447-5')).toBe('서울 마포구 서교동 부동산')
    expect(buildBrokerQuery('서울 마포구')).toBe('서울 마포구 부동산')
    expect(buildBrokerQuery('')).toBe(null)
    expect(buildBrokerQuery(null)).toBe(null)
  })

  test('거리: 좌표 없으면 null (추정치 금지)', () => {
    expect(distanceKm(null, { lat: 37.5, lng: 126.9 })).toBe(null)
    expect(distanceKm({ lat: 37.556, lng: 126.919 }, { lat: 37.566, lng: 126.919 })).toBe(1.1)
  })
})

// ── UI ──────────────────────────────────────────────────────
const LANDLORD_ROW = {
  id: 'nb-l1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
  address: '서울 마포구 서교동 447-5 1층', latitude: 37.556, longitude: 126.919,
  device_id: DEV, created_at: '2026-08-01T00:00:00Z',
}
const BIZ_ROW = {
  id: 'nb-b1', listing_type: 'business', status: 'published', shop_name: '모두공인 파트너',
  image_urls: ['https://x.test/logo.jpg'], biz_tagline: '상가 전문 15년', biz_tags: ['상가', '임대차'],
}
const NAVER_ITEMS = [
  { title: '<b>서교</b>부동산공인중개사', category: '부동산>중개업', address: '서울 마포구 서교동 350-1', mapx: '1269190000', mapy: '375660000' },
  { title: '홍대탑공인', category: '부동산>중개업', address: '서울 마포구 동교동 155', mapx: '1269200000', mapy: '375650000' },
  { title: '연남부동산', category: '부동산>중개업', address: '서울 마포구 연남동 223', mapx: '1269150000', mapy: '375670000' },
  { title: '워크박스 공유오피스', category: '서비스,산업>사무공간임대', address: '서울 마포구 서교동 100', mapx: '1269180000', mapy: '375655000' },
]

function seed(page, { region } = {}) {
  return page.addInitScript(([id, r]) => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord', ...(r ? { region: r } : {}) }))
  }, [DEV, region ?? null])
}
function baseMocks(page, { landlords = [], business = [] } = {}) {
  page.route(`${SUPABASE}/listings*`, r => {
    const url = r.request().url()
    const rows = url.includes('listing_type=eq.business') ? business : landlords
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
  })
  for (const t of ['conversations', 'daily_contents', 'market_news']) {
    page.route(`${SUPABASE}/${t}*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  }
}
function mockBrokerApi(page, { items = NAVER_ITEMS } = {}) {
  const calls = []
  page.route('**/api/nearby-brokers*', r => {
    calls.push(new URL(r.request().url()).searchParams.get('query'))
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items }) })
  })
  return calls
}

test.describe('내 주변 부동산 카드', () => {
  test('외부 3곳: 상호·동·거리 + 참고 정보 라벨, 탭=네이버 지도 외부 링크', async ({ page }) => {
    await seed(page)
    baseMocks(page, { landlords: [LANDLORD_ROW] })
    const calls = mockBrokerApi(page)
    await page.context().route('https://map.naver.com/**', r =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<html>naver map</html>' }))

    await page.goto('/a7/landlord')
    const card = page.getByTestId('nearby-brokers')
    await expect(card).toContainText('내 주변 부동산')
    await expect(card).toContainText('참고 정보') // 제휴 위장 금지 라벨
    await expect(card.getByTestId('broker-external')).toHaveCount(3)
    await expect(card).toContainText('서교부동산공인중개사') // <b> 태그 제거
    await expect(card).toContainText('서울 마포구 서교동')   // 동 단위까지만
    await expect(card).toContainText('1.1km')                // 상가 좌표 기준 실거리
    await expect(card).not.toContainText('워크박스')          // 비부동산 카테고리 제외(실응답 검증 기반)
    expect(calls[0]).toBe('서울 마포구 서교동 부동산')        // 대표 상가 주소 기준 쿼리

    // 탭 = 외부 링크(새 창) — 앱 내 상세 없음
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      card.getByTestId('broker-external').first().click(),
    ])
    expect(popup.url()).toContain('map.naver.com')
  })

  test('입점 혼합: 입점 상단(뱃지·홍보문구·태그) + 탭=앱 내 상세(/e2b)', async ({ page }) => {
    await seed(page)
    baseMocks(page, { landlords: [LANDLORD_ROW], business: [BIZ_ROW] })
    mockBrokerApi(page)

    await page.goto('/a7/landlord')
    const card = page.getByTestId('nearby-brokers')
    const partner = card.getByTestId('broker-partner')
    await expect(partner).toHaveCount(1)
    await expect(partner).toContainText('모두공인 파트너')
    await expect(partner).toContainText('모두 입점')       // 입점 뱃지
    await expect(partner).toContainText('상가 전문 15년')  // 홍보 문구 = 입점사 입력값
    await expect(partner).toContainText('#상가')
    await expect(card.getByTestId('broker-external')).toHaveCount(2) // 빈 슬롯만 외부

    // 첫 슬롯이 입점 (무조건 상단)
    const first = card.locator('button').first()
    await expect(first).toContainText('모두 입점')

    await partner.click()
    await expect(page).toHaveURL(/\/e2b\/nb-b1/) // 앱 내 상세 분기 (라우트는 기업회원 축 예정)
  })

  test('다지역: 매물 2건(영종구·광명시) → 지역별 검색 + 각 지역 최소 1곳 반영', async ({ page }) => {
    await seed(page)
    const ROW_GM = { ...LANDLORD_ROW, id: 'nb-l2', address: '경기 광명시 소하동 100 1층', latitude: null, longitude: null, created_at: '2026-07-30T00:00:00Z' }
    baseMocks(page, { landlords: [LANDLORD_ROW, ROW_GM] })
    const calls = []
    await page.route('**/api/nearby-brokers*', r => {
      const q = new URL(r.request().url()).searchParams.get('query')
      calls.push(q)
      const items = q.includes('광명시')
        ? [{ title: '소하동중앙부동산', category: '부동산>중개업', address: '경기 광명시 소하동 200', mapx: '1268640000', mapy: '374780000' }]
        : NAVER_ITEMS
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items }) })
    })

    await page.goto('/a7/landlord')
    const card = page.getByTestId('nearby-brokers')
    await expect(card.getByTestId('broker-external')).toHaveCount(3)
    // 두 지역 쿼리가 각각 나갔다
    expect(calls.sort()).toEqual(['경기 광명시 소하동 부동산', '서울 마포구 서교동 부동산'])
    // 각 지역 최소 1곳 — 광명 업소가 슬롯에 포함된다 (라운드로빈)
    await expect(card).toContainText('소하동중앙부동산')
    await expect(card).toContainText('경기 광명시 소하동')
    await expect(card).toContainText('서교부동산공인중개사')
  })

  test('폴백 체인: 상가 0건 → A3 지역으로 검색', async ({ page }) => {
    await seed(page, { region: '서울 마포구' })
    baseMocks(page, { landlords: [] })
    const calls = mockBrokerApi(page)
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('nearby-brokers')).toBeVisible()
    expect(calls[0]).toBe('서울 마포구 부동산')
  })

  test('폴백 끝: 상가 0 + A3 지역 없음 → 카드 미표시 + 호출 0회 (가짜 지역 금지)', async ({ page }) => {
    await seed(page)
    baseMocks(page, { landlords: [] })
    const calls = mockBrokerApi(page)
    await page.goto('/a7/landlord')
    await expect(page.getByText('상가 진행 가이드')).toBeVisible() // 홈 렌더 완료 대기
    await expect(page.getByTestId('nearby-brokers')).toHaveCount(0)
    expect(calls.length).toBe(0)
  })

  test('일 1회 캐시: 재진입 시 API 재호출 없음', async ({ page }) => {
    await seed(page)
    baseMocks(page, { landlords: [LANDLORD_ROW] })
    const calls = mockBrokerApi(page)
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('nearby-brokers')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('nearby-brokers')).toBeVisible() // 캐시로 렌더
    expect(calls.length).toBe(1) // 홈 진입마다 호출 금지
  })

  test('키 미도착(disabled): 카드 자체 미렌더 — 준비중 껍데기 금지', async ({ page }) => {
    await seed(page)
    baseMocks(page, { landlords: [LANDLORD_ROW] })
    // fixtures 기본 mock이 disabled:true — 추가 mock 없이 그대로
    await page.goto('/a7/landlord')
    await expect(page.getByText('상가 진행 가이드')).toBeVisible()
    await expect(page.getByTestId('nearby-brokers')).toHaveCount(0)
  })
})
