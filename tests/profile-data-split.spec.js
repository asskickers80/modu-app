/**
 * 축별 사업체 정보 분리 + 승계 확인 (ORDER-profile-data-split-v1)
 * - 대상 3축(seller·operating·landlord)만 roleData 분리, 한 축 변경이 다른 축 무영향
 * - 프로필 추가 시 "같은 가게인가요?" 확인: 같음=업종·지역 승계·질문 스킵 / 다름=전체 질문
 * - 레거시 flat 데이터 정상 표시(마이그레이션 SQL 전 폴백) / 대상 외 축 미노출
 */
import { test, expect } from './fixtures.js'
import { seedSession } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'

const SELLER_ROLE = {
  category_main: '카페·베이커리', category_sub: '카페·커피전문점', ksic_code: '56221',
  bizType: '카페·커피전문점', region: '서울', region_sub: '마포구', transfer_priority: 'fast',
}

async function setup(page, { profile, profiles } = {}) {
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.route(`${SUPABASE}/auth/v1/user*`, r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 'split-user', aud: 'authenticated', user_metadata: {} }),
  }))
  await seedSession(page, { id: 'split-user' })
  await page.addInitScript(([p, ps]) => {
    localStorage.setItem('modu_device_id', 'split-dev')
    if (p) localStorage.setItem('modu_user_profile', JSON.stringify(p))
    if (ps) localStorage.setItem('modu_profiles', JSON.stringify(ps))
  }, [profile ?? null, profiles ?? null])
}

const sellerOwner = () => ({
  profile: { name: '김분리', category: 'seller', roleData: { seller: SELLER_ROLE } },
  profiles: [{ id: 'p_seller', category: 'seller', name: '김분리', active: true }],
})

const readRaw = page => page.evaluate(() => JSON.parse(localStorage.getItem('modu_user_profile') || '{}'))

test('승계 같음: 업종·지역 질문 스킵 + seller 값이 operating roleData로 복사', async ({ page }) => {
  await setup(page, sellerOwner())
  await page.goto('/a3/operating')

  // A3 질문 전에 확인 — 질문·다음 버튼은 아직 없음
  await expect(page.getByTestId('same-business-prompt')).toBeVisible()
  await expect(page.getByText('카페·커피전문점 · 서울 마포구')).toBeVisible() // 후보 라벨(업종·지역)
  await expect(page.getByText('어떤 장사를 하고 계세요?')).toHaveCount(0)

  await page.getByTestId('same-business-seller').click()
  // 업종·지역은 승계 요약만, 매출 질문만 진행
  await expect(page.getByTestId('carryover-industry')).toContainText('카페·커피전문점')
  await expect(page.getByTestId('carryover-region')).toContainText('서울 마포구')
  await expect(page.getByText('어떤 장사를 하고 계세요?')).toHaveCount(0)
  await page.getByText('수동 입력').click()
  await page.getByRole('button', { name: '다음 — 내 대시보드 만들기' }).click()

  await expect(page).toHaveURL('/a7/operating')
  const raw = await readRaw(page)
  expect(raw.roleData.operating.category_sub).toBe('카페·커피전문점') // 승계 복사
  expect(raw.roleData.operating.region_sub).toBe('마포구')
  expect(raw.roleData.operating.sales).toBe('manual')
  expect(raw.roleData.seller).toEqual(SELLER_ROLE) // 원본 축 무변경
})

