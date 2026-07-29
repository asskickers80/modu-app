/**
 * 빈껍데기 실구현 (ORDER-e1p-shell-eliminate-v2 2부)
 * a. E1p 사진 실업로드 → 저장 → E2L 표시  b. E1p 상권 실데이터 카드
 * c. E2L 내리기/삭제(확인 다이얼로그·소프트)  + D4 수신자 수락 실구현
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, agreeListingTerms } from './helpers.js'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const LISTINGS = `${SUPABASE}/rest/v1/listings*`
const CONVERSATIONS = `${SUPABASE}/rest/v1/conversations*`
const MESSAGES = `${SUPABASE}/rest/v1/messages*`
const STORAGE = `${SUPABASE}/storage/v1/object/**`
const DEV = 'shell-dev'

const ROW = {
  id: 'sh-1', listing_type: 'landlord', deal_type: 'lease', status: 'published',
  address: '서울 마포구 서교동 400', floor: '1층', area: '40', deposit: '3000', monthly_rent: '200',
  ai_draft: {}, review_choices: {}, edited_texts: {}, image_urls: [], device_id: DEV,
}
function seed(page, dev = DEV) {
  return page.addInitScript(id => {
    localStorage.setItem('modu_device_id', id)
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'landlord' }))
  }, dev)
}

test.describe('a. E1p 사진 실업로드', () => {
  test('도면 업로드 → Storage 호출 + 저장 payload에 interior/exterior/image_urls', async ({ page }) => {
    await mockGemini(page)
    let inserted = null
    // Storage 업로드 mock — 실호출 금지
    await page.route(STORAGE, r => r.request().method() === 'POST'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'k' }) })
      : r.continue())
    await page.route(LISTINGS, async r => r.request().method() === 'POST'
      ? (inserted = JSON.parse(r.request().postData()), r.fulfill({ status: 201, contentType: 'application/json', body: '[{"id":"p"}]' }))
      : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click()
    await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
    const s2 = page.getByRole('button', { name: /다음 — 검수·공개 선택/ })
    await expect(async () => { await s2.click(); await expect(page).toHaveURL(/\/e1p\/3/, { timeout: 1000 }) }).toPass({ timeout: 15000 })
    await page.getByRole('button', { name: /다음 — 도면·서류 추가/ }).click()

    // 실 파일 선택 → 업로드 (도면 그리드)
    await page.getByTestId('floorplan-grid').locator('input[type=file]').setInputFiles({
      name: 'plan.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-image-bytes'),
    })
    await expect(page.getByTestId('floorplan-grid').locator('img')).toHaveCount(1) // 업로드 반영

    await page.getByRole('button', { name: '다음 — 완성도 확인' }).click()
    await expect(page.getByText('도면 사진').first()).toBeVisible()
    await agreeListingTerms(page)
    await page.getByRole('button', { name: '상가 공개하기' }).click()
    await page.getByRole('button', { name: /휴대폰 본인인증/ }).click()
    await page.getByRole('button', { name: '대시보드로 이동' }).click({ timeout: 5000 })
    await expect(page).toHaveURL(/\/a7\/landlord/)

    const row = Array.isArray(inserted) ? inserted[0] : inserted
    expect(row.interior_image_urls.length).toBe(1) // 도면 → interior 재사용
    expect(row.image_urls.length).toBe(1)          // 합본
  })

  test('E2L: 저장된 사진이 히어로에 표시', async ({ page }) => {
    await seed(page)
    await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...ROW, image_urls: ['https://x.test/p1.jpg'] }) }))
    await page.goto('/e2l/sh-1')
    await expect(page.locator('img[src="https://x.test/p1.jpg"]').first()).toBeVisible()
  })
})

test.describe('b. E1p 상권 실데이터', () => {
  test('실거래 mock → Step2 결과에 주변 실거래 카드', async ({ page }) => {
    await mockGemini(page)
    await mockMarketData(page) // 국토부 XML mock (성공 2건)
    await page.goto('/e1p/1')
    await page.getByRole('button', { name: '예시 ✦' }).click()
    await page.getByRole('button', { name: /다음 — 모두가 초안 작성/ }).click()
    await expect(page.getByTestId('e1p-market-card')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('e1p-market-card')).toContainText('주변 실거래 참고')
    // 로딩 체크리스트: 위치·실거래는 실호출(예정 아님), 등기·시세는 (예정) 유지 확인은 소스 테스트로 커버
  })
})

test.describe('c. E2L 소유자 내리기·삭제', () => {
  test('내리기 → PATCH hidden, 다시 공개 버튼으로 전환', async ({ page }) => {
    await seed(page)
    let patched = null
    await page.route(LISTINGS, async r => {
      if (r.request().method() === 'PATCH') {
        patched = JSON.parse(r.request().postData() || '{}')
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROW) })
    })
    await page.goto('/e2l/sh-1')
    await page.getByTestId('owner-status-hide').click()
    await expect(page.getByText('상가를 내렸어요', { exact: false })).toBeVisible()
    expect(patched.status).toBe('hidden')
    await expect(page.getByTestId('owner-status-publish')).toBeVisible() // 즉시 전환
  })

  test('삭제: 확인 다이얼로그 필수 → 확인 시 PATCH deleted + 홈 이동', async ({ page }) => {
    await seed(page)
    let patched = null
    await page.route(LISTINGS, async r => {
      if (r.request().method() === 'PATCH') {
        patched = JSON.parse(r.request().postData() || '{}')
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: r.request().url().includes('sh-1') && !r.request().url().includes('listing_type') ? JSON.stringify(ROW) : '[]' })
    })
    await page.route(CONVERSATIONS, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route(MESSAGES, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/e2l/sh-1')
    await page.getByTestId('owner-delete').click()
    await expect(page.getByTestId('delete-confirm')).toBeVisible() // 확인 없이는 진행 안 됨
    expect(patched).toBeNull()
    await page.getByTestId('delete-confirm-yes').click()
    await expect(page).toHaveURL(/\/a7\/landlord/)
    expect(patched.status).toBe('deleted') // 소프트 삭제
  })

  test('deleted 상가: 소유자에게도 상세 비노출', async ({ page }) => {
    await seed(page)
    await page.route(LISTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...ROW, status: 'deleted' }) }))
    await page.goto('/e2l/sh-1')
    await expect(page.getByText('상가를 찾을 수 없어요')).toBeVisible()
  })
})

test.describe('D4 연락처 교환 — 수신자 실 수락(더미 버튼 대체)', () => {
  const CONV = {
    id: 'cx-1', listing_id: 'l1', listing_name: '테스트 매물',
    sender_id: 'requester-dev', receiver_id: DEV, sender_name: '문의자', receiver_name: '양도인',
    contact_status: 'requested', contact_requester: 'requester-dev',
  }
  test('수신자: 수락 배너 노출 → 수락 시 accepted UPDATE + 시스템 메시지', async ({ page }) => {
    await seed(page) // 나 = receiver(DEV)
    let convPatch = null, sysMsg = null
    await page.route(CONVERSATIONS, async r => {
      if (r.request().method() === 'PATCH') {
        convPatch = JSON.parse(r.request().postData() || '{}')
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CONV) })
    })
    await page.route(MESSAGES, async r => {
      if (r.request().method() === 'POST') {
        const b = JSON.parse(r.request().postData() || '{}')
        if (b.type === 'contact_accepted') sysMsg = b
        return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'm1', ...b }) })
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/d4/chat/cx-1')
    await expect(page.getByText('상대방이 연락처 교환을 요청했어요')).toBeVisible()
    await expect(page.getByText('데모 버튼')).toHaveCount(0) // 더미 사망
    await page.getByTestId('contact-accept').click()
    await expect(page.getByText('연락처 교환 완료').first()).toBeVisible()
    await expect.poll(() => convPatch?.contact_status).toBe('accepted')
    await expect.poll(() => sysMsg).not.toBeNull() // 시스템 메시지 insert(비동기) 완료 대기
  })

  test('수신자: 거절 → 상태 초기화(재요청 가능)', async ({ page }) => {
    await seed(page)
    let convPatch = null
    await page.route(CONVERSATIONS, async r => {
      if (r.request().method() === 'PATCH') {
        convPatch = JSON.parse(r.request().postData() || '{}')
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CONV) })
    })
    await page.route(MESSAGES, async r => r.request().method() === 'POST'
      ? r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'm2' }) })
      : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/d4/chat/cx-1')
    await page.getByTestId('contact-decline').click()
    await expect(page.getByRole('button', { name: /연락처 교환 요청/ })).toBeVisible() // idle 복귀 → 재요청 가능
    expect(convPatch.contact_status).toBeNull()
  })

  test('요청자: 대기 배너에 더미 수락 버튼 없음', async ({ page }) => {
    await seed(page, 'requester-dev') // 나 = 요청자
    await page.route(CONVERSATIONS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CONV) }))
    await page.route(MESSAGES, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.goto('/d4/chat/cx-1')
    await expect(page.getByText('연락처 교환 요청 보냄')).toBeVisible()
    await expect(page.getByText('더미')).toHaveCount(0)
    await expect(page.getByText('데모 버튼')).toHaveCount(0)
  })
})
