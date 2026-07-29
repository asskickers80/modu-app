import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1 } from './E1Context'
import { buildListingBlocks } from './buildListingBlocks'
import { generateListingDraft, generateMarketInsight, rewriteDraftBlock } from '../../lib/gemini'
import { fetchMarketData } from '../../lib/marketData'
import { getProfile } from '../../lib/userProfile'
import ModuSpinner from '../../components/ModuSpinner'
import ModuWord from '../../components/ModuWord'
import DraftBlockCard from '../../components/DraftBlockCard'
import EditStepTabs, { E1_EDIT_STEPS } from '../../components/EditStepTabs'

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

// 블록 카드는 components/DraftBlockCard 공용 (E1p와 공유 — 복제 금지)

export default function E1Step2() {
  const navigate = useNavigate()
  const { data, update, editLoading } = useE1()
  const editQ = data.editingListingId ? `?edit=${data.editingListingId}` : '' // 단계 이동 시 수정 모드 URL 보존(edit-stability)
  const [ready, setReady] = useState(false)
  const [blocks, setBlocks] = useState([])
  const [error, setError] = useState(null)
  // 로딩 단계 — 실호출 진행에만 연동(연출 타이머 없음): 0=상권 수집, 1=소개글 생성
  const [loadPhase, setLoadPhase] = useState(0)
  const [editTexts, setEditTexts] = useState({})
  // "모두에게 수정 요청" — 블록 단위(공용 DraftBlockCard), 요청당 Gemini 1회(그라운딩 없음), 세션당 10회 상한
  const [rewriteCount, setRewriteCount] = useState(0)
  const [rewriteLog, setRewriteLog] = useState([])
  const REWRITE_LIMIT = 10
  const handleModuRewrite = async (block, currentText, request) => {
    if (rewriteCount >= REWRITE_LIMIT) throw new Error('이번 등록에서는 수정 요청을 다 썼어요 — ✏️ 직접 수정은 계속 할 수 있어요')
    const newText = await rewriteDraftBlock({ blockTitle: block.title, currentText, request })
    setRewriteCount(c => c + 1)
    setRewriteLog(l => [...l, { blockId: block.id, request }])
    return newText
  }
  const [itemVisibility, setItemVisibility] = useState(() => data.itemVisibility ?? {})
  // 새로 쓰기 — 받아온 새 글을 기존 글과 비교해 고르기 전까지 임시 보관
  const [rewriting, setRewriting] = useState(false)
  const [rewriteError, setRewriteError] = useState(false)
  const [pending, setPending] = useState(null)

  // salesAnalysis 블록 첫 등장 시 기본 비공개 처리
  useEffect(() => {
    if (!ready) return
    const hasSales = blocks.some(b => b.id === 'salesAnalysis')
    if (hasSales && !('salesAnalysis' in itemVisibility)) {
      setItemVisibility(prev => ({ ...prev, salesAnalysis: false }))
    }
  }, [ready, blocks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Gemini 호출 1회분 — 결과를 어디에 쓸지는 호출부가 정한다.
  // 순차화(E1p 방식): 상권 실값을 먼저 받아 초안 프롬프트에 주입한다 (district-draft-v2).
  const generate = useCallback(async () => {
    const bizType = getProfile().bizType ?? '카페'
    setLoadPhase(0) // 위치·상권 데이터 수집 중
    // includeDistrict: 등록 초안에서만 상권 실데이터(지오코딩+소진공 API) 포함 — ksicCode로 동종 수 산출
    const marketData = await fetchMarketData(
      { address: data.address, bizType, area: data.area, ksicCode: data.ksicCode },
      { includeDistrict: true },
    )
    setLoadPhase(1) // 소개글 쓰는 중
    const draftResult = await generateListingDraft(data, marketData.districtData)
    let insight = null
    try {
      insight = await generateMarketInsight(marketData, data)
    } catch (e) {
      console.warn('[E1Step2] 시세 해석 생성 실패 (계속 진행):', e)
    }
    return { draftResult, marketData, insight }
  }, [data])

  // 최초 생성 — 아직 쓸 글이 없을 때만
  const run = useCallback(() => {
    setReady(false)
    setError(null)
    generate()
      .then(({ draftResult, marketData, insight }) => {
        update({ aiDraft: draftResult, marketData, marketInsight: insight })
        setBlocks(buildListingBlocks(draftResult, marketData, insight, data))
        setTimeout(() => setReady(true), 400)
      })
      .catch(err => {
        console.error('[E1Step2] 생성 실패:', err)
        setError(err.message)
      })
  }, [generate, data, update])

  // 새로 쓰기 — 기존 글은 그대로 두고 새 글을 따로 받아 비교 후 고르게 한다
  const requestRewrite = useCallback(() => {
    setRewriting(true)
    setRewriteError(false)
    generate()
      .then(res => { setPending(res); setRewriting(false) })
      .catch(err => {
        console.error('[E1Step2] 새로 쓰기 실패:', err)
        setRewriting(false)
        setRewriteError(true)
      })
  }, [generate])

  const keepCurrent = useCallback(() => setPending(null), [])

  const applyPending = useCallback(() => {
    if (!pending) return
    const { draftResult, marketData, insight } = pending
    // 새 글로 갈아끼우므로 기존 수정문·공개설정은 초기화한다
    setEditTexts({})
    setItemVisibility({})
    update({ aiDraft: draftResult, marketData, marketInsight: insight, editedTexts: {}, itemVisibility: {} })
    setBlocks(buildListingBlocks(draftResult, marketData, insight, data))
    setPending(null)
  }, [pending, update, data])

  // 자동 생성은 "쓸 글이 아직 없을 때" 딱 한 번만. 기존 소개글이 있으면 절대 재생성하지 않는다
  // (수정 모드는 DB 로드가 끝날 때까지 기다린다 — 예전엔 로드 전에 판단해 덮어썼다).
  const autoRanRef = useRef(false)
  useEffect(() => {
    if (editLoading) return          // 아직 기존 글을 모른다 → 판단 보류
    if (autoRanRef.current) return   // 자동 실행은 1회로 제한

    if (data.aiDraft) {
      autoRanRef.current = true
      if (data.editedTexts) setEditTexts(data.editedTexts)
      if (data.itemVisibility) setItemVisibility(data.itemVisibility)
      setBlocks(buildListingBlocks(data.aiDraft, data.marketData, data.marketInsight, data))
      setReady(true)
      return
    }
    autoRanRef.current = true
    run()
  }, [editLoading, data.aiDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate(`/e1/1${editQ}`)} className="flex items-center gap-0.5 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">매물 등록</h1>
          <span className="text-[13px] font-bold" style={{ color: NAVY }}>2 / 4</span>
        </div>
        <ProgressBar step={2} />
        <EditStepTabs editId={data.editingListingId} steps={E1_EDIT_STEPS} accent={'#1a4d8f'} />
        {ready && (
          <div className="px-5 pb-5 border-b border-gray-50">
            <h2 className="text-[20px] font-bold text-gray-900">
              {data.editingListingId
                ? '지금 소개글이에요'
                : <><ModuWord />가 써본 초안이에요</>}
            </h2>
            <div className="flex items-center mt-1">
              <p className="text-[13px] text-gray-400 flex-1">고칠 부분만 다듬어주세요</p>
              <button
                onClick={requestRewrite}
                disabled={rewriting}
                data-testid="rewrite-button"
                className="text-[11px] underline underline-offset-2 shrink-0 disabled:opacity-50"
                style={{ color: NAVY }}>
                {rewriting ? '새로 쓰는 중…' : '모두가 새로 써드릴까요?'}
              </button>
            </div>
            {rewriteError && (
              <p className="text-[11px] text-amber-700 mt-1.5">
                지금은 새로 쓰지 못했어요. 지금 소개글은 그대로 두었어요.
              </p>
            )}
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
              <button onClick={() => navigate(`/e1/3${editQ}`)}
                className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white"
                style={{ backgroundColor: '#374151' }}>
                초안 없이 계속 진행 — 사진·증빙(3단계)
              </button>
              <button onClick={() => navigate(`/e1/1${editQ}`)}
                className="w-full py-4 rounded-2xl text-[15px] font-semibold text-gray-500 border border-gray-200">
                1단계로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* 로딩 화면 — 실호출 항목만 단계 표시 (연출 금지: loadPhase는 실제 await 진행에만 연동) */}
        {!ready && !error && (
          <div className="flex flex-col items-center justify-center h-full px-5 gap-8">
            <ModuSpinner size={72} />
            <div className="flex flex-col gap-2.5">
              {[
                { icon: '📍', text: '위치·상권 데이터 수집 중' },
                { icon: '✍️', text: '소개글 쓰는 중' },
              ].map((s, i) => (
                <div key={i} data-testid={`e1-load-step-${i}`}
                  className="flex items-center gap-2 transition-opacity"
                  style={{ opacity: loadPhase >= i ? 1 : 0.35 }}>
                  <span className="text-[16px]">{s.icon}</span>
                  <p className="text-[15px] font-bold text-gray-900">
                    {s.text}{loadPhase > i ? ' ✓' : loadPhase === i ? '…' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 결과 화면: 항목별 카드 */}
        {ready && (
          <div className="px-5 pt-5 pb-8 flex flex-col gap-4">
            {blocks.map(block => (
              <DraftBlockCard accent={NAVY} accentBg={NAVY_BG} onModuRewrite={handleModuRewrite}
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
            onClick={() => {
              // 소개글 확인 이벤트 기록 — 그대로 수용(수정 0건)해도 '읽고 확인'은 남긴다.
              // 홈 가이드 3단계·E2 검수 뱃지·완성도 점수가 이 필드의 존재 여부로 판정한다.
              update({
                editedTexts: editTexts,
                itemVisibility,
                reviewChoices: {
                  confirmedAt: new Date().toISOString(),
                  editedCount: Object.keys(editTexts).length,
                },
              })
              navigate(`/e1/3${editQ}`)
            }}
            className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white"
            style={{ backgroundColor: '#111827' }}>
            다음
          </button>
        </div>
      )}

      {/* 새 글 비교 — 덮어쓰기 전에 반드시 고르게 한다 */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="rewrite-compare">
          <div className="absolute inset-0 bg-black/40" onClick={keepCurrent} />
          <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-8">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <p className="text-[17px] font-bold text-gray-900">어느 쪽으로 할까요?</p>
            <p className="text-[12px] text-gray-400 mt-1 mb-4">
              고르기 전까지는 지금 소개글이 그대로 유지돼요
            </p>

            <div className="rounded-2xl border border-gray-100 p-3.5 mb-2.5">
              <p className="text-[11px] font-bold text-gray-400 mb-1.5">지금 소개글</p>
              <p className="text-[13px] text-gray-700 leading-relaxed line-clamp-4">
                {editTexts.description ?? data.aiDraft?.description ?? '(내용 없음)'}
              </p>
            </div>
            <div className="rounded-2xl border p-3.5 mb-5" style={{ borderColor: `${NAVY}40`, backgroundColor: NAVY_BG }}>
              <p className="text-[11px] font-bold mb-1.5" style={{ color: NAVY }}>모두가 새로 쓴 글</p>
              <p className="text-[13px] text-gray-700 leading-relaxed line-clamp-4">
                {pending.draftResult?.description ?? '(내용 없음)'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={keepCurrent}
                data-testid="keep-current"
                className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold text-gray-600 bg-gray-100">
                지금 글 유지
              </button>
              <button
                onClick={applyPending}
                data-testid="apply-new"
                className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold text-white"
                style={{ backgroundColor: NAVY }}>
                새 글로 바꾸기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
