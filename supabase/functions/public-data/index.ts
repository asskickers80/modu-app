// data.go.kr 계열 프록시 — 국세청 사업자상태·소진공 상권·국토부 실거래·건축HUB 건축물대장.
// 단일 키(PUBLIC_DATA_KEY)를 공유하므로 경로 파라미터로 분기한다.
//
// verify_jwt = false — 근거: 비로그인 방문자가 보는 매물 상세(E2)가 실거래·상권 데이터를
// 읽고, 등록 1단계(주소 자동 채움)도 로그인 전에 동작한다. JWT를 요구하면 열람이 깨진다.
import { handler, json, passthrough } from '../_shared/proxy.ts'

const UPSTREAM = 'https://apis.data.go.kr'

// 앱이 실제로 쓰는 경로만 통과 — 개방 프록시 방지 (기존 api/opendata 화이트리스트와 동일 정책)
const ALLOWED = [
  '1613000/RTMSDataSvcNrgTrade',   // 국토부 상업업무용 실거래가
  'B553077/api/open/sdsc2',        // 소상공인시장진흥공단 상가(상권)정보
  '1613000/BldRgstHubService',     // 국토부 건축HUB 건축물대장
  'B552016/NtsBusinessmanService', // 국세청 사업자등록 상태조회
]

Deno.serve(handler('public-data', async (req) => {
  const url = new URL(req.url)
  // /functions/v1/public-data/<upstream path>?<query>
  const path = url.pathname.replace(/^\/functions\/v1\/public-data\/?/, '')
  if (!ALLOWED.some((a) => path.startsWith(a))) return json({ error: 'path not allowed' }, 403)

  const key = Deno.env.get('PUBLIC_DATA_KEY')
  if (!key) return json({ error: 'PUBLIC_DATA_KEY not configured' }, 503)

  const params = new URLSearchParams(url.search)
  params.set('serviceKey', key) // 클라이언트가 보낸 값이 있어도 서버 키로 덮어쓴다

  const init: RequestInit = { method: req.method }
  if (req.method === 'POST') {
    init.body = await req.text()
    init.headers = { 'Content-Type': req.headers.get('content-type') ?? 'application/json' }
  }
  const r = await fetch(`${UPSTREAM}/${path}?${params}`, init)
  return passthrough(await r.text(), r.status, r.headers.get('content-type') ?? 'text/plain')
}))
