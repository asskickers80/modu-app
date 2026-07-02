/**
 * Playwright 공용 헬퍼
 *
 * - mockGemini: Gemini API를 인터셉트해 더미 응답 반환 (실제 API 키 불필요)
 * - setSellerLocalStorage: 양도자 프로필을 localStorage에 직접 심기
 */

// generateListingDraft 가 기대하는 JSON 구조
const DRAFT_JSON = JSON.stringify({
  description: '서교동 고양이 카페입니다. 보증금 3,000만원, 월세 200만원 조건의 B1층 매물이에요.',
  facility: '에스프레소 머신, 냉장 쇼케이스 등이 구비된 것으로 추정됩니다.',
  salesAnalysis: null,
})

function geminiBody(text) {
  return JSON.stringify({
    candidates: [{ content: { parts: [{ text }] } }],
  })
}

/**
 * Gemini REST API 전체를 가로채 더미 응답 반환.
 * generateListingDraft 요청은 JSON, 나머지는 plain text 반환.
 */
export async function mockGemini(page) {
  await page.route('https://generativelanguage.googleapis.com/**', async route => {
    const body = JSON.parse(route.request().postData() || '{}')
    const prompt = body.contents?.[0]?.parts?.[0]?.text ?? ''

    const isDraft = prompt.includes('카피라이터') || prompt.includes('초안')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: isDraft
        ? geminiBody(DRAFT_JSON)
        : geminiBody('사진을 추가하면 양수자 관심이 더 높아져요.'),
    })
  })
}

/**
 * localStorage에 양도자 프로필을 직접 심는다.
 * A7SellerDashboard 에 직접 접근할 때 getProfile() 오류를 방지.
 */
export async function setSellerLocalStorage(page) {
  await page.evaluate(() => {
    localStorage.setItem('modu_user_profile', JSON.stringify({
      category: 'seller',
      bizType: '카페·디저트',
      region: '서울',
      transfer: 'full',
    }))
  })
}

/**
 * A2→A3→A4(네이버 더미)→A7 온보딩을 자동으로 통과.
 * 양도자 경로 기준.
 */
export async function runSellerOnboarding(page) {
  await page.goto('/a2')
  await page.getByText('이제 그만할 때가 됐나봐요').click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByText('카페·디저트').click()
  await page.getByText('서울').click()
  await page.getByText('자리·시설만').click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('button', { name: '네이버로 시작하기' }).click()
}
