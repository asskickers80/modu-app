/**
 * A7 실 Supabase daily_contents 조회 스크린샷
 * daily_contents는 mock하지 않음 — 실 DB 데이터 검증용
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const BASE = 'http://localhost:5173'
const FAKE_DEVICE_ID = 'test-device-seller-' + Date.now()

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' })
  const page = await ctx.newPage()

  // 양도자 프로필 + 내 매물(카페·디저트) 설정
  await page.addInitScript((deviceId) => {
    localStorage.setItem('modu_user_profile', JSON.stringify({
      category: 'seller', name: '테스터', bizType: '카페·디저트', region: '서울',
    }))
    localStorage.setItem('modu_device_id', deviceId)
  }, FAKE_DEVICE_ID)

  // listings mock — 내 매물만 (카페·디저트, 사진 없음)
  // daily_contents는 mock 안 함 → 실 Supabase 조회
  await page.route('https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*', async route => {
    const url = route.request().url()
    // 내 매물 조회 (device_id 필터)
    if (url.includes(`device_id=eq.${FAKE_DEVICE_ID}`)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 'test-listing-1', shop_name: '서교동 고양이 카페', biz_type: '카페·디저트',
        address: '서울 마포구 서교동 332-4', transfer_fee: '3000', transfer_type: 'full',
        deposit: '3000', monthly_rent: '200', area: '33', image_urls: [],
        status: 'published', device_id: FAKE_DEVICE_ID, review_choices: {},
      }]) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto(`${BASE}/a7/seller`)
  // daily_contents 쿼리가 돌아올 때까지 충분히 대기
  await page.waitForTimeout(4000)

  const out = path.join(ROOT, 'screenshot-a7-live.png')
  await page.screenshot({ path: out, fullPage: false })
  console.log('스크린샷:', out)

  // 실제 렌더된 텍스트 확인
  const body = await page.locator('body').textContent()
  const hasGuide = body.includes('오늘') || body.includes('준비')
  const hasCoaching = body.includes('한 마디')
  const isComingSoon = body.includes('준비하고 있어요')
  console.log('양도자 필독 ComingSoon 여부:', isComingSoon)
  console.log('오늘의 한마디 섹션 존재:', hasCoaching)

  // 실제 텍스트 추출
  const guideEl = await page.locator('section:has-text("양도자 필독") p.text-\\[14px\\]').textContent().catch(() => '(없음)')
  const coachingEl = await page.locator('text=오늘의 한 마디').locator('..').locator('p.text-\\[14px\\]').textContent().catch(() => '(없음)')
  console.log('\n[필독 표시 문구]', guideEl)
  console.log('[한마디 표시 문구]', coachingEl)

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
