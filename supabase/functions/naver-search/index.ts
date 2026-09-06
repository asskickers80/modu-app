// 네이버 검색 API 프록시 — 뉴스(시장 동향 배치)·지역(주변 부동산).
//
// verify_jwt = false — 근거: 주변 부동산 카드가 매물 등록 1단계(로그인 전)에 노출되고,
// 뉴스 수집은 서버 배치가 부른다. 둘 다 사용자 세션이 없는 경로다.
import { handler, json } from '../_shared/proxy.ts'

const ENDPOINT: Record<string, string> = {
  news: 'https://openapi.naver.com/v1/search/news.json',
  local: 'https://openapi.naver.com/v1/search/local.json',
}

Deno.serve(handler('naver-search', async (req) => {
  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') ?? 'local'
  const target = ENDPOINT[kind]
  if (!target) return json({ error: 'unknown kind' }, 400)

  const id = Deno.env.get('NAVER_SEARCH_CLIENT_ID')
  const secret = Deno.env.get('NAVER_SEARCH_CLIENT_SECRET')
  if (!id || !secret) return json({ error: 'naver search keys not configured' }, 503)

  const q = new URLSearchParams()
  q.set('query', url.searchParams.get('query') ?? '')
  q.set('display', url.searchParams.get('display') ?? '10')
  if (url.searchParams.get('sort')) q.set('sort', url.searchParams.get('sort')!)

  const r = await fetch(`${target}?${q}`, {
    headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret },
  })
  return json(await r.json(), r.status)
}))
