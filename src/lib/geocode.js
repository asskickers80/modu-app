/**
 * 주소 → 좌표 변환 — 등록/수정 시 1회만 호출해 저장(표시 때마다 호출 금지, 비용 원칙).
 * 네이버 지오코딩 secret 보호를 위해 서버 함수(/api/geocode) 경유.
 * 키 미설정·실패 시 null → 좌표 없이 저장(지도는 폴백 안내). 저장 자체는 막지 않는다.
 */
export async function geocodeAddress(address) {
  if (!address) return null
  try {
    const res = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    if (!res.ok) return null
    const j = await res.json()
    return (Number.isFinite(j?.lat) && Number.isFinite(j?.lng)) ? { lat: j.lat, lng: j.lng } : null
  } catch {
    return null
  }
}
