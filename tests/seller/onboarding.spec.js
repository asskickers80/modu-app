import { test, expect } from '../fixtures.js'
import { mockGemini, runSellerOnboarding } from '../helpers.js'

test.describe('양도자 온보딩 (A1→A4→A7)', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
  })

  // ── A1 ────────────────────────────────────────────────────

  test('A1: 스플래시 — 2초 후 A2로 자동 이동', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/a2/, { timeout: 5_000 })
  })

  // ── A2 ────────────────────────────────────────────────────

  test('A2: 양도자 칩 선택 → 다음 활성화', async ({ page }) => {
    await page.goto('/a2')
    const next = page.getByRole('button', { name: '다음' })
    await expect(next).toBeDisabled()
    await page.getByText('매각 진행 중, 새로 들어오실 분 찾습니다!').click()
    await expect(next).toBeEnabled()
  })

  test('A2 → A3: 양도자 선택 후 다음 클릭', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('매각 진행 중, 새로 들어오실 분 찾습니다!').click()
    await page.getByRole('button', { name: '다음' }).click()
    await expect(page).toHaveURL('/a3/seller')
  })

  // ── A3 ────────────────────────────────────────────────────

  test('A3: Q1만 답변 → 다음 비활성', async ({ page }) => {
    await page.goto('/a3/seller', { state: { category: 'seller' } })
    await page.getByText('카페·베이커리').click()
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  test('A3 → A4: 가게 정보 3개 + 목적 답변 후 다음', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('매각 진행 중, 새로 들어오실 분 찾습니다!').click()
    await page.getByRole('button', { name: '다음' }).click()
    await page.getByText('카페·베이커리').click()
    await page.getByText('서울').click()
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled()
    await page.getByText('하루라도 빨리 정리하고 싶어요').click()
    // 3개 모두 답변 → 자동 접힘 + 요약 칩
    await expect(page.getByText('☑️ 카페·베이커리 · 서울 · 빨리 정리')).toBeVisible()
    await page.getByRole('button', { name: '다음' }).click()
    await expect(page).toHaveURL('/a4')
  })

  test('A3: 대분류 탭 → 소분류 드릴다운 선택 → 요약 칩에 소분류 반영', async ({ page }) => {
    await page.goto('/a3/seller')
    await page.getByText('요식업', { exact: true }).click()
    await expect(page.getByText('더 자세한 업종을 고를 수 있어요')).toBeVisible()
    await page.getByRole('button', { name: '치킨', exact: true }).click()
    // 지역도 동일 드릴다운 — 시/도 → 구 단위
    await page.getByText('서울', { exact: true }).click()
    await expect(page.getByText('더 자세한 지역을 고를 수 있어요')).toBeVisible()
    await page.getByRole('button', { name: '강남구', exact: true }).click()
    await page.getByText('시간이 걸려도 제값 받고 싶어요').click()
    await expect(page.getByText('☑️ 치킨 · 서울 강남구 · 제값 받기')).toBeVisible()
  })

  test('A2 다중 선택(B안): 대표 역할만 온보딩, 나머지는 pending 프로필 → 전환 시 질문 보완', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('매각 진행 중, 새로 들어오실 분 찾습니다!').click() // 양도자
    await page.getByText('현재 영업 중, 운영에 필요한 모든 것!').click()   // 운영중 (중복 선택)
    await page.getByRole('button', { name: '다음' }).click()
    await expect(page).toHaveURL('/a3/seller') // 우선순위 대표: 양도자
    // 대표 역할(양도자) 온보딩만 진행
    await page.getByText('카페·베이커리').click()
    await page.getByText('서울', { exact: true }).click()
    await page.getByText('하루라도 빨리 정리하고 싶어요').click()
    await page.getByRole('button', { name: '다음' }).click()
    await page.getByRole('button', { name: '회원가입' }).click()
    await page.getByRole('button', { name: '네이버로 시작하기' }).click()
    await expect(page).toHaveURL('/a7/seller')
    // 추가 선택했던 운영중이 프로필 칩으로 자동 등록됨
    const operatingChip = page.getByRole('button', { name: '사장님' })
    await expect(operatingChip).toBeVisible()
    // 칩 탭 → 지연 온보딩: 운영중 질문(보완 모드)으로 이동
    await operatingChip.click()
    await expect(page).toHaveURL(/\/a3\/operating\?complete=1/)
    // 중도 이탈하면 프로필 전환 안 됨 — 칩과 화면이 어긋나지 않아야 함 (회귀 방지)
    await page.goBack()
    await expect(page).toHaveURL('/a7/seller')
    await expect(page.getByRole('button', { name: '양도인' })).toBeVisible()
    await page.getByRole('button', { name: '사장님' }).click()
    await expect(page).toHaveURL(/\/a3\/operating\?complete=1/)
    // 질문 완료 → A4 없이 바로 운영중 대시보드 (이 시점에 전환 확정)
    await page.getByText('카페·디저트').click()
    await page.getByText('서울', { exact: true }).click()
    await page.getByText('수동 입력').click()
    await page.getByRole('button', { name: /다음/ }).click()
    await expect(page).toHaveURL('/a7/operating')
  })

  test('A7: 라우트-프로필 동기화 — 어긋난 상태로 진입해도 칩과 화면 일치', async ({ page }) => {
    // 활성 프로필은 운영중인데 양도자 화면으로 진입 (뒤로가기 제스처 등으로 생기는 불일치 재현)
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'operating', name: '테스터' }))
      localStorage.setItem('modu_profiles', JSON.stringify([
        { id: 'p1', category: 'seller', name: '테스터', active: false },
        { id: 'p2', category: 'operating', name: '테스터', active: true },
      ]))
    })
    await page.goto('/a7/seller')
    // 동기화 장치가 활성 프로필을 화면 카테고리(양도자)로 자동 교정해야 함
    await expect(page.getByRole('button', { name: '양도인' })).toHaveAttribute('data-active', 'true')
    await expect(page.getByRole('button', { name: '사장님' })).toHaveAttribute('data-active', 'false')
  })

  test('A2: 방문자는 다른 역할과 중복 선택 불가', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('현재 영업 중, 운영에 필요한 모든 것!').click() // 사장님 선택
    await page.getByText('둘러보고 싶어요, 구인·구직자도 모두 환영!').click() // 방문자 → 사장님 자동 해제
    await page.getByRole('button', { name: '다음' }).click()
    // 사장님이 남아 있었다면 /a3/operating으로 갔을 것 — 방문자 단독이므로 방문자 환영 화면으로
    await expect(page).toHaveURL('/a6/browsing')
  })

  test('방문자 환영: "가입 없이 둘러보기" → 비로그인으로 피드 입장', async ({ page }) => {
    // 방문자 홈(/a7/browsing)의 화제의 매물 조회 — 실 네트워크 차단
    await page.route('https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/a6/browsing')
    await page.getByTestId('browse-guest').click()
    await expect(page).toHaveURL('/a7/browsing')
  })

  test('방문자 환영: "회원가입" → 온보딩 없이 가입 화면 직행(역할 선택 미노출)', async ({ page }) => {
    await page.goto('/a6/browsing')
    await page.getByTestId('browse-signup').click()
    await expect(page).toHaveURL('/a4')
    // 역할(구름) 선택 화면이 아니라 가입 화면 — A2 헤드라인 부재
    await expect(page.getByText('당신은 누구인가요?')).toHaveCount(0)
  })

  test('A2: 기존 회원 로그인 지름길 → A4 로그인 모드', async ({ page }) => {
    await page.goto('/a2')
    await page.getByText('이미 모두 회원이세요?').click()
    await expect(page).toHaveURL(/\/a4\?mode=login/)
    await expect(page.getByText('로그인해 주세요')).toBeVisible()
    await expect(page.getByRole('button', { name: '카카오로 로그인' })).toBeVisible()
  })

  test('A3: 업종 직접 검색 — 동의어(통닭) → 대분류·소분류 자동 세팅', async ({ page }) => {
    await page.goto('/a3/seller')
    // 직접 검색은 대분류를 눌러 세부 선택 단계에 들어가야 노출
    await expect(page.getByText('업종 직접 검색')).not.toBeVisible()
    await page.getByText('주점', { exact: true }).click()
    await page.getByText('업종 직접 검색').click()
    await page.getByPlaceholder('업종을 입력해보세요 (예: 통닭, 헤어샵)').fill('통닭')
    await page.getByRole('button', { name: /^치킨 요식업$/ }).click()
    await page.getByText('서울', { exact: true }).click()
    await page.getByText('일단 시세만 알아보는 중이에요').click()
    await expect(page.getByText('☑️ 치킨 · 서울 · 시세 파악')).toBeVisible()
  })

  // ── A4 ────────────────────────────────────────────────────

  test('A4 → A7: 네이버 더미 로그인 → 양도자 대시보드', async ({ page }) => {
    await runSellerOnboarding(page)
    await expect(page).toHaveURL('/a7/seller')
    await expect(page.getByRole('button', { name: '양도인' })).toBeVisible()
  })
})
