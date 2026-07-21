/**
 * 사업자번호 진위확인 게이트 + 폐업 확인 카드 (ORDER-bizno-closure-check)
 *
 * ① 형식 검증 lib
 * ② 공개 게이트: 불일치 차단 / 장애 통과(완화안) / 정상 통과
 * ③ 홈 폐업 확인 카드 3택
 * ④ 방문자 쿼리에 business_number 미노출
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { normalizeBizno, formatBizno, isValidBiznoFormat } from '../src/lib/bizno.js'
import { gateResultFromStatus } from '../api/_ntsBusinessman.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const ME = 'bizno-device'

// 체크섬 통과 번호를 코드로 만든다 (테스트가 임의 번호에 흔들리지 않도록)
function makeValidBizno(prefix9) {
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5]
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(prefix9[i]) * w[i]
  sum += Math.floor((Number(prefix9[8]) * 5) / 10)
  const check = (10 - (sum % 10)) % 10
  return prefix9 + check
}
const GOOD_BIZNO = makeValidBizno('123456789')

// ─────────────────────────────────────────── ① lib
test.describe('사업자번호 형식', () => {
  test('normalize·format', () => {
    expect(normalizeBizno('123-45-67890')).toBe('1234567890')
    expect(formatBizno('1234567890')).toBe('123-45-67890')
  })

  test('체크섬으로 오타를 거른다', () => {
    expect(isValidBiznoFormat(GOOD_BIZNO)).toBe(true)
    expect(isValidBiznoFormat('1234567890'), '체크섬 불일치 번호').toBe(false)
    expect(isValidBiznoFormat('12345'), '자리수 부족').toBe(false)
    expect(isValidBiznoFormat('abcdefghij')).toBe(false)
  })
})

// ─────────────────────────────────────────── 배치 판정 코어 (폐업 감지 = code '03')
test.describe('국세청 상태 코드 판정', () => {
  test('폐업(03)·미등록은 차단, 계속(01)·휴업(02)은 통과', () => {
    expect(gateResultFromStatus({ registered: true, code: '01' })).toBe('verified')
    expect(gateResultFromStatus({ registered: true, code: '02' })).toBe('verified')
    expect(gateResultFromStatus({ registered: true, code: '03' }), '폐업').toBe('mismatch')
    expect(gateResultFromStatus({ registered: false, code: '' }), '미등록').toBe('mismatch')
    expect(gateResultFromStatus(null), '조회 안 됨').toBe('mismatch')
  })
})

// ─────────────────────────────────────────── ② 공개 게이트
test.describe('공개 게이트 — 진위확인', () => {
  const draft = {
    address: '서울 마포구 서교동 332-4', detailAddress: '1층',
    shopName: '게이트 테스트', shopNamePublic: true,
    deposit: '3000', monthlyRent: '200', transferFee: '3000', transferType: 'full',
    area: '33', bizType: '카페·커피전문점', categoryMain: '카페·베이커리', categorySub: '카페·커피전문점',
    aiDraft: { description: '정상 소개글입니다.' }, editedTexts: {}, itemVisibility: {}, reviewChoices: {},
    interiorPhotos: [{ url: 'a' }, { url: 'b' }, { url: 'c' }], exteriorPhotos: [],
    facilities: [], salesProof: false,
  }

  async function setup(page, verifyResult) {
    await mockGemini(page)
    await mockMarketData(page)
    await page.addInitScript(([id, d]) => {
      localStorage.setItem('modu_device_id', id)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
      sessionStorage.setItem('modu_e1_draft', JSON.stringify(d))
    }, [ME, draft])
    // 진위확인 서버 함수 mock
    if (verifyResult === '__down__') {
      await page.route('**/api/verify-bizno', r => r.fulfill({ status: 502, body: 'bad gateway' }))
    } else {
      await page.route('**/api/verify-bizno', r =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: verifyResult }) }))
    }
  }

  async function openGate(page) {
    await page.goto('/e1/4')
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await page.getByTestId('bizno-input').fill(GOOD_BIZNO)
    await page.getByTestId('bizno-submit').click()
  }

  test('불일치("등록되지 않은 번호") → 공개 차단', async ({ page }) => {
    let writes = 0
    await setup(page, 'mismatch')
    await page.route(`${SUPABASE}/listings*`, r => {
      if (r.request().method() !== 'GET') writes++
      r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await openGate(page)
    await expect(page.getByTestId('bizno-error')).toContainText(/등록되지 않았거나 폐업/)
    await page.waitForTimeout(300)
    expect(writes, '불일치인데 저장됨').toBe(0)
  })

  test('API 장애(5xx) → 미검증 표식 + 공개 허용 (완화안)', async ({ page }) => {
    let inserted = null
    await setup(page, '__down__')
    await page.route(`${SUPABASE}/listings*`, r => {
      if (r.request().method() === 'POST') inserted = JSON.parse(r.request().postData() ?? '{}')
      r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await openGate(page)
    await expect(page.getByText('매물이 공개됐어요!')).toBeVisible()
    expect(inserted.business_number).toBe(GOOD_BIZNO)
    expect(inserted.bizno_verified_at, '장애인데 검증 시각이 찍힘').toBeNull()
  })

  test('정상(verified) → 공개 + 검증 시각 기록', async ({ page }) => {
    let inserted = null
    await setup(page, 'verified')
    await page.route(`${SUPABASE}/listings*`, r => {
      if (r.request().method() === 'POST') inserted = JSON.parse(r.request().postData() ?? '{}')
      r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await openGate(page)
    await expect(page.getByText('매물이 공개됐어요!')).toBeVisible()
    expect(inserted.business_number).toBe(GOOD_BIZNO)
    expect(inserted.bizno_verified_at, '검증됐는데 시각이 없음').not.toBeNull()
  })

  test('형식 오류 → 조회 없이 즉시 차단', async ({ page }) => {
    let verifyCalls = 0
    await setup(page, 'verified')
    await page.route('**/api/verify-bizno', r => { verifyCalls++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: 'verified' }) }) })
    await page.route(`${SUPABASE}/listings*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/e1/4')
    await page.getByRole('button', { name: '매물 공개하기' }).click()
    await page.getByTestId('bizno-input').fill('12345')
    await page.getByTestId('bizno-submit').click()

    await expect(page.getByTestId('bizno-error')).toContainText(/10자리/)
    expect(verifyCalls, '형식 오류인데 국세청 조회함').toBe(0)
  })
})

// ─────────────────────────────────────────── ③ 폐업 확인 카드
test.describe('홈 폐업 확인 카드 3택', () => {
  const CLOSED = {
    id: 'l1', device_id: ME, status: 'hidden',
    shop_name: '폐업 테스트', shop_name_public: true,
    address: '서울 마포구 서교동 332-4', transfer_fee: '3000', transfer_type: 'full',
    category_main: '카페·베이커리', category_sub: '카페·커피전문점', biz_type: '카페·커피전문점',
    interior_image_urls: [], image_urls: [], review_choices: {}, ai_draft: {}, edited_texts: {},
    item_visibility: {}, facilities: [], created_at: '2026-07-19T00:00:00Z',
    closure_detected_at: '2026-07-21T00:00:00Z', closure_prev_status: 'published', closure_resolved_at: null,
  }

  async function setup(page, onPatch) {
    await mockGemini(page)
    await mockMarketData(page)
    await page.addInitScript(id => {
      localStorage.setItem('modu_device_id', id)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
    }, ME)
    await page.route(`${SUPABASE}/conversations*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route(`${SUPABASE}/messages*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route(`${SUPABASE}/listings*`, r => {
      if (r.request().method() === 'PATCH') { onPatch?.(JSON.parse(r.request().postData() ?? '{}')); return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) }
      const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? CLOSED : [CLOSED]) })
    })
  }

  test('폐업 감지 매물 소유자 홈 진입 시 카드가 뜬다', async ({ page }) => {
    await setup(page)
    await page.goto('/a7/seller')
    await expect(page.getByTestId('closure-prompt')).toBeVisible()
    await expect(page.getByText('사업자 폐업이 확인됐어요')).toBeVisible()
  })

  test('① 양도 완료 → completed + resolved 기록', async ({ page }) => {
    let patch = null
    await setup(page, p => { patch = p })
    await page.goto('/a7/seller')
    await page.getByTestId('closure-complete').click()

    await expect(page.getByText('거래 완료로 정리했어요')).toBeVisible()
    expect(patch.status).toBe('completed')
    expect(patch.closure_resolved_at).toBeTruthy()
  })

  test('② 시설·집기 계속 → published + 양도방식 갱신', async ({ page }) => {
    let patch = null
    await setup(page, p => { patch = p })
    await page.goto('/a7/seller')
    await page.getByTestId('closure-continue').click()

    await expect(page.getByText('시설·집기 양도로 다시 공개했어요')).toBeVisible()
    expect(patch.status).toBe('published')
    expect(patch.transfer_type).toBe('bare')
    expect(patch.closure_resolved_at).toBeTruthy()
  })

  test('③ 내리기 → hidden 유지 + resolved 기록', async ({ page }) => {
    let patch = null
    await setup(page, p => { patch = p })
    await page.goto('/a7/seller')
    await page.getByTestId('closure-keep-hidden').click()

    await expect(page.getByText('매물을 내린 상태로 뒀어요')).toBeVisible()
    expect(patch.status).toBe('hidden')
    expect(patch.closure_resolved_at).toBeTruthy()
  })

  test('닫기 → 쓰기 없이 이번 접속만 숨김', async ({ page }) => {
    let writes = 0
    await setup(page, () => { writes++ })
    await page.goto('/a7/seller')
    await page.getByTestId('closure-close').click()
    await expect(page.getByTestId('closure-prompt')).toHaveCount(0)
    await page.waitForTimeout(200)
    expect(writes).toBe(0)
  })

  test('이미 resolved된 매물은 카드가 안 뜬다', async ({ page }) => {
    await mockGemini(page); await mockMarketData(page)
    await page.addInitScript(id => {
      localStorage.setItem('modu_device_id', id)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', region: '서울' }))
    }, ME)
    await page.route(`${SUPABASE}/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route(`${SUPABASE}/listings*`, r => {
      const single = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
      const row = { ...CLOSED, closure_resolved_at: '2026-07-21T02:00:00Z' }
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? row : [row]) })
    })
    await page.goto('/a7/seller')
    await expect(page.getByTestId('my-listing-card')).toBeVisible()
    await expect(page.getByTestId('closure-prompt')).toHaveCount(0)
  })
})

// ─────────────────────────────────────────── ④ 방문자 노출 금지
test.describe('사업자번호 비공개', () => {
  test('탐색 피드 쿼리가 business_number를 요청하지 않는다', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page)
    let selectUrl = null
    await page.route(`${SUPABASE}/listings*`, r => {
      const url = decodeURIComponent(r.request().url())
      // 피드 쿼리는 status=in.(published,negotiating) 로 식별 (device_id 필터 없는 전체 조회)
      if (r.request().method() === 'GET' && url.includes('status=in') && !url.includes('device_id=eq')) selectUrl = url
      r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.goto('/explore')
    await page.waitForTimeout(400)

    expect(selectUrl).toBeTruthy()
    expect(selectUrl, '탐색 쿼리에 select=* (비공개 컬럼 딸려옴)').not.toContain('select=*')
    expect(selectUrl).not.toContain('business_number')
  })
})
