/**
 * 자동 채움 출처 기록 (ORDER-address-autofill-v1 §3) — E1·E1p 공용.
 * listings.autofill(jsonb)에 "무엇을 자동으로 채웠고 사용자가 수락했는지"를 남긴다.
 * 표시값의 단일 소스는 언제나 floor/area 컬럼 — 이건 근거·분석용 기록이다.
 */
export function autofillMeta(data) {
  const reg = data?.buildingRegistry
  // 사용자 확정 전(auto) 자동 채움 필드 — 완성도·배지 제외 재료 (2026-09-11 파트 B5)
  const autoFields = Object.entries(data?.fieldSources ?? {}).filter(([, v]) => v?.status === 'auto').map(([k]) => k)
  const photoDraft = data?.photoDraft?.items && Object.keys(data.photoDraft.items).length ? data.photoDraft.items : null
  if (!reg && !autoFields.length && !photoDraft) return null
  return {
    source: reg ? 'building_registry' : 'place_lookup',
    fetched_at: new Date().toISOString(),
    auto: { floor: reg?.floor ?? null, area: reg?.area ?? null },
    accepted: !!data.autoFilled,
    registry_kind: reg?.kind ?? null, // exclusive(집합건물) | title — 부동산원 비교선 상가 유형
    auto_fields: autoFields,
    photo_draft: photoDraft,          // 사진 초안 중 사용자가 확정한 항목만
  }
}
