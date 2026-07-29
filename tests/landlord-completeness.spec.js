/**
 * 임대인 완성도 배점 (ORDER-landlord-completeness-v1)
 * 유닛: 배점 경계(임대/매각/둘다 × 항목 유무)·0/100 양극·힌트 최저 항목 매칭
 * UI: 홈 ⑦ 카드 — 준비중 → 실점수(복수 상가는 최저 대표) + 힌트
 * 원칙: 완성도 = 정보 충실도. 질 평가·랭킹 판매 아님.
 */
import { test, expect } from './fixtures.js'
import { calcScoreLandlord, landlordScoreBreakdown, landlordNextHint } from '../src/lib/completeness.js'

const FULL = {
  listingType: 'both',
  address: '서울 마포구 서교동 2', detailAddress: '101호', floor: '1', area: '40',
  deposit: '3000', monthlyRent: '200', salePrice: '90000', capRate: '',
  occupancy: 'occupied',
  exteriorPhotos: [{ url: 'e1' }, { url: 'e2' }, { url: 'e3' }], floorPlanPhotos: [{ url: 'p1' }],
  reviewChoices: { confirmedAt: '2026-08-01T00:00:00Z' }, editedTexts: { description: '수정' }, itemVisibility: {},
  showMap: true, recommendedBiz: ['카페'], extras: ['tax'],
}

test.describe('배점 유닛', () => {
  test('양극: 빈 데이터(지도 OFF) 0점 / 전 항목 충족 100점', () => {
    expect(calcScoreLandlord({ showMap: false })).toBe(0)
    expect(calcScoreLandlord(FULL)).toBe(100)
  })

  test('기본 정보 20 — 거래유형별 가격 조건', () => {
    const get = (d, id) => landlordScoreBreakdown(d).find(i => i.id === id).got
    // 임대: 보증금+월세 둘 다 있어야 10
    expect(get({ listingType: 'rent', deposit: '1000', monthlyRent: '100' }, 'basic')).toBe(10)
    expect(get({ listingType: 'rent', monthlyRent: '100' }, 'basic')).toBe(0)
    // 매각: 매매가
    expect(get({ listingType: 'sale', salePrice: '50000' }, 'basic')).toBe(10)
    // 둘다: 양쪽 모두 — 매매가만으론 0
    expect(get({ listingType: 'both', salePrice: '50000' }, 'basic')).toBe(0)
    expect(get({ listingType: 'both', salePrice: '50000', deposit: '1000', monthlyRent: '100' }, 'basic')).toBe(10)
    // 주소+상세 5 / 면적·층 5
    expect(get({ address: '서울', detailAddress: '101호' }, 'basic')).toBe(5)
    expect(get({ address: '서울' }, 'basic')).toBe(0)
    expect(get({ area: '40', floor: '1' }, 'basic')).toBe(5)
  })

  test('임차 현황·수익률 15 — occupancy 5 + 산출 가능 10', () => {
    const get = d => landlordScoreBreakdown(d).find(i => i.id === 'tenancy').got
    expect(get({ occupancy: 'vacant' })).toBe(5)
    // 매각: capRate 저장값 또는 매매가+월세로 산출
    expect(get({ listingType: 'sale', capRate: '5.2' })).toBe(10)
    expect(get({ listingType: 'sale', salePrice: '50000', monthlyRent: '200' })).toBe(10)
    expect(get({ listingType: 'sale', salePrice: '50000' })).toBe(0)
    // 임대 단독: 현 임대료(월세) 입력 시 10
    expect(get({ listingType: 'rent', monthlyRent: '150', occupancy: 'occupied' })).toBe(15)
  })

  test('사진 25 — 외관 1장 10 / 3장 +5 / 도면 +10', () => {
    const get = d => landlordScoreBreakdown(d).find(i => i.id === 'photos').got
    expect(get({ exteriorPhotos: [{}] })).toBe(10)
    expect(get({ exteriorPhotos: [{}, {}, {}] })).toBe(15)
    expect(get({ floorPlanPhotos: [{}] })).toBe(10)
    expect(get({ exteriorPhotos: [{}, {}, {}], floorPlanPhotos: [{}] })).toBe(25)
  })

  test('소개글 20 — 확정 10, 수정·전공개는 확정 위 가산', () => {
    const get = d => landlordScoreBreakdown(d).find(i => i.id === 'draft').got
    const confirmed = { reviewChoices: { confirmedAt: 'x' } }
    expect(get({})).toBe(0)
    expect(get({ ...confirmed, itemVisibility: { rent_market: false } })).toBe(10) // 비공개 블록 존재 → 전공개 5 없음
    expect(get({ ...confirmed })).toBe(15) // 확정 + 전공개(기본)
    expect(get({ ...confirmed, editedTexts: { description: 'y' } })).toBe(20)
    expect(get({ editedTexts: { description: 'y' } })).toBe(0) // 확정 없인 가산 없음
  })

  test('위치 10 / 부가 10', () => {
    const get = (d, id) => landlordScoreBreakdown(d).find(i => i.id === id).got
    expect(get({}, 'location')).toBe(10)            // 기본 ON
    expect(get({ showMap: false }, 'location')).toBe(0)
    expect(get({ recommendedBiz: ['카페'] }, 'extra')).toBe(5)
    expect(get({ recommendedBiz: ['카페'], extras: ['arch'] }, 'extra')).toBe(10)
  })

  test('힌트: 잃은 점수 최대 항목 우선 — 사진 최우선 / 도면만 남으면 도면 문구 / 만점 null', () => {
    expect(landlordNextHint({})).toBe('외관 사진을 추가하면 완성도가 올라가요') // 사진 25 손실 최대
    expect(landlordNextHint({ ...FULL, floorPlanPhotos: [] })).toBe('도면을 추가하면 완성도가 올라가요')
    expect(landlordNextHint({ ...FULL, reviewChoices: {} })).toBe('소개글을 확정하면 완성도가 올라가요')
    expect(landlordNextHint(FULL)).toBe(null)
  })
})

