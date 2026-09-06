// NCP 지오코딩 프록시 — 정방향(주소→좌표)·역방향(좌표→법정동).
// 지도 렌더링용 Client ID는 도메인 제한이 걸린 공개 값이라 이관 대상이 아니다(오더 명시).
//
// verify_jwt = false — 근거: 매물 등록 1단계 주소 선택과 비로그인 방문자의 상세 지도가
// 좌표를 필요로 한다. 로그인 전 경로라 JWT를 요구하면 등록·열람이 막힌다.
import { handler, json } from '../_shared/proxy.ts'

const GEOCODE = 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode'
const REVERSE = 'https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc'

Deno.serve(handler('ncp-geo', async (req) => {
  const id = Deno.env.get('NAVER_MAP_API_KEY_ID')
  const key = Deno.env.get('NAVER_MAP_API_KEY')
  if (!id || !key) return json({ error: 'ncp keys not configured' }, 503)
  const headers = { 'x-ncp-apigw-api-key-id': id, 'x-ncp-apigw-api-key': key }

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const url = new URL(req.url)
  const address = body.address ?? url.searchParams.get('address')
  const lat = body.lat ?? url.searchParams.get('lat')
  const lng = body.lng ?? url.searchParams.get('lng')

  // 역방향 — 좌표에서 법정동. 실패해도 200 + null (호출부가 저장을 막지 않는다)
  if (lat != null && lng != null && lat !== '' && lng !== '') {
    const r = await fetch(`${REVERSE}?coords=${lng},${lat}&orders=legalcode&output=json`, { headers })
    const j = await r.json().catch(() => null)
    const region = j?.results?.[0]?.region
    if (!region) return json({ region: null, code: null })
    const name = [region.area1?.name, region.area2?.name, region.area3?.name].filter(Boolean).join(' ')
    // 법정동코드도 함께 반환 — 건축물대장 조회 보조 키 (기존 응답은 region만 줬다)
    return json({ region: name || null, code: j?.results?.[0]?.code?.id ?? null })
  }

  // 정방향 — 주소에서 좌표
  if (address) {
    const r = await fetch(`${GEOCODE}?query=${encodeURIComponent(address)}`, { headers })
    const j = await r.json().catch(() => null)
    const a = j?.addresses?.[0]
    if (!a) return json({ lat: null, lng: null })
    return json({ lat: Number(a.y), lng: Number(a.x) })
  }

  return json({ error: 'address or lat/lng required' }, 400)
}))
