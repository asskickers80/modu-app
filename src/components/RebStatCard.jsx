/**
 * 한국부동산원 임대동향 비교선 카드 (ORDER 2026-09-11 파트 A2) — 최대 2줄 + 회색 안내 1줄.
 * getRebStat 이 null 이거나 두 값이 모두 null 이면 렌더하지 않는다. 판단 문구 없음 — 숫자와 출처만.
 * place: owner_reg | owner_manage | listing_detail
 */
import { useEffect, useState } from 'react'
import { getRebStat } from '../lib/rebStats'
import { cardLines, compareBucket } from '../lib/rebStatsRules'
import { logEvent } from '../lib/eventLog'

export default function RebStatCard({ source, monthlyRent = null, area = null, place = 'listing_detail', mineLabel = 'owner', accent = '#1e6b6b', compact = false, children = null }) {
  const [stat, setStat] = useState(null)
  const key = `${source?.bjd_code ?? source?.bcode ?? ''}|${source?.autofill?.registry_kind ?? source?.buildingRegistry?.kind ?? ''}`
  useEffect(() => {
    let alive = true
    if (!key.split('|')[0]) { setStat(null); return }
    getRebStat(source).then(s => { if (alive) setStat(s) })
    return () => { alive = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const lines = cardLines(stat, { monthlyRent, area, label: mineLabel })
  useEffect(() => {
    if (!lines) return
    logEvent('reb_stat_shown', { place, level: stat.level, store_type: stat.store_type, has_compare: !!lines.line2 })
    if (lines.pct != null) logEvent('reb_stat_compare_bucket', { bucket: compareBucket(lines.pct) })
  }, [lines?.line1, lines?.line2]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!lines) return null
  return (
    <div className={compact ? 'mb-3' : 'rounded-2xl border border-gray-100 bg-white px-4 py-3.5 mb-3'} data-testid="reb-stat-card" data-place={place}>
      <p className="text-t13 font-semibold text-gray-900 leading-snug" data-testid="reb-stat-line1">{lines.line1}</p>
      {lines.line2 && <p className="text-t13 mt-0.5 font-bold" style={{ color: accent }} data-testid="reb-stat-line2">{lines.line2}</p>}
      <p className="text-t11 text-gray-400 mt-1">{lines.note}</p>
      {children}
    </div>
  )
}
