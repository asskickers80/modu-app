/**
 * 야간 작업 3건 스크린샷 촬영
 * 실행: node scripts/smoke/take-screenshots.mjs
 * 전제: npm run dev (포트 5173) 실행 중
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const BASE = 'http://localhost:5173'

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ko-KR',
  })

  // A7 양도자 필독 스크린샷 (daily_contents 없으면 ComingSoon 표시)
  {
    const page = await ctx.newPage()
    await page.route('https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route('https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/daily_contents*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { body: '권리금 협상 전 인근 시세를 반드시 확인하세요. 동일 업종·면적 기준으로 3건 이상 사례를 수집한 뒤 협상에 임하면 훨씬 유리한 위치에 설 수 있어요.', display_order: 0 },
        { body: '매물 사진은 낮 시간대 자연광에서 찍는 게 핵심입니다. 어두운 실내 사진은 양수자에게 부정적인 첫인상을 줄 수 있어요.', display_order: 1 },
      ]) }))
    await page.route('https://generativelanguage.googleapis.com/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '오늘도 한 발 더 나아가는 중이에요. 매물 완성도를 높이면 양수자의 첫 연락이 빨라져요.' }] } }] }) }))
    await page.goto(`${BASE}/a7/seller`)
    await page.waitForTimeout(2500)
    const out = path.join(ROOT, 'screenshot-a7-seller.png')
    await page.screenshot({ path: out, fullPage: false })
    console.log('A7 스크린샷:', out)
    await page.close()
  }

  // E1 Step4 시설·집기 3단 구조 스크린샷
  {
    const page = await ctx.newPage()
    // bizType='카페·디저트'로 sessionStorage 세팅
    await page.addInitScript(() => {
      sessionStorage.setItem('modu_e1_draft', JSON.stringify({
        address: '서울 마포구 서교동 332-4',
        shopName: '서교동 고양이 카페',
        bizType: '카페·디저트',
        isFranchise: false,
        floor: 'B1', area: '33', deposit: '3000',
        monthlyRent: '200', maintenance: '10',
        transferFee: '3000', transferType: 'full',
      }))
    })
    await page.goto(`${BASE}/e1/4`)
    await page.waitForTimeout(1500)
    // 입력할게요 클릭
    await page.getByText('입력할게요').click()
    await page.waitForTimeout(500)
    // 카테고리 클릭
    await page.getByText('커피·음료 장비').click()
    await page.waitForTimeout(500)
    const out = path.join(ROOT, 'screenshot-e1-step4.png')
    await page.screenshot({ path: out, fullPage: false })
    console.log('E1 Step4 스크린샷:', out)
    await page.close()
  }

  // 탐색탭 시장조사 모드 스크린샷
  {
    const page = await ctx.newPage()
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({
        category: 'seller',
        bizType: '카페·디저트',
        region: '서울',
      }))
    })
    await page.route('https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*', async route => {
      const url = route.request().url()
      if (url.includes('device_id=eq.')) {
        // 내 매물 조회
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
          id: 'my-listing', biz_type: '카페·디저트', address: '서울 마포구 서교동 1-1', franchise_brand_name: null,
        }]) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'l1', shop_name: '서교동 카페 양도', address: '서울 마포구 서교동 10-1', transfer_type: 'full',
          transfer_fee: '3000', deposit: '3000', monthly_rent: '200', area: '33',
          biz_type: '카페·디저트', views: 48, image_urls: [], review_choices: {}, status: 'published' },
        { id: 'l2', shop_name: '강남구 분식집 양도', address: '서울 강남구 역삼동 5-2', transfer_type: 'bare',
          transfer_fee: '800', deposit: '2000', monthly_rent: '150', area: '25',
          biz_type: '분식·떡볶이', views: 31, image_urls: [], review_choices: {}, status: 'published' },
      ]) })
    })
    await page.goto(`${BASE}/explore`)
    await page.waitForTimeout(2000)
    const out = path.join(ROOT, 'screenshot-explore-seller.png')
    await page.screenshot({ path: out, fullPage: false })
    console.log('탐색 시장조사 스크린샷:', out)
    await page.close()
  }

  await browser.close()
  console.log('\n스크린샷 완료')
}

main().catch(e => { console.error(e); process.exit(1) })
