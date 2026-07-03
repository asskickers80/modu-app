/**
 * 더미 수치 → "서비스 준비중" 전환 검증
 *
 * 실데이터 없는 항목에 가짜 숫자 금지 — 카드/섹션 프레임은 유지하고
 * 내부만 준비중 안내로 교체 (A7 매출·통계·새문의·정보 섹션, 마이 하위, 오픈채팅).
 */
import { test, expect } from '@playwright/test'
import { mockGemini } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'

test.describe('서비스 준비중 전환', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await page.route(SUPABASE_CONVERSATIONS, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  })

  test('A7: 더미 수치 부재 + 서비스 준비중 표시(매출·시장동향 포함 5곳)', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/a7/seller')
    await expect(page.getByText('이번 달 매출')).toBeVisible()

    // 옛 더미 수치·문구 부재
    await expect(page.getByText('2,840만원')).toHaveCount(0)
    await expect(page.getByText('새 문의 3건 도착')).toHaveCount(0)
    await expect(page.getByText('인근 카페 평균 권리금')).toHaveCount(0)
    await expect(page.getByText('빠른인테리어')).toHaveCount(0)
    await expect(page.getByText('권리금 협상, 이렇게 하면 유리해요')).toHaveCount(0)

    // 준비중 표시: 매출·새문의·시장동향·거래처·필독 5곳 + 통계 compact 3곳
    await expect(page.getByText('서비스 준비중')).toHaveCount(5)
    await expect(page.getByText('준비중', { exact: true })).toHaveCount(3)

    // 명시 2곳 스코프 단언: 매출 카드 / 시장동향 섹션
    await expect(page.locator('div.rounded-2xl.p-4', { hasText: '이번 달 매출' })
      .getByText('서비스 준비중')).toBeVisible()
    await expect(page.locator('section', { hasText: '동종 시장 동향' })
      .getByText('서비스 준비중')).toBeVisible()

    // 섹션 프레임 유지 (레이아웃 구멍 없음)
    await expect(page.getByText('🏢 거래처·지원 업체')).toBeVisible()
    await expect(page.getByText('📝 양도자 필독')).toBeVisible()
  })

  test('마이 하위 상세: 사업자·본인인증 더미 값 부재 + 준비중', async ({ page }) => {
    await page.goto('/my/business-cert')
    await expect(page.getByText('123-45-67890')).toHaveCount(0)
    await expect(page.getByText('홍대 고양이 카페')).toHaveCount(0)
    await expect(page.getByText('서비스 준비중')).toBeVisible()

    await page.goto('/my/identity')
    await expect(page.getByText('010-****-1234')).toHaveCount(0)
    await expect(page.getByText('카카오 본인인증')).toHaveCount(0)
    await expect(page.getByText('서비스 준비중')).toBeVisible()
  })

  test('커뮤니티 오픈채팅 탭: 더미 방 목록 부재 + 준비중', async ({ page }) => {
    await page.goto('/community') // 기본 탭 = 오픈채팅

    await expect(page.getByText('홍대 상권 양도자 모임')).toHaveCount(0)
    await expect(page.getByText('서울 자영업 AI 정보방')).toHaveCount(0)
    await expect(page.getByText('서비스 준비중')).toBeVisible()
  })
})
