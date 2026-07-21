/**
 * 소개글 플레이스홀더 저장 차단 (긴급 버그)
 *
 * 실사례: ai_draft.description 이 "(주소)에 위치한 독립 (업종) 점포입니다…" 인
 * published 매물 1건. 매물 데이터가 비어 있는 채로 초안 생성이 돌면
 * 프롬프트의 '(미입력)'을 모델이 빈칸 문장으로 되돌려준다.
 *
 * 생성 경로는 e1-draft-edit.spec.js가 막고, 여기서는 저장 시점 차단을 고정한다.
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, passPublishGate } from './helpers.js'
import { hasPlaceholder, findPlaceholderBlocks } from '../src/lib/draftQuality.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const ME = 'ph-device'

// 실제로 DB에 저장돼 있던 문장 그대로
const REAL_BAD = '본 매물은 (주소)에 위치한 독립 (업종) 점포입니다. 총 (층수) 중 (해당 층수)에 자리하고 있으며, 전용면적 (전용면적)으로 효율적인 공간 활용이 가능합니다. 임대 조건은 보증금 (보증금), 월세 (월세)이며, 관리비는 없는 것이 특징입니다.'
const GOOD = '강원 원주 무실로 1층에 자리한 왓더버거 가맹점입니다. 전용면적 66㎡로 운영 효율이 좋습니다.'

test.describe('플레이스홀더 검출', () => {
  test('실제 저장돼 있던 문장을 잡아낸다', () => {
    expect(hasPlaceholder(REAL_BAD)).toBe(true)
  })

  test('정상 문장은 통과시킨다', () => {
    expect(hasPlaceholder(GOOD)).toBe(false)
  })

  test('값 이름이 아닌 괄호는 통과시킨다 (과잉 차단 방지)', () => {
    expect(hasPlaceholder('시세는 참고용입니다. (참고용)')).toBe(false)
    expect(hasPlaceholder('왓더버거(가맹점) 매물입니다.')).toBe(false)
    expect(hasPlaceholder('보증금 3,000만원(협의 가능)')).toBe(false)
  })

  test('블록 단위로 어디가 문제인지 돌려준다', () => {
    const bad = findPlaceholderBlocks(
      { description: REAL_BAD, facility: '(업종) 운영에 적합합니다.', salesAnalysis: null },
      {},
    )
    expect(bad.sort()).toEqual(['description', 'facility'])
  })

  test('사용자가 고쳐 쓴 문장이 있으면 그 문장으로 판정한다', () => {
    // 초안은 빈칸이지만 사용자가 직접 고쳤으면 통과
    expect(findPlaceholderBlocks({ description: REAL_BAD }, { description: GOOD })).toEqual([])
    // 반대로 초안은 멀쩡한데 고친 문장이 빈칸이면 차단
    expect(findPlaceholderBlocks({ description: GOOD }, { description: REAL_BAD }))
      .toEqual(['description'])
  })

  test('빈 값·null에 오작동하지 않는다', () => {
    expect(findPlaceholderBlocks(null, null)).toEqual([])
    expect(findPlaceholderBlocks({}, {})).toEqual([])
    expect(hasPlaceholder(null)).toBe(false)
  })
})

test.describe('저장 차단 — E1 5단계', () => {
  const draft = (aiDraft, editedTexts = {}) => ({
    address: '강원특별자치도 원주시 무실로 1', detailAddress: '1층',
    shopName: '왓더버거 원주일산점', shopNamePublic: true,
    deposit: '3000', monthlyRent: '200', transferFee: '13000', transferType: 'full',
    area: '66', bizType: '외식 > 패스트푸드',
    categoryMain: '요식업', categorySub: '피자·버거·샌드위치',
    isFranchise: true, franchiseBrandName: '왓더버거',
    aiDraft, editedTexts, itemVisibility: {}, reviewChoices: {},
    interiorPhotos: [{ url: 'a' }, { url: 'b' }, { url: 'c' }], exteriorPhotos: [],
    facilities: [], salesProof: false,
  })

  async function setup(page, d) {
    await mockGemini(page)
    await mockMarketData(page)
    await page.addInitScript(([id, dd]) => {
      localStorage.setItem('modu_device_id', id)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '강원' }))
      sessionStorage.setItem('modu_e1_draft', JSON.stringify(dd))
    }, [ME, d])
  }

  test('플레이스홀더가 있으면 저장되지 않고 안내가 뜬다', async ({ page }) => {
    let writes = 0
    await setup(page, draft({ description: REAL_BAD, facility: '(업종) 운영에 적합합니다.' }))
    await page.route(`${SUPABASE}/listings*`, async route => {
      if (route.request().method() !== 'GET') writes++
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/e1/4')
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await passPublishGate(page)

    await expect(page.getByText(/채워지지 않은 빈칸/)).toBeVisible()
    await expect(page.getByText(/매물 설명문/)).toBeVisible()
    expect(writes, `차단돼야 하는데 쓰기 ${writes}회 발생`).toBe(0)
  })

  test('정상 소개글이면 저장이 진행된다 (과잉 차단 아님)', async ({ page }) => {
    let inserted = null
    await setup(page, draft({ description: GOOD, facility: '집기 상태 양호합니다.' }))
    await page.route(`${SUPABASE}/listings*`, async route => {
      const req = route.request()
      if (req.method() === 'POST') inserted = JSON.parse(req.postData() ?? '{}')
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/e1/4')
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await passPublishGate(page)

    await expect(page.getByText(/채워지지 않은 빈칸/)).toHaveCount(0)
    await expect.poll(() => inserted, { timeout: 10000 }).not.toBeNull()
    expect(inserted.ai_draft.description).toBe(GOOD)
  })
})
