/**
 * 마이페이지 정직한 빈 상태
 *
 * 연락처 입력·사업자 인증·소셜 연동이 미구현이므로 하드코딩 더미
 * (010-****-1234 / 등록완료 / 카카오)를 보여주지 않고
 * 미등록/미연동으로 표시한다. 탭 시 준비 중 토스트.
 */
import { test, expect } from '@playwright/test'

const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'

test('⑥ 계정 정보: 더미 값 부재 + 미등록/미연동 표시 + 준비 중 토스트', async ({ page }) => {
  // 메시지 탭 점 배지(useHasUnread)의 대화 조회 mock
  await page.route(SUPABASE_CONVERSATIONS, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await page.goto('/my')
  await expect(page.getByText('⑥ 계정 정보')).toBeVisible()

  // 하드코딩 더미 부재
  await expect(page.getByText('010-****-1234')).toHaveCount(0)
  await expect(page.getByText('등록완료')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /연결된 소셜 계정 카카오/ })).toHaveCount(0)

  // 정직한 빈 상태 표시
  await expect(page.getByRole('button', { name: /연락처 미등록/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /사업자 정보 미등록/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /연결된 소셜 계정 미연동/ })).toBeVisible()

  // 탭 → 준비 중 토스트
  await page.getByRole('button', { name: /연락처 미등록/ }).click()
  await expect(page.getByText('준비 중이에요 🚧')).toBeVisible()
})
