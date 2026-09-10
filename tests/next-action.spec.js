/**
 * 사장님 매출 분석 '다음 행동' 카드 (ORDER 2026-09-10 파트 B)
 * ① 같은 구 업종 매물 2건 → 시세 카드 없음, 3건 → 카드(범위 두 개·예측 문구 없음) ② lease 150일 → lease_prep, 60일 → lease_end_near 1장만
 * ③ 6월 20일 → vat_due, 5월 → 없음 ④ 3연속 상승 → growth, [근처 매물 보기] → 탐색 임대·같은 구
 * ⑤ 시세 카드 클릭 → ledger 1행 source=price_card ⑥ 초안 API 실패 → 빈 입력란·에러 문구 없음 ⑦ 초안에 전화번호 → 빈칸 ⑧ 카드 함수 plan_tier → lint 실패
 */
import { test, expect } from './fixtures.js'
import { mockGemini } from './helpers.js'
import { priceRange, nextMonthRule, daysToVatDue, growthStreak, getNextActionCard, nextActionCopy } from '../src/lib/nextActionRules.js'
import { buildInquiryDraftPrompt, validateInquiryDraft } from '../src/lib/prompts/inquiryDraft.js'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'
import { categoriesOf } from '../config/salesCardCategories.ts'
import { kstToday, addDays } from '../src/lib/weekUtil.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const TODAY = kstToday()
const back = (n) => addDays(TODAY, -n)
const L = (i, over = {}) => ({ id: `p${i}`, status: 'published', address: '서울 마포구 서교동 1', category_main: '카페·베이커리', transfer_fee: String(3000 + i * 500), monthly_rent: String(150 + i * 25), updated_at: new Date().toISOString(), ...over })
/** 4개 완결 월(5~8월 기준 상대) — 각 10일 입력, 월 합계 상승 */
function growthEntries(now = new Date()) {
  const out = []
  const t = kstToday(now); let y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7))
  for (let k = 1; k <= 4; k++) {
    m -= 1; if (m === 0) { m = 12; y -= 1 }
    const ym = `${y}-${String(m).padStart(2, '0')}`
    for (let d = 1; d <= 10; d++) out.push({ sale_date: `${ym}-${String(d).padStart(2, '0')}`, revenue: (5 - k) * 100000 })
  }
  return out
}

