// Gemini 프록시 — 매물·상가 소개글 생성. 키를 서버에만 둔다.
//
// verify_jwt = true — 근거: 소개글 생성은 등록 흐름(내 매물을 만드는 사람)만 쓰고,
// 비로그인 열람 경로에는 없다. 호출당 비용이 발생하므로 익명 개방은 남용 위험이 크다.
// ※ 다만 앱은 비로그인 등록을 허용하므로(기기 ID 신원 모델), 전환 시점에
//    익명 세션 토큰이 붙는지 확인이 필요하다 — 미확인 상태에서는 프록시를 켜지 않는다.
import { handler, json } from '../_shared/proxy.ts'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

Deno.serve(handler('gemini', async (req) => {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) return json({ error: 'GEMINI_API_KEY not configured' }, 503)
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const { model = 'gemini-2.5-flash', body } = await req.json().catch(() => ({}))
  if (!body) return json({ error: 'body required' }, 400)

  const r = await fetch(`${BASE}/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return json(await r.json(), r.status)
}))
