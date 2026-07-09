// Vercel 서버리스 프록시 — 인트라넷(INTRANET_TARGET)을 같은 출처(/)로 중계한다.
// dev의 Vite 프록시와 동일한 역할을 프로덕션(Vercel)에서 수행.
// 핵심: 인트라넷 로그인 세션 유지 → 요청의 Cookie 전달 + 응답 Set-Cookie의 Domain 제거로
//       브라우저가 Vercel 도메인에 쿠키를 저장하게 하고, 다음 요청에 다시 실어 보낸다.
//
// 라우팅: vercel.json이 /app/* (앱) 외 모든 경로를 이 함수로 rewrite하며,
//         원본 경로를 ?__path= 로 전달한다.

export const config = { api: { bodyParser: false } }

// 프록시에서 그대로 전달하면 안 되는 요청 헤더
const STRIP_REQUEST = new Set([
  'host', 'connection', 'content-length', 'accept-encoding',
  'x-vercel-id', 'x-vercel-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
  'x-real-ip', 'forwarded',
])
// 응답에서 다시 계산되어야 하는 헤더
const STRIP_RESPONSE = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection'])

// Set-Cookie 재작성: Domain 제거(→ Vercel 호스트에 저장), Secure 보장, SameSite 기본 Lax
export function rewriteSetCookie(cookie) {
  const parts = cookie.split(';').filter(p => !/^\s*domain=/i.test(p))
  let out = parts.join(';').trim()
  if (!/;\s*secure/i.test(out)) out += '; Secure'
  if (!/;\s*samesite=/i.test(out)) out += '; SameSite=Lax'
  return out
}

// Location(리다이렉트) 재작성: 대상 오리진으로 시작하면 경로만 남겨 프록시에 머물게 한다
export function rewriteLocation(location, targetOrigin) {
  if (!location) return location
  if (location.startsWith(targetOrigin)) return location.slice(targetOrigin.length) || '/'
  return location // 상대경로/외부링크는 그대로
}

// 대상 URL 조립 — __path(원본 경로 + 쿼리)를 INTRANET_TARGET에 붙인다
export function buildTargetUrl(target, rawPath) {
  const base = target.replace(/\/$/, '')
  const path = rawPath && rawPath !== '' ? (rawPath.startsWith('/') ? rawPath : `/${rawPath}`) : '/'
  return base + path
}

