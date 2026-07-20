import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1b } from './E1bContext'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 3 ? PURPLE : '#e5e7eb' }} />
      ))}
    </div>
  )
}

const AXES = [
  { id: 'money', emoji: '💰', label: '돈' },
  { id: 'trust', emoji: '🤝', label: '신뢰' },
  { id: 'time', emoji: '⏱️', label: '시간' },
]

export default function E1bStep3() {
  const navigate = useNavigate()
  const { data, update } = useE1b()

  const [solutions, setSolutions] = useState(data.solutions)
  const [editingId, setEditingId] = useState(null)

  const setField = (id, field, val) =>
    setSolutions(prev => prev.map(s => s.id === id ? { ...s, [field]: val, edited: true } : s))

  const saveAndNext = () => {
    update({ solutions })
    navigate('/e1b/4')
  }

  return (
    <>
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1b/2')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">노출 페이지</h1>
          <span className="text-[13px] font-bold" style={{ color: PURPLE }}>3 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">③ 무엇을 해결합니다</h2>
          <p className="text-[13px] text-gray-400 mt-1">
            문제 → 해결 3쌍. 모두가 초안을 만들었어요. 수정해도 돼요.
          </p>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-44" style={{ scrollbarWidth: 'none' }}>

        {/* 공통축 안내 */}
        <div className="flex gap-2 mb-5">
          {AXES.map(a => (
            <div key={a.id}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border"
              style={{ borderColor: PURPLE + '30', backgroundColor: PURPLE_BG }}>
              <span className="text-[18px]">{a.emoji}</span>
              <span className="text-[11px] font-bold" style={{ color: PURPLE }}>{a.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mb-4 text-center">
          자영업자가 가장 아파하는 축 — 이 3가지로 좁혀요
        </p>

        {/* 해결 3쌍 */}
        <div className="flex flex-col gap-4">
          {solutions.map((s, idx) => {
            const isEditing = editingId === s.id
            return (
              <div key={s.id}
                className="rounded-2xl border-2 overflow-hidden"
                style={{ borderColor: isEditing ? PURPLE : '#e5e7eb' }}>

                {/* 헤더 */}
                <div className="flex items-center gap-2 px-4 py-2.5"
                  style={{ backgroundColor: isEditing ? PURPLE_BG : '#f9fafb' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: PURPLE }}>{idx + 1}</span>
                  <p className="text-[12px] font-semibold flex-1"
                    style={{ color: isEditing ? PURPLE : '#6b7280' }}>해결 쌍 {idx + 1}</p>
                  {s.edited && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: PURPLE + '20', color: PURPLE }}>수정됨</span>
                  )}
                  <button onClick={() => setEditingId(isEditing ? null : s.id)}
                    className="text-[12px] font-bold px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: PURPLE_BG, color: PURPLE }}>
                    {isEditing ? '닫기' : '수정'}
                  </button>
                </div>

                {/* 문제 → 해결 */}
                <div className="px-4 py-3 bg-white space-y-2.5">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 mb-1">문제</p>
                    {isEditing ? (
                      <textarea value={s.problem}
                        onChange={e => setField(s.id, 'problem', e.target.value)}
                        className="w-full text-[13px] text-gray-800 outline-none resize-none border rounded-xl px-3 py-2"
                        style={{ borderColor: PURPLE }} rows={2} autoFocus />
                    ) : (
                      <p className="text-[13px] text-gray-700 leading-relaxed">"{s.problem}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[11px] text-gray-300 px-1">↓ 해결</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold mb-1" style={{ color: PURPLE }}>해결</p>
                    {isEditing ? (
                      <textarea value={s.solve}
                        onChange={e => setField(s.id, 'solve', e.target.value)}
                        className="w-full text-[13px] font-semibold outline-none resize-none border rounded-xl px-3 py-2"
                        style={{ borderColor: PURPLE, color: PURPLE }} rows={2} />
                    ) : (
                      <p className="text-[14px] font-bold" style={{ color: PURPLE }}>
                        → {s.solve}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 px-4 py-3 rounded-2xl border border-gray-100">
          <p className="text-[12px] text-gray-400 leading-relaxed">
            💡 "저희가 최고입니다"(자랑) 대신 "당신 상황에 우리가 맞아요"(상황 매칭)로 써주세요.
          </p>
        </div>

      </main>

    </div>

    {/* ══ 하단 버튼 — position fixed ══ */}
    <div style={{
      position: 'fixed', bottom: 0, left: '50%',
      transform: 'translateX(-50%)',
      width: '100%', maxWidth: '390px',
      padding: '12px 20px 20px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #f0f0f0',
      zIndex: 9999,
    }}>
      <button
        type="button"
        onClick={saveAndNext}
        style={{
          display: 'block', width: '100%',
          padding: '18px 0',
          borderRadius: '16px',
          backgroundColor: PURPLE,
          color: '#ffffff',
          fontSize: '16px', fontWeight: 700,
          border: 'none', cursor: 'pointer',
          WebkitAppearance: 'none',
        }}>
        다음 — 믿을 근거
      </button>
    </div>
    </>
  )
}
