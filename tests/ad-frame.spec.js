/**
 * 광고 틀 재편 (ORDER-ad-frame-v1)
 * ① 섹션 그룹·앵커 탭(점프·하이라이트·빈 섹션 생략) ② ad-body 적용 전수
 * ③ 입지 블록(칩·좁은 반경·왕복 보존) ④ 좁은 반경 호출/캐시
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, agreeListingTerms, passPublishGate } from './helpers.js'
import { listingToContext, listingToLandlordContext } from '../src/lib/completeness.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const DEV = 'af-dev'

const FULL_L = {
  id: 'af-l1', listing_type: 'landlord', deal_type: 'both', status: 'published',
  address: '인천 영종구 햇내로14번길 9 101호', floor: '1층', area: '84',
  deposit: '3000', monthly_rent: '200', sale_price: '169000', cap_rate: '5.2', occupancy: 'occupied',
  recommended_biz: ['카페'], show_map: true, latitude: 37.49, longitude: 126.49,
  ai_draft: {
    description: '상가 설명문입니다.', rentMarket: '임대 해석문.', saleMarket: '수익률 해석문.',
    locationSpot: '1층 대로변 코너 자리로 주차가 가능합니다. 반경 100m 안에 상가 42곳이 있습니다.',
  },
  edited_texts: {}, item_visibility: {}, review_choices: { confirmedAt: '2026-08-01' },
  image_urls: [], device_id: 'other', created_at: '2026-08-01T00:00:00Z',
}
const MIN_L = {
  ...FULL_L, id: 'af-l2', show_map: false, recommended_biz: [], area: null, floor: null,
  deposit: null, monthly_rent: null, sale_price: null, cap_rate: null, deal_type: null,
  ai_draft: { description: '설명문만 있는 상가입니다.' },
}

test.describe('섹션 그룹 · 앵커 탭', () => {
  test('E2L: 섹션 탭 렌더 + 탭 점프 + 입지 섹션이 지도 앞', async ({ page }) => {
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FULL_L) }))
    await page.goto(`/e2l/${FULL_L.id}`)

    const tabs = page.getByTestId('ad-section-tabs')
    await expect(tabs).toBeVisible()
    for (const id of ['basic', 'building', 'deal', 'spot', 'market', 'map']) {
      await expect(page.getByTestId(`section-tab-${id}`)).toBeVisible()
    }
    // 입지 서술 → 지도 순서 (서술 후 시각 확인)
    const spotY = await page.locator('#sec-spot').evaluate(e => e.getBoundingClientRect().top + window.scrollY)
    const mapY = await page.locator('#sec-map').evaluate(e => e.getBoundingClientRect().top + window.scrollY)
    expect(spotY).toBeLessThan(mapY)

    // 탭 점프 — 입지 섹션이 화면 상단으로
    await page.getByTestId('section-tab-spot').click()
    await page.waitForTimeout(700)
    // 스크롤 컨테이너(main) 상단에 해당 섹션이 붙었는지 — 화면 절대좌표가 아니라 컨테이너 기준
    const gap = await page.evaluate(() => {
      const el = document.getElementById('sec-spot')
      const main = document.querySelector('main')
      return el.getBoundingClientRect().top - main.getBoundingClientRect().top
    })
    expect(Math.abs(gap)).toBeLessThan(40)
  })

  test('빈 섹션 생략: 내용 없는 상가는 해당 탭 자체가 없다', async ({ page }) => {
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MIN_L) }))
    await page.goto(`/e2l/${MIN_L.id}`)
    // 내용 있는 섹션이 하나뿐 → 탭 바 자체를 띄우지 않는다(빈 섹션 헤더 금지의 연장)
    await expect(page.getByTestId('ad-section-tabs')).toHaveCount(0)
    for (const id of ['deal', 'spot', 'market', 'map']) {
      await expect(page.getByTestId(`section-tab-${id}`)).toHaveCount(0)
    }
    await expect(page.getByTestId('e2l-location-spot')).toHaveCount(0) // 빈 서술 금지
  })

  test('E2L 입지 블록: 본문 ad-body 적용 + 근거 문구', async ({ page }) => {
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FULL_L) }))
    await page.goto(`/e2l/${FULL_L.id}`)
    const spot = page.getByTestId('e2l-location-spot')
    await expect(spot).toContainText('1층 대로변 코너 자리')
    await expect(spot.locator('.ad-body')).toHaveCount(1)
    await expect(spot).toContainText('반경 100m 실데이터')
  })
})

test.describe('입지 칩 · 좁은 반경', () => {
  test('전면 노출 선택지: 나쁨·건물 내부 포함 (정직한 선택지)', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await page.addInitScript(() => {
      localStorage.setItem('modu_device_id', 'af-dev')
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', bizType: '카페' }))
      sessionStorage.setItem('modu_e1_draft', JSON.stringify({
        address: '서울 마포구 서교동 447-5', shopName: '입지 카페', bizType: '카페', area: '40',
        deposit: '3000', monthlyRent: '200', transferType: 'full', transferFee: '4500', isFranchise: false,
      }))
    })
    await page.goto('/e1/3')
    for (const o of ['좋음', '보통', '나쁨', '건물 내부']) {
      await expect(page.getByTestId(`spot-visibility-${o}`)).toBeVisible()
    }
    await page.getByTestId('spot-visibility-건물 내부').click()
    const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem('modu_e1_draft') || '{}'))
    expect(draft.spotVisibility).toBe('건물 내부')
  })

  test('E1 시설 단계에 입지 칩 — 선택 저장', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    await page.addInitScript(() => {
      localStorage.setItem('modu_device_id', 'af-dev')
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', bizType: '카페' }))
      sessionStorage.setItem('modu_e1_draft', JSON.stringify({
        address: '서울 마포구 서교동 447-5', shopName: '입지 카페', bizType: '카페', area: '40',
        deposit: '3000', monthlyRent: '200', transferType: 'full', transferFee: '4500', isFranchise: false,
      }))
    })
    await page.goto('/e1/3')
    await expect(page.getByTestId('spot-chips')).toBeVisible()
    await page.getByTestId('spot-frontage-코너').click()
    await page.getByTestId('spot-parking-가능').click()
    await expect(page.getByTestId('spot-frontage-코너')).toHaveCSS('font-weight', '700')
    // draft 반영 확인
    const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem('modu_e1_draft') || '{}'))
    expect(draft.spotFrontage).toBe('코너')
    expect(draft.spotParking).toBe('가능')
  })

  test('초안 프롬프트: 입지 칩 + 반경 100m 실값 주입, locationSpot 필드 지시', async ({ page }) => {
    await mockMarketData(page)
    // 300m·100m 두 반경 모두 같은 mock으로 응답, 호출 URL을 수집해 반경 판정
    const radii = []
    await page.route('**/api/geocode', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lat: 37.55, lng: 126.92 }) }))
    await page.route('**/api/opendata/B553077/**', r => {
      radii.push(new URL(r.request().url()).searchParams.get('radius'))
      return r.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ header: {}, body: { totalCount: 42, items: [{ indsMclsNm: '한식', ksicCd: 'I56111' }] } }),
      })
    })
    const captured = []
    await page.route('https://generativelanguage.googleapis.com/**', r => {
      captured.push(JSON.parse(r.request().postData() || '{}'))
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ description: 'd', facility: 'f', locationSpot: '이 자리 서술.', competitiveness: 'c' }) }] } }] }) })
    })
    await page.addInitScript(() => {
      localStorage.setItem('modu_device_id', 'af-dev')
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', bizType: '카페' }))
      sessionStorage.setItem('modu_e1_draft', JSON.stringify({
        address: '서울 마포구 서교동 447-5', shopName: '입지 카페', bizType: '카페', floor: '1층', area: '40',
        deposit: '3000', monthlyRent: '200', transferType: 'full', transferFee: '4500', isFranchise: false,
        spotFrontage: '코너', spotParking: '가능', spotVisibility: '좋음',
      }))
    })
    await page.goto('/e1/1')
    await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
    await expect(page.getByTestId('block-description')).toBeVisible({ timeout: 15000 })

    // 상권(300) + 입지(100) 각 1회 — 지오코딩 재사용, 반경별 1회씩만
    expect(radii.sort()).toEqual(['100', '300'])
    const prompt = captured.find(b => (b.contents?.[0]?.parts?.[0]?.text ?? '').includes('카피라이터')).contents[0].parts[0].text
    expect(prompt).toContain('[확인된 입지 정보')
    expect(prompt).toContain('도로 접면: 코너')
    expect(prompt).toContain('주차: 가능')
    expect(prompt).toContain('반경 100m 상가: 42곳')
    expect(prompt).toContain('locationSpot')
    // 입지 블록이 검수 화면에 렌더
    await expect(page.getByTestId('block-location_spot')).toContainText('이 자리 서술.')
  })

  test('역매핑 유닛: spot_* → camelCase (양축 수정 왕복 대비)', () => {
    const row = { spot_frontage: '대로변', spot_parking: '인근 공영', spot_visibility: '보통' }
    for (const ctx of [listingToContext(row), listingToLandlordContext(row)]) {
      expect(ctx.spotFrontage).toBe('대로변')
      expect(ctx.spotParking).toBe('인근 공영')
      expect(ctx.spotVisibility).toBe('보통')
    }
    // 컬럼 생성 전 옛 행 안전
    expect(listingToContext({}).spotFrontage).toBe('')
  })
})

