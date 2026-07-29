import { useState, useEffect } from 'react'
import ModuWord from './ModuWord'

/**
 * 초안 블록 카드 — 초안+검수 1화면의 단위 (E1 양도인·E1p 임대인 공유, 복제 금지).
 * 기능: 본문 표시 / ✏️ 수정하기(인라인 편집→저장) / 공개·비공개 토글(canHide 블록만) / 모두 작성 뱃지.
 * 상태(editTexts·itemVisibility)는 호출부 소유 — E1Step2에서 추출, accent 파라미터화.
 */
export default function DraftBlockCard({ block, editTexts, setEditTexts, itemVisibility, setItemVisibility, accent = '#1a4d8f', accentBg = '#eef2fb', onModuRewrite }) {
  const savedText = editTexts[block.id] ?? block.body
  const [isEditing, setIsEditing] = useState(false)
  const [localText, setLocalText] = useState(savedText)
  // "모두에게 수정 요청" — 요청 입력 → 해당 블록만 재작성 → 기존/신규 2안 비교
  const [requesting, setRequesting] = useState(false)
  const [requestText, setRequestText] = useState('')
  const [rewriting, setRewriting] = useState(false)
  const [pendingNew, setPendingNew] = useState(null) // 신규안 대기 — 선택 전 덮어쓰기 금지
  const [rewriteError, setRewriteError] = useState('')

  const submitRewrite = async () => {
    const req = requestText.trim()
    if (!req || rewriting) return
    setRewriting(true)
    setRewriteError('')
    try {
      const newText = await onModuRewrite(block, savedText, req)
      setPendingNew(newText)
      setRequesting(false)
      setRequestText('')
    } catch (e) {
      setRewriteError(e?.message ?? '수정 요청에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setRewriting(false)
    }
  }

  // 부모에서 regenerate 시 editTexts가 {}로 초기화 → localText도 원본으로 리셋
  useEffect(() => {
    if (!isEditing) setLocalText(editTexts[block.id] ?? block.body)
  }, [editTexts]) // eslint-disable-line react-hooks/exhaustive-deps

  const showAiBadge = block.source === 'ai' && !(block.id in editTexts)
  const isHidden = itemVisibility[block.id] === false

  const startEdit = () => {
    setLocalText(editTexts[block.id] ?? block.body)
    setIsEditing(true)
  }

  const saveEdit = () => {
    setEditTexts(prev => ({ ...prev, [block.id]: localText }))
    setIsEditing(false)
  }

  return (
    <div
      data-testid={`block-${block.id}`}
      className="rounded-2xl border overflow-hidden bg-white"
      style={{
        borderColor: isEditing ? accent : '#f3f4f6',
        opacity: isHidden ? 0.5 : 1,
      }}
    >
      {/* 카드 헤더 */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ backgroundColor: isEditing ? accentBg : '#f9fafb', borderColor: isEditing ? `${accent}20` : '#f3f4f6' }}
      >
        <span className="text-[16px]">{block.icon}</span>
        <p className="text-[13px] font-bold text-gray-800 flex-1">{block.title}</p>
        {showAiBadge && (
          <span
            data-testid={`ai-badge-${block.id}`}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: accentBg, color: accent }}
          >
            <ModuWord /> 작성 ✦
          </span>
        )}
        {block.canHide && (
          <button
            data-testid={`visibility-toggle-${block.id}`}
            onClick={() => setItemVisibility(prev => ({
              ...prev,
              [block.id]: prev[block.id] === false ? true : false,
            }))}
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
            style={isHidden
              ? { color: '#9ca3af', borderColor: '#e5e7eb', backgroundColor: 'white' }
              : { color: accent, borderColor: `${accent}40`, backgroundColor: accentBg }
            }
          >
            {isHidden ? '비공개' : '공개'}
          </button>
        )}
      </div>

      {/* 카드 본문 */}
      <div className="px-4 pt-3 pb-2">
        {isEditing ? (
          <textarea
            data-testid={`edit-textarea-${block.id}`}
            value={localText}
            onChange={e => setLocalText(e.target.value)}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            rows={4}
            autoFocus
            className="w-full text-[13px] text-gray-800 leading-relaxed resize-none outline-none rounded-xl border px-3 py-2.5"
            style={{ minHeight: '80px', borderColor: `${accent}30`, backgroundColor: '#fafbff' }}
          />
        ) : (
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">
            {savedText}
          </p>
        )}
        {block.note && (
          <p className="mt-2 text-[11px] text-gray-400 border-t border-gray-50 pt-2">
            ⓘ {block.note}
          </p>
        )}
        {/* 모두에게 수정 요청 — 입력창 */}
        {requesting && !pendingNew && (
          <div className="mt-2 pt-2 border-t border-gray-50">
            <div className="flex gap-2">
              <input
                data-testid={`rewrite-request-input-${block.id}`}
                value={requestText}
                onChange={e => setRequestText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitRewrite() }}
                placeholder='예: "더 짧게", "유동인구 얘기 빼줘"'
                autoFocus
                disabled={rewriting}
                className="flex-1 text-[13px] outline-none rounded-xl border px-3 py-2"
                style={{ borderColor: `${accent}30` }}
              />
              <button
                data-testid={`rewrite-request-send-${block.id}`}
                onClick={submitRewrite}
                disabled={rewriting || !requestText.trim()}
                className="shrink-0 text-[13px] font-bold px-3 py-2 rounded-xl text-white disabled:opacity-40"
                style={{ backgroundColor: accent }}
              >
                {rewriting ? '쓰는 중...' : '요청'}
              </button>
            </div>
            {rewriteError && <p className="mt-1.5 text-[11px] text-red-500">{rewriteError}</p>}
          </div>
        )}

        {/* 2안 비교 — 재생성과 동일 문법: 선택 전 덮어쓰기 금지 */}
        {pendingNew && (
          <div className="mt-2 pt-2 border-t border-gray-50" data-testid={`rewrite-compare-${block.id}`}>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: accent }}>모두가 새로 쓴 글</p>
            <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line rounded-xl px-3 py-2.5"
              style={{ backgroundColor: accentBg }}>{pendingNew}</p>
            <div className="flex gap-2 mt-2">
              <button
                data-testid={`rewrite-apply-${block.id}`}
                onClick={() => { setEditTexts(prev => ({ ...prev, [block.id]: pendingNew })); setPendingNew(null) }}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                새 글로 바꾸기
              </button>
              <button
                data-testid={`rewrite-keep-${block.id}`}
                onClick={() => setPendingNew(null)}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium text-gray-500 border border-gray-200 bg-white"
              >
                지금 글 유지
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-50">
          {!isEditing ? (
            <>
              {onModuRewrite && !pendingNew && (
                <button
                  data-testid={`rewrite-btn-${block.id}`}
                  onClick={() => { setRequesting(r => !r); setRewriteError('') }}
                  className="flex items-center gap-1 text-[13px] font-semibold px-3 py-1.5 rounded-xl border"
                  style={{ color: accent, borderColor: `${accent}40`, backgroundColor: 'white' }}
                >
                  <ModuWord />에게 수정 요청
                </button>
              )}
              <button
                data-testid={`edit-btn-${block.id}`}
                onClick={startEdit}
                className="flex items-center gap-1 text-[13px] font-semibold px-3 py-1.5 rounded-xl border"
                style={{ color: accent, borderColor: `${accent}40`, backgroundColor: accentBg }}
              >
                ✏️ 수정하기
              </button>
            </>
          ) : (
            <button
              data-testid={`save-btn-${block.id}`}
              onClick={saveEdit}
              className="flex items-center gap-1 text-[13px] font-bold px-3 py-1.5 rounded-xl"
              style={{ color: 'white', backgroundColor: accent }}
            >
              저장 완료
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
