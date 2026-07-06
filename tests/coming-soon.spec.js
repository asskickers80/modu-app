/**
 * 더미 수치 → "서비스 준비중" 전환 검증
 *
 * 실데이터 없는 항목에 가짜 숫자 금지 — 카드/섹션 프레임은 유지하고
 * 내부만 준비중 안내로 교체 (A7 매출·통계·새문의·정보 섹션, 마이 하위, 오픈채팅).
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketNews } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'

test.describe('서비스 준비중 전환', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page)
    await mockMarketNews(page)
    await page.route(SUPABASE_CONVERSATIONS, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  })

  test('A7: 더미 수치 부재 + 서비스 준비중 표시(매출·시장동향 포함 5곳)', async ({ page }) => {
    await page.route(SUPABASE_LISTINGS, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/a7/seller')
    await expect(page.getByText('이번 달 매출')).toBeVisible()

    // 옛 더미 수치·문구 부재
    await expect(page.getByText('2,840만원')).toHaveCount(0)
    await expect(page.getByText('새 문의 3건 도착')).toHaveCount(0)
    await expect(page.getByText('인근 카페 평균 권리금')).toHaveCount(0)
    await expect(page.getByText('빠른인테리어')).toHaveCount(0)
    await expect(page.getByText('권리금 협상, 이렇게 하면 유리해요')).toHaveCount(0)

    // 준비중 표시: 매출·새문의·시장동향·거래처·필독 5곳 + 통계 compact 3곳
    await expect(page.getByText('서비스 준비중')).toHaveCount(5)
    await expect(page.getByText('준비중', { exact: true })).toHaveCount(3)

    // 명시 2곳 스코프 단언: 매출 카드 / 시장동향 섹션
    await expect(page.locator('div.rounded-2xl.p-4', { hasText: '이번 달 매출' })
      .getByText('서비스 준비중')).toBeVisible()
    await expect(page.locator('section', { hasText: '동종 시장 동향' })
      .getByText('서비스 준비중')).toBeVisible()

    // 섹션 프레임 유지 (레이아웃 구멍 없음)
    await expect(page.getByText('🏢 거래처·지원 업체')).toBeVisible()
    await expect(page.getByText('📝 양도자 필독')).toBeVisible()
  })

  test('마이 하위 상세: 사업자·본인인증 더미 값 부재 + 준비중', async ({ page }) => {
    await page.goto('/my/business-cert')
    await expect(page.getByText('123-45-67890')).toHaveCount(0)
    await expect(page.getByText('홍대 고양이 카페')).toHaveCount(0)
    await expect(page.getByText('서비스 준비중')).toBeVisible()

    await page.goto('/my/identity')
    await expect(page.getByText('010-****-1234')).toHaveCount(0)
    await expect(page.getByText('카카오 본인인증')).toHaveCount(0)
    await expect(page.getByText('서비스 준비중')).toBeVisible()
  })

  test('A7 임대인: 더미 수치 부재 + 서비스 준비중 (양도자와 동일 패턴)', async ({ page }) => {
    await page.goto('/a7/landlord')
    await expect(page.getByText('보유 자산')).toBeVisible()

    // 옛 더미 수치·목록 부재
    await expect(page.getByText('서울 소형 상가 월세')).toHaveCount(0)
    await expect(page.getByText('모두공인중개')).toHaveCount(0)
    await expect(page.getByText('상가 임대차보호법 이렇게 바뀌었어요')).toHaveCount(0)
    await expect(page.getByText('서울 마포구 서교동 332-4')).toHaveCount(0) // 더미 자산 주소
    await expect(page.getByText('진지도 🔥🔥 높음')).toHaveCount(0)

    // 준비중: 자산현황·시세해석·자산별·시장동향·업체·필독 6곳 + compact(조회/관심/문의+임차/매수) 5곳
    await expect(page.getByText('서비스 준비중')).toHaveCount(6)
    await expect(page.getByText('준비중', { exact: true })).toHaveCount(5)

    // 실기능 유지: 코칭 고정 문구(Gemini 미호출) + 임차 문의 카드 → 실 인박스 이동
    await expect(page.getByText('첫 상가를 등록해보세요. 등록만 해도 절반은 시작이에요.')).toBeVisible()
    await page.getByText('임차 문의').click()
    await expect(page).toHaveURL('/d4/landlord/inbox')
  })

  test('A7 운영중: 더미 수치 부재 + 서비스 준비중 (세 번째 동일 패턴)', async ({ page }) => {
    await page.goto('/a7/operating')
    await expect(page.getByText('오늘 매출', { exact: true })).toBeVisible()

    // 옛 더미 수치·목록 부재
    await expect(page.getByText('324,000')).toHaveCount(0)
    await expect(page.getByText('내 매출 상위 43%')).toHaveCount(0)
    await expect(page.getByText('세금계산서 발행 기한 D-2')).toHaveCount(0)
    await expect(page.getByText('카페 매출 300만 돌파한 사장님 비결')).toHaveCount(0)
    await expect(page.getByText('세금계산서 발행 완벽 가이드')).toHaveCount(0)

    // 준비중: 매출·AI진단·할일·프로필·시장동향·업체·콘텐츠·가이드 8곳 + 통계 compact 3곳
    await expect(page.getByText('서비스 준비중')).toHaveCount(8)
    await expect(page.getByText('준비중', { exact: true })).toHaveCount(3)

    // 실기능 유지: 고정 코칭 문구(Gemini 미호출) + 매출 입력 버튼 → 실 입력 화면
    await expect(page.getByText('오늘 매출을 입력해보세요. 기록이 쌓이면 AI가 코칭해드려요.')).toBeVisible()
    await page.getByRole('button', { name: '입력', exact: true }).click()
    await expect(page).toHaveURL('/operating/sales-input')
  })

  test('A7 기업회원: 더미 수치 부재 + 서비스 준비중 (네 번째 동일 패턴)', async ({ page }) => {
    await page.goto('/a7/business')
    await expect(page.getByRole('banner').getByText('영업 상황판')).toBeVisible()

    // 옛 더미 수치·목록 부재
    await expect(page.getByText('마포 국밥집')).toHaveCount(0)
    await expect(page.getByText('뜨거운 리드')).toHaveCount(0)
    await expect(page.getByText('1240')).toHaveCount(0)
    await expect(page.getByText('페이지가 60% 완성됐어요')).toHaveCount(0)
    await expect(page.getByText('2024 상반기 인테리어 시장 분석 리포트')).toHaveCount(0)

    // 준비중: 알림·성과해석·놓친수요·노출페이지·동종비교·업계동향·노출팁 7곳
    //        + compact/헤더 '준비중' 7곳 (성과 4칸 + 다크 헤더 요약 3칸)
    await expect(page.getByText('서비스 준비중')).toHaveCount(7)
    await expect(page.getByText('준비중', { exact: true })).toHaveCount(7)

    // 실기능 유지: 고정 코칭 문구(Gemini 미호출) + 무료 플랜 카드 보존 + 인박스 이동
    await expect(page.getByText('노출 페이지를 다듬어보세요. 트리거를 채울수록 매칭이 정확해져요.')).toBeVisible()
    await expect(page.getByText('무료 플랜')).toBeVisible()
    await page.getByRole('button', { name: '메시지함 →' }).click()
    await expect(page).toHaveURL('/d4/business/inbox')
  })

  test('A7 그냥구경: 수치 더미 부재 + 매거진 판형 유지', async ({ page }) => {
    await page.goto('/a7/browsing')

    // 수치성 더미 부재 (조회수·공감·통계·인원·매물 수치)
    await expect(page.getByText('4.2만 회')).toHaveCount(0)
    await expect(page.getByText('공감 2,341')).toHaveCount(0)
    await expect(page.getByText('4,200만')).toHaveCount(0)
    await expect(page.getByText('847명')).toHaveCount(0)
    await expect(page.getByText('홍대입구 카페, 권리금 5,500만')).toHaveCount(0)
    await expect(page.getByText('LIVE')).toHaveCount(0)

    // 매거진 판형 유지 — 카드 7종의 배지·제목·이미지 영역 구조 존재
    await expect(page.getByText('🎬 인터뷰')).toBeVisible()
    await expect(page.getByText('사장님 인터뷰 — 콘텐츠 준비중')).toBeVisible()
    await expect(page.getByText('📊 인사이트')).toBeVisible()
    await expect(page.getByText('🔥 화제의 매물')).toBeVisible()
    await expect(page.getByText('📰 정책')).toBeVisible()

    // 가입 유도 실기능 유지
    await expect(page.getByText('가입하면 상세 정보를 볼 수 있어요')).toBeVisible()
  })

  test('창업 피드: Gemini 실패 폴백에 가짜 수치 없음', async ({ page }) => {
    // beforeEach의 mockGemini를 실패 응답으로 덮어씀 (나중 등록이 우선)
    await page.route('https://generativelanguage.googleapis.com/**', route =>
      route.fulfill({ status: 500, body: 'error' }))
    await page.route('https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.addInitScript(() => {
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'startup', startupMode: 'franchise', region: '서울' }))
    })

    await page.goto('/a7/startup')

    // 정직 폴백 표시 + 옛 가짜 수치 주장 부재
    await expect(page.getByText('트렌드 분석을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')).toBeVisible()
    await expect(page.getByText(/가맹 문의 32% 증가/)).toHaveCount(0)
    await expect(page.getByText(/8% 저렴한 조건/)).toHaveCount(0)
    await expect(page.getByText(/신규 매물 12건/)).toHaveCount(0)
  })

  test('커뮤니티 오픈채팅 탭: 더미 방 목록 부재 + 준비중', async ({ page }) => {
    await page.goto('/community') // 기본 탭 = 오픈채팅

    await expect(page.getByText('홍대 상권 양도자 모임')).toHaveCount(0)
    await expect(page.getByText('서울 자영업 AI 정보방')).toHaveCount(0)
    await expect(page.getByText('서비스 준비중')).toBeVisible()
  })
})
