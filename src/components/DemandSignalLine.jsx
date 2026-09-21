/**
 * 등록 화면 수요 신호 1줄 (ORDER 2026-09-21 파트 C2) — 판매자에게 유리한 사실만.
 * "이 동네에서 {업종} 매물 알림을 신청한 분이 {n}명 있어요 · 모두가 본 것(이번 달)"
 * 임계값(기본 3명) 미만이면 줄 자체를 만들지 않는다. 누구인지는 어떤 경우에도 없다.
 * 기업회원 화면에는 쓰지 않는다 — 저장 알림은 매물을 찾는 행동이지 업체를 찾는 행동이 아니다.
 */
import { useEffect, useState } from 'react'
import { fetchDemandSignalLine } from '../lib/savedSearch'

export default function DemandSignalLine({ region, industry, accent = '#1a4d8f' }) {
  const [line, setLine] = useState(null)
  useEffect(() => {
    let alive = true
    if (!region) { setLine(null); return }
    fetchDemandSignalLine(region, industry).then(l => { if (alive) setLine(l) })
    return () => { alive = false }
  }, [region, industry])
  if (!line) return null
  return (
    <p className="text-t12 mt-1.5" style={{ color: accent }} data-testid="demand-signal-line">{line}</p>
  )
}
