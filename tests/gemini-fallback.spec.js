/**
 * Gemini 폴백 모델 체인
 * 주 모델(gemini-2.5-flash) 5xx 시 gemini-2.0-flash 자동 재시도 검증
 */
import { test, expect } from './fixtures.js'
import { mockMarketNews } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'

test.describe('Gemini 폴백 모델 체인', () => {
  test('주 모델 502 → gemini-2.0-flash 폴백 성공 경로 검증', async ({ page }) => {
    let primaryHits = 0
    let fallbackHits = 0
    const warns = []

    page.on('console', msg => {
      if (msg.type() === 'warning') warns.push(msg.text())
    })

    // 주 모델 → 502
    await page.route(/gemini-2\.5-flash/, route => {
      primaryHits++
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'overloaded' } }),
      })
    })

    // 폴백 모델 → 성공
    await page.route(/gemini-2\.0-flash/, route => {
      fallbackHits++
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{ content: { parts: [{ text: '폴백모델인사이트' }] } }],
        }),
      })
    })

    await page.route(`${SUPABASE}/listings*`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route(`${SUPABASE}/daily_contents*`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await mockMarketNews(page)

    // 폴백 응답이 실제로 도착할 때까지 기다린 후 단언 — 타이밍 플레이크 방지
    const fallbackDone = page.waitForResponse(/gemini-2\.0-flash/)
    await page.goto('/a7/startup')
    await fallbackDone

    // 주 모델 시도됨
    expect(primaryHits).toBeGreaterThanOrEqual(1)
    // 폴백 모델로 재시도됨
    expect(fallbackHits).toBeGreaterThanOrEqual(1)
    // console.warn 에 502 폴백 경고 기록됨
    expect(warns.some(w => w.includes('502'))).toBe(true)
    // 에러 메시지 미노출 (폴백 성공 → 정상 렌더)
    await expect(page.getByText('Gemini 오류')).toHaveCount(0)
    await expect(page.getByText('오류가 발생했어요')).toHaveCount(0)
  })
})
