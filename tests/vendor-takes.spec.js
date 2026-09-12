/**
 * 기업회원 '함께 일한 사장님 한마디' (ORDER 2026-09-12 파트 C5)
 * ① 초대 생성 → 링크 페이지 비회원 접근 가능, 계정 입력란 없음 ② 5명 응답 후 6번째 → 닫힘 안내 ③ 73시간 후 → 만료 안내
 * ④ 승인 4번째 → 막힘 ⑤ 프로필에 후기 칸·한마디 칸 순서와 고정 문안 2줄 ⑥ 유료 입점 계정도 MAX_APPROVED 3
 * ⑦ require_login_for_take=true → 링크 페이지가 로그인으로 리다이렉트 ⑧ 음성 31초 → 거부
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import { inviteState, canApprove, validateVoiceSec, takeGate, approvedOrdered, pendingList } from '../src/lib/vendorTakesRules.js'
import { TAKES } from '../config/vendorTakes.ts'
import { findCopyViolations } from '../scripts/lint-copy.mjs'
import { findPricingSortViolations } from '../scripts/lint-pricing.mjs'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const VENDOR = { id: 'v-1', device_id: 'vendor-dev', user_id: 'vendor-user', listing_type: 'business', status: 'published', shop_name: '서교 인테리어', biz_tagline: '테스트 업체', biz_tags: [], address: '서울 마포구 서교동 1' }
const H = (n) => new Date(Date.now() + n * 36e5).toISOString()
const INV = (over = {}) => ({ id: 'inv-1', vendor_user_id: 'vendor-user', vendor_id: 'v-1', token: 'tok-1', expires_at: H(72), max_responses: 5, response_count: 0, closed_at: null, created_at: new Date().toISOString(), ...over })
const T = (id, over = {}) => ({ id, invite_id: 'inv-1', vendor_user_id: 'vendor-user', display_name: `사장${id}`, business_type: '카페', chip: '인테리어', body: `한마디 ${id}`, voice_url: null, voice_sec: null, position: null, approved_at: null, removed_at: null, created_at: new Date(Date.now() - 36e5).toISOString(), ...over })

test.describe('룰 유닛', () => {
  test('②·③·④·⑧ 초대 상태(open/full/expired/closed)·승인 상한·음성 30초·게이트·정렬', () => {
    expect(inviteState(INV())).toBe('open')
    expect(inviteState(INV({ response_count: 5 }))).toBe('full')
    expect(inviteState(INV({ expires_at: H(-1) }))).toBe('expired')
    expect(inviteState(INV({ closed_at: new Date().toISOString() }))).toBe('closed')
    expect(inviteState(null)).toBe('closed')
    expect(TAKES.INVITE_HOURS).toBe(72); expect(TAKES.MAX_RESPONSES).toBe(5); expect(TAKES.MAX_APPROVED).toBe(3); expect(TAKES.MAX_PENDING).toBe(20); expect(TAKES.VOICE_SEC).toBe(30)
    expect(canApprove(2)).toBe(true); expect(canApprove(3)).toBe(false)
    expect(validateVoiceSec(30)).toBe(true); expect(validateVoiceSec(31)).toBe(false); expect(validateVoiceSec(0)).toBe(false)
    expect(TAKES.require_login_for_take).toBe(false)
    expect(takeGate(TAKES, null)).toBe('ok'); expect(takeGate({ ...TAKES, require_login_for_take: true }, null)).toBe('login'); expect(takeGate({ ...TAKES, require_login_for_take: true }, { id: 'u' })).toBe('ok')
    const rows = [T('a', { approved_at: 'x', position: 2 }), T('b', { approved_at: 'x', position: 1 }), T('c'), T('d', { approved_at: 'x', position: 3 }), T('e', { approved_at: 'x', position: 4 }), T('f', { removed_at: 'x' })]
    expect(approvedOrdered(rows).map(r => r.id)).toEqual(['b', 'a', 'd'])
    expect(pendingList(rows).map(r => r.id)).toEqual(['c'])
  })
  test('⑥ 코드 검사: 한마디 코드 어디에도 plan_tier·결제 참조 없음, 화면 금지어 0, 정렬 lint 0', () => {
    for (const f of ['config/vendorTakes.ts', 'src/lib/vendorTakesRules.js', 'src/lib/vendorTakes.js', 'src/components/VendorTakesSection.jsx', 'src/screens/TakeLinkPage.jsx', 'src/screens/VendorTakesManagePage.jsx']) {
      const src = readFileSync(f, 'utf8')
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '')
      expect(code, f).not.toMatch(/plan_tier|premium|paid|is_paid|billing/)
      expect(findCopyViolations(src, f)).toEqual([])
      expect(findPricingSortViolations(src, f)).toEqual([])
    }
  })
})

async function base(page, { login = true, deviceId = 'vendor-dev', profile = { category: 'business', uid: 'vendor-user' }, invites = [], takes = [], vendor = VENDOR } = {}) {
  await mockGemini(page); await mockMarketData(page)
  if (login) await seedSession(page, { id: profile.uid ?? 'test-user' })
  await page.addInitScript(([d, p]) => { localStorage.setItem('modu_device_id', d); localStorage.setItem('modu_user_profile', JSON.stringify(p)) }, [deviceId, profile])
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/listings*`, r => {
    const u = r.request().url()
    const one = u.includes('id=eq.') || u.includes('device_id=eq.') ? null : null
    void one
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(u.includes('select=id') ? [{ id: vendor.id }] : vendor) })
  })
  const st = { invites: [...invites], takes: [...takes], postedInvites: [], postedTakes: [], patchedTakes: [] }
  await page.route(`${REST}/vendor_take_invites*`, r => {
    const m = r.request().method(); const u = r.request().url()
    if (m === 'POST') { const b = JSON.parse(r.request().postData()); const inv = INV({ ...b, id: `inv-${st.postedInvites.length + 1}` }); st.postedInvites.push(b); st.invites.push(inv); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(inv) }) }
    if (m === 'PATCH') { const b = JSON.parse(r.request().postData()); st.invites = st.invites.map(i => u.includes(`id=eq.${i.id}`) || u.includes('vendor_user_id=eq.') ? { ...i, ...b } : i); return r.fulfill({ status: 204, body: '' }) }
    const tok = u.match(/token=eq\.([^&]+)/)?.[1]
    const rows = tok ? st.invites.filter(i => i.token === tok) : st.invites.filter(i => !i.closed_at)
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
  })
  await page.route(`${REST}/vendor_takes*`, r => {
    const m = r.request().method(); const u = r.request().url()
    if (m === 'POST') { const b = JSON.parse(r.request().postData()); st.postedTakes.push(b); st.takes.push(T(`new-${st.postedTakes.length}`, b)); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    if (m === 'PATCH') { const b = JSON.parse(r.request().postData()); const id = u.match(/id=eq\.([^&]+)/)?.[1]; st.patchedTakes.push({ id, ...b }); st.takes = st.takes.map(t => t.id === id ? { ...t, ...b } : t); return r.fulfill({ status: 204, body: '' }) }
    let rows = st.takes
    if (u.includes('approved_at=not.is.null')) rows = rows.filter(t => t.approved_at && !t.removed_at)
    else if (u.includes('approved_at=is.null')) rows = rows.filter(t => !t.approved_at && !t.removed_at)
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
  })
  return st
}

test('① 기업회원 [한마디 부탁하기] → 초대 생성(72시간·5명) → 링크 페이지: 비회원 접근, 계정·전화·이메일 입력란 없음, 응답 저장', async ({ page, browser }) => {
  const st = await base(page)
  await page.goto('/business/takes')
  await expect(page.getByText('72시간 동안 5분까지 답할 수 있어요')).toBeVisible()
  await page.getByTestId('take-invite-create').click()
  await expect.poll(() => st.postedInvites.length).toBe(1)
  expect(st.postedInvites[0]).toMatchObject({ vendor_user_id: 'vendor-user', vendor_id: 'v-1', max_responses: 5 })
  expect(new Date(st.postedInvites[0].expires_at).getTime() - Date.now()).toBeGreaterThan(71 * 36e5)
  await expect(page.getByTestId('take-invite-active')).toContainText('답변 0/5')
  const token = st.invites[0].token

  // 비회원(다른 기기·로그인 없음) 링크 페이지
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const guest = await ctx.newPage()
  const gst = await base(guest, { login: false, deviceId: 'guest-dev', profile: { category: 'startup' }, invites: [st.invites[0]] })
  await guest.goto(`/take/${token}`)
  await expect(guest.getByTestId('take-link-page')).toBeVisible()
  await expect(guest.getByTestId('take-vendor-name')).toHaveText('서교 인테리어')
  await expect(guest.locator('input[type="email"], input[type="tel"], input[type="password"]')).toHaveCount(0)
  await expect(guest.getByTestId('take-link-page')).not.toContainText(/로그인|가입/)
  await expect(guest.getByText('계정·전화번호·이메일은 받지 않아요')).toBeVisible()
  await guest.getByTestId('take-chip-인테리어').click()
  await guest.getByTestId('take-body').fill('공사 기간을 지켜 주셨어요')
  await guest.getByTestId('take-name').fill('서교동 카페 사장')
  await guest.getByTestId('take-biz').fill('카페')
  await guest.getByTestId('take-submit').click()
  await expect(guest.getByTestId('take-done')).toHaveText('업체가 확인한 뒤에 프로필에 올라가요')
  expect(gst.postedTakes[0]).toMatchObject({ invite_id: 'inv-1', vendor_user_id: 'vendor-user', display_name: '서교동 카페 사장', business_type: '카페', chip: '인테리어', body: '공사 기간을 지켜 주셨어요', voice_url: null })
  for (const k of ['email', 'phone', 'user_id', 'device_id']) expect(gst.postedTakes[0]).not.toHaveProperty(k)
  await ctx.close()
})

test('②·③ 응답 5명 찬 초대 → 닫힘 안내 / 73시간 지난 초대 → 만료 안내 (입력란 없음)', async ({ page }) => {
  await base(page, { login: false, deviceId: 'guest-dev', profile: { category: 'startup' }, invites: [INV({ response_count: 5 }), INV({ id: 'inv-2', token: 'tok-2', expires_at: H(-1) })] })
  await page.goto('/take/tok-1')
  await expect(page.getByTestId('take-notice')).toHaveText('답할 수 있는 인원이 다 찼어요')
  await expect(page.getByTestId('take-submit')).toHaveCount(0)
  await page.goto('/take/tok-2')
  await expect(page.getByTestId('take-notice')).toHaveText('이 초대는 기간이 지났어요')
  await expect(page.getByTestId('take-chips')).toHaveCount(0)
})

test('④·⑥ 관리 화면: 승인 3개 상태에서 4번째 [올리기] 막힘 (유료 입점 계정도 동일), [내리기] 후 다시 가능', async ({ page }) => {
  const takes = [T('a', { approved_at: 'x', position: 1 }), T('b', { approved_at: 'x', position: 2 }), T('c', { approved_at: 'x', position: 3 }), T('d')]
  const st = await base(page, { takes, vendor: { ...VENDOR, plan_tier: 'premium' } })
  await page.goto('/business/takes')
  await expect(page.getByTestId('take-approved')).toHaveCount(3)
  await expect(page.getByTestId('take-pending')).toHaveCount(1)
  await expect(page.getByTestId('take-approve-max')).toHaveText('한마디는 3개까지 올릴 수 있어요')
  await expect(page.getByTestId('take-approve')).toBeDisabled()
  await page.getByTestId('take-remove').first().click()
  await expect(page.getByTestId('take-approved')).toHaveCount(2)
  await expect(page.getByTestId('take-approve')).toBeEnabled()
  await page.getByTestId('take-approve').click()
  await expect(page.getByTestId('take-approved')).toHaveCount(3)
  expect(st.patchedTakes.at(-1)).toMatchObject({ id: 'd', position: 3 })
})

test('⑤ 기업회원 프로필: 후기 칸 → 한마디 칸 순서, 고정 문안 2줄, 승인 3개만 표시', async ({ page }) => {
  const takes = [T('a', { approved_at: 'x', position: 1 }), T('b', { approved_at: 'x', position: 2, body: null, voice_url: 'https://example.com/v.webm', voice_sec: 12 }), T('c', { approved_at: 'x', position: 3 }), T('d')]
  await base(page, { deviceId: 'buyer-dev', profile: { category: 'startup', uid: 'buyer-user' }, takes })
  await page.goto('/e2b/v-1')
  const review = page.getByTestId('review-section'); const sec = page.getByTestId('takes-section')
  await expect(review.getByTestId('review-foot')).toHaveText('모두 회원이 남긴 후기 · 업체가 고르지 않아요')
  await expect(sec.getByTestId('takes-foot')).toHaveText('업체가 초대한 분들이 남긴 말이에요 · 업체가 골라서 올려요')
  const [ry, ty] = await Promise.all([review.boundingBox(), sec.boundingBox()])
  expect(ty.y).toBeGreaterThan(ry.y)
  await expect(sec.getByTestId('take-item')).toHaveCount(3)
  await expect(sec.getByTestId('take-item').first()).toContainText('사장a')
  await expect(sec.getByTestId('take-audio')).toHaveCount(1)
  await expect(sec).not.toContainText(/별점|평점|추천|인증/)
  await expect(sec.getByTestId('takes-manage-link')).toHaveCount(0)
})

test('⑦ require_login_for_take=true → 링크 페이지가 로그인으로 리다이렉트', async ({ page }) => {
  await base(page, { login: false, deviceId: 'guest-dev', profile: { category: 'startup' }, invites: [INV()] })
  await page.addInitScript(() => localStorage.setItem('modu_dev_require_login_for_take', '1'))
  await page.goto('/take/tok-1')
  await expect(page).toHaveURL(/\/a4/)
  await expect(page.getByTestId('take-chips')).toHaveCount(0)
})

test('⑧ 음성 모드: 30초 안내, 녹음 없이 제출 → 거부 (업로드 호출 없음)', async ({ page }) => {
  const st = await base(page, { login: false, deviceId: 'guest-dev', profile: { category: 'startup' }, invites: [INV()] })
  let uploads = 0
  await page.route(`${SUPABASE}/storage/**`, r => { uploads++; r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) })
  await page.goto('/take/tok-1')
  await page.getByTestId('take-chip-세무').click()
  await page.getByTestId('take-mode-voice').click()
  await expect(page.getByTestId('take-voice')).toContainText('30초까지 녹음돼요')
  await page.getByTestId('take-name').fill('연남 분식 사장')
  await page.getByTestId('take-submit').click()
  await expect(page.getByTestId('take-error')).toHaveText('음성은 30초까지예요')
  expect(uploads).toBe(0); expect(st.postedTakes).toHaveLength(0)
})
