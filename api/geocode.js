// 네이버 지오코딩 프록시 (Vercel 서버리스). 등록/수정 시 주소→좌표 1회 변환.
// secret은 서버 env로만 보관. 키 미설정(로컬·미주입)이면 좌표 null 반환 → 저장은 정상, 지도는 폴백.
const KEY_ID = process.env.NAVER_MAP_API_KEY_ID
const KEY = process.env.NAVER_MAP_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const address = req.body?.address
  if (!address || !KEY_ID || !KEY) return res.status(200).json({ lat: null, lng: null })
  try {
    const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`
    const r = await fetch(url, {
      headers: { 'X-NCP-APIGW-API-KEY-ID': KEY_ID, 'X-NCP-APIGW-API-KEY': KEY },
    })
    const j = await r.json()
    const a = j?.addresses?.[0]
    if (!a) return res.status(200).json({ lat: null, lng: null })
    return res.status(200).json({ lat: parseFloat(a.y), lng: parseFloat(a.x) })
  } catch (e) {
    return res.status(200).json({ lat: null, lng: null, error: String(e?.message ?? e) })
  }
}
