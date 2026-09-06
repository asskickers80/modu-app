/**
 * 계정 삭제·동의 (ORDER-key-proxy-account-deletion 작업 B)
 * 유닛: 비식별 원장 구간화(면적·지역 구 단위까지)
 * UI: 탈퇴 화면 문안(사라짐/남음 명시·붙잡는 문구 없음)·2단계 확인·삭제 후 첫 화면,
 *     가입 선택 동의(미체크 기본·체크 없이도 가입 진행)
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { areaBand, regionParts } from '../src/lib/closeFlowRules.js'
import { OPTIONAL, REQUIRED } from '../src/lib/consents.js'

test.describe('비식별 원장 유닛', () => {
  test('면적은 구간으로만 저장된다 (원값 미보존)', () => {
    expect(areaBand('15')).toBe('under_20')
    expect(areaBand('33')).toBe('20_40')
    expect(areaBand('45.2')).toBe('40_70')
    expect(areaBand('85')).toBe('70_100')
    expect(areaBand('200')).toBe('over_100')
    expect(areaBand('')).toBeNull()
  })

  test('지역은 구 단위까지만 — 동·번지는 버린다 (재식별 방지)', () => {
    expect(regionParts('서울 마포구 서교동 332-4')).toEqual({ sido: '서울', gu: '마포구' })
    expect(regionParts('경기 수원시 팔달구 인계동 2')).toMatchObject({ sido: '경기' })
    const r = regionParts('서울 마포구 서교동 332-4')
    expect(JSON.stringify(r)).not.toContain('서교동')
    expect(JSON.stringify(r)).not.toContain('332')
  })
})

test('동의 유형 — 필수 2·선택 2로 분리돼 있다', () => {
  expect(REQUIRED).toEqual(['terms', 'privacy'])
  expect(OPTIONAL).toEqual(['marketing_contact', 'retention_after_withdrawal'])
})

// ── UI ───────────────────────────────────────────────────────
const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'

async function setup(page) {
  await mockGemini(page)
  await mockMarketData(page)
  await page.route(`${SUPABASE}/rest/v1/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'del-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ name: '김탈퇴', category: 'seller' }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_s', category: 'seller', name: '김탈퇴', active: true }]))
  })
}

test('탈퇴 화면: 사라지는 것·남는 것을 그대로 적고, 붙잡는 문구가 없다', async ({ page }) => {
  await setup(page)
  await page.goto('/my/delete-account')

  await expect(page.getByText('계정을 삭제하면 되돌릴 수 없어요.')).toBeVisible()
  const gone = page.getByTestId('delete-gone')
  await expect(gone).toContainText('등록한 매물과 상가')
  await expect(gone).toContainText('카카오·네이버 연결')
  const stays = page.getByTestId('delete-stays')
  await expect(stays).toContainText('탈퇴한 사용자')
  await expect(stays).toContainText('누구인지는 남지 않아요')

  // 붙잡는 문구 금지 — 혜택·만류·아쉬움 표현이 없어야 한다
  await expect(page.getByText(/아쉬|정말 떠나|혜택을 놓|잠시만|다시 생각/)).toHaveCount(0)
})

test('탈퇴는 2단계 확인을 거친다 (바로 삭제되지 않는다)', async ({ page }) => {
  await setup(page)
  let deleteCalled = false
  await page.route('**/functions/v1/delete-account*', r => {
    deleteCalled = true
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })
  await page.goto('/my/delete-account')

  await expect(page.getByTestId('delete-account-confirm')).toHaveCount(0)
  await page.getByTestId('delete-account-start').click()
  await expect(page.getByTestId('delete-account-confirm')).toBeVisible()
  expect(deleteCalled, '확인 전에 이미 호출됨').toBe(false)

  // 그만두면 되돌아온다
  await page.getByRole('button', { name: '그만둘게요' }).click()
  await expect(page.getByTestId('delete-account-start')).toBeVisible()
  expect(deleteCalled).toBe(false)
})

test('마이 화면의 회원 탈퇴 → 탈퇴 화면으로 이동한다 (준비 중 토스트 아님)', async ({ page }) => {
  await setup(page)
  await page.goto('/my')
  await page.getByText('회원 탈퇴').click()
  await expect(page).toHaveURL('/my/delete-account')
})

test('가입 선택 동의: 미체크가 기본이고, 체크하지 않아도 가입이 진행된다', async ({ page }) => {
  await setup(page)
  await page.goto('/a4')

  const box = page.getByTestId('optional-consents')
  await expect(box).toBeVisible()
  await expect(box).toContainText('선택 — 안 하셔도 가입돼요')
  for (const type of ['marketing_contact', 'retention_after_withdrawal']) {
    await expect(page.getByTestId(`consent-${type}`)).toBeVisible()
  }
  // 미체크 기본 — 저장소에 아무것도 없다
  const saved = await page.evaluate(() => localStorage.getItem('modu_optional_consents'))
  expect(saved).toBeNull()

  // 체크 → 저장, 재탭 → 해제
  await page.getByTestId('consent-marketing_contact').click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('modu_optional_consents') || '[]')))
    .toEqual(['marketing_contact'])
  await page.getByTestId('consent-marketing_contact').click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('modu_optional_consents') || '[]')))
    .toEqual([])
})
