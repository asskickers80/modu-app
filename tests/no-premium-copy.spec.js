/**
 * 프리미엄 문구 제거 — 없는 상품을 광고하지 않는다 (정직 원칙)
 *
 * ① "무료 노출(1층)" — 노출 등급 비유가 실제 점포 층수로 오독된다
 * ② 프리미엄 상품이 설계 전인데 혜택·가격을 광고하고 있었다
 *
 * 복귀 지점은 PROGRESS.md에 기록돼 있다.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const ME = 'premium-copy-device'

const DRAFT = {
  address: '서울 마포구 서교동 332-4', detailAddress: '1층',
  shopName: '카피 테스트 카페', shopNamePublic: true,
  deposit: '3000', monthlyRent: '200', transferFee: '3000', transferType: 'full',
  area: '33', floor: '1층', bizType: '카페·커피전문점',
  categoryMain: '카페·베이커리', categorySub: '카페·커피전문점',
  aiDraft: { description: '정상 소개글입니다.' },
  editedTexts: {}, itemVisibility: {}, reviewChoices: {},
  interiorPhotos: [{ url: 'a' }, { url: 'b' }, { url: 'c' }], exteriorPhotos: [],
  facilities: [], salesProof: false,
}

async function setup(page, draft = DRAFT) {
  await mockGemini(page)
  await mockMarketData(page)
  await page.addInitScript(([id, d]) => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
    if (d) sessionStorage.setItem('modu_e1_draft', JSON.stringify(d))
  }, [ME, draft])
  await page.route(`${SUPABASE}/**`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
}

test.describe('E1 4단계 — 노출 3층 안내 제거', () => {
  test('"무료 노출(1층)" 안내 박스가 사라졌다', async ({ page }) => {
    await setup(page)
    await page.goto('/e1/4')

    await expect(page.getByText(/무료 노출/)).toHaveCount(0)
    await expect(page.getByText(/1층\)/)).toHaveCount(0)
    await expect(page.getByText(/프리미엄/)).toHaveCount(0)
  })

  test('층수 비유가 사라져도 체크리스트는 그대로', async ({ page }) => {
    await setup(page)
    await page.goto('/e1/4')

    await expect(page.getByText('내부 사진 3장')).toBeVisible()
    await expect(page.getByText('매물 공개하기')).toBeVisible()
  })
})

test.describe('프리미엄 혜택 광고 제거 — 화면별', () => {
  test('E1 2단계 로딩 화면에 무료/프리미엄 대비 없음', async ({ page }) => {
    await setup(page, { ...DRAFT, aiDraft: null })
    await page.goto('/e1/2')

    await expect(page.getByText(/프리미엄/)).toHaveCount(0)
  })

  test('마이 — 업그레이드 유도 없음 (현재 플랜 표시는 유지)', async ({ page }) => {
    await setup(page, null)
    await page.goto('/my')

    await expect(page.getByText(/프리미엄/)).toHaveCount(0)
    await expect(page.getByText(/업그레이드/)).toHaveCount(0)
    await expect(page.getByText('현재 플랜: 무료')).toBeVisible()
  })

  test('멤버십 페이지 — 혜택 목록·가격 없이 준비 중 안내만', async ({ page }) => {
    await setup(page, null)
    await page.goto('/my/membership')

    await expect(page.getByText('유료 플랜은 준비 중이에요')).toBeVisible()
    await expect(page.getByText(/9,900원/)).toHaveCount(0)
    await expect(page.getByText(/프리미엄 혜택/)).toHaveCount(0)
    await expect(page.getByText(/노출 우선순위 상위권/)).toHaveCount(0)
  })

  test('창업준비 피드 — 프리미엄 추천 유도 없음', async ({ page }) => {
    await setup(page, null)
    await page.goto('/a7/startup')
    await page.waitForTimeout(500)

    await expect(page.getByText(/프리미엄/)).toHaveCount(0)
    await expect(page.getByText('추천의 질이 더 높아져요')).toHaveCount(0)
  })
})

test.describe('임대인 E1p — 같은 형태의 대비 박스 제거', () => {
  test('E1p 2단계에 무료/프리미엄 대비 없음', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord', region: '서울' }))
      sessionStorage.setItem('modu_e1p_draft', JSON.stringify({
        address: '서울 마포구 서교동 332-4', deposit: '3000', monthlyRent: '200', area: '33',
      }))
    })
    await page.route(`${SUPABASE}/**`, r =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/e1p/2')
    await page.waitForTimeout(500)

    await expect(page.getByText(/프리미엄/)).toHaveCount(0)
  })
})
