// 네이버 지오코딩 프록시 (Vercel 서버리스). 등록/수정 시 주소→좌표 1회 변환.
// secret은 서버 env로만 보관. 키 미설정(로컬·미주입)이면 좌표 null 반환 → 저장은 정상, 지도는 폴백.
const KEY_ID = process.env.NAVER_MAP_API_KEY_ID
const KEY = process.env.NAVER_MAP_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const { address, lat, lng } = req.body ?? {}

  // 역지오코딩 (brokers-entry-only): 좌표 → 법정동 지역명. 현 위치 기반 주변 부동산 검색용.
  if (lat != null && lng != null) {
    if (!KEY_ID || !KEY) return res.status(200).json({ region: null })
    try {
      const url = `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&orders=legalcode&output=json`
      const r = await fetch(url, { headers: { 'X-NCP-APIGW-API-KEY-ID': KEY_ID, 'X-NCP-APIGW-API-KEY': KEY } })
      const j = await r.json()
      const rg = j?.results?.[0]?.region
      if (!rg) return res.status(200).json({ region: null })
      const region = [rg.area1?.name, rg.area2?.name, rg.area3?.name].filter(Boolean).join(' ')
      return res.status(200).json({ region: region || null })
    } catch (e) {
      return res.status(200).json({ region: null, error: String(e?.message ?? e) })
    }
  }

  if (!address || !KEY_ID || !KEY) return res.status(200).json({ lat: null, lng: null })
  try {
    // maps.apigw.ntruss.com = 신규 VPC 콘솔 Maps 앱 엔드포인트 (구 naveropenapi.* 는 legacy)
    const url = `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`
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
