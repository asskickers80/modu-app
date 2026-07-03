/**
 * 커뮤니티 Q&A 최소 루프
 *
 * 1. Q&A 탭: community_posts 실데이터 렌더 + 옛 더미 부재
 * 2. 질문 등록: insert payload(author_device_id·닉네임·category·제목·내용) 단언
 * 3. 상세: 글 단건 + 댓글 실렌더, 답변 등록 insert payload 단언
 * 4. 없는 id: "글을 찾을 수 없어요"
 *
 * 추천 피드·오픈채팅 탭은 더미 유지 대상이라 건드리지 않음.
 */
import { test, expect } from '@playwright/test'
import { mockGemini } from './helpers.js'

const SUPABASE_POSTS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/community_posts*'
const SUPABASE_COMMENTS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/community_comments*'
const SUPABASE_CONVERSATIONS = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1/conversations*'

const MY_DEVICE = 'qna-device'

const POST_ROW = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  title: '실제 질문입니다',
  body: '실제 질문 본문이에요. 답변 부탁드려요.',
  author_device_id: 'someone-device',
  author_nickname: '김질문',
  category: 'seller',
  created_at: new Date().toISOString(),
}

const COMMENT_ROW = {
  id: 'cccccccc-0000-0000-0000-000000000001',
  post_id: POST_ROW.id,
  author_device_id: 'answer-device',
  author_nickname: '답변왕',
  text: '기존 답변입니다',
  created_at: new Date().toISOString(),
}

