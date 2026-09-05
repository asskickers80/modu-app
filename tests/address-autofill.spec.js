/**
 * 주소 자동 채움 (ORDER-address-autofill-v1)
 * 유닛: 조회 파라미터 파싱·호실/층 정규화·전유부 매칭·업종 제안 게이트
 * UI: 확인 카드 → [맞아요] 반영 / [고칠게요] 직접 입력 / 조회 실패 폴백 / 업종 확인 칩
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { parseJibun, registryParams, normalizeUnit, normalizeFloor, matchUnit } from '../src/lib/addressParse.js'
import { suggestIndustry, MAX_CANDIDATES } from '../src/lib/storeLookup.js'
import { summaryOf } from '../src/lib/buildingRegistry.js'

test.describe('주소 파싱 유닛', () => {
  test('지번 본번·부번·산번지', () => {
    expect(parseJibun('서울특별시 마포구 서교동 332-4')).toEqual({ bun: '0332', ji: '0004', isMountain: false })
    expect(parseJibun('서울 마포구 서교동 332')).toEqual({ bun: '0332', ji: '0000', isMountain: false })
    expect(parseJibun('경기도 양평군 서종면 문호리 산 12-3')).toEqual({ bun: '0012', ji: '0003', isMountain: true })
    expect(parseJibun('')).toBeNull()
  })

  test('조회 파라미터: bcode 10자리 분해 + 지번', () => {
    expect(registryParams({ bcode: '1144012300', jibunAddress: '서울 마포구 서교동 332-4' }))
      .toEqual({ sigunguCd: '11440', bjdongCd: '12300', platGbCd: '0', bun: '0332', ji: '0004' })
  })

  test('도로명주소만 있으면 조회하지 않는다 (도로 번호 오독 방지)', () => {
    // "양화로 45"의 45를 본번으로 읽으면 엉뚱한 건물 — 지번 없으면 null
    expect(registryParams({ bcode: '1144012300', jibunAddress: '' })).toBeNull()
    expect(registryParams({ jibunAddress: '서울 마포구 서교동 332-4' })).toBeNull() // bcode 없음
  })

  test('호실·층 표기 정규화', () => {
    expect([normalizeUnit('101호'), normalizeUnit('1층 101호'), normalizeUnit('제101호')]).toEqual(['101', '101', '101'])
    expect([normalizeFloor('지1층'), normalizeFloor('B1'), normalizeFloor('제1층'), normalizeFloor('3층')])
      .toEqual(['B1', 'B1', '1층', '3층'])
  })

  test('전유부 매칭: 호실 일치 우선, 후보 1개면 확정, 여러 개면 미확정', () => {
    const rows = [{ hoNm: '101호', area: 1 }, { hoNm: '102호', area: 2 }]
    expect(matchUnit(rows, '102호')).toEqual({ hoNm: '102호', area: 2 })
    expect(matchUnit(rows, null)).toBeNull()
    expect(matchUnit([{ hoNm: '제101호', area: 45.2 }], null)).toEqual({ hoNm: '제101호', area: 45.2 })
  })
})

test.describe('업종 제안 게이트 유닛', () => {
  const store = (ksicCd, label, unit = null) => ({ ksicCd, indsSclsNm: label, ksicNm: label, name: '가나다', unit })

  test('같은 지번 업소가 많으면(집합건물) 제안하지 않는다', () => {
    const many = Array.from({ length: MAX_CANDIDATES + 1 }, () => store('56221', '카페'))
    expect(suggestIndustry({ stores: many })).toBeNull()
  })

  test('소수 후보면 최빈 업종 제안 (confident=false)', () => {
    const few = [store('56221', '카페'), store('56221', '카페'), store('47811', '약국')]
    const s = suggestIndustry({ stores: few })
    expect(s.ksicCd).toBe('56221')
    expect(s.label).toBe('카페')
    expect(s.confident).toBe(false)
  })

  test('호실이 일치하면 후보가 많아도 제안 (confident=true)', () => {
    const many = [
      ...Array.from({ length: 20 }, () => store('56221', '카페')),
      store('47811', '약국', '302'),
    ]
    const s = suggestIndustry({ stores: many }, '302호')
    expect(s.ksicCd).toBe('47811')
    expect(s.confident).toBe(true)
  })

  test('빈 결과는 null', () => {
    expect(suggestIndustry(null)).toBeNull()
    expect(suggestIndustry({ stores: [] })).toBeNull()
  })
})

test('확인 카드 문구: 채워진 값만 이어 붙인다', () => {
  expect(summaryOf({ floor: '1층', area: 45.2, useApprovalYear: 2009 })).toBe('1층 · 45.2㎡ · 2009년 준공')
  expect(summaryOf({ floor: null, area: null, useApprovalYear: 1999 })).toBe('1999년 준공')
  expect(summaryOf({ floor: null, area: null, useApprovalYear: null, mainPurpose: '업무시설' })).toBe('업무시설')
  expect(summaryOf({ floor: null, area: null, useApprovalYear: null, mainPurpose: null })).toBeNull()
  expect(summaryOf(null)).toBeNull()
})

// ── UI ───────────────────────────────────────────────────────
const REGISTRY = '**/api/opendata/1613000/BldRgstHubService/**'
const STORES = '**/api/opendata/B553077/**'

const titleRes = (over = {}) => ({
  response: {
    header: { resultCode: '00' },
    body: { items: { item: [{ bldNm: '모두빌딩', mainPurpsCdNm: '제2종근린생활시설', useAprDay: '20090315', ...over }] } },
  },
})
const listRes = (items) => ({ response: { header: { resultCode: '00' }, body: { items: { item: items } } } })

async function setupE1(page, { expos = [], floors = [], stores = null, registryFail = false } = {}) {
  await mockGemini(page)
  await mockMarketData(page)
  await page.route(REGISTRY, r => {
    if (registryFail) return r.fulfill({ status: 500, body: '' })
    const u = r.request().url()
    const body = u.includes('getBrTitleInfo') ? titleRes()
      : u.includes('getBrExposPubuseAreaInfo') ? listRes(expos)
        : listRes(floors)
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.route(STORES, r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ body: { totalCount: stores?.length ?? 0, items: stores ?? [] } }),
  }))
  await page.route('**/api/geocode', r => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ lat: 37.5563, lng: 126.9236 }),
  }))
  // Daum 우편번호 위젯 스크립트를 스텁으로 대체 — 외부 실호출 금지(헌법).
  // 실제 AddressSearch 코드 경로(oncomplete → onSelect 매핑)를 그대로 태운다.
  await page.route('**/postcode.v2.js', r => r.fulfill({
    status: 200, contentType: 'application/javascript',
    body: `window.daum = { Postcode: function (opts) {
      this.embed = function () {
        setTimeout(function () {
          opts.oncomplete({
            roadAddress: '서울 마포구 양화로 45',
            jibunAddress: '서울 마포구 서교동 332-4',
            zonecode: '04039', buildingName: '모두빌딩',
            bcode: '1144012300', sigunguCode: '11440', apartment: 'N',
          })
        }, 0)
      }
    } }`,
  }))
}