test.describe('룰 유닛', () => {
  test('① 같은 구 업종 매물 2건 → null, 3건 → 범위 두 개 · 예측 문구 없음 · 매출 금액 없음', () => {
    expect(priceRange([L(0), L(1)], { industry: '카페·베이커리', gu: '마포구' })).toBeNull()
    const r = priceRange([L(0), L(1), L(2), L(3, { address: '서울 강남구 1' }), L(4, { status: 'sold', updated_at: new Date(Date.now() - 400 * 864e5).toISOString() })], { industry: '카페·베이커리', gu: '마포구' })
    expect(r.n).toBe(3)
    const c = nextActionCopy({ kind: 'price_range', range: r, industry: '카페·베이커리' })
    expect(c.line1).toBe('같은 구 카페·베이커리 매물 3건: 권리금 3,000~4,000만 · 월세 150~200만')
    expect(c.line2).toBe('실제 등록·거래된 값의 범위예요 · 예측값이 아니에요')
    expect(c.line1).not.toMatch(/예상|예측|매출/)
    expect(c.cta).toBe('내 가게도 등록하면?')
    expect(c.foot).toBe('이 화면을 본 사실은 업체에 전달되지 않아요 · 지역별 건수만 집계돼요')
  })

  test('② lease 150일 → lease_prep, 60일 → 상황 카드 lease_end_near 1장만', () => {
    const in150 = addDays(TODAY, 150), in60 = addDays(TODAY, 60)
    expect(nextMonthRule({ roleData: { lease_end_date: in150 } }).rule).toBe('lease_prep')
    const a = getNextActionCard({ roleData: { lease_end_date: in150 }, now: new Date() })
    expect(a.kind).toBe('next_month'); expect(a.signal).toBe('next_month:lease_prep')
    expect(nextActionCopy(a).line1).toBe('임대차 만료까지 150일 · 재계약 조건을 미리 정리해 두세요')
    const b = getNextActionCard({ roleData: { lease_end_date: in60 } })
    expect(b.kind).toBe('service'); expect(b.signal).toBe('lease_end_near')
    expect(nextMonthRule({ roleData: { lease_end_date: in60 }, now: new Date('2026-03-01T03:00:00Z') })).toBeNull() // 90일 이내는 다음 달 준비가 아니다
  })

  test('③ 6월 20일 → vat_due(D-11), 5월 20일 → 없음', () => {
    const jun = new Date('2026-06-20T03:00:00Z'), may = new Date('2026-05-20T03:00:00Z')
    expect(daysToVatDue(jun)).toBe(11)
    expect(nextMonthRule({ now: jun }).rule).toBe('vat_due')
    expect(nextActionCopy(getNextActionCard({ now: jun })).cta).toBe('세무 업체 보기')
    expect(categoriesOf('vat_due').map(c => c.key)).toEqual(['tax'])
    expect(daysToVatDue(may)).toBe(42)
    expect(getNextActionCard({ now: may })).toBeNull()
  })

  test('④ 3개월 연속 상승 → growth, 한 달이라도 안 오르면 없음', () => {
    const now = new Date('2026-09-10T03:00:00Z')
    const g = growthStreak(growthEntries(now), now)
    expect(g.months).toHaveLength(3)
    const card = getNextActionCard({ entries: growthEntries(now), now })
    expect(card.signal).toBe('next_month:growth')
    expect(nextActionCopy(card).cta).toBe('근처 매물 보기')
    const flat = growthEntries(now).map(e => ({ ...e, revenue: 100000 }))
    expect(growthStreak(flat, now)).toBeNull()
  })

  test('⑦ 초안 검증: 전화번호·URL·금액 → null, 300자 초과 → 자름 / 프롬프트에 매출 금액 없음', () => {
    expect(validateInquiryDraft('안녕하세요. 문의드립니다. 010-1234-5678로 연락 주세요.')).toBeNull()
    expect(validateInquiryDraft('자세한 내용은 https://example.com 참고')).toBeNull()
    expect(validateInquiryDraft('예산은 300만원 정도입니다')).toBeNull()
    expect(validateInquiryDraft('안녕하세요. 홍보 방법을 상담받고 싶습니다.')).toBe('안녕하세요. 홍보 방법을 상담받고 싶습니다.')
    expect(validateInquiryDraft('가'.repeat(400))).toHaveLength(300)
    const p = buildInquiryDraftPrompt({ industry: '카페', region: '서울 마포구', situation: '최근 한 달 매출이 이전 석 달 평균보다 25% 적어요', category: 'marketing' })
    expect(p).toContain('마케팅·홍보'); expect(p).not.toMatch(/\d+원/)
  })

  test('⑧ lint: 카드 함수가 plan_tier 를 참조하면 실패, 카드가 관심 수를 표시하는 건 허용', () => {
    expect(findPricingSortViolations('function NextActionCard(props) {\n  const paid = props.plan_tier === "premium"\n  return paid\n}')).toHaveLength(1)
    expect(findPricingSortViolations('function WatchOwnerCard(props) {\n  const n = props.watchers.length\n  return n\n}')).toEqual([])
    expect(findPricingSortViolations('function sortByWatch(l) {\n  return l.sort((a, b) => b.watchers - a.watchers)\n}')).toHaveLength(1)
  })
})

// ── UI ───────────────────────────────────────────────────────
async function setupOperating(page, { sales = [], listings = [], vendors = [], profileExtra = {} } = {}) {
  await mockGemini(page)
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/rest/v1/daily_sales*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sales) }))
  await page.route(`${SUPABASE}/rest/v1/listings*`, r => {
    const url = r.request().url()
    const m = url.match(/biz_category=eq\.(\w+)/)
    const body = m ? vendors.filter(v => v.biz_category === m[1]) : url.includes('category_main=eq.') ? listings : []
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  const ledger = []
  await page.route(`${SUPABASE}/rest/v1/inquiry_ledger*`, r => {
    if (r.request().method() === 'POST') { ledger.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'l1' }) }) }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.addInitScript(extra => {
    localStorage.setItem('modu_device_id', 'na-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ name: '김사장', category: 'operating',
      roleData: { operating: { bizLabel: '카페·커피전문점', region: '서울', region_sub: '마포구', category_main: '카페·베이커리', ...extra } } }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_op', category: 'operating', name: '김사장', active: true }]))
  }, profileExtra)
  await page.goto('/a7/operating')
  return { ledger }
}

