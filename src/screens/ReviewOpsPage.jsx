/**
 * 운영 판정 화면 — 후기 이의신청 (ORDER 2026-09-12 파트 A6). /dev/reviews
 * keep → 즉시 복구 / remove → deleted_by=ops. 미판정은 블라인드 기간 경과 시 크론이 자동 keep.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPendingAppeals, resolveAppeal } from '../lib/reviews'
import { APPEAL_REASONS } from '../../config/reviews'

export default function ReviewOpsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const load = () => fetchPendingAppeals().then(setItems)
  useEffect(() => { load() }, [])
  const decide = async (x, resolution) => { await resolveAppeal(x.appeal, x.review, resolution); load() }
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-12 pb-3 border-b border-gray-50">
        <button onClick={() => navigate('/dev')} aria-label="뒤로" className="w-11 h-11 flex items-center justify-center">‹</button>
        <h1 className="text-t17 font-bold text-gray-900">후기 이의신청 판정</h1>
        <span className="text-t12 text-gray-400 ml-auto">{items.length}건 대기</span>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-4">
        {items.length === 0 && <p className="text-t13 text-gray-400">대기 중인 이의신청이 없어요</p>}
        {items.map(x => (
          <div key={x.appeal.id} className="rounded-2xl border border-gray-100 px-4 py-3 mb-3" data-testid="ops-appeal">
            <p className="text-t12 text-gray-400">{APPEAL_REASONS.find(r => r.key === x.appeal.reason_chip)?.label ?? x.appeal.reason_chip} · {new Date(x.appeal.created_at).toLocaleDateString('ko-KR')}</p>
            {x.appeal.note && <p className="text-t13 text-gray-700 mt-1">업체: {x.appeal.note}</p>}
            <p className="text-t13 text-gray-900 mt-2 font-semibold">후기: {[x.review.chips?.what, x.review.chips?.progress].filter(Boolean).join(' · ')}</p>
            {x.review.body && <p className="text-t13 text-gray-700">{x.review.body}</p>}
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => decide(x, 'keep')} data-testid="ops-keep" className="flex-1 py-2.5 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: '#2d7a4f' }}>복구 (keep)</button>
              <button type="button" onClick={() => decide(x, 'remove')} data-testid="ops-remove" className="flex-1 py-2.5 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: '#ef4444' }}>내리기 (remove)</button>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
