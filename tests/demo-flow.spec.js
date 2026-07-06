/**
 * 투자자 데모 6분 동선 E2E (5막, mock 기반)
 *
 * 1막: 스플래시 → 카테고리(창업준비) 선택 → A3 → A4 → 추천 피드 도달
 * 2막: "충실한 매물" 뱃지 매물 탭 → E2 상세 (뱃지·AI 검수·실거래 카드)
 * 3막: DM 문의 → 대화방 진입 → 메시지 전송 (sender_name = 닉네임)
 * 4막: /a7/seller → 안읽음 점 → 인박스(닉네임 표시) → 스레드(읽음 처리)
 *      → A7 복귀(점 해제·완성도 80%) → 완성도 카드 탭 → ?edit= 1단계 값 복원
 * 5막: 커뮤니티 Q&A → 글 카드의 카테고리 색점 + 라벨
 *
 * 각 막 종료마다 콘솔 에러(console.error + pageerror) 0건 단언.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, mockDailyContents, mockMarketNews } from './helpers.js'

const SUPABASE_LISTINGS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/listings*'
const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'
const SUPABASE_MESSAGES = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/messages*'
const SUPABASE_POSTS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/community_posts*'
const SUPABASE_COMMENTS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/community_comments*'

const MY_DEVICE = 'demo-device'
const SELLER_DEVICE = 'demo-seller-device'
const NICKNAME = '데모 김모두'

// 완성도 85점(주소20+상호10+면적5+보증·월세15+권리금10+방식5+사진12+증빙8)
// → "충실한 매물" + "AI 검수 완료" 뱃지 대상
const DEMO_LISTING = {
  id: 'de300000-1111-2222-3333-444444444444',
  shop_name: '데모 신뢰 카페',
  address: '서울 마포구 서교동 7-7 1층',
  floor: '1',
  area: '33',
  deposit: '3000',
  monthly_rent: '200',
  transfer_fee: '2500',
  transfer_type: 'full',
  ai_draft: { description: '데모용 검수 완료 설명문입니다.', facility: null, salesAnalysis: null },
  review_choices: { description: 'keep', location: 'keep', facility: 'keep' },
  edited_texts: {},
  image_urls: ['https://example.com/p1.jpg'],
  sales_proof: true,
  facilities: [],
  status: 'published',
  device_id: SELLER_DEVICE,
  created_at: new Date().toISOString(),
}

// 4막에서 내(양도자 시점)가 보유한 매물 — 동일하게 80점, 수정 모드 복원 대상
const MY_LISTING = {
  ...DEMO_LISTING,
  id: 'de300000-aaaa-bbbb-cccc-dddddddddddd',
  shop_name: '데모 내 분식집',
  address: '서울 마포구 연남동 12-3 1층',
  ai_draft: { description: '내 매물 저장 설명문입니다.', facility: null, salesAnalysis: null },
  photos_added: false,
  sales_proof: false,
  device_id: MY_DEVICE,
}

const DEMO_POST = {
  id: 'de300000-9999-8888-7777-666666666666',
  title: '데모 질문: 권리금 협상 팁 있을까요?',
  body: '데모용 질문 본문입니다.',
  author_device_id: 'someone-device',
  author_nickname: '데모 김질문',
  category: 'seller',
  created_at: new Date().toISOString(),
}

const SHOP_INPUT = 'input[placeholder="예) 고양이 카페 서교점"]'

/** listings — 단건(id=eq.)·내 매물(device_id=eq.)·목록을 URL로 분기 */
function mockListings(page) {
  return page.route(SUPABASE_LISTINGS, async route => {
    const url = route.request().url()
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.includes(`id=eq.${DEMO_LISTING.id}`)) return json(DEMO_LISTING)
    if (url.includes(`id=eq.${MY_LISTING.id}`)) return json(MY_LISTING)
    if (url.includes(`device_id=eq.${MY_DEVICE}`)) return json([MY_LISTING])
    return json([DEMO_LISTING]) // 피드·탐색 목록
  })
}