// ── 신규 저장 경로 (spot_* 컬럼 가동 후 검증) ────────────────
test('신규 등록: 선택한 입지 칩이 INSERT payload의 spot_* 로 저장된다', async ({ page }) => {
  await mockGemini(page)
  await mockMarketData(page)
  let inserted = null
  await page.route(`${SUPABASE}/listings*`, async r => {
    if (r.request().method() === 'POST') {
      inserted = JSON.parse(r.request().postData() || '{}')
      return r.fulfill({ status: 201, contentType: 'application/json', body: '[{"id":"sp-1"}]' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto('/e1/1')
  await page.getByRole('button', { name: /예시/ }).click()
  await page.getByRole('button', { name: /다음.*모두가 초안/ }).click()
  await page.getByRole('button', { name: /^다음$/, timeout: 15_000 }).click()
  await page.getByTestId('spot-frontage-대로변').click()
  await page.getByTestId('spot-parking-인근 공영').click()
  await page.getByTestId('spot-visibility-좋음').click()
  await page.getByRole('button', { name: /다음.*완성도/ }).click()
  await agreeListingTerms(page)
  await page.getByRole('button', { name: '매물 공개하기' }).click()
  await passPublishGate(page)
  await expect.poll(() => inserted).not.toBeNull()
  const row = Array.isArray(inserted) ? inserted[0] : inserted
  expect(row.spot_frontage).toBe('대로변')
  expect(row.spot_parking).toBe('인근 공영')
  expect(row.spot_visibility).toBe('좋음')
})

// ── 자산 카드 미리보기 (asset-card-fix) ──────────────────────
test('E1p 자산 카드: 등록 사진 실렌더 + 허위 역세권 문구 사망', async ({ page }) => {
  await mockGemini(page)
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  const ROW = {
    id: 'ac-1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
    address: '인천 영종구 햇내로14번길 9 101호', address_detail: '101호', floor: '1', area: '84',
    deposit: '3000', monthly_rent: '250', ai_draft: { description: 'x' }, review_choices: { confirmedAt: 'x' },
    edited_texts: {}, item_visibility: {},
    image_urls: ['https://x.test/plan.jpg', 'https://x.test/ext.jpg'],
    interior_image_urls: ['https://x.test/plan.jpg'], exterior_image_urls: ['https://x.test/ext.jpg'],
    device_id: 'ac-dev', terms_version: 'v1-2026-07', created_at: '2026-08-05T00:00:00Z',
  }
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'ac-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
  })
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) }))
  await page.goto('/e1p/4?edit=ac-1')
  // 실사진 — E2L 히어로와 동일 소스(합본 첫 장 = 도면)
  await expect(page.getByTestId('asset-card-photo')).toHaveAttribute('src', 'https://x.test/plan.jpg')
  await expect(page.getByText('홍대입구역')).toHaveCount(0)
  await expect(page.getByText('도보 4분')).toHaveCount(0)
})

