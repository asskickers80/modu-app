/**
 * 자동 채움 출처 기록 (ORDER-address-autofill-v1 §3) — E1·E1p 공용.
 * listings.autofill(jsonb)에 "무엇을 자동으로 채웠고 사용자가 수락했는지"를 남긴다.
 * 표시값의 단일 소스는 언제나 floor/area 컬럼 — 이건 근거·분석용 기록이다.
 */
export function autofillMeta(data) {
  const reg = data?.buildingRegistry
  if (!reg) return null
  return {
    source: 'building_registry',
    fetched_at: new Date().toISOString(),
    auto: { floor: reg.floor ?? null, area: reg.area ?? null },
    accepted: !!data.autoFilled,
    registry_kind: reg.kind ?? null, // exclusive(집합건물) | title — 부동산원 비교선 상가 유형
  }
}