// 최상위 브라우저 방문(사람)이 루트로 들어오면 앱(/app/)으로 보낸다.
// iframe 안에서의 요청(Sec-Fetch-Dest: iframe)이나 하위 경로는 인트라넷 그대로 프록시.
export function shouldRedirectToApp(path, headers) {
  if (path !== '/' && path !== '') return false
  const dest = headers['sec-fetch-dest']
  const mode = headers['sec-fetch-mode']
  return dest === 'document' && mode === 'navigate' // 최상위 문서 내비게이션만
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// 원문 요청 본문 확보 — Vercel이 이미 파싱해 req.body를 채웠으면 원래 형식으로 되돌리고,
// 아니면(bodyParser 비활성) 원본 스트림을 그대로 읽는다. (로그인·인증번호 POST 손상 방지)
async function getRawBody(req) {
  const b = req.body
  if (b !== undefined && b !== null) {
    if (Buffer.isBuffer(b)) return b
    if (typeof b === 'string') return Buffer.from(b)
    const ct = (req.headers['content-type'] || '').toLowerCase()
    if (ct.includes('application/x-www-form-urlencoded')) return Buffer.from(new URLSearchParams(b).toString())
    if (ct.includes('application/json')) return Buffer.from(JSON.stringify(b))
    return Buffer.from(String(b))
  }
  return readBody(req)
}

// 순수 프록시 로직 (테스트에서 직접 호출) — Node 전역 fetch 사용
// selfOrigin: 프록시(Vercel) 자신의 오리진 — Origin/Referer를 인트라넷 것으로 교정해
//             ASP 서버의 CSRF/Referer 검사를 통과시킨다.
export async function proxyRequest({ target, method, path, headers, body, selfOrigin }) {
  const targetOrigin = new URL(target).origin
  const url = buildTargetUrl(target, path)

  const fwd = {}
  for (const [k, v] of Object.entries(headers)) {
    if (!STRIP_REQUEST.has(k.toLowerCase())) fwd[k] = v
  }
  // Origin/Referer를 인트라넷 오리진으로 교정 (서버가 "자기 사이트에서 온 요청"으로 인식)
  if (fwd.origin || fwd.Origin) { delete fwd.Origin; fwd.origin = targetOrigin }
  const refKey = fwd.referer !== undefined ? 'referer' : (fwd.Referer !== undefined ? 'Referer' : null)
  if (refKey && selfOrigin) fwd[refKey] = String(fwd[refKey]).split(selfOrigin).join(targetOrigin)

  const res = await fetch(url, {
    method,
    headers: fwd,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
    redirect: 'manual', // 리다이렉트를 우리가 재작성
  })

  const outHeaders = {}
  const setCookies = []
  // Node fetch: 다중 Set-Cookie는 getSetCookie()로 수집
  const rawSetCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  for (const c of rawSetCookie) setCookies.push(rewriteSetCookie(c))

  res.headers.forEach((value, key) => {
    const lk = key.toLowerCase()
    if (lk === 'set-cookie') return // 위에서 처리
    if (STRIP_RESPONSE.has(lk)) return
    if (lk === 'location') { outHeaders[key] = rewriteLocation(value, targetOrigin); return }
    outHeaders[key] = value
  })

  let bodyBuf = Buffer.from(await res.arrayBuffer())

  // HTML이면 대상 오리진 절대URL을 루트상대로 바꿔 프록시에 머물게 한다.
  // ⚠️ 인트라넷이 EUC-KR/CP949 등 비-UTF-8일 수 있으므로 UTF-8 디코딩 금지.
  //    latin1(바이트 1:1 매핑)로 다뤄 ASCII 링크만 치환 → 한글 바이트·원본 charset 보존.
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('text/html')) {
    let s = bodyBuf.toString('latin1')
    s = s.split(targetOrigin).join('')
      .split(targetOrigin.replace(/^https?:/, '')).join('') // protocol-relative
    bodyBuf = Buffer.from(s, 'latin1')
  }

  return { status: res.status, headers: outHeaders, setCookies, body: bodyBuf }
}

export default async function handler(req, res) {
  const target = process.env.INTRANET_TARGET
  if (!target) {
    res.statusCode = 500
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end('INTRANET_TARGET 환경변수가 설정되지 않았습니다 (Vercel 대시보드에서 등록하세요).')
    return
  }

  try {
    const u = new URL(req.url, 'http://localhost')
    const path = u.searchParams.get('__path') || '/'

    // 사람이 도메인 루트로 직접 방문 → 앱으로 이동 (인트라넷은 앱 안 천하통일 탭에서)
    if (shouldRedirectToApp(path, req.headers)) {
      res.statusCode = 302
      res.setHeader('location', '/app/')
      res.end()
      return
    }

    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await getRawBody(req)
    // 프록시 자신(Vercel)의 오리진 — Origin/Referer 교정용
    const proto = req.headers['x-forwarded-proto'] || 'https'
    const selfHost = req.headers['x-forwarded-host'] || req.headers.host
    const selfOrigin = selfHost ? `${proto}://${selfHost}` : undefined

    const out = await proxyRequest({ target, method: req.method, path, headers: req.headers, body, selfOrigin })

    res.statusCode = out.status
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v)
    if (out.setCookies.length) res.setHeader('set-cookie', out.setCookies)
    res.end(out.body)
  } catch (err) {
    res.statusCode = 502
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end(`인트라넷 프록시 오류: ${err.message || err}`)
  }
}
