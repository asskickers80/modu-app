/**
 * 매물 마감 흐름 (ORDER-close-flow-peer-stats-v1 항목 2)
 * 유닛: 재등록 시기 계산(한 달 뒤·명절 지나고)
 * UI: 팔렸어요→sold+설문+프리미엄 / 기존 프리미엄 연장 / 쉴게요→hidden+알림 /
 *     계속 운영→deleted / 그냥 삭제→질문 없음 / 스킵→설문만 남음 / 소유주 어휘 / roleData 구조
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { computeRepostRemindAt, nextHolidayRepost } from '../src/lib/closeFlowRules.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const MY_DEVICE = 'close-flow-dev'
const DAY = 864e5

const LISTING = {
  id: 'cf-1', device_id: MY_DEVICE, status: 'published',
  shop_name: '마감 카페', shop_name_public: true,
  address: '서울 마포구 서교동 1-1', deposit: '3000', monthly_rent: '200',
  transfer_fee: '3000', transfer_type: 'full', area: '33',
  category_main: '카페·베이커리', category_sub: '카페·커피전문점',
  ai_draft: {}, review_choices: {}, edited_texts: {}, item_visibility: {},
  image_urls: [], interior_image_urls: [], facilities: [],
  owner_nickname: '주인장', created_at: '2026-07-19T00:00:00Z',
}

// ── 유닛: 재등록 시기 ────────────────────────────────────────
test.describe('재등록 시기 계산 유닛', () => {
  test('한 달 뒤 = +30일 / 명절 지나고 = 다음 설·추석 +3일 / 직접 지정', () => {
    const now = new Date('2026-09-05T00:00:00Z')
    expect(computeRepostRemindAt('month', now)).toBe(new Date(now.getTime() + 30 * DAY).toISOString())
    // 2026-09-05 기준 다음 명절 = 추석(2026-09-25) → +3일 = 9/28
    const h = nextHolidayRepost(now)
    expect(h.name).toBe('추석')
    expect(h.date.toISOString().slice(0, 10)).toBe('2026-09-28')
    expect(computeRepostRemindAt('holiday', now)).toBe(h.date.toISOString())
    const custom = new Date('2026-12-01T00:00:00Z')
    expect(computeRepostRemindAt(custom, now)).toBe(custom.toISOString())
    expect(computeRepostRemindAt(null, now)).toBeNull()
  })

  test('추석이 지난 시점이면 다음 명절은 설날', () => {
    const h = nextHolidayRepost(new Date('2026-10-01T00:00:00Z'))
    expect(h.name).toBe('설날')
    expect(h.date.toISOString().slice(0, 10)).toBe('2027-02-10') // 2027-02-07 +3일
  })
})

// ── UI 셋업 ──────────────────────────────────────────────────
async function setup(page, { listing = LISTING, category = 'seller', premium = [] } = {}) {
  await mockGemini(page)
  await mockMarketData(page)
  await page.addInitScript(({ id, cat }) => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ name: '김대표', category: cat, roleData: { [cat]: { region: '서울' } } }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_main', category: cat, name: '김대표', active: true }]))
  }, { id: MY_DEVICE, cat: category })

  const patches = []
  await page.route(`${SUPABASE}/listings*`, async route => {
    const req = route.request()
    if (req.method() === 'PATCH') {
      patches.push(JSON.parse(req.postData() ?? '{}'))
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    // E2(.single)는 객체, A7 홈(목록)은 배열 — Accept 헤더로 구분
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
    const row = { ...listing, status: patches.length ? patches[patches.length - 1].status ?? listing.status : listing.status }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? row : [row]) })
  })

  const surveyPosts = [], surveyPatches = []
  await page.route(`${SUPABASE}/listing_close_surveys*`, async route => {
    const req = route.request()
    if (req.method() === 'POST') {
      surveyPosts.push(JSON.parse(req.postData() ?? '{}'))
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'srv-1' }) })
    }
    if (req.method() === 'PATCH') {
      surveyPatches.push(JSON.parse(req.postData() ?? '{}'))
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  const premiumPosts = []
  await page.route(`${SUPABASE}/premium_grants*`, async route => {
    const req = route.request()
    if (req.method() === 'POST') {
      premiumPosts.push(JSON.parse(req.postData() ?? '{}'))
      return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(premium) })
  })

  // 이벤트 로깅은 기록만 — 실패해도 흐름 무영향이므로 성공 응답으로 소음 제거
  await page.route(`${SUPABASE}/events*`, r => r.fulfill({ status: 201, body: '' }))

  return { patches, surveyPosts, surveyPatches, premiumPosts }
}

const readRaw = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('modu_user_profile') || '{}'))

test('팔렸어요 → sold 전환 + 설문 저장 + 프리미엄 30일 + 다음 계획', async ({ page }) => {
  const { patches, surveyPosts, surveyPatches, premiumPosts } = await setup(page)
  await page.goto('/e2/cf-1')
  await page.getByTestId('owner-delete').click()
  await expect(page.getByText('매물을 내리시는군요.')).toBeVisible()

  await page.getByTestId('close-reason-sold').click()
  await expect(page.getByText('축하드려요 🎉')).toBeVisible()
  expect(patches[0].status).toBe('sold')
  expect(surveyPosts[0].close_reason).toBe('sold')
  expect(surveyPosts[0].listing_id).toBe('cf-1')
  // 1단계에는 보상 언급 없음 — 2단계에서만
  await expect(page.getByText('두 가지만 알려주시면 프리미엄 1개월을 드릴게요.')).toBeVisible()

  await page.getByText('최종 권리금은 어땠어요?').isVisible() // 양도인 어휘: 권리금
  await page.getByTestId('price-band-adj_10').click()
  await page.getByTestId('deal-channel-modu').click()
  await page.getByTestId('sold-survey-done').click()

  await expect(page.getByText('프리미엄 1개월이 적용됐어요')).toBeVisible()
  expect(surveyPatches[0].final_price_band).toBe('adj_10')
  expect(surveyPatches[0].deal_channel).toBe('modu')
  expect(premiumPosts[0].days).toBe(30)
  expect(premiumPosts[0].reason).toBe('sold_survey')
  const expires = new Date(premiumPosts[0].expires_at).getTime()
  expect(Math.abs(expires - (Date.now() + 30 * DAY))).toBeLessThan(DAY) // 오늘+30일 (하루 오차 내)

  // 3단계 — 다음 계획
  await expect(page.getByText('다음은 어떻게 하실 계획이세요?')).toBeVisible()
  await page.getByTestId('plan-unknown').click()
  await expect(page.getByText('고생 많으셨어요.')).toBeVisible()
  expect(surveyPatches[1].next_plan).toBe('unknown')
  await page.getByTestId('close-flow-done').click()
  await expect(page).toHaveURL('/a7/seller')
})

test('기존 프리미엄 유효분이 있으면 만료일에 +30일 연장', async ({ page }) => {
  const currentExpiry = new Date(Date.now() + 10 * DAY)
  const { premiumPosts } = await setup(page, { premium: [{ expires_at: currentExpiry.toISOString() }] })
  await page.goto('/e2/cf-1')
  await page.getByTestId('owner-delete').click()
  await page.getByTestId('close-reason-sold').click()
  await page.getByTestId('price-band-same').click()
  await page.getByTestId('deal-channel-broker').click()
  await page.getByTestId('sold-survey-done').click()
  await expect(page.getByText('프리미엄 1개월이 적용됐어요')).toBeVisible()

  const expires = new Date(premiumPosts[0].expires_at).getTime()
  expect(Math.abs(expires - (currentExpiry.getTime() + 30 * DAY))).toBeLessThan(60e3) // 기존 만료 +30일
})

test('잠깐 쉴게요 → hidden + 재등록 알림·동향 토글이 roleData.seller에 저장', async ({ page }) => {
  const { patches, surveyPosts } = await setup(page)
  await page.goto('/e2/cf-1')
  await page.getByTestId('owner-delete').click()
  await page.getByTestId('close-reason-rest').click()

  await expect(page.getByText('언제쯤 다시 올려드릴까요?')).toBeVisible()
  expect(patches[0].status).toBe('hidden')
  expect(surveyPosts[0].close_reason).toBe('rest')

  await page.getByTestId('repost-month').click()
  await page.getByTestId('alert-peer-toggle').click() // "쉬는 동안 비슷한 매물 동향" — 양도인 어휘
  await expect(page.getByText('쉬는 동안 비슷한 매물 동향 알려드릴까요?')).toBeVisible()
  await page.getByTestId('rest-save').click()
  await expect(page.getByText('고생 많으셨어요.')).toBeVisible()

  const raw = await readRaw(page)
  expect(raw.roleData.seller.alert_peer_trend).toBe(true)
  const remind = new Date(raw.roleData.seller.repost_remind_at).getTime()
  expect(Math.abs(remind - (Date.now() + 30 * DAY))).toBeLessThan(DAY)
})

test('계속 운영 → deleted + 사유 기록, 건너뛰면 알림 설정은 남지 않는다', async ({ page }) => {
  const { patches, surveyPosts } = await setup(page)
  await page.goto('/e2/cf-1')
  await page.getByTestId('owner-delete').click()
  await page.getByTestId('close-reason-keep').click()

  await expect(page.getByTestId('keep-skip')).toBeVisible() // 단계 전환(저장 완료) 대기
  expect(patches[0].status).toBe('deleted')
  expect(surveyPosts[0].close_reason).toBe('keep')

  await page.getByTestId('keep-skip').click()
  await expect(page.getByText('고생 많으셨어요.')).toBeVisible()
  await page.getByTestId('close-flow-done').click()
  await expect(page).toHaveURL('/a7/seller')

  const raw = await readRaw(page)
  expect(raw.roleData.seller.alert_my_value).toBeUndefined()
  expect(raw.roleData.seller.lease_end_date).toBeUndefined()
})

test('그냥 삭제할게요 → 질문 없이 기존 확인 다이얼로그 → deleted, 설문 없음', async ({ page }) => {
  const { patches, surveyPosts } = await setup(page)
  await page.goto('/e2/cf-1')
  await page.getByTestId('owner-delete').click()
  await page.getByTestId('close-plain-delete').click()

  await expect(page.getByTestId('delete-confirm')).toBeVisible()
  expect(patches.length).toBe(0) // 확인 전 무변경
  await page.getByTestId('delete-confirm-yes').click()
  await expect(page).toHaveURL('/a7/seller') // 삭제 후 홈 복귀 (토스트는 이동과 겹쳐 URL로 검증)
  expect(patches[0].status).toBe('deleted')
  expect(surveyPosts.length).toBe(0) // 질문(설문) 없이 종료
})

test('설문·계획 전부 건너뛰기 → 1단계 사유만 남고 프리미엄·알림 없음', async ({ page }) => {
  const { surveyPosts, surveyPatches, premiumPosts } = await setup(page)
  await page.goto('/e2/cf-1')
  await page.getByTestId('owner-delete').click()
  await page.getByTestId('close-reason-sold').click()
  await page.getByTestId('sold-survey-skip').click()
  await page.getByTestId('plan-skip').click()
  await expect(page.getByText('고생 많으셨어요.')).toBeVisible()

  expect(surveyPosts[0].close_reason).toBe('sold') // 사유는 남는다
  expect(surveyPatches.length).toBe(0)             // 설문·계획 미기록
  expect(premiumPosts.length).toBe(0)              // 스킵 = 보상 없음
  const raw = await readRaw(page)
  expect(raw.roleData.seller.repost_remind_at).toBeUndefined()
})

test('팔렸어요 → 다른 점포 운영 중 → 사장님 프로필 생성 + roleData.operating.lease_end_date', async ({ page }) => {
  await setup(page)
  await page.goto('/e2/cf-1')
  await page.getByTestId('owner-delete').click()
  await page.getByTestId('close-reason-sold').click()
  await page.getByTestId('sold-survey-skip').click()
  await page.getByTestId('plan-operating').click()

  await expect(page.getByText('그 점포 임대차 만료가')).toBeVisible()
  await page.getByTestId('lease-month-input').fill('2027-03')
  await page.getByTestId('plan-lease-save').click()
  await expect(page.getByText('고생 많으셨어요.')).toBeVisible()

  const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_profiles') || '[]'))
  expect(profiles.some(p => p.category === 'operating')).toBe(true)
  const raw = await readRaw(page)
  expect(raw.roleData.operating.lease_end_date).toBe('2027-03') // 축별 분리 구조 준수 — flat 아님
  expect(raw.lease_end_date).toBeUndefined()
})

test('팔렸어요 → 다른 매물 찾기 → 창업 프로필 생성 + 희망 조건 저장', async ({ page }) => {
  await setup(page)
  await page.goto('/e2/cf-1')
  await page.getByTestId('owner-delete').click()
  await page.getByTestId('close-reason-sold').click()
  await page.getByTestId('sold-survey-skip').click()
  await page.getByTestId('plan-find').click()

  await expect(page.getByText('어느 동네, 어떤 업종이면')).toBeVisible()
  await page.getByRole('button', { name: '서울', exact: true }).click()
  await page.getByRole('button', { name: '마포구' }).click()
  await page.getByRole('button', { name: '카페·베이커리' }).click()
  await page.getByTestId('plan-find-save').click()
  await expect(page.getByText('고생 많으셨어요.')).toBeVisible()

  const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('modu_profiles') || '[]'))
  expect(profiles.some(p => p.category === 'startup')).toBe(true)
  const raw = await readRaw(page)
  expect(raw.wish_region).toBe('서울')
  expect(raw.wish_region_sub).toBe('마포구')
  expect(raw.wish_industry_main).toBe('카페·베이커리')
})

// ── 소유주(임대인) 어휘 ─────────────────────────────────────
const L_LISTING = {
  id: 'cfl-1', device_id: MY_DEVICE, status: 'published', deal_type: 'lease',
  building_name: '마감 상가', address: '서울 마포구 서교동 2-2',
  deposit: '5000', monthly_rent: '300', area: '50',
  image_urls: [], recommended_biz: [], created_at: '2026-07-19T00:00:00Z',
}

test('소유주(임대): "상가를 내리시는군요" + 임차인 구했어요 + 계속 보유 + 시세 어휘', async ({ page }) => {
  const { patches, surveyPosts } = await setup(page, { listing: L_LISTING, category: 'landlord' })
  await page.goto('/e2l/cfl-1')
  await page.getByTestId('owner-delete').click()

  await expect(page.getByText('상가를 내리시는군요.')).toBeVisible()
  await expect(page.getByTestId('close-reason-sold')).toContainText('임차인 구했어요') // deal_type=lease
  await expect(page.getByTestId('close-reason-keep')).toContainText('계속 보유하기로 했어요')

  await page.getByTestId('close-reason-rest').click()
  await expect(page.getByText('쉬는 동안 이 상권 시세 알려드릴까요?')).toBeVisible() // 소유주 어휘: 시세
  expect(patches[0].status).toBe('hidden')
  expect(surveyPosts[0].close_reason).toBe('rest')
})

test('소유주(매각): "팔렸어요" + 최종 매매가 어휘', async ({ page }) => {
  await setup(page, { listing: { ...L_LISTING, deal_type: 'sale' }, category: 'landlord' })
  await page.goto('/e2l/cfl-1')
  await page.getByTestId('owner-delete').click()

  await expect(page.getByTestId('close-reason-sold')).toContainText('팔렸어요')
  await page.getByTestId('close-reason-sold').click()
  await expect(page.getByText('최종 매매가는 어땠어요?')).toBeVisible()
})
