/**
 * 운영 화면 — 갱신 임박 위험 업체 + 수요 신호 pending 지역 (ORDER 2026-09-13 파트 B3). /dev/vendor-ops
 * 영업 우선순위 뷰 하나. 사용자 식별 정보는 이 화면에도 나오지 않는다.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchOpsList } from '../lib/vendorRenewal'
import { RENEWAL_COPY } from '../../config/vendorRenewal'
import { supabase } from '../lib/supabase'

export default function VendorOpsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState({ watch: [], pending: [], rate: null })
  // 지역×업종 수요 — 저장 알림·0건 탐색 집계(원문·식별자 없음). 기업회원 화면에는 가지 않는다
  const [demand, setDemand] = useState([])
  useEffect(() => { fetchOpsList().then(setData) }, [])
  useEffect(() => {
    const month = new Date(); month.setDate(1)
    supabase.from('search_demand_facts').select('region_code, industry_code, kind, count')
      .gte('month', month.toISOString().slice(0, 10)).limit(200)
      .then(({ data: rows }) => {
        const map = new Map()
        for (const r of rows ?? []) {
          const k = `${r.region_code}|${r.industry_code ?? ''}`
          const cur = map.get(k) ?? { region: r.region_code, industry: r.industry_code, saved: 0, empty: 0 }
          if (r.kind === 'saved_search') cur.saved += r.count ?? 0
          else cur.empty += r.count ?? 0
          map.set(k, cur)
        }
        setDemand([...map.values()].sort((a, b) => (b.saved + b.empty) - (a.saved + a.empty)))
      })
  }, [])
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-12 pb-3 border-b border-gray-50">
        <button onClick={() => navigate('/dev')} aria-label="뒤로" className="w-11 h-11 flex items-center justify-center">‹</button>
        <h1 className="text-t17 font-bold text-gray-900">{RENEWAL_COPY.opsTitle}</h1>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-4">
        {data.rate && <p className="text-t13 text-gray-700 mb-3" data-testid="ops-rate">이번 달 갱신 도래 {data.rate.due}곳 · 갱신 {data.rate.renewed}곳</p>}
        <p className="text-t12 font-bold text-gray-500">갱신 임박 위험</p>
        {!data.watch.length && <p className="text-t13 text-gray-400 mt-1">해당 업체가 없어요</p>}
        {data.watch.map(x => (
          <div key={x.sub.vendor_id} className="rounded-2xl border border-gray-100 px-4 py-3 mt-2" data-testid="ops-watch">
            <p className="text-t13 font-bold text-gray-900">{x.vendor?.shop_name ?? '업체'} <span className="text-t11 text-gray-500 font-normal">갱신까지 {x.days}일</span></p>
            <p className="text-t12 text-gray-600 mt-0.5">받은 문의 {x.m.received}건 · 답한 문의 {x.m.replied}건</p>
          </div>
        ))}
        <p className="text-t12 font-bold text-gray-500 mt-6">지역 × 업종 수요 (이번 달)</p>
        {!demand.length && <p className="text-t13 text-gray-400 mt-1">집계된 수요가 없어요</p>}
        {demand.map(d => (
          <p key={`${d.region}|${d.industry ?? ''}`} className="text-t13 text-gray-800 mt-1" data-testid="ops-demand-row">
            {d.region}{d.industry ? ` · ${d.industry}` : ''} — 저장 알림 {d.saved}건 · 0건 탐색 {d.empty}회
          </p>
        ))}

        <p className="text-t12 font-bold text-gray-500 mt-6">입점 업체가 없는 지역 (수요 신호 대기)</p>
        {!data.pending.length && <p className="text-t13 text-gray-400 mt-1">대기 중인 지역이 없어요</p>}
        {data.pending.map(p => (
          <p key={p.region} className="text-t13 text-gray-800 mt-1" data-testid="ops-pending">{p.region} · {p.n}건</p>
        ))}
      </main>
    </div>
  )
}
