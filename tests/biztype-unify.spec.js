/**
 * 업종 분류 통일 (ORDER-biztype-unify-step1) — 3~5·7단계 검증
 *
 * 1. E1 업종 입력: A3와 같은 2단계 드릴다운 + 동의어 검색
 * 2. 프랜차이즈 브랜드 선택 → 신규 3필드 자동 세팅
 * 3. 조용히 깨져 있던 3곳: 탐색 '같은 업종' 필터 / 시설 추천 / 뉴스 매칭
 * 4. 홈 헤더 "대분류 > 소분류" 표기 (소분류 없으면 대분류만)
 * 5. 완성도 채점에 업종 반영
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, mockDailyContents } from './helpers.js'
import { calcScore, listingToScoreInput } from '../src/lib/completeness.js'
import { industryLabel } from '../src/lib/categories.ts'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const LISTINGS = `${SUPABASE}/listings*`

function mockListings(page, rows) {
  return page.route(LISTINGS, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    } else {
      await route.continue()
    }
  })
}

// ─────────────────────────────────────────────────────────
test.describe('E1 업종 입력 — 드릴다운 + 동의어 검색', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await mockDailyContents(page)
  })

  test('대분류 탭 → 소분류 펼침 → 선택', async ({ page }) => {
    await page.goto('/e1/1')

    // 평면 12종 칩은 사멸해야 함
    await expect(page.getByRole('button', { name: '치킨·피자', exact: true })).toHaveCount(0)

    // A3와 같은 대분류 8종
    await page.getByRole('button', { name: '요식업', exact: true }).click()
    await expect(page.getByText('더 자세한 업종을 고를 수 있어요')).toBeVisible()

    await page.getByRole('button', { name: '치킨', exact: true }).click()
    // 선택 후에도 대분류·소분류가 유지된다
    await expect(page.getByRole('button', { name: '치킨', exact: true })).toBeVisible()
  })

  test('동의어 검색(통닭) → 대분류·소분류 자동 세팅', async ({ page }) => {
    await page.goto('/e1/1')

    await page.getByRole('button', { name: '요식업', exact: true }).click()
    await page.getByText('업종 직접 검색').click()
    await page.getByPlaceholder('업종을 입력해보세요 (예: 통닭, 헤어샵)').fill('통닭')

    // 검색 결과에 소분류 '치킨' + 대분류 '요식업'이 함께 뜬다
    const result = page.getByRole('button', { name: /치킨.*요식업/ })
    await expect(result.first()).toBeVisible()
    await result.first().click()

    // 검색창이 닫히고 선택이 반영된다
    await expect(page.getByPlaceholder('업종을 입력해보세요 (예: 통닭, 헤어샵)')).toHaveCount(0)
  })

  test('목록에 없는 업종 → 직접입력 폴백', async ({ page }) => {
    await page.goto('/e1/1')

    await page.getByRole('button', { name: '숙박·사무·기타', exact: true }).click()
    await page.getByText('업종 직접 검색').click()
    await page.getByPlaceholder('업종을 입력해보세요 (예: 통닭, 헤어샵)').fill('우주정거장')
    await page.getByRole('button', { name: /"우주정거장" 그대로 입력하기/ }).click()

    await expect(page.getByText('✓ 직접입력: 우주정거장')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────
test.describe('프랜차이즈 브랜드 → 신규 3필드 자동 세팅', () => {
  test('브랜드 선택 시 category_main/sub가 승계된다', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await mockDailyContents(page)

    // 브랜드 검색 결과 mock — 백필된 3컬럼을 함께 반환
    // 교차 출처라 content-range는 expose-headers에 넣어야 supabase가 count를 읽는다
    const CORS = {
      'content-range': '0-0/11683',
      'access-control-expose-headers': 'content-range',
    }
    await page.route(`${SUPABASE}/franchise_brands*`, async route => {
      if (route.request().method() === 'HEAD') {
        await route.fulfill({ status: 200, headers: CORS })
        return
      }
      await route.fulfill({
        status: 200, contentType: 'application/json', headers: CORS,
        body: JSON.stringify([{
          id: 'brand-1', brand_name: '모두치킨', biz_type: '외식 > 치킨',
          category_main: '요식업', category_sub: '치킨', ksic_code: '56193',
        }]),
      })
    })

    await page.goto('/e1/1')
    await page.getByRole('button', { name: '예', exact: true }).click()
    await page.getByPlaceholder('브랜드명 검색 (예: 메가커피, 빽다방)').fill('모두치킨')
    await page.getByRole('button', { name: /모두치킨/ }).click()

    await expect(page.getByText('브랜드 업종으로 자동 선택됐어요')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────
test.describe('탐색 "같은 업종" 필터 — 대분류 기준', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
  })

  test('프랜차이즈 매물과 직접 등록 매물이 같은 대분류면 매칭된다', async ({ page }) => {
    // 예전엔 biz_type 문자열 비교라 '외식 > 치킨' vs '치킨·피자'가 영원히 안 맞았다
    const mine = {
      id: 'mine', device_id: 'me', status: 'published',
      biz_type: '외식 > 치킨', category_main: '요식업', category_sub: '치킨',
      address: '서울 마포구 서교동 1', shop_name: '내 치킨집', shop_name_public: true,
      franchise_brand_name: '모두치킨', is_franchise: true, image_urls: [], review_choices: {},
      created_at: '2026-07-19T00:00:00Z',
    }
    const other = {
      id: 'other', device_id: 'someone', status: 'published',
      biz_type: '한식', category_main: '요식업', category_sub: '한식',
      address: '부산 해운대구 우동 1', shop_name: '남의 한식집', shop_name_public: true,
      is_franchise: false, image_urls: [], review_choices: {},
      created_at: '2026-07-18T00:00:00Z',
    }
    const offCategory = {
      id: 'off', device_id: 'someone', status: 'published',
      biz_type: '카페·디저트', category_main: '카페·베이커리', category_sub: '카페·커피전문점',
      address: '서울 강남구 역삼동 1', shop_name: '남의 카페', shop_name_public: true,
      is_franchise: false, image_urls: [], review_choices: {},
      created_at: '2026-07-17T00:00:00Z',
    }

    await page.addInitScript(() => {
      localStorage.setItem('modu_device_id', 'me')
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
    })
    await page.route(LISTINGS, async route => {
      const url = route.request().url()
      if (route.request().method() !== 'GET') return route.continue()
      // 내 매물 조회(device_id 필터)와 전체 조회를 구분
      const body = url.includes('device_id=eq.me') ? [mine] : [mine, other, offCategory]
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })

    await page.goto('/explore')
    await page.getByRole('button', { name: '같은 업종' }).click()

    // 같은 대분류(요식업) — 프랜차이즈 내 매물과 직접 등록 한식집이 함께 남는다
    await expect(page.getByText('남의 한식집')).toBeVisible()
    // 다른 대분류는 걸러진다
    await expect(page.getByText('남의 카페')).toHaveCount(0)
  })
})

// ─────────────────────────────────────────────────────────
test.describe('시설 추천 — 신규 컬럼 기준', () => {
  const seedDraft = (page, extra) => page.addInitScript(d => {
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', name: '테스터', region: '서울' }))
    sessionStorage.setItem('modu_e1_draft', JSON.stringify({
      address: '서울 마포구 서교동 332-4', shopName: '테스트 가게',
      area: '33', deposit: '3000', monthlyRent: '200', transferFee: '3000', transferType: 'full',
      reviewChoices: {}, interiorPhotos: [], exteriorPhotos: [], salesProof: false, facilities: [],
      ...d,
    }))
  }, extra)

  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await mockDailyContents(page)
  })

  test('프랜차이즈 매물도 업종별 시설이 나온다 (예전엔 기본 목록으로 떨어짐)', async ({ page }) => {
    await seedDraft(page, {
      biz_type: '외식 > 치킨', bizType: '외식 > 치킨',
      categoryMain: '요식업', categorySub: '치킨',
    })
    await page.goto('/e1/3')
    await page.waitForTimeout(400)

    // 치킨·피자 시설 묶음이 떠야 함 — 기본 목록('기본 집기')이 아니라
    await expect(page.getByRole('button', { name: '배달 장비' })).toBeVisible()
    await expect(page.getByRole('button', { name: '기본 집기' })).toHaveCount(0)
  })

  test('소분류가 없어도 대분류로 시설을 고른다', async ({ page }) => {
    await seedDraft(page, { bizType: '', categoryMain: '카페·베이커리', categorySub: null })
    await page.goto('/e1/3')
    await page.waitForTimeout(400)

    await expect(page.getByRole('button', { name: '커피·음료 장비' })).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────
test.describe('홈 헤더 업종 표기', () => {
  const BASE = {
    id: 'l1', shop_name: '테스트 가게', shop_name_public: true, status: 'published',
    address: '서울특별시 마포구 양화로 1', transfer_fee: '3000',
    device_id: 'd', review_choices: {}, image_urls: [], interior_image_urls: [],
    created_at: '2026-07-19T00:00:00Z',
  }

  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', bizType: '패스트푸드', region: '경기' }))
    })
  })

  test('대분류 > 소분류로 표기', async ({ page }) => {
    await mockListings(page, [{ ...BASE, biz_type: '치킨', category_main: '요식업', category_sub: '치킨' }])
    await page.goto('/a7/seller')

    await expect(page.getByText('요식업 > 치킨 양도 준비 중')).toBeVisible()
  })

  test('소분류가 없으면 대분류만', async ({ page }) => {
    await mockListings(page, [{ ...BASE, biz_type: '카페·디저트', category_main: '카페·베이커리', category_sub: null }])
    await page.goto('/a7/seller')

    await expect(page.getByText('카페·베이커리 양도 준비 중')).toBeVisible()
    await expect(page.getByText('>')).toHaveCount(0)
  })

  test('신규 컬럼이 빈 옛 매물은 biz_type 폴백', async ({ page }) => {
    await mockListings(page, [{ ...BASE, biz_type: '카페·디저트', category_main: null, category_sub: null }])
    await page.goto('/a7/seller')

    await expect(page.getByText('카페·디저트 양도 준비 중')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────
test.describe('완성도 채점 — 업종 반영', () => {
  const base = {
    address: '서울 마포구 서교동 1', shop_name: '가게', area: '33',
    deposit: '3000', monthly_rent: '200', transfer_fee: '3000', transfer_type: 'full',
    image_urls: [], review_choices: {}, sales_proof: false,
  }

  test('업종이 있으면 5점 더 높다', () => {
    const without = calcScore(listingToScoreInput({ ...base, biz_type: null, category_main: null }))
    const withMain = calcScore(listingToScoreInput({ ...base, biz_type: null, category_main: '요식업' }))
    expect(withMain - without, '업종 입력이 완성도에 반영되지 않음').toBe(5)
  })

  test('옛 매물(biz_type만)도 인정된다', () => {
    const legacy = calcScore(listingToScoreInput({ ...base, biz_type: '카페·디저트', category_main: null }))
    const none = calcScore(listingToScoreInput({ ...base, biz_type: null, category_main: null }))
    expect(legacy - none).toBe(5)
  })

  test('소분류 유무는 점수에 영향 없다 (소분류는 선택 사항)', () => {
    const mainOnly = calcScore(listingToScoreInput({ ...base, category_main: '요식업', category_sub: null }))
    const withSub = calcScore(listingToScoreInput({ ...base, category_main: '요식업', category_sub: '치킨' }))
    expect(withSub).toBe(mainOnly)
  })
})

// ─────────────────────────────────────────────────────────
test.describe('industryLabel — 표시 라벨 규칙', () => {
  test('대분류+소분류 / 대분류만 / 빈 값', () => {
    expect(industryLabel({ category_main: '요식업', category_sub: '치킨' })).toBe('요식업 > 치킨')
    expect(industryLabel({ category_main: '요식업', category_sub: null })).toBe('요식업')
    expect(industryLabel({ category_main: null, category_sub: null })).toBe(null)
    expect(industryLabel(null)).toBe(null)
  })
})
