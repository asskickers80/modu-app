import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1 } from './E1Context'
import { buildListingBlocks } from './buildListingBlocks'
import { generateListingDraft, generateMarketInsight } from '../../lib/gemini'
import { fetchMarketData } from '../../lib/marketData'
import { getProfile } from '../../lib/userProfile'
import ModuSpinner from '../../components/ModuSpinner'
import ModuWord from '../../components/ModuWord'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

function ProgressBar({ step }) {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= step ? NAVY : '#e5e7eb' }} />
      ))}
    </div>
  )
}

function BlockCard({ block, editTexts, setEditTexts, itemVisibility, setItemVisibility }) {
  const savedText = editTexts[block.id] ?? block.body
  const [isEditing, setIsEditing] = useState(false)
  const [localText, setLocalText] = useState(savedText)

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
        borderColor: isEditing ? NAVY : '#f3f4f6',
        opacity: isHidden ? 0.5 : 1,
      }}
    >
      {/* 카드 헤더 */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ backgroundColor: isEditing ? NAVY_BG : '#f9fafb', borderColor: isEditing ? `${NAVY}20` : '#f3f4f6' }}
      >
        <span className="text-[16px]">{block.icon}</span>
        <p className="text-[13px] font-bold text-gray-800 flex-1">{block.title}</p>
        {showAiBadge && (
          <span
            data-testid={`ai-badge-${block.id}`}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: NAVY_BG, color: NAVY }}
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
              : { color: NAVY, borderColor: `${NAVY}40`, backgroundColor: NAVY_BG }
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
            style={{ minHeight: '80px', borderColor: `${NAVY}30`, backgroundColor: '#fafbff' }}
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
        {/* 수정/저장 버튼 — 본문 하단 우측, 헤더 overflow 영향 없음 */}
        <div className="flex justify-end mt-2 pt-2 border-t border-gray-50">
          {!isEditing ? (
            <button
              data-testid={`edit-btn-${block.id}`}
              onClick={startEdit}
              className="flex items-center gap-1 text-[13px] font-semibold px-3 py-1.5 rounded-xl border"
              style={{ color: NAVY, borderColor: `${NAVY}40`, backgroundColor: NAVY_BG }}
            >
              ✏️ 수정하기
            </button>
          ) : (
            <button
              data-testid={`save-btn-${block.id}`}
              onClick={saveEdit}
              className="flex items-center gap-1 text-[13px] font-bold px-3 py-1.5 rounded-xl"
              style={{ color: 'white', backgroundColor: NAVY }}
            >
              저장 완료
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function E1Step2() {
  const navigate = useNavigate()
  const { data, update } = useE1()
  const [ready, setReady] = useState(false)
  const [blocks, setBlocks] = useState([])
  const [error, setError] = useState(null)
  const [editTexts, setEditTexts] = useState({})
  const [itemVisibility, setItemVisibility] = useState(() => data.itemVisibility ?? {})

  // salesAnalysis 블록 첫 등장 시 기본 비공개 처리
  useEffect(() => {
    if (!ready) return
    const hasSales = blocks.some(b => b.id === 'salesAnalysis')
    if (hasSales && !('salesAnalysis' in itemVisibility)) {
      setItemVisibility(prev => ({ ...prev, salesAnalysis: false }))
    }
  }, [ready, blocks]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback(() => {
    setReady(false)
    setError(null)

    const bizType = getProfile().bizType ?? '카페'

    Promise.all([
      generateListingDraft(data),
      fetchMarketData({ address: data.address, bizType, area: data.area }),
    ])
      .then(async ([draftResult, marketData]) => {
        let insight = null
        try {
          insight = await generateMarketInsight(marketData, data)
        } catch (e) {
          console.warn('[E1Step2] 시세 해석 생성 실패 (계속 진행):', e)
        }

        update({ aiDraft: draftResult, marketData, marketInsight: insight })
        setBlocks(buildListingBlocks(draftResult, marketData, insight, data))
        setTimeout(() => setReady(true), 400)
      })
      .catch(err => {
        console.error('[E1Step2] 생성 실패:', err)
        setError(err.message)
      })
  }, [data, update])

  const regenerate = useCallback(() => {
    setEditTexts({})
    setItemVisibility({})
    run()
  }, [run])

  useEffect(() => {
    if (data.aiDraft) {
      if (data.editedTexts) setEditTexts(data.editedTexts)
      if (data.itemVisibility) setItemVisibility(data.itemVisibility)
      setBlocks(buildListingBlocks(data.aiDraft, data.marketData, data.marketInsight, data))
      setReady(true)
      return
    }
    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1/1')} className="flex items-center gap-0.5 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">매물 등록</h1>
          <span className="text-[13px] font-bold" style={{ color: NAVY }}>2 / 4</span>
        </div>
        <ProgressBar step={2} />
        {ready && (
          <div className="px-5 pb-5 border-b border-gray-50">
            <h2 className="text-[20px] font-bold text-gray-900"><ModuWord />가 써본 초안이에요</h2>
            <div className="flex items-center mt-1">
              <p className="text-[13px] text-gray-400 flex-1">고칠 부분만 다듬어주세요</p>
              <button onClick={regenerate}
                className="text-[11px] text-gray-400 underline underline-offset-2 shrink-0">
                다시 생성
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="px-5 pb-5 border-b border-gray-50">
            <h2 className="text-[20px] font-bold text-gray-900">잠깐, 문제가 생겼어요</h2>
          </div>
        )}
      </div>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

        {/* 에러 화면 */}
        {error && !ready && (
          <div className="flex flex-col items-center justify-center h-full px-6 gap-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-[32px]"
              style={{ backgroundColor: '#fef2f2' }}>⚠️</div>
            <div>
              <p className="text-[17px] font-bold text-gray-900 mb-2">지금은 초안 작성이 어려워요</p>
              <p className="text-[14px] text-gray-500 leading-relaxed">직접 작성하시거나 잠시 후 다시 시도해주세요</p>
              <p className="text-[12px] text-gray-400 mt-2">{error}</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button onClick={run}
                className="w-full py-4 rounded-2xl text-[15px] font-bold text-white"
                style={{ backgroundColor: NAVY }}>
                다시 시도
              </button>
              <button onClick={() => navigate('/e1/3')}
                className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white"
                style={{ backgroundColor: '#374151' }}>
                초안 없이 계속 진행 — 사진·증빙(3단계)
              </button>
              <button onClick={() => navigate('/e1/1')}
                className="w-full py-4 rounded-2xl text-[15px] font-semibold text-gray-500 border border-gray-200">
                1단계로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* 로딩 화면 */}
        {!ready && !error && (
          <div className="flex flex-col items-center justify-center h-full px-5 gap-8">
            <ModuSpinner size={72} />
            <div className="text-center">
              <p className="text-[20px] font-bold text-gray-900">사장님 가게 소개글을 쓰고 있어요…</p>
            </div>
            <div className="w-full px-4 py-3 rounded-2xl border border-gray-100 text-center">
              <p className="text-[12px] text-gray-400">
                <span className="font-semibold text-gray-600">무료</span>: 기본 설명·시세·위치<br />
                <span className="font-semibold" style={{ color: '#d68b2a' }}>프리미엄</span>: 경쟁 분석·심층 해석·노출 강화
              </p>
            </div>
          </div>
        )}

        {/* 결과 화면: 항목별 카드 */}
        {ready && (
          <div className="px-5 pt-5 pb-8 flex flex-col gap-4">
            {blocks.map(block => (
              <BlockCard
                key={block.id}
                block={block}
                editTexts={editTexts}
                setEditTexts={setEditTexts}
                itemVisibility={itemVisibility}
                setItemVisibility={setItemVisibility}
              />
            ))}
          </div>
        )}

      </main>

      {/* 하단 버튼 */}
      {ready && (
        <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
          <button
            onClick={() => { update({ editedTexts: editTexts, itemVisibility }); navigate('/e1/3') }}
            className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white"
            style={{ backgroundColor: '#111827' }}>
            다음
          </button>
        </div>
      )}

    </div>
  )
}
