/**
 * 블록 생성 ↔ 광고 렌더 자동 대조 (ORDER-e2-block-render-fix-v1 재발 방지)
 * E2L rent/sale_market, E2 location_spot — 렌더 배선 누락이 두 번째라 구조로 종결:
 * 검수 화면 블록 빌더에서 생성되는 블록 id를 소스에서 추출해, 상세 화면 소스에
 * 해당 키의 렌더 배선이 있는지 대조한다. 새 블록을 추가하고 상세 배선을 빼먹으면
 * 이 테스트가 블록명을 지목하며 실패한다.
 */
import { test, expect } from './fixtures.js'
import fs from 'fs'

const ids = src => [...src.matchAll(/id: '([a-z_A-Z]+)'/g)].map(m => m[1])

// 상세에서 렌더하지 않는 블록 — 사유를 명시한 예외 목록 (묵시 제외 금지)
const E2_EXCLUDED = {
  location: '입력 팩트 — E2는 기본 팩트 그리드로 별도 구조화 렌더',
  market_data: '등록 시점 시세 스냅샷 — E2는 진입 시 실시세 재조회 카드로 대체 (저장 데이터보다 최신)',
  market_insight: 'ai_draft에 저장되지 않는 파생 텍스트 — 실시세 카드가 대체',
}
const E2L_EXCLUDED = {
  location: '입력 팩트 — E2L은 기본 정보 카드로 별도 구조화 렌더',
}

test('E1 블록 전수: E2 상세에 렌더 배선 존재 (예외는 사유 명시)', () => {
  const builder = fs.readFileSync('src/screens/e1/buildListingBlocks.js', 'utf8')
  const e2 = fs.readFileSync('src/screens/E2PropertyDetail.jsx', 'utf8')
  const blocks = [...new Set(ids(builder))]
  expect(blocks.length).toBeGreaterThanOrEqual(7) // 파서 자체 검증
  const missing = blocks.filter(b => !(b in E2_EXCLUDED) && !e2.includes(`'${b}'`))
  expect(missing, `E2 렌더 배선 누락: ${missing.join(', ')}`).toEqual([])
})

test('E1p 블록 전수: E2L 상세에 렌더 배선 존재 (예외는 사유 명시)', () => {
  const builder = fs.readFileSync('src/screens/e1p/E1pStep2.jsx', 'utf8')
  const e2l = fs.readFileSync('src/screens/E2LPropertyDetail.jsx', 'utf8')
  const blocks = [...new Set(ids(builder))]
  expect(blocks.length).toBeGreaterThanOrEqual(6)
  const missing = blocks.filter(b => !(b in E2L_EXCLUDED) && !e2l.includes(`'${b}'`))
  expect(missing, `E2L 렌더 배선 누락: ${missing.join(', ')}`).toEqual([])
})

test('camelCase 초안 키의 폴백 배선: location_spot ↔ locationSpot (양쪽 상세)', () => {
  // ai_draft 키(locationSpot)와 블록 id(location_spot)가 다른 유일 케이스 — 폴백이 없으면
  // 검수에서 보이던 블록이 광고에서 증발한다 (이번 버그의 직접 원인)
  for (const f of ['src/screens/E2PropertyDetail.jsx', 'src/screens/E2LPropertyDetail.jsx']) {
    const src = fs.readFileSync(f, 'utf8')
    expect(src.includes('locationSpot'), `${f}: locationSpot 초안 폴백 누락`).toBe(true)
  }
})

// ── E2 입지 블록 실표시 (버그 재현 케이스) ──────────────────
const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
test('E2: 재생성으로 만든 입지 블록(ai_draft.locationSpot)이 광고에 표시된다', async ({ page }) => {
  const ROW = {
    id: 'br-1', listing_type: 'seller', status: 'published',
    shop_name: '검증 카페', shop_name_public: true, address: '서울 마포구 서교동 447-5',
    transfer_fee: '3000', transfer_type: 'full',
    ai_draft: { description: '설명문.', facility: '시설.', locationSpot: '1층 코너 자리로 주차가 가능합니다.' },
    edited_texts: {}, item_visibility: {}, review_choices: { confirmedAt: 'x' },
    image_urls: [], device_id: 'other', created_at: '2026-08-05T00:00:00Z',
  }
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) }))
  await page.goto(`/e2/${ROW.id}`)
  const spot = page.getByTestId('e2-location-spot')
  await expect(spot).toContainText('1층 코너 자리로 주차가 가능합니다.')
  await expect(page.getByTestId('section-tab-spot')).toBeVisible() // 섹션 탭 연동
  // 비공개 존중
  const hidden = { ...ROW, id: 'br-2', item_visibility: { location_spot: false } }
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hidden) }))
  await page.goto(`/e2/${hidden.id}`)
  await expect(page.getByTestId('e2-location-spot')).toHaveCount(0)
  await expect(page.getByTestId('section-tab-spot')).toHaveCount(0) // 빈 섹션 탭 규칙 연동
})
