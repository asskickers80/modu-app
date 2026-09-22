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

/**
 * 쓰기 어려워하지 않게 보여주는 예시 — placeholder 로만 쓴다(저장되지 않는다).
 * 예전에는 이 문장들이 기본값으로 박혀 있어서, 손대지 않으면 그대로 저장될 구조였다.
 */
const EXAMPLE_BANK = {
  default: [
    { problem: '어디서부터 시작할지 막막할 때', solve: '첫 상담은 무료로 방향부터 잡아드려요' },
    { problem: '가격이 적절한지 모르겠을 때', solve: '견적서를 항목별로 쪼개서 보여드려요' },
    { problem: '맡기고 나서 연락이 끊길까 걱정될 때', solve: '진행 상황을 단계마다 알려드려요' },
  ],
  marketing: [
    { problem: '손님이 줄었는데 뭘 해야 할지 모를 때', solve: '동네 손님부터 되돌리는 순서로 잡아드려요' },
    { problem: '사진이 별로라 눌러보지 않을 때', solve: '메뉴 사진 촬영·보정까지 한 번에 해요' },
    { problem: '광고비만 쓰고 효과를 모를 때', solve: '얼마 써서 몇 명 왔는지 월마다 보여드려요' },
  ],
  consulting: [
    { problem: '팔리는데 남는 게 없을 때', solve: '메뉴별 원가를 뜯어서 가격을 다시 짜요' },
    { problem: '주중 손님이 유난히 없을 때', solve: '요일별 매출을 보고 붙일 메뉴를 찾아요' },
    { problem: '사람 쓰는 게 맞는지 모를 때', solve: '시간대별 손님 수로 필요한 인력을 계산해요' },
  ],
  realestate: [
    { problem: '재계약 조건이 적절한지 모를 때', solve: '같은 골목 최근 계약과 비교해 알려드려요' },
    { problem: '자리를 옮기고 싶은데 어디로 갈지 막막할 때', solve: '지금 매출을 기준으로 맞는 자리를 추려드려요' },
    { problem: '점포를 내놓을지 고민될 때', solve: '지금 내놓을 때와 1년 뒤를 나눠서 설명해요' },
  ],
  tax: [
    { problem: '신고 기간마다 놓칠까 불안할 때', solve: '기한 전에 미리 챙겨서 연락드려요' },
    { problem: '세금이 왜 이만큼인지 모를 때', solve: '항목별로 어디서 나왔는지 풀어서 설명해요' },
    { problem: '폐업·양도 전 정리가 막막할 때', solve: '순서대로 뭘 언제 해야 하는지 짚어드려요' },
  ],
}

export default function E1bStep3() {
  const navigate = useNavigate()
  const { data, update } = useE1b()

  const [solutions, setSolutions] = useState(data.solutions)
  const [editingId, setEditingId] = useState(null)
  const examples = EXAMPLE_BANK[data.category] || EXAMPLE_BANK.default

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
          <h1 className="flex-1 text-center text-t16 font-bold text-gray-900">노출 페이지</h1>
          <span className="text-t13 font-bold" style={{ color: PURPLE }}>3 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-t20 font-bold text-gray-900">③ 무엇을 해결합니다</h2>
          <p className="text-t13 text-gray-400 mt-1">
            문제 → 해결 3쌍. 채운 것만 노출돼요 · 하나만 써도 괜찮아요.
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
              <span className="text-t18">{a.emoji}</span>
              <span className="text-t11 font-bold" style={{ color: PURPLE }}>{a.label}</span>
            </div>
          ))}
        </div>
        <p className="text-t11 text-gray-400 mb-4 text-center">
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
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-t10 font-bold text-white shrink-0"
                    style={{ backgroundColor: PURPLE }}>{idx + 1}</span>
                  <p className="text-t12 font-semibold flex-1"
                    style={{ color: isEditing ? PURPLE : '#6b7280' }}>해결 쌍 {idx + 1}</p>
                  {s.edited && (
                    <span className="text-t10 font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: PURPLE + '20', color: PURPLE }}>수정됨</span>
                  )}
                  <button onClick={() => setEditingId(isEditing ? null : s.id)}
                    className="text-t12 font-bold px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: PURPLE_BG, color: PURPLE }}>
                    {isEditing ? '닫기' : '수정'}
                  </button>
                </div>

                {/* 문제 → 해결 */}
                <div className="px-4 py-3 bg-white space-y-2.5">
                  <div>
                    <p className="text-t10 font-bold text-gray-400 mb-1">문제</p>
                    {isEditing ? (
                      <textarea value={s.problem}
                        onChange={e => setField(s.id, 'problem', e.target.value)}
                        placeholder={`예: ${examples[idx]?.problem ?? ''}`}
                        data-testid={`solution-problem-${idx}`}
                        className="w-full text-t13 text-gray-800 outline-none resize-none border rounded-xl px-3 py-2"
                        style={{ borderColor: PURPLE }} rows={2} autoFocus />
                    ) : s.problem ? (
                      <p className="text-t13 text-gray-700 leading-relaxed">"{s.problem}"</p>
                    ) : (
                      <p className="text-t13 text-gray-300 leading-relaxed">예: {examples[idx]?.problem ?? ''}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-t11 text-gray-300 px-1">↓ 해결</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div>
                    <p className="text-t10 font-bold mb-1" style={{ color: PURPLE }}>해결</p>
                    {isEditing ? (
                      <textarea value={s.solve}
                        onChange={e => setField(s.id, 'solve', e.target.value)}
                        placeholder={`예: ${examples[idx]?.solve ?? ''}`}
                        data-testid={`solution-solve-${idx}`}
                        className="w-full text-t13 font-semibold outline-none resize-none border rounded-xl px-3 py-2"
                        style={{ borderColor: PURPLE, color: PURPLE }} rows={2} />
                    ) : s.solve ? (
                      <p className="text-t14 font-bold" style={{ color: PURPLE }}>
                        → {s.solve}
                      </p>
                    ) : (
                      <p className="text-t13 text-gray-300">예: {examples[idx]?.solve ?? ''}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 px-4 py-3 rounded-2xl border border-gray-100">
          <p className="text-t12 text-gray-400 leading-relaxed">
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
