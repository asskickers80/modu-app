/**
 * 기업회원 수요 신호 카드 — 양도 검토 신호 집계 (ORDER 2026-09-10 파트 C4)
 * 부동산·양도 상담 카테고리 기업회원 홈에만. "이번 주 {구} 양도 검토 신호 {n}건" 정보 카드 1장(응답 버튼 없음).
 * 표본이 최소 건수 미만이면 카드 없음. 지시문 E 카드가 없어 여기 신설 — 배치·테이블 없이 진입 시 최근 7일 원장을 읽는다.
 */
import { useEffect, useState } from 'react'
import { DEMAND_SIGNAL_DAYS } from '../../config/completeness'
import { aggregateDemand } from '../lib/demandSignals'
import { fetchPriceCardRegions } from '../lib/inquiryLedger'
import { logEvent } from '../lib/eventLog'

const PURPLE = '#7d4ba3'

export default function DemandSignalCard({ enabled }) {
  const [top, setTop] = useState(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    fetchPriceCardRegions(DEMAND_SIGNAL_DAYS).then(regions => {
      if (!alive) return
      const agg = aggregateDemand(regions)
      if (agg[0]) { setTop(agg[0]); logEvent('demand_signal_agg_shown', { region: agg[0].region, n: agg[0].n }) }
    })
    return () => { alive = false }
  }, [enabled])
  if (!enabled || !top) return null
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 mb-5" data-testid="demand-signal-card">
      <p className="text-t12 font-bold" style={{ color: PURPLE }}>수요 신호</p>
      <p className="text-t15 font-bold text-gray-900 mt-0.5" data-testid="demand-signal-line">
        이번 주 {top.region} 양도 검토 신호 {top.n}건
      </p>
      <p className="text-t11 text-gray-400 mt-1">가게 시세를 확인한 사장님 수예요 · 누구인지는 집계하지 않아요</p>
    </div>
  )
}
