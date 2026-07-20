import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1p } from './E1pContext'
import { saveReviewLog } from '../../lib/reviewLog'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'
const AMBER = '#d68b2a'
const AMBER_BG = '#fef3e2'
const GREEN = '#22c55e'

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 3 ? TEAL : '#e5e7eb' }} />
      ))}
    </div>
  )
}

function getReviewBlocks(data) {
  const isRent = data.listingType === 'rent' || data.listingType === 'both'
  const isSale = data.listingType === 'sale' || data.listingType === 'both'
  const addr = data.address || '서울 마포구 서교동 332-4'

  const blocks = [
    {
      id: 'description', title: '모두가 쓴 상가 설명문', icon: '✍️', tone: 'fact', canHide: false,
      preview: `${addr}에 위치한 ${data.area || '45'}㎡ 규모의 상가. ${data.floor || '1층'} 점포로 홍대 상권 인근, 즉시 입주 가능.`,
    },
    {
      id: 'location', title: '위치 · 상권 분석', icon: '📍', tone: 'fact', canHide: false,
      preview: `${addr.split(' ').slice(0, 3).join(' ')} · 홍대입구역 도보 4분 · 반경 300m 유동인구 15만/월`,
    },
  ]

  if (isRent) {
    blocks.push({
      id: 'rent_market', title: '임대 시세 분석', icon: '📊', tone: 'estimate', canHide: true,
      preview: `인근 시세 보증금 ${(Number(data.deposit || 5000) - 500).toLocaleString()}~${(Number(data.deposit || 5000) + 500).toLocaleString()}만원, 월세 ${(Number(data.monthlyRent || 180) - 20).toLocaleString()}~${(Number(data.monthlyRent || 180) + 20).toLocaleString()}만원. 현재 조건 적정 범위.`,
    })
  }
  if (isSale) {
    blocks.push({
      id: 'sale_market', title: '매매 시세·수익률', icon: '💰', tone: 'estimate', canHide: true,
      preview: `인근 시세 ${(Number(data.salePrice || 8000) - 1000).toLocaleString()}~${(Number(data.salePrice || 8000) + 1000).toLocaleString()}만원. 추정 수익률 ${data.capRate || '5.2'}%.`,
    })
  }
  blocks.push({
    id: 'biz_rec', title: '권장 업종 추천', icon: '🏷️', tone: 'estimate', canHide: true,
    preview: '카페·디저트, 음식점, 미용·뷰티 적합도 높음. 상권 내 경쟁 밀도 낮아 진입 여건 양호.',
  })

  return blocks
}

function EditArea({ defaultValue, onSave, onCancel }) {
  const [text, setText] = useState(defaultValue)
  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        rows={4} autoFocus
        className="w-full text-[13px] text-gray-700 leading-relaxed outline-none resize-none border-0 bg-transparent" />
      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
        <button onClick={onCancel}
          className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-gray-400 border border-gray-200">
          취소
        </button>
        <button onClick={() => onSave(text)}
          className="flex-1 py-2 rounded-xl text-[13px] font-bold text-white"
          style={{ backgroundColor: TEAL }}>
          저장
        </button>
      </div>
    </div>
  )
}

const ACTION_OPTS = [
  { id: 'keep', label: '그대로', icon: '✓' },
  { id: 'edit', label: '수정', icon: '✏️' },
  { id: 'hide', label: '공개 안 함', icon: '🙈' },
]

