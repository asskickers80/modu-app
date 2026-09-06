// Edge Function 공용 유틸 (ORDER-key-proxy-account-deletion 작업 A)
// 네이티브 앱 전환 대비 — 공공 API 키를 서버에만 두고 앱은 이 함수들만 부른다.

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

export const passthrough = (text: string, status: number, contentType: string) =>
  new Response(text, { status, headers: { ...CORS, 'Content-Type': contentType } })

/**
 * 호출 기록 — NCP·data.go.kr 이용량 상한 감시용 (A-6).
 * events 테이블에 남기며, 실패해도 본 응답을 막지 않는다.
 */
export async function logCall(
  fn: string,
  ok: boolean,
  ms: number,
  extra: Record<string, unknown> = {},
) {
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')
    if (!url || !key) return
    await fetch(`${url}/rest/v1/events`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        device_id: 'edge',           // 서버 발생 이벤트 — 기기 구분 없음
        event_name: `edge_${fn}`,
        payload: { ok, ms, ...extra },
      }),
    })
  } catch (_) { /* 기록 실패는 삼킨다 */ }
}

/** 공용 핸들러 래퍼 — CORS preflight·시간 측정·기록을 한 곳에서 */
export function handler(fn: string, run: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    const t0 = Date.now()
    try {
      const res = await run(req)
      logCall(fn, res.ok, Date.now() - t0, { status: res.status })
      return res
    } catch (e) {
      logCall(fn, false, Date.now() - t0, { error: String((e as Error)?.message ?? e) })
      return json({ error: 'upstream failed' }, 502)
    }
  }
}
