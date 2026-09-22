/**
 * 기업회원(E1b) 실저장 — 이 조각 전에는 5단계 완료가 아무것도 저장하지 않았다(화면 안 메모리만).
 * ① payload 유닛: listing_type='business' + 소비처가 읽는 칸이 채워진다
 * ② 가짜 기본값 사망: Context 기본값이 전부 빈 값(예전엔 '서교동 인테리어'·2019·인테리어 해결 3쌍이 박혀 있었다)
 * ③ 빈 해결 쌍은 저장하지 않는다 / 업종 키는 화이트리스트 밖이면 null
 * ④ 1단계 게이트: 업종·개업연도 없으면 다음 버튼 잠김
 * ⑤ 5단계 완료 → listings 에 POST 1건(실저장), 본문이 payload 규격과 일치
 * ⑥ 상호·업종 없으면 저장하지 않고 안내(POST 0건)
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData, seedSession } from './helpers.js'
import { readFileSync } from 'node:fs'
import { buildVendorPayload, buildTagline, cleanSolutions, missingRequired } from '../src/lib/vendorListingRules.js'
import { VENDOR_CATEGORIES, isVendorCategory } from '../config/salesCardCategories.ts'
import { DEMAND } from '../config/demandSignal.ts'

const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const REST = `${SUPABASE}/rest/v1`
const NOW = new Date('2026-09-22T00:00:00Z')

const FULL = {
  bizName: '한빛 공인중개사', bizNumber: '1234567890', verified: true,
  region: '서울 마포구 서교동 12-3', phone: '02-333-4444',
  category: 'realestate', categoryLabel: '부동산(재계약·이전)', founded: '2019',
  triggers: ['임대차 계약 만료가 다가올 때', '재계약 조건이 적절한지 모를 때'],
  solutions: [
    { id: 's1', problem: '재계약 조건이 적절한지 모를 때', solve: '같은 골목 최근 계약과 비교해 알려드려요' },
    { id: 's2', problem: '', solve: '' },
    { id: 's3', problem: '', solve: '' },
  ],
  dmSpeed: 'fast', dmDeposit: false, dmActive: true,
}

test.describe('룰 유닛', () => {
  test('① payload: 소비처가 읽는 칸이 전부 채워진다', () => {
    const p = buildVendorPayload(FULL, { lat: 37.55, lng: 126.92 }, NOW)
    // 배정(lib/priceInquiry.js:21)이 거는 조건
    expect(p.listing_type).toBe('business')
    expect(p.biz_category).toBe('realestate')
    expect(DEMAND.categories).toContain(p.biz_category)
    expect(p.latitude).toBe(37.55)
    expect(p.longitude).toBe(126.92)
    // 상세(VendorDetailPage)·전화
    expect(p.shop_name).toBe('한빛 공인중개사')
    expect(p.biz_phone).toBe('02-333-4444')
    expect(p.biz_tagline).toBe('서울 마포구 · 업력 7년 · 부동산(재계약·이전)')
    expect(p.biz_tags).toEqual(FULL.triggers)
    expect(p.business_number).toBe('1234567890')
    expect(p.biz_founded).toBe(2019)
    expect(p.biz_settings).toEqual({ speed: 'fast', deposit: false, active: true })
  })

  test('② 한 줄 정체성: 없는 정보는 만들지 않는다', () => {
    expect(buildTagline({ region: '', founded: '', categoryLabel: '' }, NOW)).toBe('')
    expect(buildTagline({ region: '서울 마포구 서교동', founded: '', categoryLabel: '' }, NOW)).toBe('서울 마포구')
    expect(buildTagline({ region: '', founded: '2026', categoryLabel: '세무' }, NOW)).toBe('업력 0년 · 세무')
    // 네 자리가 아니면 업력을 추정하지 않는다
    expect(buildTagline({ region: '', founded: '19', categoryLabel: '세무' }, NOW)).toBe('세무')
  })

  test('③ 빈 해결 쌍은 버린다 · 업종은 화이트리스트만', () => {
    expect(cleanSolutions(FULL.solutions)).toEqual([
      { problem: '재계약 조건이 적절한지 모를 때', solve: '같은 골목 최근 계약과 비교해 알려드려요' },
    ])
    expect(cleanSolutions([{ problem: '   ', solve: '  ' }])).toEqual([])
    expect(buildVendorPayload({ ...FULL, solutions: [{ problem: '', solve: '' }] }, null, NOW).biz_solutions).toBeNull()
    // 예전 더미 값('시설')은 이제 저장되지 않는다
    expect(isVendorCategory('시설')).toBe(false)
    expect(buildVendorPayload({ ...FULL, category: '시설' }, null, NOW).biz_category).toBeNull()
    expect(VENDOR_CATEGORIES.map(c => c.key).sort()).toEqual(['consulting', 'marketing', 'realestate', 'tax'])
  })

  test('⑥ 상호·업종이 없으면 저장 대상이 아니다', () => {
    expect(missingRequired(FULL)).toEqual([])
    expect(missingRequired({ ...FULL, bizName: '  ' })).toEqual(['상호'])
    expect(missingRequired({ ...FULL, category: '' })).toEqual(['업종'])
  })

  test('② 가짜 기본값 사망: Context 에 박힌 업체 정보가 0건', () => {
    const src = readFileSync('src/screens/e1b/E1bContext.jsx', 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '')
    for (const dummy of ['서교동 인테리어', '123-45-67890', '인테리어·간판', "founded: '2019'", '당일 현장 방문 무료 견적']) {
      expect(code, `E1bContext 에 더미 ${dummy} 잔존`).not.toContain(dummy)
    }
    // 해결 3쌍은 빈 문자열로 시작한다
    expect(code).toMatch(/problem: '',\s*solve: ''/)
  })
})

async function base(page, { start = null } = {}) {
  await mockGemini(page); await mockMarketData(page)
  await seedSession(page, { id: 'vendor-user' })
  await page.addInitScript((s) => {
    localStorage.setItem('modu_device_id', 'vendor-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'business' }))
    if (s) sessionStorage.setItem('modu_e1b_start', JSON.stringify(s))
  }, start)
  await page.route(`${REST}/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  const posted = []
  await page.route(`${REST}/listings*`, r => {
    if (r.request().method() === 'POST') {
      posted.push(JSON.parse(r.request().postData()))
      return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  return posted
}

const START = { bizName: '한빛 공인중개사', bizNumber: '1234567890', verified: true, region: '서울 마포구 서교동 12-3', phone: '02-333-4444' }

test('④ 1단계: 업종·개업연도를 고르기 전에는 다음으로 못 간다', async ({ page }) => {
  await base(page, { start: START })
  await page.goto('/e1b/1')
  const next = page.getByTestId('vendor-step1-next')
  await expect(next).toBeDisabled()
  await expect(page.getByText('업종과 개업연도를 골라주세요')).toBeVisible()

  await page.getByTestId('vendor-category-realestate').click()
  await expect(next).toBeDisabled()          // 개업연도가 아직 없다
  await page.getByTestId('vendor-founded').fill('2019')
  await expect(next).toBeEnabled()
  await expect(page.getByTestId('vendor-tagline')).toHaveText('서울 마포구 · 업력 7년 · 부동산(재계약·이전)')
})

test('⑤ 5단계 완료 → listings 에 business 행이 실제로 저장된다', async ({ page }) => {
  const posted = await base(page, { start: START })
  await page.goto('/e1b/1')
  await page.getByTestId('vendor-category-realestate').click()
  await page.getByTestId('vendor-founded').fill('2019')
  await page.getByTestId('vendor-step1-next').click()

  // page.goto 로 건너뛰면 입력값(화면 안 메모리)이 날아간다 — 실제 사용자처럼 눌러서 간다
  await page.waitForURL('**/e1b/2')
  await page.getByText('임대차 계약 만료가 다가올 때').click()
  await page.getByText('재계약 조건이 적절한지 모를 때').first().click()
  await page.getByRole('button', { name: '다음 — 무엇을 해결하는지' }).click()
  await page.waitForURL('**/e1b/3')
  await page.getByRole('button', { name: '다음 — 믿을 근거' }).click()
  await page.waitForURL('**/e1b/4')
  await page.getByRole('button', { name: '다음 — 견적·문의 설정' }).click()
  await page.waitForURL('**/e1b/5')
  await page.getByRole('button', { name: '노출 시작하기' }).click()
  await page.getByTestId('vendor-publish-confirm').click()

  await expect.poll(() => posted.length).toBe(1)
  const row = posted[0]
  expect(row.listing_type).toBe('business')
  expect(row.status).toBe('published')
  expect(row.biz_category).toBe('realestate')
  expect(row.shop_name).toBe('한빛 공인중개사')
  expect(row.biz_phone).toBe('02-333-4444')
  expect(row.biz_founded).toBe(2019)
  expect(row.device_id).toBe('vendor-dev')
  // 예전 더미가 섞여 들어가지 않는다
  expect(JSON.stringify(row)).not.toContain('서교동 인테리어')
})

test('⑥ 업종이 비면 저장하지 않고 안내한다 (POST 0건)', async ({ page }) => {
  const posted = await base(page, { start: START })
  await page.goto('/e1b/5')
  await page.getByRole('button', { name: '노출 시작하기' }).click()
  await page.getByTestId('vendor-publish-confirm').click()
  await expect(page.getByTestId('vendor-publish-error')).toContainText('업종')
  expect(posted).toHaveLength(0)
})