export default function E1pStep3() {
  const navigate = useNavigate()
  const { data, update } = useE1p()
  const [editingId, setEditingId] = useState(null)
  const [editTexts, setEditTexts] = useState(data.editedTexts || {})

  const choices = data.reviewChoices || {}
  const REVIEW_BLOCKS = getReviewBlocks(data)

  const setChoice = (blockId, choice) => {
    update(prev => ({ reviewChoices: { ...(prev.reviewChoices || {}), [blockId]: choice } }))
    if (choice === 'edit') setEditingId(blockId)
    else if (editingId === blockId) setEditingId(null)
  }

  const saveEdit = (blockId, text) => {
    const next = { ...editTexts, [blockId]: text }
    setEditTexts(next)
    update({ editedTexts: next })
    setEditingId(null)
  }

  const reviewedCount = Object.keys(choices).length
  const allReviewed = reviewedCount >= REVIEW_BLOCKS.length

  return (
    <>
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1p/2')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">상가 등록</h1>
          <span className="text-[13px] font-bold" style={{ color: TEAL }}>3 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">항목별로 검수해 주세요</h2>
          <p className="text-[13px] text-gray-400 mt-1">그대로 두거나, 수정하거나, 공개하지 않을 수 있어요</p>
        </div>
      </div>

      <div className="shrink-0 px-5 py-2.5 flex items-center gap-2 bg-white border-b border-gray-50">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(reviewedCount / REVIEW_BLOCKS.length) * 100}%`, backgroundColor: GREEN }} />
        </div>
        <span className="text-[12px] font-bold shrink-0" style={{ color: GREEN }}>
          {reviewedCount}/{REVIEW_BLOCKS.length} 완료
        </span>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-44" style={{ scrollbarWidth: 'none' }}>
        <div className="flex flex-col gap-4">
          {REVIEW_BLOCKS.map(block => {
            const isFact = block.tone === 'fact'
            const accentColor = isFact ? TEAL : AMBER
            const accentBg = isFact ? TEAL_BG : AMBER_BG
            const chosen = choices[block.id]
            const isEditing = editingId === block.id

            return (
              <div key={block.id}
                className="rounded-2xl border-2 overflow-hidden transition-all"
                style={{ borderColor: chosen ? (chosen === 'hide' ? '#e5e7eb' : accentColor) : '#e5e7eb' }}>

                <div className="flex items-center gap-2.5 px-4 py-3"
                  style={{ backgroundColor: chosen ? (chosen === 'hide' ? '#f9fafb' : accentBg) : '#f9fafb' }}>
                  <span className="text-[18px]">{block.icon}</span>
                  <p className="flex-1 text-[13px] font-bold"
                    style={{ color: chosen && chosen !== 'hide' ? accentColor : '#374151' }}>
                    {block.title}
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: isFact ? TEAL_BG : AMBER_BG, color: isFact ? TEAL : AMBER }}>
                    {isFact ? '사실' : '모두 추정'}
                  </span>
                  {chosen && (
                    <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: chosen === 'hide' ? '#9ca3af' : accentColor }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>

                {chosen !== 'hide' && (
                  <div className="px-4 py-3 bg-white">
                    {isEditing ? (
                      <EditArea
                        defaultValue={editTexts[block.id] || block.preview}
                        onSave={text => saveEdit(block.id, text)}
                        onCancel={() => setEditingId(null)} />
                    ) : (
                      <p className="text-[13px] text-gray-600 leading-relaxed line-clamp-3">
                        {editTexts[block.id] || block.preview}
                      </p>
                    )}
                  </div>
                )}

                {chosen === 'hide' && (
                  <div className="px-4 py-3 bg-white flex items-center gap-2">
                    <span className="text-gray-300 text-[18px]">🙈</span>
                    <p className="text-[13px] text-gray-400">이 항목은 임차·매수 희망자에게 공개되지 않아요</p>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex border-t border-gray-100">
                    {ACTION_OPTS
                      .filter(a => a.id !== 'hide' || block.canHide)
                      .map((action, idx, arr) => {
                        const isChosen = chosen === action.id
                        return (
                          <button key={action.id}
                            onClick={() => setChoice(block.id, action.id)}
                            className="flex-1 py-3 text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                            style={{
                              backgroundColor: isChosen ? (action.id === 'hide' ? '#f3f4f6' : accentBg) : '#fff',
                              color: isChosen ? (action.id === 'hide' ? '#6b7280' : accentColor) : '#9ca3af',
                              borderRight: idx < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
                            }}>
                            <span className="text-[14px]">{action.icon}</span>
                            {action.label}
                          </button>
                        )
                      })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-5 px-4 py-3 rounded-2xl border border-gray-100">
          <p className="text-[12px] text-gray-500 leading-relaxed">
            <strong>모두 추정</strong>은 모두가 계산한 값이에요. 공개 안 함 선택 시 임차·매수 희망자에게 노출되지 않아요.
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
        onClick={() => navigate('/e1p/4')}
        style={{
          display: 'block', width: '100%',
          padding: '18px 0',
          borderRadius: '16px',
          backgroundColor: '#111827',
          color: '#ffffff',
          fontSize: '16px', fontWeight: 700,
          border: 'none', cursor: 'pointer',
          WebkitAppearance: 'none',
        }}>
        다음 — 도면·서류 추가
      </button>
    </div>
    </>
  )
}
