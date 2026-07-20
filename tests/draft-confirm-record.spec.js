/**
 * 소개글 확인 판정 복구 — 제3안 (확인 이벤트 기록)
 *
 * E1Step2 '다음'에서 review_choices에 { confirmedAt, editedCount } 를 남긴다.
 * 판정식·뱃지·점수는 손대지 않았고, Object.keys 판정이 자연 부활하는지 확인한다.
 *
 * 1. 그대로 수용(수정 0건)도 confirmedAt 기록 → 3단계 완료
 * 2. 수정 후 저장 → editedCount 반영
 * 3. 옛 매물의 per-block 모양과 공존 (회귀 없음)
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { calcScore, listingToScoreInput, trustBadges } from '../src/lib/completeness.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const ME = 'confirm-device'

const DRAFT = {
  address: '서울 마포구 서교동 332-4', shopName: '확인 테스트 카페',
  deposit: '3000', monthlyRent: '200', transferFee: '3000', transferType: 'full',
  area: '33', bizType: '카페·커피전문점',
  categoryMain: '카페·베이커리', categorySub: '카페·커피전문점',
  reviewChoices: {}, interiorPhotos: [], exteriorPhotos: [], facilities: [],
}

function seed(page, draft = DRAFT) {
  return page.addInitScript(([id, d]) => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', bizType: '카페·디저트', region: '서울' }))
    sessionStorage.setItem('modu_e1_draft', JSON.stringify(d))
  }, [ME, draft])
}

/** '다음'까지 진행한 뒤 draft에 남은 reviewChoices를 읽는다 */
async function confirmAndRead(page) {
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.waitForURL('**/e1/3')
  return page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('modu_e1_draft') ?? '{}').reviewChoices)
}

test.describe('소개글 확인 이벤트 기록', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await seed(page)
    await page.route(`${SUPABASE}/listings*`, r =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  })

  test('그대로 수용(수정 0건)도 confirmedAt이 기록된다', async ({ page }) => {
    await page.goto('/e1/2')
    await expect(page.getByTestId('block-description')).toBeVisible()

    const rc = await confirmAndRead(page)

    expect(rc.confirmedAt, 'confirmedAt이 기록되지 않음').toBeTruthy()
    expect(new Date(rc.confirmedAt).toString(), 'ISO 시각이 아님').not.toBe('Invalid Date')
    expect(rc.editedCount, '수정 0건인데 editedCount가 0이 아님').toBe(0)
  })

  test('수정 후 저장하면 editedCount에 반영된다', async ({ page }) => {
    await page.goto('/e1/2')
    await expect(page.getByTestId('block-description')).toBeVisible()

    // 설명문 한 개를 실제로 고친다
    const card = page.getByTestId('block-description')
    await card.getByRole('button', { name: /수정하기/ }).click()
    await card.locator('textarea').fill('직접 고쳐 쓴 소개글입니다.')
    await card.getByRole('button', { name: /저장/ }).click()

    const rc = await confirmAndRead(page)

    expect(rc.editedCount, '수정 1건이 반영되지 않음').toBe(1)
    expect(rc.confirmedAt).toBeTruthy()
  })

  test('확인 기록이 있으면 Object.keys 판정이 참이 된다 (판정식 무수정)', async ({ page }) => {
    await page.goto('/e1/2')
    await expect(page.getByTestId('block-description')).toBeVisible()
    const rc = await confirmAndRead(page)

    // 홈 가이드 3단계 · E2 검수 뱃지 · 완성도 점수가 공통으로 쓰는 판정
    expect(Object.keys(rc).length, '판정이 자연 부활하지 않음').toBeGreaterThan(0)
  })
})

test.describe('판정 소비처 — 실제 저장 모양으로 검증', () => {
  const base = {
    address: '서울 마포구 서교동 1', shop_name: '가게', area: '33',
    deposit: '3000', monthly_rent: '200', transfer_fee: '3000', transfer_type: 'full',
    category_main: '카페·베이커리', image_urls: ['a'], sales_proof: false,
  }
  // E1Step2가 실제로 남기는 모양
  const CONFIRMED = { confirmedAt: '2026-07-20T12:00:00.000Z', editedCount: 0 }
  // 옛 매물(E1Step3 시절) 모양
  const LEGACY = { description: 'keep', location: 'keep' }

  test('완성도 점수: 확인 기록 유무로 뱃지가 갈린다', () => {
    const withConfirm = trustBadges({ ...base, review_choices: CONFIRMED })
    const without = trustBadges({ ...base, review_choices: {} })

    expect(withConfirm.some(b => b.id === 'reviewed'), '확인했는데 검수 뱃지 없음').toBe(true)
    expect(without.some(b => b.id === 'reviewed'), '미확인인데 검수 뱃지 있음').toBe(false)
  })

  test('옛 per-block 모양도 그대로 인정된다 (회귀 없음)', () => {
    const legacy = trustBadges({ ...base, review_choices: LEGACY })
    expect(legacy.some(b => b.id === 'reviewed')).toBe(true)
  })

  test('점수 계산은 확인 기록에 영향받지 않는다 (별도 항목)', () => {
    const a = calcScore(listingToScoreInput({ ...base, review_choices: CONFIRMED }))
    const b = calcScore(listingToScoreInput({ ...base, review_choices: {} }))
    expect(a).toBe(b)
  })
})

test.describe('홈 가이드 3단계 — 확인 기록으로 완료', () => {
  test('confirmedAt만 있어도 소개글 단계가 완료된다', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await page.addInitScript(id => {
      localStorage.setItem('modu_device_id', id)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
    }, ME)

    const row = {
      id: 'l1', device_id: ME, status: 'published',
      shop_name: '확인 테스트', shop_name_public: true,
      address: '서울 마포구 서교동 332-4', transfer_fee: '3000', transfer_type: 'full',
      category_main: '카페·베이커리', category_sub: '카페·커피전문점', biz_type: '카페·커피전문점',
      interior_image_urls: ['a', 'b', 'c'], image_urls: [],
      review_choices: { confirmedAt: '2026-07-20T12:00:00.000Z', editedCount: 0 },
      ai_draft: {}, edited_texts: {}, item_visibility: {}, facilities: [],
      created_at: '2026-07-19T00:00:00Z',
    }
    await page.route(`${SUPABASE}/listings*`, r => {
      const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? row : [row]) })
    })
    await page.route(`${SUPABASE}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route(`${SUPABASE}/messages*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/a7/seller')
    await expect(page.getByTestId('guide-draft')).toHaveAttribute('data-done', 'true')
  })
})