/** 주소 검색 버튼 → 스텁 위젯이 즉시 선택을 돌려준다 */
async function pickAddress(page) {
  await page.getByRole('button', { name: /주소 검색/ }).click()
  await expect(page.getByText('서울 마포구 양화로 45')).toBeVisible()
}

test('단독 층 건물: 확인 카드 → [맞아요] → 층·면적 반영', async ({ page }) => {
  await setupE1(page, { floors: [{ flrGbCdNm: '지상', flrNoNm: '1층', area: 45.2 }] })
  await page.goto('/e1/1')
  await pickAddress(page)

  await expect(page.getByTestId('autofill-card')).toBeVisible()
  await expect(page.getByTestId('autofill-summary')).toHaveText('1층 · 45.2㎡ · 2009년 준공')
  await page.getByTestId('autofill-accept').click()
  await expect(page.getByTestId('autofill-accepted')).toBeVisible()
  await expect(page.locator('input[placeholder="면적 입력"]')).toHaveValue('45.2')
})

test('집합건물(호실 미상): 층·면적은 비우고 연식·용도만 — 직접 입력 유지', async ({ page }) => {
  await setupE1(page, {
    expos: [
      { hoNm: '101호', flrNoNm: '1층', exposPubuseGbCdNm: '전유', area: 30 },
      { hoNm: '102호', flrNoNm: '1층', exposPubuseGbCdNm: '전유', area: 40 },
    ],
  })
  await page.goto('/e1/1')
  await pickAddress(page)

  await expect(page.getByTestId('autofill-summary')).toHaveText('2009년 준공')
  await page.getByTestId('autofill-accept').click()
  await expect(page.locator('input[placeholder="면적 입력"]')).toHaveValue('') // 추정 금지
})

test('조회 실패: 카드 없이 직접 입력 안내 (에러 노출 없음)', async ({ page }) => {
  await setupE1(page, { registryFail: true })
  await page.goto('/e1/1')
  await pickAddress(page)

  await expect(page.getByTestId('autofill-card')).toHaveCount(0)
  await expect(page.getByText('층·면적은 아래에 입력해 주세요')).toBeVisible()
  await expect(page.getByText(/오류|실패|에러/)).toHaveCount(0)
})

test('업종 확인 칩: [맞아요] → 업종 반영 / [다른 업종이에요] → 그대로', async ({ page }) => {
  await setupE1(page, {
    floors: [{ flrGbCdNm: '지상', flrNoNm: '1층', area: 45.2 }],
    stores: [{ bizesNm: '모두카페', ksicCd: 'I56221', ksicNm: '커피 전문점', indsSclsNm: '카페',
      lnoAdr: '서울특별시 마포구 서교동 332-4', rdnmAdr: '서울특별시 마포구 양화로 45', ldongCd: '1144012300' }],
  })
  await page.goto('/e1/1')
  await pickAddress(page)

  await expect(page.getByTestId('industry-confirm')).toBeVisible()
  await expect(page.getByTestId('industry-confirm')).toContainText('카페')
  await page.getByTestId('industry-no').click()
  await expect(page.getByTestId('industry-confirm')).toHaveCount(0) // 답하면 사라진다
})
