/**
 * 내 주변 부동산 — 등록 진입 시점 한정 (ORDER-brokers-entry-only-v1, 홈 상시 노출 폐지)
 * 홈 카드 부재·조회 0회 / 등록 1단계 하단 노출 / 권한 허용·거부 분기 / 슬롯 우선순위 / 캐시
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'
import { composeBrokerSlots, buildBrokerQuery, distanceKm } from '../src/lib/nearbyBrokers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'

// ── 유닛 (정책 무관 — 유지) ──────────────────────────────────
test.describe('슬롯·쿼리 유닛', () => {
  const P = n => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `입점${i}` }))
  const E = n => Array.from({ length: n }, (_, i) => ({ name: `외부${i}` }))

  test('생애주기: 입점 0=전부 외부 / N=입점 상단+빈 슬롯 외부 / 3+=외부 완전 배제', () => {
    expect(composeBrokerSlots([], E(5)).map(s => s.type)).toEqual(['external', 'external', 'external'])
    expect(composeBrokerSlots(P(1), E(5)).map(s => s.type)).toEqual(['partner', 'external', 'external'])
    expect(composeBrokerSlots(P(4), E(5)).some(s => s.type === 'external')).toBe(false)
  })

  test('쿼리: 시·구(+동)까지만 / 거리: 좌표 없으면 null', () => {
    expect(buildBrokerQuery('경기 수원시 팔달구 인계동')).toBe('경기 수원시 부동산')
    expect(buildBrokerQuery(null)).toBe(null)
    expect(distanceKm(null, { lat: 37.5, lng: 126.9 })).toBe(null)
  })
})

// ── 홈 상시 노출 폐지 ────────────────────────────────────────
test('홈(양축): 내 주변 부동산 카드 부재 + 관련 조회 0회', async ({ page }) => {
  await mockGemini(page)
  let brokerCalls = 0, geoCalls = 0
  await page.route('**/api/nearby-brokers*', r => { brokerCalls++; return r.fulfill({ status: 200, contentType: 'application/json', body: '{"items":[]}' }) })
  await page.route('**/api/geocode', r => { geoCalls++; return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) })
  for (const t of ['listings', 'conversations', 'daily_contents', 'market_news']) {
    await page.route(`${SUPABASE}/${t}*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  }
  for (const [cat, path, marker] of [['landlord', '/a7/landlord', '상가 진행 가이드'], ['seller', '/a7/seller', '양도 진행 가이드']]) {
    await page.addInitScript(c => {
      localStorage.setItem('modu_device_id', 'be-dev')
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: c, region: '서울', bizType: '카페' }))
    }, cat)
    await page.goto(path)
    await expect(page.getByText(marker)).toBeVisible()
    await expect(page.getByTestId('nearby-brokers')).toHaveCount(0)
    await expect(page.getByTestId('brokers-entry-open')).toHaveCount(0)
  }
  expect(brokerCalls).toBe(0) // 홈 진입 시 외부 조회 없음
  expect(geoCalls).toBe(0)
})

// ── 등록 진입 시점 노출 ──────────────────────────────────────
test.describe('등록 1단계 — 현 위치 기반', () => {
  test.use({ geolocation: { latitude: 37.2635, longitude: 127.0286 }, permissions: ['geolocation'] })

  function entryMocks(page) {
    const calls = { reverse: 0, broker: 0 }
    page.route('**/api/geocode', async r => {
      const body = JSON.parse(r.request().postData() || '{}')
      if (body.lat != null) {
        calls.reverse++
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ region: '경기도 수원시 인계동' }) })
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lat: null, lng: null }) })
    })
    page.route('**/api/nearby-brokers*', r => {
      calls.broker++
      return r.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ items: [
          { title: '인계<b>부동산</b>공인', category: '부동산>중개업', address: '경기 수원시 팔달구 인계동 1', mapx: '1270290000', mapy: '372640000' },
          { title: '팔달공인중개사', category: '부동산>중개업', address: '경기 수원시 팔달구 인계동 2', mapx: '1270300000', mapy: '372650000' },
        ] }),
      })
    })
    return calls
  }

  test('E1p 1단계 하단: 탭 → 위치 기반 목록 (참고 정보 톤·권유 문구 없음)', async ({ page }) => {
    const calls = entryMocks(page)
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/e1p/1')
    const open = page.getByTestId('brokers-entry-open')
    await expect(open).toContainText('등록 전에 주변 부동산 참고하기')
    await expect(open).toContainText('위치가 필요해요') // 맥락 있는 권한 안내
    await open.click()

    const card = page.getByTestId('nearby-brokers')
    await expect(card).toContainText('인계부동산공인') // <b> 제거
    await expect(card).toContainText('경기 수원시 팔달구') // 동 단위 주소
    await expect(card).toContainText('km')               // 현 위치 기준 거리
    await expect(card).toContainText('참고 정보')
    await expect(card).not.toContainText('의뢰')          // 권유 문구 금지
    expect(calls.reverse).toBe(1)
    expect(calls.broker).toBe(1)
  })

  test('E1(양도인) 1단계에도 동일 진입점', async ({ page }) => {
    entryMocks(page)
    await mockGemini(page)
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/e1/1')
    await expect(page.getByTestId('brokers-entry-open')).toBeVisible()
    await page.getByTestId('brokers-entry-open').click()
    await expect(page.getByTestId('nearby-brokers')).toBeVisible()
  })

  test('입점 우선: 파트너가 첫 슬롯', async ({ page }) => {
    entryMocks(page)
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(r.request().url().includes('listing_type=eq.business')
        ? [{ id: 'p1', listing_type: 'business', status: 'published', shop_name: '모두공인 파트너', image_urls: [], biz_tagline: '상가 전문', biz_tags: [] }]
        : []),
    }))
    await page.goto('/e1p/1')
    await page.getByTestId('brokers-entry-open').click()
    const card = page.getByTestId('nearby-brokers')
    await expect(card.getByTestId('broker-partner')).toContainText('모두공인 파트너')
    await expect(card.locator('button').first()).toContainText('모두 입점')
  })

  test('캐시: 재진입 후 다시 탭해도 역지오코딩·검색 재호출 없음 (일 1회)', async ({ page }) => {
    const calls = entryMocks(page)
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/e1p/1')
    await page.getByTestId('brokers-entry-open').click()
    await expect(page.getByTestId('nearby-brokers')).toBeVisible()
    await page.reload()
    await page.getByTestId('brokers-entry-open').click()
    await expect(page.getByTestId('nearby-brokers')).toBeVisible()
    expect(calls.reverse).toBe(1) // 좌표 기준 일 1회
    expect(calls.broker).toBe(1)  // 쿼리 기준 일 1회
  })
})

test.describe('권한 거부·실패 분기 (entry-geo-fix — 조용히 사라지는 동작 폐기)', () => {
  test('거부: 설정 안내 문구 표시(사라지지 않음) + 같은 세션 재진입엔 재권유 없음', async ({ page }) => {
    // permissions 미부여 → getCurrentPosition PERMISSION_DENIED
    await page.route('**/api/geocode', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
    await page.route('**/api/nearby-brokers*', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"items":[]}' }))
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/e1p/1')
    await page.getByTestId('brokers-entry-open').click()
    await expect(page.getByTestId('brokers-entry-denied')).toContainText('위치 권한이 꺼져 있어요') // 안내
    await expect(page.getByTestId('brokers-entry-open')).toHaveCount(0)

    await page.reload() // 같은 세션 — 재권유 금지
    await expect(page.getByText('상가 정보를 입력해요')).toBeVisible()
    await expect(page.getByTestId('brokers-entry-open')).toHaveCount(0)
  })

  test('위치 확인 실패(역지오코딩 불가): 안내 + 다시 시도 동작', async ({ page }) => {
    let reverseFails = true
    await page.context().grantPermissions(['geolocation'])
    await page.context().setGeolocation({ latitude: 37.2635, longitude: 127.0286 })
    await page.route('**/api/geocode', r => {
      const body = JSON.parse(r.request().postData() || '{}')
      if (body.lat != null) {
        return r.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(reverseFails ? { region: null } : { region: '경기도 수원시 인계동' }) })
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.route('**/api/nearby-brokers*', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ items: [{ title: '인계부동산', category: '부동산>중개업', address: '경기 수원시 팔달구 인계동 1', mapx: '1270290000', mapy: '372640000' }] }),
    }))
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/e1p/1')
    await page.getByTestId('brokers-entry-open').click()
    await expect(page.getByTestId('brokers-entry-error')).toContainText('위치를 확인하지 못했어요')

    reverseFails = false // 복구 후 다시 시도
    await page.getByTestId('brokers-entry-retry').click()
    await expect(page.getByTestId('nearby-brokers')).toContainText('인계부동산')
  })
})
