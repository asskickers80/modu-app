/**
 * 부동산원 비교선 — 데이터 계층 (ORDER 2026-09-11 파트 A). 판정은 rebStatsRules(순수).
 * 테이블 부재·행 없음·실패는 null → 카드 없음(가짜 수치 금지).
 */
import { supabase } from './supabase'
import { REB } from '../../config/rebStats'
import { pickStat, sigunguCodeOf, districtNameOf, storeTypeOf } from './rebStatsRules'

/**
 * @param src { bjd_code | bcode, autofill?, buildingRegistry?, hjd_code? }
 * @returns { level, region_name, store_type, quarter, vacancy_rate, rent_per_m2 } | null
 */
export async function getRebStat(src) {
  try {
    const bjd = src?.bjd_code ?? src?.bcode ?? null
    const sigunguCode = sigunguCodeOf(bjd)
    const districtName = districtNameOf(src?.hjd_code ?? bjd)
    const storeType = storeTypeOf(src)
    if (!sigunguCode && !districtName) return null
    let q = supabase.from('reb_market_stats').select('quarter, region_level, region_code, region_name, store_type, vacancy_rate, rent_per_m2').eq('store_type', storeType)
    const ors = []
    if (sigunguCode) ors.push(`and(region_level.eq.sigungu,region_code.eq.${sigunguCode})`)
    if (districtName) ors.push(`and(region_level.eq.district,region_name.eq.${districtName})`)
    q = q.or(ors.join(',')).order('quarter', { ascending: false }).limit(REB.LOOKBACK_QUARTERS * 2)
    const { data, error } = await q
    if (error || !Array.isArray(data)) return null
    return pickStat(data, { sigunguCode, districtName, storeType })
  } catch (_) { return null }
}
