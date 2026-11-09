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
import { vendorDetailView } from '../src/lib/vendorDetailView.js'

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

async function base(page, { login = true, deviceId = 'vendor-dev', profile = { category: 'business', uid: 'vendor-user' }, invites = [], takes = [], vendor = VENDOR, vendors = [vendor] } = {}) {
  await mockGemini(page); await mockMarketData(page)
  if (login) await seedSession(page, { id: profile.uid ?? 'test-user' })
  await page.addInitScript(([d, p]) => { localStorage.setItem('modu_device_id', d); localStorage.setItem('modu_user_profile', JSON.stringify(p)) }, [deviceId, profile])
  await page.route(`${REST}/**`, r => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 204, body: '' }))
  await page.route(`${REST}/listings*`, r => {
    const params = new URL(r.request().url()).searchParams
    const id = params.get('id')?.replace('eq.', '')
    const owner = params.get('user_id')?.replace('eq.', '')
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(id ? vendors.find(v => v.id === id) ?? null : vendors.filter(v => owner ? v.user_id === owner : v.device_id === deviceId)) })
  })
  // 기존 응답 fixture에도 실제 FK가 가리키는 초대장을 둔다.
  const linkedInvites = [...invites]
  for (const take of takes) if (!linkedInvites.some(i => i.id === take.invite_id)) linkedInvites.push(INV({ id: take.invite_id }))
  const st = { invites: linkedInvites, takes: [...takes], postedInvites: [], postedTakes: [], patchedTakes: [], patchedInvites: [], requests: [] }
  const matches = (row, params, key) => !params.has(key) || params.get(key) === `eq.${row[key]}`
  await page.route(`${REST}/vendor_take_invites*`, r => {
    const m = r.request().method(); const u = r.request().url()
    const params = new URL(u).searchParams
    st.requests.push(u)
    if (m === 'POST') { const b = JSON.parse(r.request().postData()); const inv = INV({ ...b, id: `inv-${st.postedInvites.length + 1}` }); st.postedInvites.push(b); st.invites.push(inv); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(inv) }) }
    if (m === 'PATCH') { const b = JSON.parse(r.request().postData()); st.patchedInvites.push({ params: Object.fromEntries(params), ...b }); st.invites = st.invites.map(i => ['id', 'vendor_user_id', 'vendor_id'].every(key => matches(i, params, key)) ? { ...i, ...b } : i); return r.fulfill({ status: 204, body: '' }) }
    const tok = u.match(/token=eq\.([^&]+)/)?.[1]
    const rows = tok ? st.invites.filter(i => i.token === tok) : st.invites.filter(i => (!params.has('closed_at') || !i.closed_at) && ['id', 'vendor_user_id', 'vendor_id'].every(key => matches(i, params, key)))
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
  })
  await page.route(`${REST}/vendor_takes*`, r => {
    const m = r.request().method(); const u = r.request().url()
    const params = new URL(u).searchParams
    st.requests.push(u)
    if (m === 'POST') { const b = JSON.parse(r.request().postData()); st.postedTakes.push(b); st.takes.push(T(`new-${st.postedTakes.length}`, b)); return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) }
    if (m === 'PATCH') { const b = JSON.parse(r.request().postData()); const id = params.get('id')?.replace('eq.', ''); st.patchedTakes.push({ id, ...b }); st.takes = st.takes.map(t => ['id', 'vendor_user_id', 'invite_id'].every(key => matches(t, params, key)) ? { ...t, ...b } : t); return r.fulfill({ status: 204, body: '' }) }
    let rows = st.takes.filter(t => matches(t, params, 'vendor_user_id'))
    const scope = params.get('vendor_take_invites.vendor_id')?.replace('eq.', '')
    const inviteOwner = params.get('vendor_take_invites.vendor_user_id')?.replace('eq.', '')
    if (scope) rows = rows.filter(t => st.invites.some(i => i.id === t.invite_id && i.vendor_id === scope && (!inviteOwner || i.vendor_user_id === inviteOwner)))
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

test('업체 상세는 저장된 분류·서비스·소재지·서비스 지역·전국·비대면·수정 소개글을 구별한다', async ({ page }) => {
  const vendor = { ...VENDOR, biz_category: 'consulting', biz_services: ['점포 중개', '창업 컨설팅'], biz_service_areas: [{ province: '경기도', district: '성남시' }], biz_nationwide: true, biz_remote: true, edited_texts: { description: '직접 수정한 소개\n두 번째 줄' }, ai_draft: { description: '이전 소개' } }
  await base(page, { vendor })
  await page.goto('/e2b/v-1')
  await expect(page.getByTestId('vendor-category')).toHaveText('중개·컨설팅')
  await expect(page.getByTestId('vendor-services')).toHaveText('점포 중개 · 창업 컨설팅')
  await expect(page.getByTestId('vendor-address')).toHaveText('소재지 · 서울 마포구 서교동 1')
  await expect(page.getByTestId('vendor-service-areas')).toHaveText('서비스 가능 지역 · 경기도 성남시')
  await expect(page.getByTestId('vendor-coverage')).toHaveText('전국 · 비대면 가능')
  await expect(page.getByTestId('vendor-description')).toHaveText('직접 수정한 소개\n두 번째 줄')
  await expect(page.getByTestId('takes-manage-link')).toBeVisible()
  await page.getByTestId('takes-manage-link').click()
  await expect(page).toHaveURL(/\/business\/takes\?vendorId=v-1/)
})

test('업체 상세는 두 숨김 설정과 빈 소개글을 존중하고 없는 사실을 만들지 않는다', () => {
  const row = { biz_category: 'interior', biz_services: ['간판'], address: '서울 마포구', biz_service_areas: [{ province: '부산광역시' }], biz_nationwide: true, biz_remote: true, edited_texts: { description: '수정 소개' }, ai_draft: { description: '원문 소개' } }
  const hidden = { biz_category: false, biz_services: false, address: false, biz_service_areas: false, biz_nationwide: false, biz_remote: false, description: false }
  expect(vendorDetailView({ ...row, item_visibility: hidden })).toEqual(vendorDetailView({}))
  expect(vendorDetailView({ ...row, review_choices: Object.fromEntries(Object.keys(hidden).map(key => [key, 'hide'])) })).toEqual(vendorDetailView({}))
  expect(vendorDetailView({ ...row, edited_texts: { description: '' } }).description).toBe('')
  expect(vendorDetailView({ ...row, edited_texts: {} }).description).toBe('원문 소개')
  expect(vendorDetailView({ ai_draft: { fact: '기존 소개' }, biz_settings: { serviceAreas: [{ province: '경기도', district: '수원시' }], nationwide: true, remote: false } })).toMatchObject({ description: '기존 소개', serviceAreas: ['경기도 수원시'], nationwide: true, remote: false, address: '' })
})

test('같은 계정 업체 A의 한마디는 업체 B와 다른 계정 업체 C에 표시되지 않는다', async ({ page }) => {
  const vendors = [VENDOR, { ...VENDOR, id: 'v-2', shop_name: '업체 B' }, { ...VENDOR, id: 'v-3', user_id: 'other-user', device_id: 'other-device', shop_name: '업체 C' }]
  const st = await base(page, { vendors, takes: [T('a', { approved_at: 'x', position: 1 })] })
  await page.goto('/e2b/v-1')
  await expect(page.getByTestId('take-item')).toHaveCount(1)
  for (const id of ['v-2', 'v-3']) {
    await page.goto(`/e2b/${id}`)
    await expect(page.getByTestId('vendor-name')).toHaveText(id === 'v-2' ? '업체 B' : '업체 C')
    await expect.poll(() => st.requests.some(url => new URL(url).searchParams.get('vendor_take_invites.vendor_id') === `eq.${id}`)).toBe(true)
    await expect(page.getByTestId('take-item')).toHaveCount(0)
  }
  expect(st.requests.filter(url => url.includes('/vendor_takes?')).every(url => new URL(url).searchParams.get('select').includes('vendor_take_invites!inner(vendor_id,vendor_user_id)'))).toBe(true)
})

test('한 계정의 업체 관리·초대·승인 상한·내리기·정렬은 선택한 업체에만 적용된다', async ({ page }) => {
  const vendors = [VENDOR, { ...VENDOR, id: 'v-2', shop_name: '업체 B' }]
  const inviteB = INV({ id: 'inv-b', vendor_id: 'v-2', token: 'tok-b' })
  const takes = [T('a'), ...['b1', 'b2', 'b3'].map((id, i) => T(id, { invite_id: 'inv-b', approved_at: 'x', position: i + 1 }))]
  const st = await base(page, { vendors, invites: [INV({ closed_at: H(-1) }), inviteB], takes })
  await page.goto('/business/takes?vendorId=v-1')
  await expect(page.getByTestId('takes-vendor-select')).toHaveValue('v-1')
  await expect(page.getByTestId('take-approved')).toHaveCount(0)
  await expect(page.getByTestId('take-pending')).toHaveCount(1)
  const blocked = await page.evaluate(async () => {
    const { approveTake, declineTake, removeTake, reorderTakes } = await import('/src/lib/vendorTakes.js')
    return [await approveTake({ id: 'b1' }, 'v-1'), await declineTake({ id: 'b1' }, 'v-1'), await removeTake({ id: 'b1' }, 'v-1'), await reorderTakes(['b1', 'b2', 'b3'], 'v-1')]
  })
  expect(blocked).toEqual([{ ok: false, reason: 'vendor' }, false, false, false])
  expect(st.patchedTakes).toHaveLength(0)
  await page.getByTestId('take-approve').click()
  await expect(page.getByTestId('take-approved')).toHaveCount(1)
  expect(st.patchedTakes).toEqual([expect.objectContaining({ id: 'a', position: 1 })])
  await page.getByTestId('take-invite-create').click()
  await expect.poll(() => st.postedInvites.length).toBe(1)
  expect(st.patchedInvites.at(-1).params).toMatchObject({ vendor_id: 'eq.v-1', vendor_user_id: 'eq.vendor-user' })
  expect(st.invites.find(i => i.id === 'inv-b').closed_at).toBeNull()
  await page.getByTestId('takes-vendor-select').selectOption('v-2')
  await expect(page.getByTestId('take-approved')).toHaveCount(3)
  await expect(page.getByTestId('take-pending')).toHaveCount(0)
  await expect(page.getByTestId('take-invite-active')).toBeVisible()
  await page.getByRole('button', { name: '아래로' }).first().click()
  await expect.poll(() => st.patchedTakes.length).toBe(4)
  expect(st.patchedTakes.slice(1).map(t => t.id)).toEqual(['b2', 'b1', 'b3'])
  await page.getByTestId('take-remove').first().click()
  await expect(page.getByTestId('take-approved')).toHaveCount(2)
  expect(st.takes.find(t => t.id === 'a').removed_at).toBeNull()
})

test('잘못된 업체 관리 주소나 다중 업체 미선택 상태에서는 초대·한마디를 불러오지 않는다', async ({ page }) => {
  const st = await base(page, { vendors: [VENDOR, { ...VENDOR, id: 'v-2' }], takes: [T('a', { approved_at: 'x', position: 1 })] })
  for (const path of ['/business/takes?vendorId=not-owned', '/business/takes']) {
    await page.goto(path)
    await expect(page.getByTestId('takes-vendor-select')).toHaveValue('')
    await expect(page.getByTestId('take-invite-create')).toBeDisabled()
    await expect(page.getByTestId('take-approved')).toHaveCount(0)
  }
  expect(st.requests).toHaveLength(0)
})

test('같은 계정의 다른 업체 대기함이 차도 현재 업체의 초대 응답을 막지 않는다', async ({ page }) => {
  const inviteB = INV({ id: 'inv-b', vendor_id: 'v-2', token: 'tok-b' })
  const st = await base(page, { login: false, deviceId: 'guest-dev', profile: { category: 'startup' }, invites: [INV(), inviteB], takes: Array.from({ length: TAKES.MAX_PENDING }, (_, i) => T(`b${i}`, { invite_id: 'inv-b' })) })
  await page.goto('/take/tok-1')
  await page.getByTestId('take-chip-인테리어').click()
  await page.getByTestId('take-body').fill('기간을 지켜 주셨어요')
  await page.getByTestId('take-name').fill('카페 사장')
  await page.getByTestId('take-submit').click()
  await expect(page.getByTestId('take-done')).toBeVisible()
  expect(st.postedTakes).toHaveLength(1)
  expect(st.postedTakes[0].invite_id).toBe('inv-1')
  expect(st.invites.find(i => i.id === 'inv-b').closed_at).toBeNull()
})

test('업체 연결이 없는 이전 초대는 다른 업체에 임의 귀속하거나 응답을 받지 않는다', async ({ page }) => {
  const st = await base(page, { login: false, deviceId: 'guest-dev', profile: { category: 'startup' }, invites: [INV({ vendor_id: null })] })
  await page.goto('/take/tok-1')
  await expect(page.getByTestId('take-notice')).toHaveText('이 초대는 마감됐어요')
  await expect(page.getByTestId('take-submit')).toHaveCount(0)
  expect(st.postedTakes).toHaveLength(0)
})

test('타 계정 업체와 계정 소유자가 없는 업체에는 직접 호출로도 초대·응답·관리를 만들지 못한다', async ({ page }) => {
  const other = { ...VENDOR, id: 'v-other', user_id: 'other-user' }
  const anonymous = { ...VENDOR, id: 'v-anon', user_id: null }
  const forged = INV({ id: 'inv-forged', vendor_id: other.id, token: 'forged' })
  const st = await base(page, { vendors: [VENDOR, other, anonymous], invites: [forged], takes: [T('forged', { invite_id: forged.id })] })
  await page.goto('/business/takes?vendorId=v-other')
  await expect(page.getByTestId('take-invite-create')).toBeDisabled()
  const blocked = await page.evaluate(async ({ forged, anonymousId }) => {
    const { createInvite, fetchActiveInvite, fetchMyTakes, submitTake } = await import('/src/lib/vendorTakes.js')
    const payload = { displayName: '사장', chip: '기타', body: '한마디' }
    return [await createInvite(forged.vendor_id), await createInvite(anonymousId), await fetchActiveInvite(forged.vendor_id), await fetchMyTakes(forged.vendor_id), await submitTake(forged, payload), await submitTake({ ...forged, vendor_id: anonymousId }, payload), await submitTake({ ...forged, vendor_id: 'v-1' }, payload)]
  }, { forged, anonymousId: anonymous.id })
  expect(blocked).toEqual([{ ok: false, reason: 'vendor' }, { ok: false, reason: 'vendor' }, null, [], { ok: false, reason: 'closed' }, { ok: false, reason: 'closed' }, { ok: false, reason: 'closed' }])
  expect(st.postedInvites).toHaveLength(0)
  expect(st.patchedInvites).toHaveLength(0)
  expect(st.postedTakes).toHaveLength(0)
  await page.goto('/take/forged')
  await expect(page.getByTestId('take-notice')).toHaveText('이 초대는 마감됐어요')
})

test('공개 한마디는 실제 업체 소유자·초대 계정·응답 계정이 모두 일치해야 한다', async ({ page }) => {
  const forged = INV({ id: 'inv-forged', token: 'forged', vendor_user_id: 'other-user' })
  const takes = [
    T('valid', { approved_at: 'x', position: 1 }),
    T('bad-invite', { invite_id: forged.id, approved_at: 'x', position: 2 }),
    T('bad-take', { vendor_user_id: 'other-user', approved_at: 'x', position: 2 }),
    T('both-wrong', { invite_id: forged.id, vendor_user_id: 'other-user', approved_at: 'x', position: 3 }),
  ]
  const anonymous = { ...VENDOR, id: 'v-anon', user_id: null }
  const st = await base(page, { login: false, deviceId: 'guest-dev', profile: { category: 'startup' }, vendors: [VENDOR, anonymous], invites: [INV(), forged, INV({ id: 'inv-anon', vendor_id: anonymous.id, token: 'anon' })], takes: [...takes, T('anon', { invite_id: 'inv-anon', approved_at: 'x', position: 1 })] })
  await page.goto('/e2b/v-1')
  await expect(page.getByTestId('take-item')).toHaveCount(1)
  await expect(page.getByTestId('take-item')).toContainText('사장valid')
  const request = st.requests.find(url => url.includes('/vendor_takes?'))
  const params = new URL(request).searchParams
  expect(params.get('vendor_user_id')).toBe('eq.vendor-user')
  expect(params.get('vendor_take_invites.vendor_user_id')).toBe('eq.vendor-user')
  await page.goto('/e2b/v-anon')
  await expect(page.getByTestId('vendor-name')).toBeVisible()
  await expect(page.getByTestId('takes-section')).toHaveCount(0)
  await page.goto('/take/anon')
  await expect(page.getByTestId('take-notice')).toHaveText('이 초대는 마감됐어요')
})
