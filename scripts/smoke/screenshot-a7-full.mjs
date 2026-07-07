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

  await page.addInitScript((deviceId) => {
    localStorage.setItem('modu_user_profile', JSON.stringify({
      category: 'seller', name: '테스터', bizType: '카페·디저트', region: '서울',
    }))
    localStorage.setItem('modu_device_id', deviceId)
  }, FAKE_DEVICE_ID)

  await page.route('https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*', async route => {
    const url = route.request().url()
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
  await page.waitForTimeout(4000)

  // 양도자 필독 섹션까지 스크롤
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)

  const outFull = path.join(ROOT, 'screenshot-a7-full.png')
  await page.screenshot({ path: outFull, fullPage: true })

  // 핵심 텍스트 추출
  const bodyText = await page.locator('body').textContent()
  const comingSoonCount = (bodyText.match(/준비하고 있어요/g) || []).length

  // 양도자 필독 실제 문구
  const guideTexts = await page.locator('section').filter({ hasText: '양도자 필독' })
    .locator('p').allTextContents()
  console.log('[양도자 필독 섹션 텍스트들]', guideTexts)
  console.log('ComingSoon 카운트 (0이어야 필독 정상):', comingSoonCount)

  const coaching = await page.locator('.text-\\[14px\\].text-gray-800.leading-relaxed').first().textContent().catch(() => '(없음)')
  console.log('[한마디]', coaching)

  console.log('전체 스크린샷:', outFull)
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
