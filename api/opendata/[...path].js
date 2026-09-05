// 공공데이터포털(apis.data.go.kr) 프록시 — 브라우저 CORS 우회.
// 개발은 vite 프록시(/api/opendata), 프로덕션은 이 함수가 같은 경로를 받는다.
// 개방 프록시가 되지 않게 앱이 실제 쓰는 API 경로만 허용한다.
const ALLOWED_PREFIXES = [
  '1613000/RTMSDataSvcNrgTrade', // 국토부 상업업무용 실거래가
  'B553077/api/open/sdsc2',      // 소상공인시장진흥공단 상가(상권)정보
  '1613000/BldRgstHubService',   // 국토부 건축HUB 건축물대장 (address-autofill)
]

// 서버에서 키를 붙이는 경로 — 클라이언트가 키를 들고 있지 않아도 된다.
// (기존 두 API는 클라이언트가 serviceKey를 실어 보내는 현행 구조 유지 — 이번 범위 밖)
const SERVER_KEYED = ['1613000/BldRgstHubService']
const serviceKey = () => process.env.PUBLIC_DATA_KEY ?? process.env.VITE_PUBLIC_DATA_KEY ?? null

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })
  const { path = [], ...query } = req.query
  const p = Array.isArray(path) ? path.join('/') : String(path)
  if (!ALLOWED_PREFIXES.some(a => p.startsWith(a))) {
    return res.status(403).json({ error: 'path not allowed' })
  }
  const params = new URLSearchParams(query)
  if (SERVER_KEYED.some(a => p.startsWith(a))) {
    const key = serviceKey()
    if (!key) return res.status(503).json({ error: 'service key not configured' })
    params.set('serviceKey', key) // 클라이언트가 보낸 값이 있어도 서버 키로 덮어쓴다
  }
  const qs = params.toString()
  try {
    const r = await fetch(`https://apis.data.go.kr/${p}${qs ? `?${qs}` : ''}`)
    const text = await r.text()
    res.setHeader('Content-Type', r.headers.get('content-type') ?? 'text/plain')
    return res.status(r.status).send(text)
  } catch (e) {
    return res.status(502).json({ error: String(e?.message ?? e) })
  }
}
