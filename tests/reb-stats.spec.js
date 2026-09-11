/**
 * 한국부동산원 임대동향 비교선 (ORDER 2026-09-11 파트 A)
 * ① 시군구 행만·상권 매핑 없음 → 구 이름 ② 전용면적 없음 → 1줄만 ③ vacancy null·rent 있음 → 임대료만, 둘 다 null → 카드 없음
 * ④ 판단 문구 lint ⑤ 배치 API 실패 → 직전 분기 유지·로그 1줄 ⑥ 소개글 수치·출처 포함, 다른 수치 → 문장 제거 ⑦ 카드 함수 plan_tier lint
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { readFileSync } from 'node:fs'
import { pickStat, cardLines, rentPerM2, comparePct, compareBucket, quarterOf, prevQuarterOf, verifyStatNumbers, verifyDraftStats, rebFacts, sigunguCodeOf, storeTypeOf } from '../src/lib/rebStatsRules.js'
import { rebPromptSection } from '../src/lib/prompts/listingIntro.js'
import { decideBatch, fetchRebQuarter, normalizeRows } from '../api/_rebConnector.js'
import { findCopyViolations } from '../scripts/lint-copy.mjs'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const ROW = { quarter: '2026Q2', region_level: 'sigungu', region_code: '11440', region_name: '마포구', store_type: 'small', vacancy_rate: 6.3, rent_per_m2: 50000 }

test.describe('룰 유닛', () => {
  test('① 시군구 행만 있고 상권 매핑 없음 → 구 이름으로 1줄, 최신 분기 우선', () => {
    const s = pickStat([{ ...ROW, quarter: '2026Q1', rent_per_m2: 48000 }, ROW], { sigunguCode: '11440', districtName: null, storeType: 'small' })
    expect(s).toMatchObject({ level: 'sigungu', region_name: '마포구', quarter: '2026Q2', rent_per_m2: 50000 })
    expect(cardLines(s).line1).toBe('마포구 소규모 상가: 공실률 6.3% · 임대료 ㎡당 50,000원 (한국부동산원 2026년 2분기)')
    expect(sigunguCodeOf('1144012000')).toBe('11440'); expect(sigunguCodeOf('abc')).toBeNull()
    expect(storeTypeOf({ autofill: { registry_kind: 'exclusive' } })).toBe('aggregate'); expect(storeTypeOf({})).toBe('small')
    expect(pickStat([ROW], { sigunguCode: '11440', storeType: 'aggregate' })).toBeNull() // 유형 불일치
  })

  test('② 전용면적 없음 → 1줄만 / 있으면 2줄째 ㎡당·평균 대비', () => {
    const s = pickStat([ROW], { sigunguCode: '11440' })
    expect(cardLines(s, { monthlyRent: '200', area: '', label: 'owner' }).line2).toBeNull()
    const c = cardLines(s, { monthlyRent: '200', area: '33', label: 'owner' })
    expect(rentPerM2('200', '33')).toBe(60606)
    expect(c.line2).toBe('내 임대료 ㎡당 60,606원 · 평균 대비 +21%')
    expect(cardLines(s, { monthlyRent: '150', area: '33', label: 'listing' }).line2).toBe('이 매물 월세 ㎡당 45,455원 · 평균 대비 -9%')
    expect(comparePct(40000, 50000)).toBe(-20); expect(compareBucket(-20)).toBe('-20_-5'); expect(compareBucket(-21)).toBe('under_-20'); expect(compareBucket(25)).toBe('over_20')
    expect(c.note).toBe('공식 통계예요 · 상가마다 조건이 달라 참고용으로 보세요')
  })

  test('③ vacancy null·rent 있음 → 임대료만 / 둘 다 null → 카드 없음', () => {
    const s = pickStat([{ ...ROW, vacancy_rate: null }], { sigunguCode: '11440' })
    expect(cardLines(s).line1).toBe('마포구 소규모 상가: 임대료 ㎡당 50,000원 (한국부동산원 2026년 2분기)')
    expect(pickStat([{ ...ROW, vacancy_rate: null, rent_per_m2: null }], { sigunguCode: '11440' })).toBeNull()
    expect(cardLines(null)).toBeNull()
  })

  test('④ 판단 문구 lint — "비싸", "싸요", "내리세요", "좋은 자리" 검출, 실제 파일은 위반 0', () => {
    for (const bad of ['임대료가 비싸요', '싸요', '지금 내리세요', '좋은 자리예요', '예상 권리금 3,000만', '추정 시세']) expect(findCopyViolations(bad).length).toBeGreaterThan(0)
    for (const f of ['config/rebStats.ts', 'src/lib/rebStatsRules.js', 'src/components/RebStatCard.jsx', 'src/lib/prompts/listingIntro.js']) {
      expect(findCopyViolations(readFileSync(f, 'utf8'), f)).toEqual([])
    }
  })

  test('⑤ 배치: 키 없음·실패 → 직전 분기 유지 + 운영 로그 1줄, 성공 → upsert', async () => {
    expect(await fetchRebQuarter({ quarter: '2026Q2', apiKey: null })).toBeNull()
    expect(await fetchRebQuarter({ quarter: '2026Q2', apiKey: 'k', fetchImpl: async () => ({ ok: false }) })).toBeNull()
    const keep = decideBatch({ fetched: null, quarter: '2026Q2', prevQuarter: '2026Q1' })
    expect(keep.action).toBe('keep'); expect(keep.rows).toEqual([]); expect(keep.log).toBe('[reb-stats] 2026Q2 수집 실패 — 직전 분기(2026Q1) 데이터 유지')
    const rows = normalizeRows({ rows: [{ store_type: '소규모', region_name: '마포구', region_level: 'sigungu', region_code: '11440', vacancy_rate: 6.3, rent_per_m2: 50000 }] }, '2026Q2')
    expect(rows[0]).toMatchObject({ quarter: '2026Q2', store_type: 'small', region_name: '마포구' })
    expect(rows[0]).not.toHaveProperty('raw')
    expect(decideBatch({ fetched: rows, quarter: '2026Q2', prevQuarter: '2026Q1' }).action).toBe('upsert')
    expect(quarterOf(new Date('2026-09-11T03:00:00Z'))).toBe('2026Q3'); expect(prevQuarterOf('2026Q1')).toBe('2025Q4')
  })

  test('⑥ 소개글: 프롬프트에 수치 + "한국부동산원 … 기준", 응답 수치가 다르면 그 문장 제거', () => {
    const s = pickStat([ROW], { sigunguCode: '11440' })
    const sec = rebPromptSection(s)
    expect(sec).toContain('공실률 6.3% (한국부동산원 2026년 2분기 기준)'); expect(sec).toContain('임대료 ㎡당 50,000원')
    expect(rebPromptSection(null)).toBe(''); expect(rebFacts({ ...s, vacancy_rate: null, rent_per_m2: null })).toBeNull()
    const text = '조용한 골목 카페입니다. 마포구 소규모 상가 공실률은 6.3%입니다 (한국부동산원 2026년 2분기 기준). 임대료는 ㎡당 70,000원 수준입니다 (한국부동산원 2026년 2분기 기준). 역에서 가깝습니다.'
    const out = verifyStatNumbers(text, s)
    expect(out).toContain('공실률은 6.3%'); expect(out).not.toContain('70,000'); expect(out).toContain('역에서 가깝습니다')
    expect(verifyDraftStats({ intro: text, nested: { a: text } }, s).nested.a).not.toContain('70,000')
    expect(verifyStatNumbers('공실률 6.3% (한국부동산원 2026년 2분기 기준).', null)).toBe('') // 통계 없는데 인용 → 제거
  })

  test('⑦ 카드 함수가 plan_tier 를 참조하면 lint 실패', () => {
    expect(findPricingSortViolations('function RebStatCard(p) {\n  return p.plan_tier\n}')).toHaveLength(1)
    expect(findPricingSortViolations(readFileSync('src/components/RebStatCard.jsx', 'utf8'), 'RebStatCard.jsx')).toEqual([])
  })
})

// ── UI ───────────────────────────────────────────────────────
const LISTING = {
  id: 'reb-1', device_id: 'other-dev', status: 'published', shop_name: '비교선 카페', shop_name_public: true,
  address: '서울 마포구 서교동 332-4 1층', bjd_code: '1144012000', deposit: '3000', monthly_rent: '200', transfer_fee: '2500', transfer_type: 'full',
  area: '33', category_main: '카페·베이커리', ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], facilities: [], created_at: new Date().toISOString(),
}
async function setupE2(page, { rows, listing = LISTING }) {
  await mockGemini(page); await mockMarketData(page)
  await page.addInitScript(() => localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup' })))
  await page.route(`${SUPABASE}/rest/v1/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listing) }))
  await page.route(`${SUPABASE}/rest/v1/reb_market_stats*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) }))
  const events = []
  await page.route(`${SUPABASE}/rest/v1/events*`, r => { if (r.request().method() === 'POST') events.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) })
  await page.goto(`/e2/${listing.id}`)
  return { events }
}

test('①·② UI: 매물 상세 상권 섹션 첫 줄 — 구 이름 1줄 + 월세·면적 있으면 2줄째, 이벤트 2건', async ({ page }) => {
  const { events } = await setupE2(page, { rows: [ROW] })
  const card = page.getByTestId('reb-stat-card')
  await expect(card.getByTestId('reb-stat-line1')).toHaveText('마포구 소규모 상가: 공실률 6.3% · 임대료 ㎡당 50,000원 (한국부동산원 2026년 2분기)')
  await expect(card.getByTestId('reb-stat-line2')).toHaveText('이 매물 월세 ㎡당 60,606원 · 평균 대비 +21%')
  await expect(card).toContainText('참고용으로 보세요')
  await expect(card).not.toContainText(/비싸|싸요|좋은 자리|AI/)
  await expect.poll(() => events.filter(e => e.event_name === 'reb_stat_shown').length).toBe(1)
  expect(events.find(e => e.event_name === 'reb_stat_shown').payload).toMatchObject({ place: 'listing_detail', level: 'sigungu', store_type: 'small', has_compare: true })
  expect(events.find(e => e.event_name === 'reb_stat_compare_bucket').payload.bucket).toBe('over_20')
})

test('② UI: 면적 없는 매물 → 1줄만 / ③ 둘 다 null → 카드 없음', async ({ page }) => {
  await setupE2(page, { rows: [ROW], listing: { ...LISTING, area: null } })
  await expect(page.getByTestId('reb-stat-line1')).toBeVisible()
  await expect(page.getByTestId('reb-stat-line2')).toHaveCount(0)

  await setupE2(page, { rows: [{ ...ROW, vacancy_rate: null, rent_per_m2: null }] })
  await expect(page.getByText('비교선 카페').first()).toBeVisible()
  await expect(page.getByTestId('reb-stat-card')).toHaveCount(0)
})
