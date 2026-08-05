/**
 * 임대인 시설 현황 (ORDER-e1p-facility-v1)
 * 빈 섹션 탭 미노출 / 내부 상태 분기(공실·잔존) / 칩 왕복 보존 / 프롬프트 주입 / E2L 표시
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'
import { listingToLandlordContext } from '../src/lib/completeness.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'

const BASE_ROW = {
  id: 'ef-1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
  address: '경기 수원시 팔달구 인계동 8', deposit: '3000', monthly_rent: '250', show_map: false,
  ai_draft: { description: '설명문.' }, review_choices: { confirmedAt: 'x' },
  edited_texts: {}, item_visibility: {}, image_urls: [], interior_image_urls: [], exterior_image_urls: [],
  device_id: 'ef-dev', terms_version: 'v1-2026-07', created_at: '2026-08-05T00:00:00Z',
}

test('E1p 시설 현황 입력: 내부 상태 2택 + 설비 잔존 분기 + 건물 설비', async ({ page }) => {
  await mockGemini(page)
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/e1p/1')
  await page.getByRole('button', { name: '예시 ✦' }).click()
  await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
  const next = page.getByRole('button', { name: /다음 — 도면·서류 추가/ })
  await expect(next).toBeEnabled({ timeout: 15000 })
  await next.click()

  // 공실 선택 → 잔존 설비 그룹 미노출
  await page.getByTestId('interior-state-empty').click()
  await expect(page.getByTestId('remaining-group')).toHaveCount(0)
  // 설비 잔존으로 전환 → 잔존 설비·이전 업종 노출
  await page.getByTestId('interior-state-equipped').click()
  await page.getByTestId('remaining-주방 설비').click()
  await page.getByTestId('remaining-덕트·후드').click()
  // 건물 설비는 상태 무관 상시
  await page.getByTestId('building-엘리베이터').click()
  await expect(page.getByTestId('remaining-주방 설비')).toHaveCSS('font-weight', '700')
})

test('역매핑: 시설 현황 4필드 왕복 (자동 대조와 별개의 값 검증)', () => {
  const ctx = listingToLandlordContext({
    interior_state: 'equipped', remaining_facilities: ['주방 설비'], prev_biz: '카페·커피전문점',
    building_facilities: ['엘리베이터', '주차장'],
  })
  expect(ctx.interiorState).toBe('equipped')
  expect(ctx.remainingFacilities).toEqual(['주방 설비'])
  expect(ctx.prevBiz).toBe('카페·커피전문점')
  expect(ctx.buildingFacilities).toEqual(['엘리베이터', '주차장'])
  expect(listingToLandlordContext({}).remainingFacilities).toEqual([]) // 옛 행 안전
})

test('3→4단계: 시설 재료 있으면 facility 블록 단건 생성 (그라운딩 없음)', async ({ page }) => {
  const captured = []
  await page.route('https://generativelanguage.googleapis.com/**', r => {
    const body = JSON.parse(r.request().postData() || '{}')
    captured.push(body)
    const prompt = body.contents?.[0]?.parts?.[0]?.text ?? ''
    const text = prompt.includes('시설·건물" 소개 단락')
      ? '내부가 비어 있어 원하는 업종으로 새로 구성할 수 있습니다. 엘리베이터와 주차장을 갖춘 건물입니다.'
      : JSON.stringify({ description: 'd', rentMarket: 'r', saleMarket: null })
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) })
  })
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await page.goto('/e1p/1')
  await page.getByRole('button', { name: '예시 ✦' }).click()
  await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
  await expect(page.getByRole('button', { name: /다음 — 도면·서류 추가/ })).toBeEnabled({ timeout: 15000 })
  await page.getByRole('button', { name: /다음 — 도면·서류 추가/ }).click()

  await page.getByTestId('interior-state-empty').click()
  await page.getByTestId('building-엘리베이터').click()
  await page.getByTestId('building-주차장').click()
  await page.getByRole('button', { name: /다음 — 완성도 확인|시설 소개 쓰는 중/ }).click()
  await expect(page).toHaveURL(/\/e1p\/4/, { timeout: 10000 })

  const facReq = captured.find(b => (b.contents?.[0]?.parts?.[0]?.text ?? '').includes('시설·건물" 소개 단락'))
  expect(facReq).toBeTruthy()
  const prompt = facReq.contents[0].parts[0].text
  expect(prompt).toContain('내부 상태: 공실')
  expect(prompt).toContain('건물 설비: 엘리베이터, 주차장')
  expect(prompt).toContain('자유도로 서술') // 집필 원칙(공실=자유도) 주입
  expect(facReq.tools).toBeUndefined()      // 그라운딩 없음
})

test('E2L: 시설 현황 표시(공실 뱃지·칩·서술) + 빈 시설이면 섹션 탭 미노출', async ({ page }) => {
  // 시설 있음
  const row = {
    ...BASE_ROW, floor: '1', area: '54',
    interior_state: 'empty', building_facilities: ['엘리베이터', '주차장'],
    ai_draft: { description: '설명문.', facility: '내부가 비어 있어 원하는 업종으로 새로 구성할 수 있습니다.' },
  }
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) }))
  await page.goto(`/e2l/${row.id}`)
  const fac = page.getByTestId('e2l-facility')
  await expect(fac).toContainText('내부 공실 — 새로 구성 가능')
  await expect(fac).toContainText('엘리베이터')
  await expect(fac).toContainText('새로 구성할 수 있습니다')
  await expect(page.getByTestId('section-tab-building')).toBeVisible()
})

test('E2L: 시설·기본정보 재료가 전혀 없으면 시설·건물 탭 자체 미노출 (빈 섹션 금지)', async ({ page }) => {
  const row = { ...BASE_ROW, id: 'ef-2', floor: null, area: null, deal_type: 'both', sale_price: '10000' }
  await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) }))
  await page.goto(`/e2l/${row.id}`)
  await expect(page.getByTestId('ad-section-tabs')).toBeVisible() // 다른 섹션은 있음
  await expect(page.getByTestId('section-tab-building')).toHaveCount(0)
  await expect(page.getByTestId('e2l-facility')).toHaveCount(0)
})
