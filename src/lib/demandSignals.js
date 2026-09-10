/**
 * 양도 검토 신호 집계 (ORDER 2026-09-10 파트 C4) — 순수 룰. supabase 무의존.
 * 시세 카드(price_card) 클릭 원장을 지역(구) 단위로 세어 최소 건수 이상인 지역만 돌려준다.
 * 개인 식별 정보 없음 — 입력은 region 문자열 목록뿐.
 */
import { DEMAND_SIGNAL_MIN } from '../../config/completeness'

/** @returns [{ region, n }] 건수 내림차순, n >= min 만 */
export function aggregateDemand(regions, { min = DEMAND_SIGNAL_MIN } = {}) {
  const count = new Map()
  for (const r of regions ?? []) {
    const key = String(r ?? '').trim()
    if (!key) continue
    count.set(key, (count.get(key) ?? 0) + 1)
  }
  return [...count.entries()].map(([region, n]) => ({ region, n })).filter(x => x.n >= min).sort((a, b) => b.n - a.n)
}
