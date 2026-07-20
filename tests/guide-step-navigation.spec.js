/**
 * 진행 가이드 — 모든 단계 탭 진입
 *
 * 완료된 단계도 눌러서 되돌아가 고칠 수 있어야 한다.
 * 진행 중 단계의 CTA 동작은 종전 그대로.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const ME = 'guide-nav-device'

// 1~4단계를 모두 완료한 매물 (사진 3장 + 소개글 확인 + 공개)
const DONE_LISTING = {
  id: 'l1', device_id: ME, status: 'published',
  shop_name: '가이드 테스트', shop_name_public: true,
  address: '서울 마포구 서교동 332-4', transfer_fee: '3000', transfer_type: 'full',
  area: '33', biz_type: '카페·커피전문점',
  category_main: '카페·베이커리', category_sub: '카페·커피전문점',
  interior_image_urls: ['a', 'b', 'c'], image_urls: [],
  review_choices: { confirmedAt: '2026-07-20T12:00:00.000Z', editedCount: 0 },
  ai_draft: { description: '정상 소개글입니다.' }, edited_texts: {}, item_visibility: {},
  facilities: [], created_at: '2026-07-19T00:00:00Z',
}

async function setup(page, row = DONE_LISTING, { convs = [], msgs = [] } = {}) {
  await mockGemini(page)
  await mockMarketData(page)
  await page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
  }, ME)
  await page.route(`${SUPABASE}/conversations*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(convs) }))
  await page.route(`${SUPABASE}/messages*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(msgs) }))
  await page.route(`${SUPABASE}/listings*`, r => {
    const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? row : [row]) })
  })
}

test.describe('완료된 단계도 탭하면 이동한다', () => {
  const CASES = [
    ['register', '/e2/l1', '매물 등록 → 매물 상세(소유자 모드)'],
    ['photos', '/e1/3?edit=l1', '내부 사진 → 사진 관리 화면'],
    ['draft', '/e1/2?edit=l1', '소개글 다듬기 → 소개글 편집'],
    ['publish', '/e2/l1', '매물 공개하기 → 매물 상세'],
  ]

  for (const [id, url, label] of CASES) {
    test(label, async ({ page }) => {
      await setup(page)
      await page.goto('/a7/seller')

      const row = page.getByTestId(`guide-${id}`)
      await expect(row, `${id}이 완료 상태가 아님`).toHaveAttribute('data-done', 'true')
      await row.click()
      await expect(page).toHaveURL(url)
    })
  }

  test('완료 단계에 셰브런이 보인다 (탭 가능 신호)', async ({ page }) => {
    await setup(page)
    await page.goto('/a7/seller')

    for (const id of ['register', 'photos', 'draft', 'publish']) {
      await expect(page.getByTestId(`guide-chevron-${id}`)).toBeVisible()
    }
  })

  test('완료 단계의 취소선·체크 스타일은 유지된다', async ({ page }) => {
    await setup(page)
    await page.goto('/a7/seller')

    const label = page.getByTestId('guide-register').locator('span').first()
    await expect(label).toHaveClass(/line-through/)
  })
})

test.describe('기다리는 단계 — 목적지 연결', () => {
  test('첫 문의 받기 → D4 인박스', async ({ page }) => {
    await setup(page)
    await page.goto('/a7/seller')

    await page.getByTestId('guide-inquiry').click()
    await expect(page).toHaveURL('/d4/inbox')
  })

  test('가격 협의 시작 → 매물 상세(상태 전환 자리)', async ({ page }) => {
    await setup(page)
    await page.goto('/a7/seller')

    await page.getByTestId('guide-negotiate').click()
    await expect(page).toHaveURL('/e2/l1')
  })
})

test.describe('진행 중 단계의 CTA 동작은 현행 유지', () => {
  test('매물 0건: 등록 단계가 진행 중이고 CTA로 /e1/1', async ({ page }) => {
    await setup(page, undefined, {})
    await page.route(`${SUPABASE}/listings*`, r =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/a7/seller')

    await expect(page.getByText('탭하여 등록 →')).toBeVisible()
    await page.getByTestId('guide-register').click()
    await expect(page).toHaveURL('/e1/1')
  })

  test('사진 미달: 진행 중 단계는 CTA 뱃지 유지 + 사진 화면으로', async ({ page }) => {
    await setup(page, { ...DONE_LISTING, interior_image_urls: ['a'] })
    await page.goto('/a7/seller')

    await expect(page.getByTestId('guide-photos')).toHaveAttribute('data-done', 'false')
    await expect(page.getByText('탭하여 추가 →')).toBeVisible()
    // 진행 중 단계엔 셰브런 대신 CTA 뱃지가 뜬다
    await expect(page.getByTestId('guide-chevron-photos')).toHaveCount(0)

    await page.getByTestId('guide-photos').click()
    await expect(page).toHaveURL('/e1/3?edit=l1')
  })
})
