// 고아 사진 정리 배치 (ORDER-key-proxy-account-deletion 작업 C-3)
//
// PhotoGrid는 파일 선택 즉시 Storage에 업로드하므로, 등록을 끝내지 않고 이탈하면
// 매물 행 없는 파일만 남는다. 24시간 이상 어떤 매물에도 연결되지 않은 파일을 지운다.
//
// ★ 작업 D 고려: 초안이 listings에 status='draft'로 저장되면, 그 초안의 image_urls도
//   "연결된 파일"이 된다. 아래 조회는 status를 가리지 않고 listings 전체를 보므로
//   draft에 연결된 파일은 자동으로 제외 대상이 된다 — D가 들어와도 수정 불필요.
//
// verify_jwt = false — 크론 호출용. CRON_SECRET으로 보호한다.
import { handler, json } from '../_shared/proxy.ts'

const BUCKET = 'Modu Apps'
const KEEP_MS = 24 * 60 * 60 * 1000 // 24시간

Deno.serve(handler('cleanup-orphan-photos', async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return json({ error: 'unauthorized' }, 401)
  }
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json({ error: 'service role not configured' }, 503)

  const admin = (path: string, init: RequestInit) =>
    fetch(`${url}${path}`, {
      ...init,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })

  // 1) 연결된 파일 집합 — listings 전체(draft 포함)의 사진 URL
  const listRes = await admin('/rest/v1/listings?select=image_urls,interior_image_urls,exterior_image_urls', { method: 'GET' })
  if (!listRes.ok) return json({ error: 'listings query failed' }, 500)
  const rows = await listRes.json().catch(() => [])
  const linked = new Set<string>()
  for (const r of Array.isArray(rows) ? rows : []) {
    for (const k of ['image_urls', 'interior_image_urls', 'exterior_image_urls']) {
      for (const u of (r?.[k] ?? [])) {
        if (typeof u === 'string') linked.add(u.split('/').slice(-2).join('/')) // <업로더>/<파일명>
      }
    }
  }

  // 2) 업로더 폴더를 훑어 24시간 넘은 미연결 파일 수집
  const folders = await admin(`/storage/v1/object/list/${encodeURIComponent(BUCKET)}`, {
    method: 'POST',
    body: JSON.stringify({ prefix: 'listings/', limit: 1000, offset: 0 }),
  }).then(r => r.ok ? r.json() : []).catch(() => [])

  const now = Date.now()
  const orphans: string[] = []
  for (const f of Array.isArray(folders) ? folders : []) {
    // 하위 폴더(업로더별)만 순회 — id가 null이면 폴더다
    if (f?.id) continue
    const prefix = `listings/${f.name}/`
    const files = await admin(`/storage/v1/object/list/${encodeURIComponent(BUCKET)}`, {
      method: 'POST',
      body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    }).then(r => r.ok ? r.json() : []).catch(() => [])
    for (const file of Array.isArray(files) ? files : []) {
      if (!file?.name) continue
      const created = Date.parse(file.created_at ?? '')
      if (!Number.isFinite(created) || now - created < KEEP_MS) continue // 24시간 유예
      if (linked.has(`${f.name}/${file.name}`)) continue                  // 매물·초안에 연결됨
      orphans.push(`${prefix}${file.name}`)
    }
  }

  if (!orphans.length) return json({ ok: true, deleted: 0, scanned: rows.length })

  const del = await admin(`/storage/v1/object/${encodeURIComponent(BUCKET)}`, {
    method: 'DELETE', body: JSON.stringify({ prefixes: orphans }),
  })
  return json({ ok: del.ok, deleted: del.ok ? orphans.length : 0, orphans: orphans.length })
}))