// ── 홈 ⑦ 카드 UI ─────────────────────────────────────────────
const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const DEV = 'lc-dev'

const ROW_LOW = {
  id: 'lc-low', listing_type: 'landlord', deal_type: 'lease', status: 'published',
  address: '서울 마포구 서교동 1', show_map: true, device_id: DEV, created_at: '2026-08-01T00:00:00Z',
} // 점수 10 (위치 공개만)
const ROW_HIGH = {
  id: 'lc-high', listing_type: 'landlord', deal_type: 'both', status: 'published',
  address: '서울 마포구 서교동 2 101호', address_detail: '101호', floor: '1', area: '40',
  deposit: '3000', monthly_rent: '200', sale_price: '90000', occupancy: 'occupied',
  interior_image_urls: ['https://x.test/p1.jpg'],
  exterior_image_urls: ['https://x.test/e1.jpg', 'https://x.test/e2.jpg', 'https://x.test/e3.jpg'],
  review_choices: { confirmedAt: '2026-08-01T00:00:00Z' }, edited_texts: { description: '수정' },
  item_visibility: {}, recommended_biz: ['카페'], show_map: true,
  device_id: DEV, created_at: '2026-08-02T00:00:00Z',
} // 점수 95 (extras 미저장 → 부가 5 손실)

function mocks(page, rows) {
  page.route(`${SUPABASE}/listings*`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    : r.fulfill({ status: 204, body: '' }))
  page.route(`${SUPABASE}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  page.route(`${SUPABASE}/daily_contents*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  page.route(`${SUPABASE}/market_news*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
}

test.describe('extras 저장·복원 (권리관계 서류 — 부가 5점)', () => {
  test('수정 진입 → 무변경 저장: extras 왕복 보존 + 홈 점수 반영', async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('modu_device_id', id)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
    }, DEV)
    const row = { ...ROW_HIGH, extras: ['arch', 'tax'], terms_version: 'v1-2026-07' }
    let patched = null
    await page.route(`${SUPABASE}/listings*`, r => {
      if (r.request().method() === 'PATCH') {
        patched = JSON.parse(r.request().postData() || '{}')
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) })
    })

    await page.goto(`/e1p/3?edit=${ROW_HIGH.id}`)
    await page.getByRole('button', { name: '다음 — 완성도 확인' }).click()
    await page.getByRole('button', { name: '수정 완료하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await page.getByRole('button', { name: '대시보드로 이동' }).click({ timeout: 5000 })
    await expect(page).toHaveURL(/\/a7\/landlord/)
    await expect.poll(() => patched).not.toBeNull()
    expect(patched.extras).toEqual(['arch', 'tax']) // 복원 → 재저장 왕복 무손실
  })

  test('홈 카드: extras 저장된 상가 → 부가 만점 포함 100%', async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('modu_device_id', id)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord', region: '서울' }))
    }, DEV)
    mocks(page, [{ ...ROW_HIGH, extras: ['tax'] }])
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('completeness-score')).toHaveText('100%')
  })
})

test.describe('홈 완성도 카드', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('modu_device_id', id)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord', region: '서울' }))
    }, DEV)
  })

  test('복수 상가: 최저 점수 대표 + 기준 라벨 + 최저 항목 힌트', async ({ page }) => {
    mocks(page, [ROW_HIGH, ROW_LOW])
    await page.goto('/a7/landlord')
    const card = page.getByTestId('landlord-completeness')
    await expect(card.getByTestId('completeness-score')).toHaveText('10%') // 최저 상가 대표
    await expect(card).toContainText('상가 2곳 중 완성도가 가장 낮은 곳 기준')
    await expect(card.getByTestId('completeness-hint')).toContainText('외관 사진을 추가하면')
    await expect(card).not.toContainText('준비 중') // 준비중 사망
  })

  test('단일 상가: 자기 점수 표시, 복수 라벨 없음', async ({ page }) => {
    mocks(page, [ROW_HIGH])
    await page.goto('/a7/landlord')
    const card = page.getByTestId('landlord-completeness')
    await expect(card.getByTestId('completeness-score')).toHaveText('95%')
    await expect(card).not.toContainText('가장 낮은 곳 기준')
  })

  test('상가 0개: 가짜 점수 대신 정직 안내', async ({ page }) => {
    mocks(page, [])
    await page.goto('/a7/landlord')
    await expect(page.getByTestId('landlord-completeness')).toContainText('상가를 등록하면 완성도를 알려드려요')
  })
})