test('승계 다름: 전체 질문 + 축별 독립 저장 (operating 변경이 seller 무영향)', async ({ page }) => {
  await setup(page, sellerOwner())
  await page.goto('/a3/operating')
  await page.getByTestId('same-business-no').click()

  // 전체 질문 노출 — 다른 업종·지역 입력
  await page.getByRole('button', { name: '요식업' }).click()
  await page.getByRole('button', { name: '치킨', exact: true }).click()
  await page.getByRole('button', { name: '부산', exact: true }).click()
  await page.getByText('아직 안 해요').click()
  await page.getByRole('button', { name: '다음 — 내 대시보드 만들기' }).click()
  await expect(page).toHaveURL('/a7/operating')

  const raw = await readRaw(page)
  expect(raw.roleData.operating.region).toBe('부산')
  expect(raw.roleData.operating.category_sub).toBe('치킨')
  expect(raw.roleData.seller).toEqual(SELLER_ROLE) // 서울 카페 그대로 — 독립 저장

  // 운영중 홈은 부산·치킨, 양도인 홈으로 전환하면 자기 축 값
  await expect(page.getByText('부산 · 치킨')).toBeVisible()
  await page.getByRole('button', { name: '양도인' }).click()
  await expect(page).toHaveURL('/a7/seller')
  await expect(page.getByText(/서울/).first()).toBeVisible()
})

test('레거시 flat 프로필: 마이그레이션 전에도 정상 표시 + 저장 시 활성 축으로 이관', async ({ page }) => {
  // SQL 실행 전 상태 재현 — roleData 없는 flat (활성 seller)
  await setup(page, {
    profile: { name: '김레거시', category: 'seller', ...SELLER_ROLE },
    profiles: [{ id: 'p_seller', category: 'seller', name: '김레거시', active: true }],
  })
  await page.goto('/a7/seller')
  await expect(page.getByRole('button', { name: '양도인' })).toHaveAttribute('data-active', 'true') // 정상 진입

  // 다른 축 추가(다른 가게) 후에도 seller 값이 flat에서 roleData.seller로 이관·보존
  await page.goto('/a3/operating')
  await page.getByTestId('same-business-no').click()
  await page.getByRole('button', { name: '요식업' }).click()
  await page.getByRole('button', { name: '부산', exact: true }).click()
  await page.getByText('아직 안 해요').click()
  await page.getByRole('button', { name: '다음 — 내 대시보드 만들기' }).click()
  await expect(page).toHaveURL('/a7/operating')

  const raw = await readRaw(page)
  expect(raw.roleData.seller.region).toBe('서울')   // 레거시 flat → seller 귀속 (활성 축 기준)
  expect(raw.roleData.operating.region).toBe('부산')
  expect(raw.region).toBeUndefined()                // flat 잔존 제거
})

test('대상 외 축(창업준비)에는 승계 확인 미노출', async ({ page }) => {
  await setup(page, sellerOwner())
  await page.goto('/a3/startup')
  await expect(page.getByText('둘 다 보고 싶어요')).toBeVisible() // 질문 즉시 표시
  await expect(page.getByTestId('same-business-prompt')).toHaveCount(0)
})

test('보유 2축(양도인·사장님) → 임대인 추가: 후보 2개, 선택한 축의 지역만 승계', async ({ page }) => {
  await setup(page, {
    profile: {
      name: '김둘', category: 'seller',
      roleData: { seller: SELLER_ROLE, operating: { category_sub: '치킨', bizType: '치킨', region: '부산', sales: 'none' } },
    },
    profiles: [
      { id: 'p_seller', category: 'seller', name: '김둘', active: true },
      { id: 'p_operating', category: 'operating', name: '김둘', active: false },
    ],
  })
  await page.goto('/a3/landlord')
  await expect(page.getByTestId('same-business-seller')).toBeVisible()
  await expect(page.getByTestId('same-business-operating')).toBeVisible()
  await page.getByTestId('same-business-operating').click() // 사장님 가게와 같은 상가
  await expect(page.getByTestId('carryover-region')).toContainText('부산')
  await expect(page.getByText('상가가 어디 있나요?')).toHaveCount(0) // 지역 질문 스킵
  // 나머지 질문은 그대로
  await page.getByText('임차인 찾는 중').click()
  await page.getByRole('button', { name: /^1개/ }).click()
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(page).toHaveURL('/a7/landlord')
  const raw = await readRaw(page)
  expect(raw.roleData.landlord.region).toBe('부산')
  expect(raw.roleData.landlord.status).toBe('vacant')
  expect(raw.roleData.seller).toEqual(SELLER_ROLE) // 타 축 무변경
})