/** conversations — stateful: POST로 생성, PATCH를 병합, GET은 상태 반환 */
function mockConversations(page) {
  const store = { conv: null, insertBody: null, patches: [] }
  page.route(SUPABASE_CONVERSATIONS, async route => {
    const req = route.request()
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (req.method() === 'POST') {
      store.insertBody = JSON.parse(req.postData())
      store.conv = {
        id: 'conv-demo',
        listing_id: DEMO_LISTING.id,
        listing_name: DEMO_LISTING.shop_name,
        listing_emoji: '🏠',
        sender_id: MY_DEVICE,
        receiver_id: SELLER_DEVICE,
        sender_name: '문의자',
        receiver_name: '양도자',
        last_message: null,
        last_message_at: null,
        sender_last_read_at: null,
        receiver_last_read_at: null,
        contact_status: null,
        created_at: new Date().toISOString(),
        ...store.insertBody,
      }
      return json(store.conv, 201)
    }
    if (req.method() === 'PATCH') {
      const body = JSON.parse(req.postData())
      store.patches.push(body)
      Object.assign(store.conv, body)
      return route.fulfill({ status: 204, body: '' })
    }
    if (req.url().includes('sender_id=eq.')) return json([]) // E2 중복 대화 조회 — 새 대화
    if (req.url().includes('id=eq.')) return json(store.conv) // D4Chat 단건
    return json(store.conv ? [store.conv] : []) // 인박스·탭 점 배지
  })
  return store
}

/** messages — stateful: POST 누적, GET은 누적분 반환 */
function mockMessages(page) {
  const msgs = []
  page.route(SUPABASE_MESSAGES, async route => {
    const req = route.request()
    if (req.method() === 'POST') {
      const row = { id: `m-${msgs.length + 1}`, created_at: new Date().toISOString(), ...JSON.parse(req.postData()) }
      msgs.push(row)
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(row) })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(msgs) })
    }
  })
  return msgs
}

