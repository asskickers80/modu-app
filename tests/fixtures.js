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
    // 이벤트 로깅(events INSERT — logEvent 부수 기록, 화면 곳곳에서 발생) 기본 성공.
    // 쓰기 가드 400이 콘솔 에러로 남는 소음 제거. 이벤트 검증 테스트는 오버라이드(LIFO).
    await page.route(`${SUPABASE}/rest/v1/events*`, route =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
        : route.fallback())
    // "이번 주 한 줄"(양도인·사장님 홈이 항상 GET) 기본 빈 결과 — 신호 없음 상태.
    // 실서버 유출·가짜 세션 401 콘솔 에러 방지. 한 줄 카드 테스트는 오버라이드(LIFO).
    await page.route(`${SUPABASE}/rest/v1/weekly_one_liners*`, route =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        : route.fallback())
    // 알림 미읽음 조회(벨 — HomeHeaderBar가 5축 홈에서 항상 GET) 기본 빈 결과.
    // 실서버 유출·가짜 세션 401 콘솔 에러 방지. 알림 테스트는 spec에서 오버라이드(LIFO).
    await page.route(`${SUPABASE}/rest/v1/notifications*`, route =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        : route.fallback())
    // 찜·원장·노출 이력 테이블(2026-09-09~10 오더) — 상세·홈이 진입 시 GET. 기본 빈 결과(LIFO 오버라이드 가능).
    for (const t of ['watchlist', 'watch_notifications', 'listing_owner_messages', 'inquiry_ledger', 'sales_card_impressions', 'reb_market_stats', 'listing_field_sources', 'demand_signals', 'demand_signal_targets', 'price_inquiry_feedback']) {
      await page.route(`${SUPABASE}/rest/v1/${t}*`, route =>
        ['GET', 'HEAD'].includes(route.request().method())
          ? route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' }, body: '[]' })
          : route.fallback())
    }
    // 공공데이터·지오코딩 외부 실호출 기본 차단 (헌법: 테스트 외부 API 실호출 금지).
    // dev 서버의 /api/opendata 는 vite 프록시로 실 API에 나가므로 여기서 끊는다.
    // 실데이터 경로 테스트는 spec에서 page.route()로 오버라이드(LIFO).
    await page.route('**/api/opendata/**', route =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }))
    await page.route('**/api/geocode', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lat: null, lng: null }) }))
    await page.route('**/api/nearby-brokers*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ disabled: true, items: null }) }))
    await use()
  }, { auto: true }],
})

export { expect }
