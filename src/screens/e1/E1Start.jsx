/**
 * 상호·주소로 시작하는 등록 — 첫 질문 하나 (ORDER 2026-09-11 파트 B0·B2). /e1/start
 * "어떤 점포인가요?" 입력 1칸 → 후보 ≤5(상호) 또는 바로 자동 채움(주소) → /e1/confirm.
 * 후보 0 → 주소 입력 유도 → 그래도 0 → 수동 흐름(/e1/1). 에러 문구 없음. [직접 입력할게요] 링크 상시.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { lookupPlace, autofillFromCandidate } from '../../lib/placeLookup'
import { logEvent } from '../../lib/eventLog'
import ModuSpinner from '../../components/ModuSpinner'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

export default function E1Start() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [phase, setPhase] = useState('ask') // ask | candidates | ask_address | filling
  const [cands, setCands] = useState([])
  const startedAt = useState(() => Date.now())[0]

  const manual = () => { logEvent('reg_start_mode', { mode: 'manual' }); navigate('/e1/1', { state: { regStartMode: 'manual', regStartAt: startedAt } }) }

  const fill = async (cand, mode) => {
    setPhase('filling')
    const draft = await autofillFromCandidate(cand)
    logEvent('reg_autofill_result', { fields_filled: Object.keys(draft.fields).length, fields_flagged: Object.keys(draft.flags).length })
    navigate('/e1/confirm', { state: { draft, mode, startedAt } })
  }

  const submit = async () => {
    const text = q.trim()
    if (!text) return
    setPhase('filling')
    const { mode, candidates } = await lookupPlace(text)
    logEvent('reg_start_mode', { mode })
    if (mode === 'address' && candidates[0]) return fill(candidates[0], 'address')
    logEvent('reg_candidates_shown', { n: candidates.length })
    if (candidates.length === 0) {
      // 후보 없음 → 주소로 다시(1회). 그래도 없으면 수동 흐름 — 에러 문구 없이
      if (phase === 'ask_address') return manual()
      setQ(''); setPhase('ask_address'); return
    }
    setCands(candidates); setPhase('candidates')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <div className="shrink-0 flex items-center px-5 pt-12 pb-2 gap-2">
        <button onClick={() => navigate(-1)} aria-label="뒤로" className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-400">‹</button>
        <h1 className="flex-1 text-center text-t16 font-bold text-gray-900">매물 등록</h1>
        <span className="w-9" />
      </div>
      <main className="flex-1 overflow-y-auto px-5 pb-10">
        {phase === 'filling' ? (
          <div className="pt-24 flex flex-col items-center gap-3"><ModuSpinner size={56} /><p className="text-t13 text-gray-400">공공 정보에서 미리 채우는 중…</p></div>
        ) : (
          <>
            <p className="text-t20 font-black text-gray-900 mt-6 leading-snug" data-testid="reg-start-question">
              {phase === 'ask_address' ? '주소로 찾아볼게요' : '어떤 점포인가요?'}
            </p>
            <p className="text-t13 text-gray-500 mt-1 mb-4">
              {phase === 'ask_address' ? '도로명 또는 지번 주소를 넣어 주세요' : '상호 또는 주소 하나만 넣으면 공공 정보로 미리 채워드려요'}
            </p>
            <div className="flex gap-2">
              <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                data-testid="reg-start-input" autoFocus
                placeholder={phase === 'ask_address' ? '예: 서울 마포구 양화로 45' : '예: 서교동 고양이 카페 / 양화로 45'}
                className="flex-1 border-2 rounded-2xl px-4 py-3.5 text-t15 outline-none" style={{ borderColor: q ? NAVY : '#e5e7eb' }} />
              <button type="button" onClick={submit} disabled={!q.trim()} data-testid="reg-start-submit"
                className="px-4 rounded-2xl text-t14 font-bold text-white disabled:opacity-40" style={{ backgroundColor: NAVY }}>찾기</button>
            </div>

            {phase === 'candidates' && (
              <div className="mt-5" data-testid="reg-candidates">
                <p className="text-t12 text-gray-400 mb-2">이 중에 있나요?</p>
                <div className="rounded-2xl border border-gray-100 divide-y divide-gray-50">
                  {cands.map(c => (
                    <button key={c.rank} type="button" data-testid={`reg-candidate-${c.rank}`}
                      onClick={() => { logEvent('reg_candidate_pick', { rank: c.rank }); fill(c, 'name') }}
                      className="w-full text-left px-4 py-3 active:bg-gray-50">
                      <p className="text-t14 font-bold text-gray-900">{c.name}</p>
                      <p className="text-t12 text-gray-500 truncate">{[c.category, c.roadAddress || c.address].filter(Boolean).join(' · ')}</p>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => { setQ(''); setPhase('ask_address') }} className="mt-3 text-t13 underline underline-offset-2 text-gray-500">없어요 — 주소로 찾을게요</button>
              </div>
            )}

            <button type="button" onClick={manual} data-testid="reg-manual-link"
              className="mt-8 w-full py-3 rounded-2xl text-t13 font-semibold" style={{ color: NAVY, backgroundColor: NAVY_BG }}>
              직접 입력할게요
            </button>
          </>
        )}
      </main>
    </div>
  )
}
