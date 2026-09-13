/**
 * 운영 화면 — 질문 주제 월간 (ORDER 2026-09-13 C2·C3). /dev/ask-topics
 * other(미분류) 상위 50개를 사람이 보고 새 축·템플릿으로 승격한다. 이 절차가 분류 체계를 굳지 않게 하는 장치다.
 * 원문은 90일만 남는다 — 그 안에 새 주제를 발견하는 것이 원문의 유일한 용도다.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { topOtherQuestions } from '../../api/_askBatch.js'
import { AXIS_LABEL } from '../../config/listingAsk'
import { logEvent } from '../lib/eventLog'

export default function AskTopicsOpsPage() {
  const navigate = useNavigate()
  const [others, setOthers] = useState([])
  const [facts, setFacts] = useState([])
  useEffect(() => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString()
    supabase.from('ask_question_events').select('topic_axis, raw_text, created_at').gte('created_at', since).limit(1000)
      .then(({ data }) => setOthers(topOtherQuestions(data ?? [])))
    supabase.from('ask_question_facts').select('topic_axis, branch, answered, converted_to_inquiry, owner_replied, opened_to_dm, count').limit(500)
      .then(({ data }) => setFacts(data ?? []))
  }, [])

  const byAxis = new Map()
  for (const f of facts) {
    const cur = byAxis.get(f.topic_axis) ?? { n: 0, owner: 0, converted: 0, opened: 0 }
    cur.n += f.count
    if (f.branch === 'owner') cur.owner += f.count
    if (f.converted_to_inquiry) cur.converted += f.count
    if (f.opened_to_dm) cur.opened += f.count
    byAxis.set(f.topic_axis, cur)
  }
  const rows = [...byAxis.entries()].sort((a, b) => b[1].n - a[1].n)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-12 pb-3 border-b border-gray-50">
        <button onClick={() => navigate('/dev')} aria-label="뒤로" className="w-11 h-11 flex items-center justify-center">‹</button>
        <h1 className="text-t17 font-bold text-gray-900">질문 주제 월간</h1>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-t12 font-bold text-gray-500">축별 집계 (영구 보관분)</p>
        {!rows.length && <p className="text-t13 text-gray-400 mt-1">아직 집계된 질문이 없어요</p>}
        {rows.map(([axis, v]) => (
          <div key={axis} className="rounded-2xl border border-gray-100 px-4 py-3 mt-2" data-testid="ask-fact-row">
            <p className="text-t13 font-bold text-gray-900">{AXIS_LABEL[axis] ?? axis} <span className="text-t11 text-gray-500 font-normal">{v.n}건</span></p>
            <p className="text-t12 text-gray-600 mt-0.5">주인 확인 {v.owner}건 · 문의 전환 {v.converted}건 · 대화 열림 {v.opened}건</p>
          </div>
        ))}

        <p className="text-t12 font-bold text-gray-500 mt-6">미분류 질문 상위 50 (새 축·템플릿 승격 후보)</p>
        {!others.length && <p className="text-t13 text-gray-400 mt-1">미분류 질문이 없어요</p>}
        {others.map((o, i) => (
          <div key={i} className="flex items-center gap-2 mt-1.5" data-testid="ask-other-row">
            <span className="text-t13 text-gray-800 flex-1">{o.text}</span>
            <span className="text-t12 text-gray-400">{o.count}</span>
            <button type="button" data-testid="ask-promote" onClick={() => logEvent('ask_topic_promoted', { axis: 'other' })}
              className="text-t11 font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-700">승격 표시</button>
          </div>
        ))}
      </main>
    </div>
  )
}