test('①·⑤ UI: 같은 구 매물 3건 → 시세 카드, 클릭 → ledger 1행 source=price_card + 등록 미리보기', async ({ page }) => {
  const { ledger } = await setupOperating(page, { listings: [L(0), L(1), L(2)] })
  const card = page.getByTestId('next-action-card')
  await expect(card).toHaveAttribute('data-signal', 'price_range')
  await expect(card.getByTestId('next-action-line1')).toHaveText('같은 구 카페·베이커리 매물 3건: 권리금 3,000~4,000만 · 월세 150~200만')
  await expect(card.getByTestId('next-action-foot')).toContainText('업체에 전달되지 않아요')
  await expect(card).not.toContainText('AI')
  await card.getByTestId('next-action-cta').click()
  await expect.poll(() => ledger.length).toBe(1)
  expect(ledger[0]).toMatchObject({ source: 'price_card', signal: 'price_range', channel: 'app', status: 'sent', region: '마포구', vendor_id: null })
  await expect(page).toHaveURL(/\/e1\/1\?preview=1$/)
  await expect(page.getByRole('heading', { name: '매물 등록 미리보기' })).toBeVisible()
})

test('① UI: 2건이면 시세 카드 없음 (카드 자체 없음)', async ({ page }) => {
  await setupOperating(page, { listings: [L(0), L(1)] })
  await expect(page.getByTestId('sales-card')).toBeVisible()
  await expect(page.getByTestId('next-action-card')).toHaveCount(0)
  await expect(page.getByTestId('sales-service-card')).toHaveCount(0)
})

test('④ UI: 3연속 상승 → growth 카드, [근처 매물 보기] → 탐색 임대·같은 구', async ({ page }) => {
  await setupOperating(page, { sales: growthEntries() })
  const card = page.getByTestId('next-action-card')
  await expect(card).toHaveAttribute('data-signal', 'next_month:growth')
  await card.getByTestId('next-action-cta').click()
  await expect(page).toHaveURL(/\/explore\?type=landlord&gu=%EB%A7%88%ED%8F%AC%EA%B5%AC$/)
  await expect(page.getByTestId('explore-landlord-notice')).toHaveText('마포구 임대 상가를 보고 있어요')
})

test('② UI: lease 150일 → 다음 달 준비 카드 → 체크리스트 5줄', async ({ page }) => {
  await setupOperating(page, { profileExtra: { lease_end_date: addDays(TODAY, 150) } })
  const card = page.getByTestId('next-action-card')
  await expect(card).toHaveAttribute('data-signal', 'next_month:lease_prep')
  await card.getByTestId('next-action-cta').click()
  await expect(page.getByTestId('checklist-items').locator('li')).toHaveCount(5)
  await expect(page.getByTestId('checklist-items')).toContainText('인상 상한 5%')
})

const salesDrop = Array.from({ length: 56 }, (_, i) => ({ sale_date: back(i), revenue: i < 30 ? 780000 : 1000000 }))
const VENDOR = { id: 'v1', device_id: 'vendor-dev', listing_type: 'business', status: 'published', biz_category: 'marketing', shop_name: '서교 홍보', address: '서울 마포구 서교동 1', image_urls: [], biz_tags: [] }

async function openInquiry(page, geminiBody) {
  await setupOperating(page, { sales: salesDrop, vendors: [VENDOR] })
  await page.route('https://generativelanguage.googleapis.com/**', r => geminiBody === 'fail'
    ? r.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
    : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: geminiBody }] } }] }) }))
  await page.getByTestId('sales-service-cta').click()
  await page.getByTestId('sales-chip-marketing').click()
  await page.getByTestId('vendor-inquire').click()
  return page.getByTestId('inquiry-attach-sheet')
}

test('⑥ UI: 초안 API 실패 → 빈 입력란, 에러 문구 없음, 전송은 가능', async ({ page }) => {
  const sheet = await openInquiry(page, 'fail')
  await expect(sheet.getByTestId('inquiry-send')).toBeEnabled()
  await expect(sheet.getByTestId('inquiry-body')).toHaveValue('')
  await expect(sheet.getByTestId('inquiry-draft-note')).toHaveCount(0)
  await expect(sheet).not.toContainText(/오류|실패|에러/)
})

test('⑦ UI: 초안 응답에 전화번호 → 폐기하고 빈칸 / 정상 초안 → 채워지고 안내 1줄', async ({ page }) => {
  let sheet = await openInquiry(page, '안녕하세요. 010-1234-5678로 연락 주세요.')
  await expect(sheet.getByTestId('inquiry-send')).toBeEnabled()
  await expect(sheet.getByTestId('inquiry-body')).toHaveValue('')
  await expect(sheet.getByTestId('inquiry-draft-note')).toHaveCount(0)

  sheet = await openInquiry(page, '안녕하세요. 카페 홍보 방법을 상담받고 싶습니다.')
  await expect(sheet.getByTestId('inquiry-body')).toHaveValue('안녕하세요. 카페 홍보 방법을 상담받고 싶습니다.')
  await expect(sheet.getByTestId('inquiry-draft-note')).toHaveText('초안을 넣어 뒀어요 · 고치거나 지우고 쓰셔도 돼요')
})