test.describe('커뮤니티 Q&A 최소 루프', () => {
  test.beforeEach(async ({ page }) => {
    await mockGemini(page) // AI 인사이트 mock (실호출 금지)
    await page.addInitScript(id => {
      localStorage.setItem('modu_device_id', id)
      localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', name: '김모두' }))
    }, MY_DEVICE)
    await page.route(SUPABASE_CONVERSATIONS, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
  })

  test('Q&A 탭: 실데이터 렌더 + 옛 더미 부재', async ({ page }) => {
    await page.route(SUPABASE_POSTS, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([POST_ROW]) })
    })

    await page.goto('/community')
    await page.getByRole('button', { name: '질문·답변' }).click()

    await expect(page.getByText('실제 질문입니다')).toBeVisible()
    await expect(page.getByText('김질문')).toBeVisible()
    // 옛 QNA_POSTS 더미 부재
    await expect(page.getByText('권리금 받을 때 세금은 얼마나 내나요?')).not.toBeVisible()
    await expect(page.getByText('폐업 신고 순서 알려주세요')).not.toBeVisible()
  })

  test('질문 등록: insert payload(device_id·닉네임·category) + 0건 안내', async ({ page }) => {
    let savedBody = null
    await page.route(SUPABASE_POSTS, async route => {
      if (route.request().method() === 'POST') {
        savedBody = JSON.parse(route.request().postData())
        await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
    })

    await page.goto('/community')
    await page.getByRole('button', { name: '질문·답변' }).click()

    // 0건 안내
    await expect(page.getByText('첫 질문을 남겨보세요')).toBeVisible()

    // 질문 등록
    await page.getByRole('button', { name: /질문 등록하기/ }).click()
    await page.getByPlaceholder('질문 제목').fill('테스트 질문 제목')
    await page.getByPlaceholder('궁금한 내용을 적어주세요').fill('테스트 질문 내용입니다')
    await page.getByRole('button', { name: '등록', exact: true }).click()

    await expect(page.getByText('질문이 등록됐어요')).toBeVisible()
    expect(savedBody, 'community_posts insert가 호출되지 않음').not.toBeNull()
    const row = Array.isArray(savedBody) ? savedBody[0] : savedBody
    expect(row.author_device_id).toBe(MY_DEVICE)
    expect(row.author_nickname).toBe('김모두')
    expect(row.category).toBe('seller')
    expect(row.title).toBe('테스트 질문 제목')
    expect(row.body).toBe('테스트 질문 내용입니다')
  })

  test('상세: 글+댓글 실렌더, 답변 등록 insert payload', async ({ page }) => {
    let savedComment = null
    await page.route(SUPABASE_POSTS, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([POST_ROW]) })
    })
    await page.route(SUPABASE_COMMENTS, async route => {
      if (route.request().method() === 'POST') {
        savedComment = JSON.parse(route.request().postData())
        await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([COMMENT_ROW]) })
      }
    })

    await page.goto(`/community/post/${POST_ROW.id}`)

    // 글 + 댓글 실렌더
    await expect(page.getByText('실제 질문입니다')).toBeVisible()
    await expect(page.getByText('실제 질문 본문이에요. 답변 부탁드려요.')).toBeVisible()
    await expect(page.getByText('답변 1개')).toBeVisible()
    await expect(page.getByText('기존 답변입니다')).toBeVisible()
    await expect(page.getByText('답변왕')).toBeVisible()
    // 카테고리 색점: 글쓴이 1개만 (댓글엔 category 미저장 — 표시 없음)
    await expect(page.getByTestId('category-dot')).toHaveCount(1)

    // 답변 등록
    await page.getByPlaceholder('도움이 될 답변을 남겨주세요...').fill('새 답변입니다')
    await page.getByRole('button', { name: '등록', exact: true }).click()

    await expect.poll(() => savedComment, { message: 'community_comments insert가 호출되지 않음' }).not.toBeNull()
    const row = Array.isArray(savedComment) ? savedComment[0] : savedComment
    expect(row.post_id).toBe(POST_ROW.id)
    expect(row.author_device_id).toBe(MY_DEVICE)
    expect(row.author_nickname).toBe('김모두')
    expect(row.text).toBe('새 답변입니다')
  })

  test('카테고리 있는 글: 색점 + 라벨 렌더', async ({ page }) => {
    await page.route(SUPABASE_POSTS, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([POST_ROW]) })
    })

    await page.goto('/community')
    await page.getByRole('button', { name: '질문·답변' }).click()

    // 카드에 "라벨 + 닉네임" (POST_ROW.category = seller)
    await expect(page.getByRole('button', { name: /양도자 김질문/ })).toBeVisible()
    // 색점: 양도자 네이비 #1a4d8f
    const dot = page.getByTestId('category-dot')
    await expect(dot).toHaveCount(1)
    await expect(dot).toHaveCSS('background-color', 'rgb(26, 77, 143)')
  })

  test('category null인 옛 글: 색점 없이 닉네임만', async ({ page }) => {
    await page.route(SUPABASE_POSTS, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ ...POST_ROW, category: null }]),
      })
    })

    await page.goto('/community')
    await page.getByRole('button', { name: '질문·답변' }).click()

    await expect(page.getByText('실제 질문입니다')).toBeVisible()
    await expect(page.getByText('김질문')).toBeVisible()
    await expect(page.getByTestId('category-dot')).toHaveCount(0)
  })

  test('필터칩: 선택한 카테고리 글만 표시', async ({ page }) => {
    const SELLER_POST = { ...POST_ROW, id: 'aaaaaaaa-bbbb-cccc-dddd-000000000011', title: '양도자 질문글', category: 'seller' }
    const STARTUP_POST = { ...POST_ROW, id: 'aaaaaaaa-bbbb-cccc-dddd-000000000012', title: '창업 질문글', category: 'startup', author_nickname: '창업김' }
    await page.route(SUPABASE_POSTS, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SELLER_POST, STARTUP_POST]) })
    })

    await page.goto('/community')
    await page.getByRole('button', { name: '질문·답변' }).click()

    // 기본 [전체]: 둘 다 표시
    await expect(page.getByText('양도자 질문글')).toBeVisible()
    await expect(page.getByText('창업 질문글')).toBeVisible()

    // [창업준비] 선택 → 창업 글만
    await page.getByRole('button', { name: '창업준비', exact: true }).click()
    await expect(page.getByText('창업 질문글')).toBeVisible()
    await expect(page.getByText('양도자 질문글')).not.toBeVisible()

    // [전체] 복귀 → 둘 다
    await page.getByRole('button', { name: '전체', exact: true }).click()
    await expect(page.getByText('양도자 질문글')).toBeVisible()
    await expect(page.getByText('창업 질문글')).toBeVisible()
  })

  test('없는 id: 글을 찾을 수 없어요', async ({ page }) => {
    await page.route(SUPABASE_POSTS, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route(SUPABASE_COMMENTS, async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.goto('/community/post/no-such-post-id')

    await expect(page.getByText('글을 찾을 수 없어요')).toBeVisible()
    await expect(page.getByRole('button', { name: '돌아가기' })).toBeVisible()
  })
})
