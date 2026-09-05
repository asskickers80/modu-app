/**
 * "이번 주 한 줄" (ORDER-weekly-one-liner-v1)
 * 유닛: 신호 우선순위(1개만)·입력 주 게이트·문의 주제 분류·주 경계
 * UI: 카드 표시 시 "오늘의 한 마디" 숨김 / 신호 없으면 한 마디만 / X → 그 주 미표시 /
 *     CTA 실동작 / 두 축 각자 신호
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { computeOperatingSignal, computeSellerSignal } from '../src/lib/oneLinerRules.js'
import { classifyInquiry, topInquiryTopic } from '../src/lib/inquiryTopics.js'
import { weekStartOf, addDays, kstToday } from '../src/lib/weekUtil.js'

const NOW = new Date('2026-09-05T03:00:00Z') // KST 2026-09-05(토) 12:00
const TODAY = kstToday(NOW)
const back = (n) => addDays(TODAY, -n)

// 최근 8주에 골고루 입력이 있는 기본 원장 (입력 주 게이트 통과용)
function baseEntries(revenueOf = () => 300000) {
  return Array.from({ length: 56 }, (_, i) => ({ sale_date: back(i + 1), revenue: revenueOf(i + 1) }))
}

test.describe('신호 룰 유닛 — 사장님', () => {
  test('같은 요일 3주 연속 하락이 최우선 (다른 신호가 동시에 참이어도 1개만)', () => {
    // 지난주 토요일(=어제, back(1))·2주 전·3주 전이 단조 감소 + 이번 달 급감(2번도 참)
    const entries = baseEntries(() => 300000)
    for (const [d, v] of [[1, 100000], [8, 200000], [15, 300000]]) {
      const row = entries.find(e => e.sale_date === back(d))
      row.revenue = v
    }
    // 이번 달 매출을 크게 낮춰 month_drop20도 동시에 참이 되게 한다
    for (const e of entries) if (e.sale_date.startsWith(TODAY.slice(0, 7))) e.revenue = 50000
    const s = computeOperatingSignal({ entries, now: NOW })
    expect(s.signal_key).toBe('weekday_drop3')
    expect(s.headline).toContain('3주째 내려가고 있어요')
    expect(s.evidence).toContain('→')
    expect(s.cta_key).toBe('sales_input')
  })

  test('입력 주가 3주뿐이면 매출 신호 없음 (게이트 미달 → null)', () => {
    // 최근 3주에만 입력, 결측 없음(missing_input도 안 걸리게 7일 전부 채움)
    const entries = Array.from({ length: 21 }, (_, i) => ({ sale_date: back(i + 1), revenue: 300000 - i * 1000 }))
    expect(computeOperatingSignal({ entries, now: NOW })).toBeNull()
  })

  test('월 비교: -20% 이하 → month_drop20, +20% 이상 → month_up20', () => {
    const day = Number(TODAY.slice(8, 10))
    const prevMonth = new Date(Date.UTC(Number(TODAY.slice(0, 4)), Number(TODAY.slice(5, 7)) - 1, 1) - 864e5)
      .toISOString().slice(0, 7)
    const mk = (curRev, prevRev) => {
      const rows = []
      for (let d = 1; d <= day; d++) {
        rows.push({ sale_date: `${TODAY.slice(0, 7)}-${String(d).padStart(2, '0')}`, revenue: curRev })
        rows.push({ sale_date: `${prevMonth}-${String(d).padStart(2, '0')}`, revenue: prevRev })
      }
      // 입력 주 게이트 통과용 과거 주 채움
      for (let i = 22; i <= 56; i += 7) rows.push({ sale_date: back(i), revenue: prevRev })
      return rows
    }
    const down = computeOperatingSignal({ entries: mk(70000, 100000), now: NOW })
    expect(down.signal_key).toBe('month_drop20')
    expect(down.headline).toContain('30% 적어요')
    expect(down.evidence).toContain('같은') // 공통 입력일 기준임을 근거에 명시
    expect(down.cta_key).toBe('sales_memo')

    const up = computeOperatingSignal({ entries: mk(150000, 100000), now: NOW })
    expect(up.signal_key).toBe('month_up20')
    expect(up.headline).toContain('50% 많아요')
    expect(up.cta_key).toBe('sales_trend')
  })

  test('요일 편차 1.5배 이상 → best_day (최근 4주 평균)', () => {
    // 토요일만 3배, 나머지 균일 — 월 비교는 동률이라 통과
    const entries = []
    for (let i = 1; i <= 56; i++) {
      const d = back(i)
      const isSat = new Date(`${d}T00:00:00Z`).getUTCDay() === 6
      entries.push({ sale_date: d, revenue: isSat ? 900000 : 300000 })
    }
    const s = computeOperatingSignal({ entries, now: NOW })
    expect(s.signal_key).toBe('best_day')
    expect(s.headline).toContain('토요일이')
    expect(s.headline).toContain('3배 팔려요')
    expect(s.evidence).toBe('최근 4주 평균')
  })

  test('최근 7일 미입력 3일 이상 → missing_input (입력이 적은 계정에도 열린다)', () => {
    const entries = [1, 2, 3, 10, 20].map(i => ({ sale_date: back(i), revenue: 200000 }))
    const s = computeOperatingSignal({ entries, now: NOW })
    expect(s.signal_key).toBe('missing_input')
    expect(s.headline).toContain('4일치 매출이 비어 있어요')
    expect(s.evidence).toBe('입력한 주만 비교가 돼요')
  })

  test('임대차 만료 90일 이내 → lease_end_90 ("양도 시세" 문구 없음)', () => {
    // 최근 7일 결측 없음(missing_input 회피) + 입력 주 3주(매출 신호 게이트 미달)
    const week = Array.from({ length: 7 }, (_, i) => ({ sale_date: back(i + 1), revenue: 200000 }))
    const s = computeOperatingSignal({
      entries: week, roleData: { lease_end_date: '2026-11' }, now: NOW,
    })
    expect(s.signal_key).toBe('lease_end_90')
    expect(s.headline).toMatch(/임대차 만료까지 \d+일 남았어요/)
    expect(s.evidence).toContain('갱신 요구는')
    expect(s.cta_key).toBe('transfer_intro')
    expect(JSON.stringify(s)).not.toContain('시세')
    // 90일 넘게 남으면 침묵
    expect(computeOperatingSignal({ entries: week, roleData: { lease_end_date: '2027-06' }, now: NOW }))
      .toBeNull()
  })

  test('신호 없음 → null (빈 카드 금지)', () => {
    const entries = Array.from({ length: 56 }, (_, i) => ({ sale_date: back(i + 1), revenue: 300000 }))
    expect(computeOperatingSignal({ entries, now: NOW })).toBeNull()
  })
})

test.describe('신호 룰 유닛 — 양도인 / 문의 주제', () => {
  test('키워드 분류: 권리금·매출·시설·기타', () => {
    expect(classifyInquiry('권리금 얼마에 조정 가능한가요?')).toBe('transfer_fee')
    expect(classifyInquiry('월매출이 어느 정도 나오나요')).toBe('sales')
    expect(classifyInquiry('주방 설비는 그대로 두고 가시나요')).toBe('facility')
    expect(classifyInquiry('안녕하세요')).toBe('etc')
  })

  test('문의 5건 중 권리금 3건 → inquiry_topic "권리금" + E1 1단계 CTA', () => {
    const inquiries = [
      { text: '권리금 조정 가능한가요?' }, { text: '권리금이 좀 비싼 것 같아요' },
      { text: '바닥권리만 받으시나요?' }, { text: '주방 설비 상태 궁금해요' },
      { text: '안녕하세요' },
    ]
    const s = computeSellerSignal({ inquiries })
    expect(s.signal_key).toBe('inquiry_topic')
    expect(s.headline).toBe('최근 2주 문의 5건, 권리금 질문이 제일 많았어요')
    expect(s.evidence).toContain('권리금 정보를 매물에 적어두면')
    expect(s.cta_payload.step).toBe('/e1/1')
    expect(JSON.stringify(s)).not.toContain('가게') // 어휘 규칙
  })

  test('문의 3건 미만·최빈 40% 미만·방문/기타 최빈 → 신호 없음', () => {
    expect(computeSellerSignal({ inquiries: [{ text: '권리금?' }, { text: '권리금?' }] })).toBeNull()
    const spread = [{ text: '권리금?' }, { text: '월세는?' }, { text: '주방 설비?' }, { text: '직원 몇 명?' }, { text: '위치가 어디?' }]
    expect(computeSellerSignal({ inquiries: spread })).toBeNull() // 최빈 20%
    const visits = [{ text: '언제 보러 가요?' }, { text: '방문 가능한가요' }, { text: '실사 하고 싶어요' }]
    expect(computeSellerSignal({ inquiries: visits })).toBeNull() // 매물에 적을 정보 아님
  })

  test('기타는 최빈 계산에서 제외된다', () => {
    const t = topInquiryTopic(['안녕하세요', '문의드려요', '권리금 얼마인가요', '권리금 조정되나요'])
    expect(t.key).toBe('transfer_fee')
    expect(t.total).toBe(2) // 기타 2건 제외
  })
})

test.describe('주 경계 유틸', () => {
  test('KST 월요일 시작 — 일요일 밤·월요일 새벽이 다른 주', () => {
    expect(weekStartOf(new Date('2026-09-05T03:00:00Z'))).toBe('2026-08-31') // 토 → 그 주 월
    expect(weekStartOf(new Date('2026-09-06T14:00:00Z'))).toBe('2026-08-31') // 일 23시 KST
    expect(weekStartOf(new Date('2026-09-06T15:00:00Z'))).toBe('2026-09-07') // 월 00시 KST
  })
})

// ── UI ───────────────────────────────────────────────────────
const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const CARD = (over = {}) => ({
  id: 'ol-1', signal_key: 'weekday_drop3',
  headline: '화요일 매출이 3주째 내려가고 있어요',
  evidence: '300,000원 → 100,000원',
  cta_key: 'sales_input', cta_payload: {}, dismissed_at: null, ...over,
})

async function setupUi(page, { role = 'operating', card = null, listing = null } = {}) {
  await mockGemini(page)
  await mockMarketData(page)
  await page.route(`${SUPABASE}/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }))
  const patches = []
  await page.route(`${SUPABASE}/weekly_one_liners*`, r => {
    if (r.request().method() === 'PATCH') {
      patches.push(JSON.parse(r.request().postData() || '{}'))
      return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    // maybeSingle — 객체 또는 빈 배열
    const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
    if (!card) return r.fulfill({ status: single ? 406 : 200, contentType: 'application/json', body: single ? '{}' : '[]' })
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? card : [card]) })
  })
  if (listing) {
    await page.route(`${SUPABASE}/listings*`, r => {
      const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? listing : [listing]) })
    })
  }
  await page.addInitScript(c => {
    localStorage.setItem('modu_device_id', 'ol-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: c, name: '김한줄', roleData: { [c]: { region: '서울', bizLabel: '카페·커피전문점' } } }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: `p_${c}`, category: c, name: '김한줄', active: true }]))
  }, role)
  return { patches }
}

const SELLER_LISTING = {
  id: 'sl-1', device_id: 'ol-dev', status: 'published', shop_name: '한줄 카페',
  address: '서울 마포구 서교동 1-1', deposit: '1000', monthly_rent: '100', transfer_fee: '2000',
  transfer_type: 'full', area: '33', category_main: '카페·베이커리', category_sub: '카페·커피전문점',
  published_at: '2026-08-25T00:00:00Z', created_at: '2026-08-25T00:00:00Z',
  image_urls: [], interior_image_urls: [], ai_draft: {}, review_choices: {}, edited_texts: {}, item_visibility: {},
}

test('사장님 홈: 한 줄 카드 표시 시 "오늘의 한 마디" 숨김', async ({ page }) => {
  await setupUi(page, { role: 'operating', card: CARD() })
  await page.goto('/a7/operating')

  await expect(page.getByTestId('one-liner-card')).toBeVisible()
  await expect(page.getByTestId('one-liner-headline')).toHaveText('화요일 매출이 3주째 내려가고 있어요')
  await expect(page.getByTestId('one-liner-evidence')).toHaveText('300,000원 → 100,000원')
  await expect(page.getByTestId('one-liner-cta')).toHaveText('이번 주 매출 입력')
  await expect(page.getByText('오늘의 한 마디')).toHaveCount(0) // 동시 표시 금지
})

test('사장님 홈: 신호 없으면 카드 없이 "오늘의 한 마디"만', async ({ page }) => {
  await setupUi(page, { role: 'operating', card: null })
  await page.goto('/a7/operating')
  await expect(page.getByText('오늘의 한 마디')).toBeVisible()
  await expect(page.getByTestId('one-liner-card')).toHaveCount(0)
})

test('CTA [이번 주 매출 입력] → 매출 입력 시트가 열린다', async ({ page }) => {
  await setupUi(page, { role: 'operating', card: CARD() })
  await page.goto('/a7/operating')
  await page.getByTestId('one-liner-cta').click()
  await expect(page.getByTestId('sales-entry-sheet')).toBeVisible()
})

test('CTA [메모 남기기] → 입력 시트의 메모 칸이 포커스', async ({ page }) => {
  await setupUi(page, { role: 'operating', card: CARD({ signal_key: 'month_drop20', cta_key: 'sales_memo', headline: '이번 달이 지난달보다 30% 적어요' }) })
  await page.goto('/a7/operating')
  await expect(page.getByTestId('one-liner-cta')).toHaveText('메모 남기기')
  await page.getByTestId('one-liner-cta').click()
  await expect(page.getByTestId('sales-memo-input')).toBeFocused()
})

test('X → 같은 주 미표시 + dismissed_at 기록 + 한 마디 복귀', async ({ page }) => {
  const { patches } = await setupUi(page, { role: 'operating', card: CARD() })
  await page.goto('/a7/operating')
  await page.getByTestId('one-liner-dismiss').click()

  await expect(page.getByTestId('one-liner-card')).toHaveCount(0)
  await expect(page.getByText('오늘의 한 마디')).toBeVisible()
  expect(patches[0].dismissed_at).toBeTruthy()
})

test('양도인 홈: 문의 주제 카드가 동향 카드 위에 + CTA는 E1 해당 단계 수정 진입', async ({ page }) => {
  await setupUi(page, {
    role: 'seller', listing: SELLER_LISTING,
    card: CARD({
      signal_key: 'inquiry_topic', headline: '최근 2주 문의 5건, 권리금 질문이 제일 많았어요',
      evidence: '권리금 정보를 매물에 적어두면 문의가 줄고 계약이 빨라져요',
      cta_key: 'edit_listing', cta_payload: { topic: 'transfer_fee', label: '권리금', step: '/e1/1' },
    }),
  })
  await page.goto('/a7/seller')

  await expect(page.getByTestId('one-liner-card')).toBeVisible()
  await expect(page.getByTestId('one-liner-cta')).toHaveText('매물에 권리금 추가')
  await expect(page.getByText('오늘의 한 마디')).toHaveCount(0)

  await page.getByTestId('one-liner-cta').click()
  await expect(page).toHaveURL('/e1/1?edit=sl-1')
})

test('양도인 홈: 신호 없으면 한 마디만 (동향 카드 자리 무영향)', async ({ page }) => {
  await setupUi(page, { role: 'seller', listing: SELLER_LISTING, card: null })
  await page.goto('/a7/seller')
  await expect(page.getByTestId('one-liner-card')).toHaveCount(0)
  await expect(page.getByText('오늘의 한 마디')).toBeVisible()
})