test('E1p 자산 카드: 사진 없으면 플레이스홀더 유지 + 더미 폴백(45㎡·1층) 부재', async ({ page }) => {
  await mockGemini(page)
  const ROW = {
    id: 'ac-2', listing_type: 'landlord', deal_type: 'lease', status: 'published',
    address: '인천 영종구 햇내로14번길 9', floor: '', area: '',
    deposit: '3000', monthly_rent: '250', ai_draft: { description: 'x' }, review_choices: { confirmedAt: 'x' },
    edited_texts: {}, item_visibility: {}, image_urls: [], interior_image_urls: [], exterior_image_urls: [],
    device_id: 'ac-dev', terms_version: 'v1-2026-07', created_at: '2026-08-05T00:00:00Z',
  }
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'ac-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
  })
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) }))
  await page.goto('/e1p/4?edit=ac-2')
  await expect(page.getByTestId('asset-card-photo')).toHaveCount(0) // 플레이스홀더 경로
  await expect(page.getByText('45㎡')).toHaveCount(0) // 가짜 면적 폴백 사망
})

test('소스 회귀: 하드코딩 지명 더미 부재 (E1p 저장 화면)', async () => {
  const fs = await import('fs')
  const src = fs.readFileSync('src/screens/e1p/E1pStep5.jsx', 'utf8')
  expect(src.includes('홍대입구역')).toBe(false)
  expect(src.includes('서교동 332-4')).toBe(false)
})
