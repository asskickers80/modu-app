import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1 } from './E1Context'
import { buildListingBlocks } from './buildListingBlocks'
import { saveReviewLog } from '../../lib/reviewLog'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const AMBER = '#d68b2a'
const AMBER_BG = '#fef3e2'
const GREEN = '#22c55e'

function ProgressBar({ step }) {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= step ? NAVY : '#e5e7eb' }} />
      ))}
    </div>
  )
}

const ACTION_OPTS = [
  { id: 'keep', label: '그대로', icon: '✓' },
  { id: 'edit', label: '수정', icon: '✏️' },
  { id: 'hide', label: '공개 안 함', icon: '🙈' },
]

export default function E1Step3() {
  const navigate = useNavigate()
  const { data, update } = useE1()
  const [editingId, setEditingId] = useState(null)
  const [editTexts, setEditTexts] = useState(data.editedTexts || {})

  const choices = data.reviewChoices || {}
  const blocks = useMemo(
    () => buildListingBlocks(data.aiDraft, data.marketData, data.marketInsight, data),
    [data.aiDraft, data.marketData, data.marketInsight, data.address]
  )

  const setChoice = (blockId, choice) => {
    const next = { ...choices, [blockId]: choice }
    update({ reviewChoices: next })
    if (choice === 'edit') setEditingId(blockId)
    else if (editingId === blockId) setEditingId(null)
  }

  const saveEdit = (blockId, text) => {
    const next = { ...editTexts, [blockId]: text }
    setEditTexts(next)
    update({ editedTexts: next })
    setEditingId(null)
  }

  const reviewedCount = blocks.filter(b => choices[b.id]).length
  const allReviewed = blocks.length > 0 && reviewedCount >= blocks.length

  const handleNext = () => {
    // 미검수 블록은 '그대로' 자동 선택 후 진행
    const finalChoices = { ...choices }
    blocks.forEach(b => { if (!finalChoices[b.id]) finalChoices[b.id] = 'keep' })
    update({ reviewChoices: finalChoices })
    saveReviewLog({ listing: data, blocks, choices: finalChoices, editedTexts })
    navigate('/e1/4')
  }

  // aiDraft 없이 직접 진입한 경우 (DevMenu 직접 진입 등)
  if (!data.aiDraft) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 gap-5 text-center">
        <div className="text-[40px]">📋</div>
        <p className="text-[17px] font-bold text-gray-900">AI 초안이 없어요</p>
        <p className="text-[14px] text-gray-500 leading-relaxed">
          1단계에서 정보를 입력하고<br />2단계 AI 생성을 먼저 진행해 주세요
        </p>
        <button onClick={() => navigate('/e1/1')}
          className="w-full max-w-xs py-4 rounded-2xl text-[15px] font-bold text-white"
          style={{ backgroundColor: NAVY }}>
          1단계로 이동
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1/2')} className="flex items-center gap-0.5 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">매물 등록</h1>
          <span className="text-[13px] font-bold" style={{ color: NAVY }}>3 / 5</span>
        </div>
        <ProgressBar step={3} />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">항목별로 검수해 주세요</h2>
          <p className="text-[13px] text-gray-400 mt-1">
            각 항목을 그대로 두거나, 직접 수정하거나, 공개하지 않을 수 있어요
          </p>
        </div>
      </div>

      {/* 진행 카운터 */}
      <div className="shrink-0 px-5 py-2.5 flex items-center gap-2 bg-white border-b border-gray-50">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(reviewedCount / blocks.length) * 100}%`, backgroundColor: GREEN }} />
        </div>
        <span className="text-[12px] font-bold shrink-0" style={{ color: GREEN }}>
          {reviewedCount}/{blocks.length} 완료
        </span>
      </div>

      {/* 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-32" style={{ scrollbarWidth: 'none' }}>
        <div className="flex flex-col gap-4">
          {blocks.map(block => {
            const isFact = block.tone === 'fact'
            const accentColor = isFact ? NAVY : AMBER
            const accentBg = isFact ? NAVY_BG : AMBER_BG
            const chosen = choices[block.id]
            const isEditing = editingId === block.id
            const displayText = editTexts[block.id] || block.body

            return (
              <div key={block.id}
                className="rounded-2xl border-2 overflow-hidden transition-all"
                style={{ borderColor: chosen ? (chosen === 'hide' ? '#e5e7eb' : accentColor) : '#e5e7eb' }}>

                {/* 블록 헤더 */}
                <div className="flex items-center gap-2.5 px-4 py-3"
                  style={{ backgroundColor: chosen ? (chosen === 'hide' ? '#f9fafb' : accentBg) : '#f9fafb' }}>
                  <span className="text-[18px]">{block.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold"
                      style={{ color: chosen && chosen !== 'hide' ? accentColor : '#374151' }}>
                      {block.title}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: accentBg, color: accentColor }}>
                    {isFact ? '사실' : 'AI 추정'}
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

                {/* 내용 */}
                {chosen !== 'hide' && (
                  <div className="px-4 py-3 bg-white">
                    {isEditing ? (
                      <EditArea
                        defaultValue={displayText}
                        onSave={text => saveEdit(block.id, text)}
                        onCancel={() => setEditingId(null)}
                        accentColor={NAVY}
                      />
                    ) : (
                      <p className="text-[13px] text-gray-600 leading-relaxed line-clamp-3 whitespace-pre-line">
                        {displayText}
                      </p>
                    )}
                  </div>
                )}

                {chosen === 'hide' && (
                  <div className="px-4 py-3 bg-white flex items-center gap-2">
                    <span className="text-gray-300 text-[18px]">🙈</span>
                    <p className="text-[13px] text-gray-400">이 항목은 양수자에게 공개되지 않아요</p>
                  </div>
                )}

                {/* 액션 버튼 */}
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
            <strong>추정 정보</strong>는 AI가 계산한 값이에요. 공개 안 함 선택 시 양수자에게 노출되지 않고,
            검수 로그는 AI 학습에 활용돼 정확도가 점점 높아져요.
          </p>
        </div>
      </main>

      {/* 하단 버튼 */}
      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        {!allReviewed && (
          <p className="text-center text-[12px] text-gray-400 mb-2">
            미검수 항목은 '그대로'로 자동 처리돼요
          </p>
        )}
        <button
          onClick={handleNext}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all text-white"
          style={{ backgroundColor: '#111827' }}>
          다음 — 사진·증빙 추가
        </button>
      </div>

    </div>
  )
}

function EditArea({ defaultValue, onSave, onCancel, accentColor }) {
  const [text, setText] = useState(defaultValue)
  return (
    <div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        className="w-full text-[13px] text-gray-700 leading-relaxed outline-none resize-none border-0 bg-transparent"
        autoFocus
      />
      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
        <button onClick={onCancel}
          className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-gray-400 border border-gray-200">
          취소
        </button>
        <button onClick={() => onSave(text)}
          className="flex-1 py-2 rounded-xl text-[13px] font-bold text-white"
          style={{ backgroundColor: accentColor }}>
          저장
        </button>
      </div>
    </div>
  )
}
