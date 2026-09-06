/**
 * 외부 API 단일 관문 (ORDER-key-proxy-account-deletion 작업 A-3)
 *
 * 모든 외부 호출은 이 모듈만 통과한다. 호출부에 직접 fetch를 남기지 않는다.
 * 네이티브 앱 전환 시 Vercel(api/*)은 웹 전용이 되므로, 최종 목적지는 Supabase
 * Edge Functions다. 전환은 VITE_USE_EDGE_PROXY 하나로 켠다.
 *
 * 기본값 off — Supabase secrets 설정 전에 배포돼도 기존 경로(Vercel·직접 호출)로
 * 그대로 동작한다(A-4). secrets 설정 통보를 받으면 on으로 바꾼다.
 */
// supabase는 callEdge 안에서 동적 import — 이 모듈을 import하는 순수 로직(storeLookup·
// buildingRegistry 등)을 테스트가 Node에서 직접 불러올 수 있게 유지한다
// (supabase.js는 Vite 전용 import.meta.env를 모듈 스코프에서 읽는다)

// 지연 참조 — Node(테스트)에서 import.meta.env가 없어도 모듈 로드가 깨지지 않게
const env = (k) => {
  try { return import.meta.env?.[k] ?? '' } catch (_) { return '' }
}
const supabaseUrl = () => env('VITE_SUPABASE_URL')
const edgeBase = () => `${supabaseUrl()}/functions/v1`

export const usingEdgeProxy = () => String(env('VITE_USE_EDGE_PROXY')) === 'true' && !!supabaseUrl()

/** Edge Function 호출 — 로그인 세션이 있으면 JWT를 싣는다(verify_jwt 함수용) */
async function callEdge(fn, { path = '', query = null, method = 'GET', body = null } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const anon = env('VITE_SUPABASE_ANON_KEY')
  headers.apikey = anon
  try {
    const { supabase } = await import('./supabase')
    const { data: { session } } = await supabase.auth.getSession()
    headers.Authorization = `Bearer ${session?.access_token ?? anon}`
  } catch (_) {
    if (anon) headers.Authorization = `Bearer ${anon}` // 세션 조회 실패는 익명 호출로
  }

  const qs = query ? `?${new URLSearchParams(query)}` : ''
  return fetch(`${edgeBase()}/${fn}${path}${qs}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

// ── data.go.kr 계열 ─────────────────────────────────────────
// 기존 경로: /api/opendata/<path>?serviceKey=...(클라이언트 키)
// 전환 경로: <edge>/public-data/<path>?...(서버가 키 주입)
export function publicDataUrl(path, query = {}) {
  const params = new URLSearchParams(query)
  if (usingEdgeProxy()) return { url: `${edgeBase()}/public-data/${path}?${params}`, edge: true }
  return { url: `/api/opendata/${path}?${params}`, edge: false }
}

export async function fetchPublicData(path, query = {}) {
  if (usingEdgeProxy()) return callEdge('public-data', { path: `/${path}`, query })
  const params = new URLSearchParams(query)
  return fetch(`/api/opendata/${path}?${params}`)
}

// ── 네이버 검색(지역·뉴스) ───────────────────────────────────
export async function fetchNaverSearch({ kind = 'local', query, display = 10, sort = null }) {
  if (usingEdgeProxy()) {
    return callEdge('naver-search', { query: { kind, query, display: String(display), ...(sort ? { sort } : {}) } })
  }
  // 기존 경로 — Vercel 함수(지역 검색만 존재)
  return fetch(`/api/nearby-brokers?query=${encodeURIComponent(query)}`)
}

// ── NCP 지오코딩 ────────────────────────────────────────────
export async function fetchGeo(body) {
  if (usingEdgeProxy()) return callEdge('ncp-geo', { method: 'POST', body })
  return fetch('/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Gemini ─────────────────────────────────────────────────
export async function fetchGemini({ model, body }) {
  if (usingEdgeProxy()) return callEdge('gemini', { method: 'POST', body: { model, body } })
  const key = env('VITE_GEMINI_API_KEY')
  const base = 'https://generativelanguage.googleapis.com/v1beta/models'
  return fetch(`${base}/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── 계정 삭제 ───────────────────────────────────────────────
// Edge Function 전용 — 대체 경로가 없다(service role이 필요해 클라이언트 불가).
export async function requestAccountDeletion() {
  if (!supabaseUrl()) return { ok: false, error: 'not-configured' }
  try {
    const res = await callEdge('delete-account', { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok && json?.ok === true, ...json }
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}
