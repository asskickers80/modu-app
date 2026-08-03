/**
 * 업종 소분류 재질문 플로우 (ORDER-biztype-unify-step1 구현 순서 6)
 *
 * 대상: 백필로 대분류까지만 복원된 매물 (category_main 있고 category_sub 없음)
 * 1. 홈 진입 시 노출 / 대상 아니면 미노출
 * 2. 칩 선택 → 즉시 저장(PATCH) + 소유권(device_id) 조건 포함
 * 3. 닫기 → 이번 접속엔 미노출, 다음 접속(새 세션)엔 재노출 — 강제 게이트 아님
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const MY_DEVICE = 'sub-prompt-device'

// 재질문 대상 — 실 데이터와 같은 형태(백필로 대분류만 채워진 example 매물)
const TARGET = {
  id: 'listing-target', device_id: MY_DEVICE, status: 'example',
  shop_name: '테스트 카페', shop_name_public: true,
  biz_type: '카페·디저트', category_main: '카페·베이커리', category_sub: null, ksic_code: null,
  address: '서울 마포구 서교동 1', transfer_fee: '3000',
  image_urls: [], interior_image_urls: [], review_choices: {},
  created_at: '2026-07-19T00:00:00Z',
}
// 이미 소분류까지 있는 매물 — 재질문 대상 아님
const DONE = {
  ...TARGET, id: 'listing-done', status: 'published',
  category_sub: '카페·커피전문점', ksic_code: '56221',
}

function seedDevice(page) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
  }, MY_DEVICE)
}

function mockListings(page, rows) {
  return page.route(SUPABASE_LISTINGS, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    } else {
      await route.continue()
    }
  })
}

test.describe('업종 소분류 재질문', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await seedDevice(page)
  })

  test('대상 매물이 있으면 홈에 재질문 카드가 뜬다', async ({ page }) => {
    await mockListings(page, [TARGET])
    await page.goto('/a7/seller')

    await expect(page.getByTestId('industry-sub-prompt')).toBeVisible()
    await expect(page.getByText('업종을 새 분류로 확인해주세요')).toBeVisible()
    // 그 매물의 대분류에 속한 소분류들이 칩으로 나온다
    await expect(page.getByTestId('industry-sub-카페·커피전문점')).toBeVisible()
    await expect(page.getByTestId('industry-sub-제과·베이커리')).toBeVisible()
  })

  test('소분류가 이미 있으면 뜨지 않는다', async ({ page }) => {
    await mockListings(page, [DONE])
    await page.goto('/a7/seller')

    await expect(page.getByTestId('my-listing-card')).toBeVisible()
    await expect(page.getByTestId('industry-sub-prompt')).toHaveCount(0)
  })

  test('매물이 아예 없으면 뜨지 않는다', async ({ page }) => {
    await mockListings(page, [])
    await page.goto('/a7/seller')

    await expect(page.getByTestId('register-listing-cta')).toBeVisible()
    await expect(page.getByTestId('industry-sub-prompt')).toHaveCount(0)
  })

  test('칩 선택 → 즉시 저장 (소분류·KSIC·소유권 조건 포함)', async ({ page }) => {
    let patchUrl = null
    let patchBody = null
    let saved = false

    await page.route(SUPABASE_LISTINGS, async route => {
      const req = route.request()
      if (req.method() === 'PATCH') {
        patchUrl = req.url()
        patchBody = JSON.parse(req.postData() ?? '{}')
        saved = true
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }
      // 저장 후 재조회에는 반영된 상태를 돌려준다
      const rows = saved
        ? [{ ...TARGET, category_sub: '카페·커피전문점', ksic_code: '56221' }]
        : [TARGET]
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    })

    await page.goto('/a7/seller')
    await page.getByTestId('industry-sub-카페·커피전문점').click()

    await expect(page.getByText('업종을 저장했어요')).toBeVisible()

    expect(patchBody.category_sub, '소분류가 저장되지 않음').toBe('카페·커피전문점')
    expect(patchBody.ksic_code, 'KSIC 코드가 함께 저장되지 않음').toBe('56221')
    // 남의 매물을 고칠 수 없도록 소유권 조건이 쿼리에 포함돼야 함
    expect(patchUrl).toContain(`device_id=eq.${MY_DEVICE}`)
    expect(patchUrl).toContain('id=eq.listing-target')

    // 저장 후에는 재질문이 사라진다
    await expect(page.getByTestId('industry-sub-prompt')).toHaveCount(0)
  })

  test('닫기 → 이번 접속에는 다시 뜨지 않는다 (강제 게이트 아님)', async ({ page }) => {
    await mockListings(page, [TARGET])
    await page.goto('/a7/seller')

    await expect(page.getByTestId('industry-sub-prompt')).toBeVisible()
    await page.getByTestId('industry-sub-prompt-close').click()
    await expect(page.getByTestId('industry-sub-prompt')).toHaveCount(0)

    // 같은 세션에서 새로고침해도 계속 닫힌 상태
    await page.reload()
    await expect(page.getByTestId('my-listing-card').or(page.getByTestId('register-listing-cta')).first()).toBeVisible()
    await expect(page.getByTestId('industry-sub-prompt')).toHaveCount(0)
  })

  test('닫아도 다음 접속(새 세션)에는 다시 뜬다', async ({ page, context }) => {
    await mockListings(page, [TARGET])
    await page.goto('/a7/seller')
    await page.getByTestId('industry-sub-prompt-close').click()
    await expect(page.getByTestId('industry-sub-prompt')).toHaveCount(0)

    // 새 탭 = 새 세션(sessionStorage 초기화). device_id는 localStorage라 유지된다.
    const next = await context.newPage()
    await mockGemini(next)
    await mockListings(next, [TARGET])
    await next.goto('/a7/seller')

    await expect(next.getByTestId('industry-sub-prompt')).toBeVisible()
  })

  // ── 매물 단위 전환 (ORDER-industry-banner-per-listing-v1) ──
  const TARGET2 = {
    ...TARGET, id: 'listing-target2', shop_name: '홍대 치킨집',
    biz_type: '치킨', category_main: '요식업', category_sub: null, ksic_code: null,
    address: '서울 마포구 동교동 2',
  }

  test('복수 미확인: 대상 매물 지목 + 순차 처리 — 한 건 저장에 다른 매물·프로필 불변', async ({ page }) => {
    const patches = []
    await page.route(SUPABASE_LISTINGS, async route => {
      const req = route.request()
      if (req.method() === 'PATCH') {
        patches.push(req.url())
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }
      const rows = patches.length
        ? [{ ...TARGET, category_sub: '카페·커피전문점', ksic_code: '56221' }, TARGET2]
        : [TARGET, TARGET2]
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    })

    await page.goto('/a7/seller')
    // 1번째 대상 지목 — 상호·주소 + 남은 건수
    const target = page.getByTestId('industry-prompt-target')
    await expect(target).toContainText('테스트 카페')
    await expect(target).toContainText('서울 마포구 서교동 1')
    await expect(page.getByTestId('industry-prompt-remaining')).toContainText('미확인 2건 중 1번째')

    await page.getByTestId('industry-sub-카페·커피전문점').click()
    await expect(page.getByText('업종을 저장했어요 — 다음 매물도 확인해 주세요')).toBeVisible()

    // 해당 매물 행에만 PATCH 1회 — 다른 매물 불변
    expect(patches.length).toBe(1)
    expect(patches[0]).toContain('id=eq.listing-target')
    expect(patches[0]).not.toContain('listing-target2')

    // 순차: 다음 미확인 매물이 이어서 지목된다 (요식업 칩)
    await expect(page.getByTestId('industry-prompt-target')).toContainText('홍대 치킨집')
    await expect(page.getByTestId('industry-sub-치킨')).toBeVisible()
    await expect(page.getByTestId('industry-prompt-remaining')).toHaveCount(0) // 마지막 1건 — 카운트 뱃지 없음

    // 프로필(온보딩 원본)은 건드리지 않는다
    const prof = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_user_profile')))
    expect(prof.category).toBe('seller')
    expect(prof.bizType ?? null).toBe(null)
  })

  test('헤더 정합: 복수 매물 업종 상이 → 업종 대신 건수 표기', async ({ page }) => {
    const doneChicken = { ...TARGET2, id: 'done-chicken', status: 'published', category_sub: '치킨', ksic_code: '56193' }
    await mockListings(page, [DONE, doneChicken])
    await page.goto('/a7/seller')
    await expect(page.getByText('매물 2건 양도 준비 중')).toBeVisible()
  })

  test('헤더 정합: 복수 매물 업종 동일 → 업종 표기 유지', async ({ page }) => {
    await mockListings(page, [DONE, { ...DONE, id: 'done-2' }])
    await page.goto('/a7/seller')
    await expect(page.getByText('카페·베이커리 > 카페·커피전문점 양도 준비 중')).toBeVisible()
  })

  test('닫기는 매물을 건드리지 않는다 (쓰기 없음)', async ({ page }) => {
    let writes = 0
    await page.route(SUPABASE_LISTINGS, async route => {
      if (route.request().method() !== 'GET') {
        writes++
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([TARGET]) })
    })

    await page.goto('/a7/seller')
    await page.getByTestId('industry-sub-prompt-close').click()
    await page.waitForTimeout(300)

    expect(writes, `닫기만 했는데 쓰기 ${writes}회 발생`).toBe(0)
  })
})