test.describe('투자자 데모 동선', () => {
  test('5막 연속 시나리오 — 각 막 콘솔 에러 0건', async ({ page }) => {
    test.setTimeout(120_000)

    // 콘솔 에러 수집 — 막 종료마다 flush하며 0건 단언
    const consoleErrors = []
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    page.on('pageerror', err => consoleErrors.push(String(err)))
    const flushConsole = (act) => expect(consoleErrors.splice(0), `${act} 콘솔 에러`).toEqual([])

    await mockGemini(page)
    await mockMarketData(page)
    await mockListings(page)
    await mockDailyContents(page)
    await mockMarketNews(page)
    const convStore = mockConversations(page)
    mockMessages(page)
    await page.route(SUPABASE_POSTS, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([DEMO_POST]) }))
    await page.route(SUPABASE_COMMENTS, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.addInitScript(id => localStorage.setItem('modu_device_id', id), MY_DEVICE)

    // ── 1막: 스플래시 → 창업준비 온보딩 → 추천 피드 ──────────
    await page.goto('/')
    await expect(page).toHaveURL(/\/a2/, { timeout: 5_000 }) // 스플래시 2초 후 자동 이동

    await page.getByText('창업을 준비하고 있어요').click()
    await page.getByRole('button', { name: '다음' }).click()
    await expect(page).toHaveURL('/a3/startup')

    await page.getByText('둘 다 보고 싶어요').click()
    await page.getByRole('button', { name: '서울', exact: true }).click()
    await page.getByRole('button', { name: '아직 모름', exact: true }).click()
    await page.getByRole('button', { name: /다음 — 추천 피드 보러 가기/ }).click()
    await expect(page).toHaveURL('/a4')

    await page.getByRole('button', { name: '네이버로 시작하기' }).click()
    await expect(page).toHaveURL('/a7/startup')
    await expect(page.getByText(DEMO_LISTING.shop_name)).toBeVisible() // 피드에 mock 매물 렌더
    flushConsole('1막')

    // 데모 계정 닉네임 세팅 (온보딩엔 이름 입력이 없음 — /my/name 저장과 동일한 저장소)
    await page.evaluate(name => {
      const p = JSON.parse(localStorage.getItem('modu_user_profile') || '{}')
      localStorage.setItem('modu_user_profile', JSON.stringify({ ...p, name }))
    }, NICKNAME)

    // ── 2막: 피드 카드 탭 → E2 상세 신뢰 신호 ─────────────────
    await page.getByText(DEMO_LISTING.shop_name).click()
    await expect(page).toHaveURL(`/e2/${DEMO_LISTING.id}`)
    await expect(page.getByText('충실한 매물')).toBeVisible()
    await expect(page.getByText('AI 검수 완료')).toBeVisible()
    await expect(page.getByText('주변 실거래 참고')).toBeVisible() // 실거래 카드 (mock 성공 응답)
    flushConsole('2막')

    // ── 3막: DM 문의 → 대화방 → 메시지 전송 ──────────────────
    await page.getByRole('button', { name: 'DM으로 문의하기' }).click()
    await page.getByRole('button', { name: 'DM 대화 시작하기' }).click()
    await expect(page).toHaveURL(/\/d4\/chat\/conv-demo/)
    await expect(page.getByText(DEMO_LISTING.shop_name)).toBeVisible() // 채팅 헤더 매물명

    expect(convStore.insertBody, 'conversations insert 미호출').not.toBeNull()
    expect(convStore.insertBody.sender_name, 'sender_name에 닉네임 미반영').toBe(NICKNAME)

    await page.getByPlaceholder('메시지 입력...').fill('데모 메시지입니다')
    await page.getByPlaceholder('메시지 입력...').press('Enter')
    await expect(page.getByText('데모 메시지입니다')).toBeVisible()

    // 전송 완료 → last_message 갱신 뒤 내 쪽 열람 처리까지 대기 (4막 안읽음 시뮬레이션 전제)
    await expect.poll(() => {
      const li = convStore.patches.findIndex(b => 'last_message' in b)
      return li >= 0 && convStore.patches.slice(li + 1).some(b => b.sender_last_read_at)
    }, { message: '전송 후 내 쪽 열람 PATCH가 오지 않음' }).toBe(true)
    flushConsole('3막')

    // ── 4막: 양도자 대시보드 → 안읽음 → 인박스 → 스레드 → 복귀 → 수정 진입 ──
    // 상대 답장 시뮬레이션 — 마지막 메시지가 내 열람 시각보다 뒤가 되도록 상태 갱신
    convStore.conv.last_message = '네, 주말 방문 가능해요!'
    convStore.conv.last_message_at = new Date().toISOString()

    await page.goto('/a7/seller')
    await expect(page.getByTestId('tab-unread-dot')).toBeVisible() // 메시지 탭 안읽음 점

    await page.getByRole('button', { name: '메시지' }).click()
    await expect(page).toHaveURL(/\/d4\/inbox/)
    await expect(page.getByText(NICKNAME)).toBeVisible() // 인박스 행에 닉네임
    await expect(page.getByTestId('unread-dot')).toHaveCount(1)

    const readPatch = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().includes('/conversations'))
    await page.getByText(NICKNAME).click()
    await expect(page).toHaveURL(/\/d4\/chat\/conv-demo/)
    await readPatch // 스레드 진입 = 읽음 처리

    await page.goto('/a7/seller')
    await expect(page.getByText('내 매물 완성도')).toBeVisible()
    await expect(page.getByText('77%')).toBeVisible() // MY_LISTING 완성도 (사진+12, 증빙 없음)
    await expect(page.getByTestId('tab-unread-dot')).toHaveCount(0) // 읽음 후 점 해제

    await page.getByRole('button', { name: /내 매물 완성도/ }).click()
    await expect(page).toHaveURL(`/e1/1?edit=${MY_LISTING.id}`)
    await expect(page.locator(SHOP_INPUT)).toHaveValue(MY_LISTING.shop_name) // 1단계 값 복원
    await expect(page.getByText(MY_LISTING.address)).toBeVisible()
    await expect(page.getByText('매물 수정')).toBeVisible()
    flushConsole('4막')

    // ── 5막: 커뮤니티 Q&A — 카테고리 색점 + 라벨 ─────────────
    await page.goto('/community')
    await page.getByRole('button', { name: '질문·답변' }).click()

    await expect(page.getByText(DEMO_POST.title)).toBeVisible()
    await expect(page.getByRole('button', { name: /양도자 데모 김질문/ })).toBeVisible() // 라벨+닉네임
    const dot = page.getByTestId('category-dot')
    await expect(dot).toHaveCount(1)
    await expect(dot).toHaveCSS('background-color', 'rgb(26, 77, 143)') // 양도자 네이비
    flushConsole('5막')
  })
})
