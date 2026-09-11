/**
 * 자동 채움 필드 출처·확정 상태 (ORDER 2026-09-11 파트 B1·B5) — listing_field_sources.
 * 완성도 규칙: status=auto 인 필드는 점수·배지에 넣지 않는다(config/completeness.ts AUTO_FIELDS_EXCLUDED).
 * 테이블 부재·실패는 조용히 무시(등록은 기존대로).
 */
// supabase 는 함수 안에서 동적 import (테스트가 Node에서 autoFieldsOf 를 직접 import)

/** { field: { source, status } } → 점수 제외 대상(auto) 필드 키 목록 */
export const autoFieldsOf = (map = {}) => Object.entries(map).filter(([, v]) => v?.status === 'auto').map(([k]) => k)

export async function recordFieldSources(listingId, map = {}, targetType = 'listing') {
  const rows = Object.entries(map).filter(([, v]) => v?.source).map(([field, v]) => ({
    target_type: targetType, listing_id: listingId, field, source: v.source, status: v.status ?? 'auto', updated_at: new Date().toISOString(),
  }))
  if (!listingId || !rows.length) return false
  try {
    const { supabase } = await import('./supabase')
    const { error } = await supabase.from('listing_field_sources').upsert(rows, { onConflict: 'target_type,listing_id,field' })
    return !error
  } catch (_) { return false }
}

export async function fetchFieldSources(listingId, targetType = 'listing') {
  try {
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase.from('listing_field_sources').select('field, source, status').eq('target_type', targetType).eq('listing_id', listingId)
    if (error || !Array.isArray(data)) return {}
    const out = {}
    for (const r of data) out[r.field] = { source: r.source, status: r.status }
    return out
  } catch (_) { return {} }
}
