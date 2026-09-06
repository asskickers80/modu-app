/**
 * 문의 동향 카드 + 차이 시트 (ORDER-close-flow-peer-stats-v1 항목 4)
 * 유닛: 비교군 5단계 확장·example 제외·±30% 면적·승격·차이 60% 게이트·sold 표본 스킵
 * UI: 카드 문안(양축 어휘)·표본 부족 시 카드 없음(대체 카드 없음)·시트·30일 숨김·승격 펼침
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { computePeerStats, computeGaps, shouldPromote, exampleSummary, parseRegion } from '../src/lib/peerStatsRules.js'

const DAY = 864e5
// 실행일 기준 상대 계산 — 고정 날짜를 쓰면 다음 날 '등록 N일째' 단언이 하루씩 밀린다
const NOW = new Date()
const iso = (daysAgo) => new Date(NOW.getTime() - daysAgo * DAY).toISOString()

const MY = {
  id: 'me', address: '서울 마포구 서교동 1-1', area: '33',
  category_main: '카페·베이커리', category_sub: '카페·커피전문점',
  status: 'published', published_at: iso(10), image_urls: [],
}

// n건의 비교군(전부 첫 문의 있음) 생성 — 기본: 같은 동·같은 소분류·비슷한 면적
function peersOf(n, over = {}) {
  const listings = [], firstInquiryAt = new Map([['dummy', iso(1)]])
  for (let i = 0; i < n; i++) {
    const id = `p${i}`
    listings.push({
      id, address: '서울 마포구 서교동 2-2', area: '30',
      category_main: '카페·베이커리', category_sub: '카페·커피전문점',
      status: 'published', published_at: iso(20), image_urls: ['a', 'b', 'c'],
      monthly_sales: '900', ...over,
    })
    firstInquiryAt.set(id, iso(17)) // 등록 3일 만에 첫 문의
  }
  return { listings, firstInquiryAt }
}

test.describe('비교군 확장 유닛', () => {
  test('1단계: 동×업종소분류×평수±30% — 라벨·평균·내 등록일', () => {
    const { listings, firstInquiryAt } = peersOf(5)
    const s = computePeerStats({ my: MY, listings, firstInquiryAt, axis: 'seller', now: NOW })
    expect(s.stage).toBe(1)
    expect(s.stageLabel).toBe('서교동 같은 업종')
    expect(s.M).toBe(5)
    expect(s.avgDays).toBe(3)
    expect(s.myDays).toBe(10)
    expect(s.myInquired).toBe(false)
  })

  test('면적 ±30% 벗어나면 1단계 탈락 → 2단계(구×업종)로 확장', () => {
    const { listings, firstInquiryAt } = peersOf(5, { area: '100' }) // 33㎡ 대비 3배
    const s = computePeerStats({ my: MY, listings, firstInquiryAt, axis: 'seller', now: NOW })
    expect(s.stage).toBe(2)
    expect(s.stageLabel).toBe('마포구 같은 업종')
  })

  test('3·4·5단계: 시도×업종 → 전국×업종 → 전국×대분류', () => {
    const p3 = peersOf(5, { address: '서울 강남구 역삼동 1-1' })
    expect(computePeerStats({ my: MY, ...p3, axis: 'seller', now: NOW }).stage).toBe(3)
    const p4 = peersOf(5, { address: '부산 해운대구 우동 1-1' })
    expect(computePeerStats({ my: MY, ...p4, axis: 'seller', now: NOW }).stage).toBe(4)
    const p5 = peersOf(5, { address: '부산 해운대구 우동 1-1', category_sub: '베이커리' })
    const s5 = computePeerStats({ my: MY, ...p5, axis: 'seller', now: NOW })
    expect(s5.stage).toBe(5)
    expect(s5.stageLabel).toContain('카페·베이커리')
  })

  test('전 단계 표본 미달(<5) → null / example·본인·문의 없음·180일 밖 제외', () => {
    const { listings, firstInquiryAt } = peersOf(4)
    expect(computePeerStats({ my: MY, listings, firstInquiryAt, axis: 'seller', now: NOW })).toBeNull()

    // 5건이어도 1건이 example이면 4건 → null
    const p = peersOf(5)
    p.listings[0].status = 'example'
    expect(computePeerStats({ my: MY, ...p, axis: 'seller', now: NOW })).toBeNull()

    // 문의 못 받은 매물은 표본 아님
    const q = peersOf(5)
    q.firstInquiryAt.delete('p0')
    expect(computePeerStats({ my: MY, ...q, axis: 'seller', now: NOW })).toBeNull()

    // 180일보다 오래된 등록 제외
    const r = peersOf(5, { published_at: iso(200) })
    expect(computePeerStats({ my: MY, ...r, axis: 'seller', now: NOW })).toBeNull()
  })

  test('소유주: deal_type 매칭 4단계', () => {
    const myL = { ...MY, id: 'meL', deal_type: 'lease', category_sub: null }
    const p = peersOf(5, { deal_type: 'lease' })
    const s = computePeerStats({ my: myL, listings: p.listings, firstInquiryAt: p.firstInquiryAt, axis: 'landlord', now: NOW })
    expect(s.stage).toBe(1)
    expect(s.stageLabel).toContain('서교동')
    // deal_type 다르면 전 단계 탈락
    const q = peersOf(5, { deal_type: 'sale' })
    expect(computePeerStats({ my: myL, listings: q.listings, firstInquiryAt: q.firstInquiryAt, axis: 'landlord', now: NOW })).toBeNull()
  })

  test('승격: 등록 21일+문의 0 → true, 문의 있으면 false', () => {
    const { listings, firstInquiryAt } = peersOf(5)
    const old = { ...MY, published_at: iso(22) }
    expect(shouldPromote(computePeerStats({ my: old, listings, firstInquiryAt, axis: 'seller', now: NOW }))).toBe(true)
    firstInquiryAt.set('me', iso(5)) // 내 매물에 문의 도착
    expect(shouldPromote(computePeerStats({ my: old, listings, firstInquiryAt, axis: 'seller', now: NOW }))).toBe(false)
    expect(shouldPromote(null)).toBe(false)
  })
})

test.describe('차이 항목 유닛', () => {
  const peers5 = peersOf(5).listings // 사진 3장·월매출 입력

  test('60% 게이트: 비교군 충족 & 내 미충족일 때만, 차이 큰 순 최대 3', () => {
    const gaps = computeGaps({ my: MY, peers: peers5, soldBands: ['same', 'adj_10', 'adj_10_30', 'adj_10', 'adj_30plus'], axis: 'seller' })
    expect(gaps.map(g => g.id)).toEqual(['photos', 'sales', 'price']) // 100%·100%·80% 순
    expect(gaps[0].detail).toContain('사진')
    // 내가 이미 충족하면 항목 없음
    const rich = { ...MY, image_urls: ['a', 'b', 'c'], monthly_sales: '800' }
    const g2 = computeGaps({ my: rich, peers: peers5, soldBands: [], axis: 'seller' })
    expect(g2).toHaveLength(0)
  })

  test('sold 표본 <5 → 가격 항목 스킵 / 소유주는 월매출·권리금 항목 없음', () => {
    const g = computeGaps({ my: MY, peers: peers5, soldBands: ['adj_10', 'adj_10', 'adj_10', 'adj_10'], axis: 'seller' })
    expect(g.find(x => x.id === 'price')).toBeUndefined()
    const gl = computeGaps({ my: MY, peers: peers5, soldBands: [], axis: 'landlord' })
    expect(gl.map(x => x.id)).toEqual(['photos']) // 상가 어휘·사진만
    expect(gl[0].detail).toContain('상가')
  })

  test('익명 예시: 첫 문의 가장 빠른 1건 요약 — 상호·주소·링크 없음', () => {
    const { listings, firstInquiryAt } = peersOf(5)
    firstInquiryAt.set('p2', iso(19)) // p2가 1일 만에 최속
    const ex = exampleSummary({ peers: listings, firstInquiryAt, axis: 'seller' })
    expect(ex).toContain('사진 3장')
    expect(ex).toContain('1일 만에 첫 문의')
    expect(ex).not.toMatch(/서교동|p2/)
  })

  test('주소 파싱: 시도·구·동', () => {
    expect(parseRegion('서울 마포구 서교동 1-1')).toEqual({ sido: '서울', gu: '마포구', dong: '서교동' })
    expect(parseRegion('경기 수원시 팔달구 인계동 2')).toMatchObject({ sido: '경기', dong: '인계동' })
  })
})

// ── UI ───────────────────────────────────────────────────────
const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const MY_DEVICE = 'peer-dev'

function serverRows(n) {
  // 서버 응답용 비교군 — 내 매물(me)과 함께 목록 GET으로 내려간다
  const rows = [{
    id: 'me', device_id: MY_DEVICE, address: '서울 마포구 서교동 1-1', area: '33',
    category_main: '카페·베이커리', category_sub: '카페·커피전문점', status: 'published',
    published_at: iso(10), created_at: iso(10), image_urls: [], shop_name: '내 카페',
    deposit: '1000', monthly_rent: '100', transfer_type: 'full',
    ai_draft: {}, review_choices: {}, edited_texts: {}, item_visibility: {},
  }]
  const convs = []
  for (let i = 0; i < n; i++) {
    rows.push({
      id: `p${i}`, device_id: 'other', address: '서울 마포구 서교동 2-2', area: '30',
      category_main: '카페·베이커리', category_sub: '카페·커피전문점', status: 'published',
      published_at: iso(20), created_at: iso(20), image_urls: ['a', 'b', 'c'], monthly_sales: '900',
    })
    convs.push({ listing_id: `p${i}`, created_at: iso(17) })
  }
  return { rows, convs }
}

async function setupUi(page, { peerCount = 5, publishedDaysAgo = 10 } = {}) {
  await mockGemini(page)
  await mockMarketData(page)
  const { rows, convs } = serverRows(peerCount)
  rows[0].published_at = iso(publishedDaysAgo)
  await page.route(`${SUPABASE}/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }))
  await page.route(`${SUPABASE}/listings*`, r => {
    if (r.request().method() !== 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? rows[0] : rows) })
  })
  await page.route(`${SUPABASE}/conversations*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(convs) }))
  await page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', name: '김동향' }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_s', category: 'seller', name: '김동향', active: true }]))
  }, MY_DEVICE)
}

test('카드: 숫자+근거 한 줄 (양도인 어휘) → 탭 시 차이 시트 + 사진·월매출 항목', async ({ page }) => {
  await setupUi(page)
  await page.goto('/a7/seller')

  const card = page.getByTestId('peer-stats-card')
  await expect(card).toBeVisible()
  await expect(card).toContainText('비슷한 매물은 첫 문의까지')
  await expect(card).toContainText('평균 3일')
  await expect(card).toContainText('서교동 같은 업종 5건 기준')
  await expect(card).toContainText('내 매물은 등록 10일째')
  await expect(page.getByTestId('peer-gap-sheet')).toHaveCount(0) // 승격 전 — 접힘

  await page.getByTestId('peer-stats-head').click()
  await expect(page.getByTestId('peer-gap-sheet')).toBeVisible()
  await expect(page.getByTestId('gap-item-photos')).toContainText('사진')
  await expect(page.getByTestId('gap-item-sales')).toContainText('월매출')
})

test('표본 부족(<5): 카드 없음 — "문의를 받으려면" 대체 카드도 없음', async ({ page }) => {
  await setupUi(page, { peerCount: 4 })
  await page.goto('/a7/seller')
  await expect(page.getByTestId('my-listing-card')).toBeVisible()
  await expect(page.getByTestId('peer-stats-card')).toHaveCount(0)
  await expect(page.getByText(/문의를 받으려면/)).toHaveCount(0)
})

test('승격: 등록 21일+문의 0 → 시트 내용이 펼쳐진 채 노출', async ({ page }) => {
  await setupUi(page, { publishedDaysAgo: 25 })
  await page.goto('/a7/seller')
  await expect(page.getByTestId('peer-stats-card')).toContainText('등록 25일째')
  await expect(page.getByTestId('peer-gap-sheet')).toBeVisible() // 탭 없이 펼침
})

test('[그대로 둘게요] → 카드 30일 숨김 (재방문에도 유지)', async ({ page }) => {
  await setupUi(page, { publishedDaysAgo: 25 })
  await page.goto('/a7/seller')
  await page.getByTestId('gap-dismiss').click()
  await expect(page.getByTestId('peer-stats-card')).toHaveCount(0)

  await page.goto('/a7/seller') // 재방문
  await expect(page.getByTestId('my-listing-card')).toBeVisible()
  await expect(page.getByTestId('peer-stats-card')).toHaveCount(0)
})

test('익명 예시 접힘 → 펼치면 요약 (링크·상호 없음)', async ({ page }) => {
  await setupUi(page, { publishedDaysAgo: 25 })
  await page.goto('/a7/seller')
  await expect(page.getByTestId('gap-example')).toHaveCount(0)
  await page.getByTestId('gap-example-toggle').click()
  await expect(page.getByTestId('gap-example')).toContainText('만에 첫 문의')
})
