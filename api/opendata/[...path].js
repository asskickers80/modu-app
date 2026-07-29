// 공공데이터포털(apis.data.go.kr) 프록시 — 브라우저 CORS 우회.
// 개발은 vite 프록시(/api/opendata), 프로덕션은 이 함수가 같은 경로를 받는다.
// 개방 프록시가 되지 않게 앱이 실제 쓰는 API 경로만 허용한다.
const ALLOWED_PREFIXES = [
  '1613000/RTMSDataSvcNrgTrade', // 국토부 상업업무용 실거래가
  'B553077/api/open/sdsc2',      // 소상공인시장진흥공단 상가(상권)정보
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })
  const { path = [], ...query } = req.query
  const p = Array.isArray(path) ? path.join('/') : String(path)
  if (!ALLOWED_PREFIXES.some(a => p.startsWith(a))) {
    return res.status(403).json({ error: 'path not allowed' })
  }
  const qs = new URLSearchParams(query).toString()
  try {
    const r = await fetch(`https://apis.data.go.kr/${p}${qs ? `?${qs}` : ''}`)
    const text = await r.text()
    res.setHeader('Content-Type', r.headers.get('content-type') ?? 'text/plain')
    return res.status(r.status).send(text)
  } catch (e) {
    return res.status(502).json({ error: String(e?.message ?? e) })
  }
}
