/**
 * 전역 Supabase 쓰기 가드
 *
 * 모든 테스트에서 POST/PATCH/DELETE 요청을 기본 차단한다.
 * 실제 쓰기가 필요한 테스트는 page.route()로 명시적 mock을 추가한다.
 * — Playwright는 LIFO 순서로 route를 처리하므로, 나중에 등록된 spec 레벨
 *   route가 이 가드보다 먼저 실행되어 정상적으로 오버라이드된다.
 */
import { test as base, expect } from '@playwright/test'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'

export const test = base.extend({
  supabaseWriteGuard: [async ({ page }, use) => {
    await page.route(`${SUPABASE}/**`, async route => {
      if (['POST', 'PATCH', 'DELETE'].includes(route.request().method())) {
        console.warn(`[DB-GUARD] ${route.request().method()} blocked: ${route.request().url()}`)
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'DB-GUARD: Supabase write blocked. Add page.route() mock in this test.' }),
        })
      } else {
        await route.continue()
      }
    })
    await use()
  }, { auto: true }],
})

export { expect }
