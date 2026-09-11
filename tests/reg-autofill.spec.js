/**
 * 상호·주소로 시작하는 등록 — 자동 채움 (ORDER 2026-09-11 파트 B, 외부 API 전부 모킹)
 * ① 후보 5 → 택1 → 확인 화면에 업종·주소·층·면적 ② 후보 0 → 주소 유도 → 0 → 수동, 에러 문구 없음 ③ auto 값은 완성도 미반영, 확정 후 반영
 * ④ 소진공 상호 불일치 → 업종 "확인 필요" ⑤ 사진 초안에 평·권리금 → 폐기, 나머지 표시 ⑥ 크롤링 문자열 lint
 * ⑦ 외부 응답 원본 컬럼 없음(스키마 검사) ⑧ 돈 5칸·매출·사유 자동 채움 없음 ⑨ 사업자번호 무효 → 배지 없음·진행 가능 ⑩ 키 미설정 → 자동 채움 비활성·등록 정상
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { readFileSync } from 'node:fs'
import { isAddressLike, candidateFrom, autofillFromCandidate, MONEY_FIELDS, mapIndustry } from '../src/lib/placeLookup.js'
import { parsePhotoDraft } from '../src/lib/photoDraftRules.js'
import { calcScore, listingToScoreInput } from '../src/lib/completeness.js'
import { autoFieldsOf } from '../src/lib/fieldSources.js'
import { findCrawlViolations } from '../scripts/lint-copy.mjs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const ITEM = (i) => ({ title: `<b>서교</b> 카페 ${i}`, roadAddress: '서울 마포구 양화로 45', address: '서울 마포구 서교동 395-1', category: '음식점>카페', telephone: '', mapx: '1269234567', mapy: '375512345' })

const okJson = (body) => ({ ok: true, json: async () => body })
const REG = { buildingName: '테스트빌딩', mainPurpose: '근린생활시설', useApprovalYear: 2009, floor: '1', area: 45.2, kind: 'exclusive' }

test.describe('유닛', () => {
  test('① 후보 → 자동 채움: 업종(소진공 상호 대조)·주소·층·면적·연식, 좌표는 확인 불필요', async () => {
    const cand = candidateFrom(ITEM(1), 0)
    expect(cand.name).toBe('서교 카페 1'); expect(cand.lat).toBeCloseTo(37.5512345, 5)
    const d = await autofillFromCandidate(cand, {
      geo: async (b) => okJson(b.lat != null ? { region: '서울 마포구 서교동', code: '1144012000' } : { lat: 37.55, lng: 126.92 }),
      stores: async () => ({ stores: [{ name: '서교 카페 1', ksicCd: 'I56221', ksicNm: '커피 전문점', indsSclsNm: '커피전문점' }] }),
      registry: async () => REG,
    })
    expect(d.fields).toMatchObject({ address: '서울 마포구 양화로 45', bcode: '1144012000', floor: '1', area: '45.2', buildingYear: 2009, shopName: '서교 카페 1' })
    expect(d.fields.categoryMain).toBeTruthy(); expect(d.sources.categoryMain).toBe('sbiz'); expect(d.flags.categoryMain).toBeUndefined()
    expect(d.sources.floor).toBe('building_ledger'); expect(d.flags.area).toBeUndefined() // 전유부 면적 → 확인 필요 아님
    expect(isAddressLike('서울 마포구 양화로 45')).toBe(true); expect(isAddressLike('서교동 고양이 카페')).toBe(false)
  })

  test('④ 소진공 상호 불일치 → 업종 "확인 필요" / 표제부 폴백 면적 → "확인 필요" / 실패한 단계만 비움', async () => {
    const d = await autofillFromCandidate(candidateFrom(ITEM(1)), {
      geo: async () => okJson({ region: null, code: null }),
      stores: async () => ({ stores: [{ name: '다른 가게', ksicCd: 'I56221', indsSclsNm: '커피전문점' }] }),
      registry: async () => ({ ...REG, kind: 'title' }),
    })
    expect(d.flags.categoryMain).toBe('확인 필요'); expect(d.flags.area).toBe('확인 필요')
    const e = await autofillFromCandidate(candidateFrom(ITEM(1)), { geo: async () => { throw new Error('x') }, stores: async () => { throw new Error('x') }, registry: async () => null })
    expect(e.fields.address).toBe('서울 마포구 양화로 45'); expect(e.fields.floor).toBeUndefined(); expect(e.fields.categoryMain).toBeUndefined()
  })

  test('⑧ 돈 5칸·매출·사유는 자동 채움 결과에 절대 없다', async () => {
    const d = await autofillFromCandidate(candidateFrom(ITEM(1)), { geo: async () => okJson({}), stores: async () => ({ stores: [] }), registry: async () => REG })
    for (const k of MONEY_FIELDS) expect(d.fields).not.toHaveProperty(k)
    expect(MONEY_FIELDS).toEqual(['transferFee', 'deposit', 'monthlyRent', 'maintenance', 'monthlySales', 'transferReason', 'remainingTerm'])
    expect(mapIndustry(null)).toBeNull()
  })

  test('③ auto 상태 값 → 완성도 미반영, 확정 후 반영', () => {
    const row = { address: '서울 마포구 서교동 1', shop_name: '카페', area: '33', deposit: '3000', monthly_rent: '200', transfer_fee: '2500', transfer_type: 'full', category_main: '카페·베이커리', image_urls: [], sales_proof: false }
    const full = calcScore(listingToScoreInput(row)) // 20+10+5+15+10+5+5 = 70
    expect(full).toBe(70)
    const auto = calcScore(listingToScoreInput({ ...row, autofill: { auto_fields: ['categoryMain', 'area'] } }))
    expect(auto).toBe(60)
    expect(calcScore(listingToScoreInput({ ...row, autofill: { auto_fields: [] } }))).toBe(70)
    expect(autoFieldsOf({ categoryMain: { source: 'sbiz', status: 'auto' }, area: { source: 'building_ledger', status: 'user_confirmed' } })).toEqual(['categoryMain'])
  })

  test('⑤ 사진 초안: "평"·"권리금" 포함 항목 폐기, 나머지 유지 / 스키마 밖 키 무시', () => {
    const d = parsePhotoDraft('```json\n{"interior_state":"보통","seats":"약 24석 정도","kitchen":true,"signboard":"간판 있음, 30평 규모","corner":"권리금 3000만 코너","area":"40㎡","quality_note":"밝기 양호"}\n```')
    expect(d.items).toEqual({ interior_state: '보통', seats: '약 24석', kitchen: '있음', quality_note: '밝기 양호' })
    expect(d.dropped).toBe(2); expect(d.items).not.toHaveProperty('area')
    expect(parsePhotoDraft('no json')).toBeNull()
    expect(parsePhotoDraft('{"interior_state":"엄청 좋음"}').items).toEqual({})
  })

  test('⑥ 소스에 place.naver.com 등 크롤링 문자열 포함 시 lint 실패 / 현재 소스 위반 0', () => {
    expect(findCrawlViolations("fetch('https://m.place.naver.com/restaurant/1')").length).toBeGreaterThan(0)
    expect(findCrawlViolations("const u = 'https://map.kakao.com/link/map/1'")).toHaveLength(1)
    expect(findCrawlViolations(readFileSync('src/lib/placeLookup.js', 'utf8'))).toEqual([])
  })

  test('⑦ 스키마: 외부 응답 원본을 저장하는 테이블·컬럼 없음', () => {
    const sql = readFileSync('docs/SQL-reb-autofill-price-inquiry.sql', 'utf8')
    expect(sql).not.toMatch(/raw_response|response_raw|raw_json|html\s+text|payload_raw/i)
    expect(sql).toMatch(/listing_field_sources/)
  })
})

// ── UI ───────────────────────────────────────────────────────
async function base(page, { naverItems = [], stores = [], registry = true, gemini = true } = {}) {
  await mockGemini(page); await mockMarketData(page)
  await page.addInitScript(() => localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' })))
  await page.route('**/api/nearby-brokers*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(naverItems === 'disabled' ? { disabled: true, items: null } : { items: naverItems }) }))
  await page.route('**/api/geocode', r => {
    const b = JSON.parse(r.request().postData() || '{}')
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b.lat != null ? { region: '서울 마포구 서교동', code: '1144012000' } : { lat: 37.55, lng: 126.92 }) })
  })
  await page.route('**/api/opendata/**', r => {
    const u = r.request().url()
    if (u.includes('sdsc2')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ body: { items: stores, totalCount: stores.length } }) })
    if (!registry) return r.fulfill({ status: 500, body: '' })
    const ok = (item) => ({ response: { header: { resultCode: '00' }, body: { items: { item } } } })
    if (u.includes('getBrTitleInfo')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok([{ bldNm: '테스트빌딩', mainPurpsCdNm: '근린생활시설', useAprDay: '20090315' }])) })
    if (u.includes('getBrExposPubuseAreaInfo')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok([{ exposPubuseGbCdNm: '전유', hoNm: '101호', flrNoNm: '1층', area: '45.2' }])) })
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok([])) })
  })
  await page.route(`${SUPABASE}/rest/v1/listings*`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }))
  await page.route(`${SUPABASE}/rest/v1/franchise_brands*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
}
const STORE_MATCH = [{ bizesNm: '서교 카페 1', ksicCd: 'I56221', ksicNm: '커피 전문점', indsSclsNm: '커피전문점', flrNo: '1', hoNo: '101', rdnmAdr: '서울 마포구 양화로 45', lnoAdr: '서울 마포구 서교동 395-1' }]

test('① UI: 상호 검색 후보 5 → 택1 → 확인 화면에 업종·주소·층·면적 → 다음 → 등록 폼에 채워짐(돈 칸은 비어 있음)', async ({ page }) => {
  await base(page, { naverItems: [1, 2, 3, 4, 5].map(ITEM), stores: STORE_MATCH })
  await page.goto('/e1/1')
  await page.getByTestId('reg-start-entry').click()
  await expect(page).toHaveURL(/\/e1\/start$/)
  await page.getByTestId('reg-start-input').fill('서교 카페')
  await page.getByTestId('reg-start-submit').click()
  await expect(page.getByTestId('reg-candidates').getByRole('button', { name: /서교 카페/ })).toHaveCount(5)
  await page.getByTestId('reg-candidate-0').click()
  await expect(page).toHaveURL(/\/e1\/confirm$/)
  const confirm = page.getByTestId('autofill-confirm')
  await expect(confirm).toContainText('공공 정보로 미리 채웠어요')
  await expect(page.getByTestId('confirm-address')).toContainText('서울 마포구 양화로 45')
  await expect(page.getByTestId('confirm-categoryMain')).toBeVisible()
  await expect(page.getByTestId('flag-categoryMain')).toHaveCount(0) // 상호 대조 성공
  await expect(page.getByTestId('confirm-floor')).toContainText('1층')
  await expect(page.getByTestId('confirm-area')).toContainText('45.2㎡')
  await expect(page.getByTestId('confirm-buildingYear')).toContainText('2009년 준공')
  // 돈 칸·매출·사유는 확인 화면에 없다 (⑧)
  await expect(confirm).not.toContainText(/권리금|보증금|월세|관리비|매출|사유/)
  await page.getByTestId('yes-categoryMain').click()
  await page.getByTestId('confirm-next').click()
  await expect(page).toHaveURL(/\/e1\/1$/)
  await expect(page.getByText('서울 마포구 양화로 45').first()).toBeVisible()
  await expect(page.getByTestId('reg-start-entry')).toHaveCount(0) // 주소가 채워졌으니 시작 박스는 사라짐
  const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem('modu_e1_draft')))
  expect(draft.fieldSources.categoryMain).toMatchObject({ source: 'sbiz', status: 'user_confirmed' })
  expect(draft.fieldSources.floor).toMatchObject({ status: 'auto' })
  expect(draft.transferFee ?? '').toBe(''); expect(draft.deposit ?? '').toBe(''); expect(draft.monthlyRent ?? '').toBe('')
})

test('④ UI: 소진공 상호 불일치 → 업종 칩에 "확인 필요"', async ({ page }) => {
  await base(page, { naverItems: [ITEM(1)], stores: [{ ...STORE_MATCH[0], bizesNm: '다른 가게' }] })
  await page.goto('/e1/start')
  await page.getByTestId('reg-start-input').fill('서교 카페')
  await page.getByTestId('reg-start-submit').click()
  await page.getByTestId('reg-candidate-0').click()
  await expect(page.getByTestId('flag-categoryMain')).toHaveText('확인 필요')
})

test('② UI: 후보 0 → 주소 입력 유도 → 그래도 0 → 수동 흐름, 에러 문구 없음 / ⑩ 키 미설정도 동일', async ({ page }) => {
  await base(page, { naverItems: [] })
  await page.goto('/e1/start')
  await page.getByTestId('reg-start-input').fill('없는 가게 이름')
  await page.getByTestId('reg-start-submit').click()
  await expect(page.getByTestId('reg-start-question')).toHaveText('주소로 찾아볼게요')
  await expect(page.locator('body')).not.toContainText(/오류|실패|에러/)
  await page.getByTestId('reg-start-input').fill('아무 말')
  await page.getByTestId('reg-start-submit').click()
  await expect(page).toHaveURL(/\/e1\/1$/)
  await expect(page.getByRole('heading', { name: '매물 등록' })).toBeVisible()

  // ⑩ 검색 키 미설정(disabled) — 자동 채움 없이 수동 등록 그대로
  await base(page, { naverItems: 'disabled' })
  await page.goto('/e1/start')
  await page.getByTestId('reg-start-input').fill('서교 카페')
  await page.getByTestId('reg-start-submit').click()
  await expect(page.getByTestId('reg-start-question')).toHaveText('주소로 찾아볼게요')
  await page.getByTestId('reg-manual-link').click()
  await expect(page).toHaveURL(/\/e1\/1$/)
  await expect(page.getByRole('button', { name: '주소 검색 (도로명·지번)' })).toBeVisible()
})

test('⑨ UI: 기업회원 — 사업자번호 무효 → 배지 없음 + 안내, 입점 진행 가능 / 유효 → "사업자 확인" 배지', async ({ page }) => {
  await base(page, { naverItems: [{ ...ITEM(1), title: '서교 인테리어', category: '생활>인테리어', telephone: '02-111-2222' }] })
  await page.addInitScript(() => localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'business', region: '서울' })))
  let result = 'mismatch'
  await page.route('**/api/verify-bizno', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result }) }))
  await page.goto('/e1b/start')
  await page.getByTestId('vendor-name').fill('서교 인테리어')
  await page.getByTestId('vendor-bizno').fill('1234567891')
  await page.getByTestId('vendor-start-submit').click()
  await expect(page.getByTestId('vendor-biz-notice')).toHaveText('국세청 조회 결과 확인되지 않았어요 · 다시 확인해 주세요')
  await expect(page.getByTestId('vendor-biz-badge')).toHaveCount(0)
  await expect(page.getByTestId('confirm-telephone')).toContainText('02-111-2222')
  await page.getByTestId('vendor-confirm-next').click()
  await expect(page).toHaveURL(/\/e1b\/1$/) // 입점 자체는 막지 않는다
  await expect(page.getByTestId('vendor-biz-notice')).toBeVisible()
  await expect(page.getByTestId('vendor-biz-badge')).toHaveCount(0)

  result = 'verified'
  await page.goto('/e1b/start')
  await page.getByTestId('vendor-name').fill('서교 인테리어')
  await page.getByTestId('vendor-bizno').fill('1234567891')
  await page.getByTestId('vendor-start-submit').click()
  await expect(page.getByTestId('vendor-biz-badge')).toHaveText('사업자 확인')
})
