/**
 * E1/5 입력 현황 체크리스트 — 실데이터 판정 (하드코딩 done 제거 회귀 방지)
 *
 * 1. 사진 4상태(내부0/외부0 · 3/0 · 0/1 · 3/1) 각각 완료/미완료 정확 표시
 * 2. E1/1 주소 선택 후 건축물대장 더미 자동채움(B1/33㎡) 부재 + 준비중 안내
 */
import { test, expect } from './fixtures.js'

// E1Context DRAFT_KEY와 동일 — draft 주입으로 단계 진행 없이 E1/5 도달
const DRAFT_KEY = 'modu_e1_draft'

const BASE_DRAFT = {
  address: '서울 마포구 서교동 1-1',
  detailAddress: '',
  shopName: '체크리스트 카페',
  floor: '1층',
  area: '33',
  deposit: '3000',
  monthlyRent: '200',
  maintenance: '',
  transferFee: '2500',
  transferType: 'full',
  monthlySales: '',
  autoFilled: false,
  reviewChoices: { description: 'keep', location: 'keep', facility: 'keep' },
  editedTexts: {},
  photosAdded: false,
  salesProof: false,
  facilities: [],
  interiorPhotos: [],
  exteriorPhotos: [],
  aiDraft: { description: '초안', facility: null, salesAnalysis: null },
}

const photo = n => Array.from({ length: n }, (_, i) => ({ url: `https://example.com/p${i}.jpg`, path: `p${i}.jpg` }))

async function gotoStep5WithDraft(page, draft) {
  await page.goto('/e1/1') // 동일 오리진 확보 후 draft 주입
  await page.evaluate(([k, d]) => sessionStorage.setItem(k, JSON.stringify(d)), [DRAFT_KEY, draft])
  await page.goto('/e1/5')
  await expect(page.getByText('입력 현황')).toBeVisible()
}

test.describe('E1/5 체크리스트 실판정', () => {
  const CASES = [
    { name: '내부0/외부0', interior: 0, exterior: 0, wantInterior: 'false', wantExterior: 'false' },
    { name: '내부3/외부0', interior: 3, exterior: 0, wantInterior: 'true', wantExterior: 'false' },
    { name: '내부0/외부1', interior: 0, exterior: 1, wantInterior: 'false', wantExterior: 'true' },
    { name: '내부3/외부1', interior: 3, exterior: 1, wantInterior: 'true', wantExterior: 'true' },
  ]

  for (const c of CASES) {
    test(`사진 판정: ${c.name}`, async ({ page }) => {
      await gotoStep5WithDraft(page, {
        ...BASE_DRAFT,
        interiorPhotos: photo(c.interior),
        exteriorPhotos: photo(c.exterior),
      })

      await expect(page.getByTestId('check-interior')).toHaveAttribute('data-done', c.wantInterior)
      await expect(page.getByTestId('check-exterior')).toHaveAttribute('data-done', c.wantExterior)
      // 사진과 무관한 행은 입력값 기반으로 정확히 완료 표시
      await expect(page.getByTestId('check-address')).toHaveAttribute('data-done', 'true')
      await expect(page.getByTestId('check-proof')).toHaveAttribute('data-done', 'false')
    })
  }
})

test('E1/1: 건축물대장 더미 자동채움 부재 + 준비중 안내', async ({ page }) => {
  // 주소만 있고 층·면적 빈 draft — 옛 더미라면 B1/33이 자동으로 채워졌을 상태
  await page.goto('/e1/1')
  await page.evaluate(([k, d]) => sessionStorage.setItem(k, JSON.stringify(d)),
    [DRAFT_KEY, { ...BASE_DRAFT, floor: '', area: '', aiDraft: null }])
  await page.goto('/e1/1')

  await expect(page.getByText('건축물대장 자동조회 준비중', { exact: false })).toBeVisible()
  await expect(page.getByText('건축물대장 자동 확인 완료')).toHaveCount(0)
  await expect(page.getByText('자동', { exact: true })).toHaveCount(0) // '자동' 배지 부재
  await expect(page.locator('input[placeholder="면적 입력"]')).toHaveValue('') // 33㎡ 더미 미채움
})
