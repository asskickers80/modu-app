// 네이버 지역 검색 프록시 (Vercel 서버리스) — "내 주변 부동산" 외부 채움용.
// 개발자센터(openapi.naver.com) 검색 API. secret은 서버 env로만 보관 (브라우저 노출 금지).
// 키 미설정이면 disabled 반환 → 클라이언트는 카드 자체를 렌더하지 않는다 (준비중 껍데기 금지).
const ID = process.env.NAVER_SEARCH_CLIENT_ID
const SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })
  const query = req.query?.query
  if (!query) return res.status(400).json({ error: 'query required' })
  if (!ID || !SECRET) return res.status(200).json({ disabled: true, items: null })
  try {
    const r = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`,
      { headers: { 'X-Naver-Client-Id': ID, 'X-Naver-Client-Secret': SECRET } },
    )
    const j = await r.json()
    if (!Array.isArray(j?.items)) return res.status(200).json({ items: [] })
    return res.status(200).json({ items: j.items })
  } catch (e) {
    return res.status(502).json({ error: String(e?.message ?? e) })
  }
}
