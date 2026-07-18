/**
 * 더보기(⋯) 시트 전면 개편 — [바로가기] + [객체 액션] 2그룹 공통 골격 (2026-07-18 오더)
 *
 * 규칙 검증:
 * - 객체 없으면 항목 미노출, 시트가 비면 ⋯ 버튼 자체 미노출
 * - 링크 복사 삭제 (공유하기로 통합), 시장 동향은 바로가기 그룹으로
 * - D4·미구현 화면 항목은 라우트 존재로 판정 → 현재는 전부 미노출
 * - 프로필 6종 × 노출/미노출
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const MY_DEVICE = 'more-sheet-device'

const LISTING = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  shop_name: '더보기 테스트 카페',
  address: '서울 마포구 서교동 1-1',
  area: '33',
  deposit: '3000',
  monthly_rent: '200',
  transfer_fee: '2500',
  transfer_type: 'full',
  ai_draft: {},
  review_choices: {},
  edited_texts: {},
  image_urls: [],
  facilities: [],
  status: 'published',
  device_id: MY_DEVICE,
  created_at: new Date().toISOString(),
}

function mockListings(page, rows) {
  return page.route(SUPABASE_LISTINGS, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) }))
}

function seedProfile(page, category) {
  return page.addInitScript(([id, cat]) => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: cat }))
  }, [MY_DEVICE, category])
}

test.describe('더보기 시트 — 프로필 6종 노출/미노출', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
  })

  test('양도인(매물 보유): 2그룹 구조 — 바로가기(시장 동향) + 매물 관리(공유·수정·숨기기·거래완료)', async ({ page }) => {
    await seedProfile(page, 'seller')
    await mockListings(page, [LISTING])

    await page.goto('/a7/seller')
    await expect(page.getByText('더보기 테스트 카페')).toBeVisible()

    await page.getByRole('button', { name: '···' }).click()

    // 그룹 라벨
    await expect(page.getByText('바로가기', { exact: true })).toBeVisible()
    await expect(page.getByText('매물 관리', { exact: true })).toBeVisible()
    // 바로가기
    await expect(page.getByText('시장 동향', { exact: true })).toBeVisible()
    // 매물 관리 (published)
    await expect(page.getByText('내 매물 공유하기')).toBeVisible()
    await expect(page.getByText('내 매물 수정하기')).toBeVisible()
    await expect(page.getByText('내 매물 숨기기')).toBeVisible()
    await expect(page.getByText('거래 완료 처리')).toBeVisible()
    // 폐기·미구현 항목
    await expect(page.getByText('링크 복사')).toHaveCount(0)
    await expect(page.getByText('시장 동향 보기')).toHaveCount(0) // 옛 라벨 경로 사멸
    // exact — 본문 안내 문구("받은 문의는 메시지 탭에서…")와 구분해 시트 항목만 겨냥
    await expect(page.getByText('받은 문의', { exact: true })).toHaveCount(0) // /messages 라우트 생기면 자동 노출
    await expect(page.getByText('내 매물 공개 전환')).toHaveCount(0) // published 상태에선 숨기기만
  })

  test('양도인 신규(매물 0): ⋯ 버튼 자체 미노출', async ({ page }) => {
    await seedProfile(page, 'seller')
    await mockListings(page, [])

    await page.goto('/a7/seller')
    await expect(page.getByText('양도 준비 중')).toBeVisible()
    await expect(page.getByRole('button', { name: '···' })).toHaveCount(0)
  })

  test('소유주(임대인): 매물 조회 도입 전 — ⋯ 미노출', async ({ page }) => {
    await seedProfile(page, 'landlord')

    await page.goto('/a7/landlord')
    await expect(page.getByText('상가 임대 관리 중')).toBeVisible()
    await expect(page.getByRole('button', { name: '···' })).toHaveCount(0)
  })

  test('창업자: 찜·저장 검색 화면 도입 전 — ⋯ 미노출', async ({ page }) => {
    await seedProfile(page, 'startup')
    await mockListings(page, [])

    await page.goto('/a7/startup')
    await expect(page.getByText('매물·브랜드 검색')).toBeVisible()
    await expect(page.getByRole('button', { name: '···' })).toHaveCount(0)
  })

  test('사장님(운영중): 가게 프로필·D4 도입 전 — ⋯ 미노출', async ({ page }) => {
    await seedProfile(page, 'operating')

    await page.goto('/a7/operating')
    await expect(page.getByText('내 가게').first()).toBeVisible()
    await expect(page.getByRole('button', { name: '···' })).toHaveCount(0)
  })

  test('기업회원: 노출 페이지·D4 도입 전 — ⋯ 미노출', async ({ page }) => {
    await seedProfile(page, 'business')

    await page.goto('/a7/business')
    await expect(page.getByText('검증됨')).toBeVisible()
    await expect(page.getByRole('button', { name: '···' })).toHaveCount(0)
  })

  test('방문자(그냥구경): ⋯ = 앱 공유하기 단일 항목', async ({ page }) => {
    await seedProfile(page, 'browsing')

    await page.goto('/a7/browsing')
    await expect(page.getByText('자영업자들의 이야기')).toBeVisible()

    await page.getByRole('button', { name: '···' }).click()
    await expect(page.getByText('앱 공유하기')).toBeVisible()
    // 단일 항목 — 그룹 라벨 없음
    await expect(page.getByText('바로가기', { exact: true })).toHaveCount(0)
    await expect(page.getByText('링크 복사')).toHaveCount(0)
  })
})
