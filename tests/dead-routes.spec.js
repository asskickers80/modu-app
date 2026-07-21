/**
 * 죽은 페이지 제거 검증 — /seller/*, /e3/*, /community/room/*
 * 삭제된 경로 직접 접근 시 catch-all이 홈(/ → 스플래시 → /a2)으로 보낸다.
 */
import { test, expect } from './fixtures.js'

const DEAD_ROUTES = ['/seller/market', '/seller/companies', '/e3/seller', '/community/room/1', '/business/competitor', '/business/trend', '/dev/supabase']

for (const route of DEAD_ROUTES) {
  test(`삭제 경로 ${route}: 홈으로 리다이렉트`, async ({ page }) => {
    await page.goto(route)
    // catch-all → / → A1 스플래시 2초 후 /a2 (온보딩 시작점)
    await expect(page).toHaveURL(/\/a2/, { timeout: 5_000 })
    // 죽은 페이지 콘텐츠 부재
    await expect(page.getByText('시장 동향', { exact: true })).toHaveCount(0)
  })
}
