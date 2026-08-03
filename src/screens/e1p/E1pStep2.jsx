import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1p } from './E1pContext'
import { generateLandlordListingDraft, rewriteDraftBlock } from '../../lib/gemini'
import { fetchMarketData } from '../../lib/marketData'
import { manwon } from '../../lib/format'
import DraftBlockCard from '../../components/DraftBlockCard'
import ModuWord from '../../components/ModuWord'
import EditStepTabs, { E1P_EDIT_STEPS } from '../../components/EditStepTabs'
import DeepBlocksLockedCard from '../../components/DeepBlocksLockedCard'
import { DEEP_BLOCKS_ENABLED } from '../../lib/memberTier'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 2 ? TEAL : '#e5e7eb' }} />
      ))}
    </div>
  )
}

// planned:true = 아직 실호출 없는 연출 단계 → "(예정)" 표기 + 완료 체크(✓) 미표시.
// 실호출: 위치·상권 검색(Gemini 그라운딩 + 국토부 실거래 + 소진공 상가업소 실데이터) + 설명문 초안(Gemini).
// 등기·건축물(API 미연동)·임대 시세(실거래 API에 임대료 없음)는 인프라 부재 → (예정) 유지.
const LOAD_STEPS = [
  { icon: '📍', text: '위치·상권 검색 중...' },
  { icon: '📋', text: '등기·건축물 정보 분석 (예정)', planned: true },
  { icon: '📊', text: '인근 임대 시세 비교 (예정)', planned: true },
  { icon: '✍️', text: '모두가 설명문 쓰는 중...' },
]

/**
 * 초안 블록 구성 — 근거 없는 더미 금지:
 * - description: AI 초안(그라운딩 검색 기반 — 상권 특성·유동인구·배후세대·추천 업종 본문 포함).
 *   실패 시 입력 사실만으로 최소 문장(날조 없음).
 * - location: 입력 사실(주소·층·면적)만 — 옛 하드코딩 상권 더미 문구 사망.
 * - rent/sale_market: AI 초안에 있을 때만 — 옛 가짜 범위 수치 폴백 사망.
 * - 권장 업종 별도 블록 삭제 — description 본문에 통합(대표 확정).
 */
function buildBlocksFromDraft(aiDraft, data, deepBlocks = DEEP_BLOCKS_ENABLED) {
  const isRent = data.listingType === 'rent' || data.listingType === 'both'
  const isSale = data.listingType === 'sale' || data.listingType === 'both'
  const factLine = [data.address, data.floor, data.area && `${data.area}㎡`].filter(Boolean).join(' · ')

  const blocks = [
    {
      id: 'description',
      title: '상가 설명문',
      icon: '✍️',
      source: aiDraft?.description ? 'ai' : 'input',
      canHide: false,
      body: aiDraft?.description || (factLine ? `${factLine} 상가입니다.` : '설명문을 직접 작성해 주세요.'),
    },
    {
      id: 'location',
      title: '위치 · 기본 정보',
      icon: '📍',
      source: 'input',
      canHide: false,
      body: factLine || '주소를 입력해 주세요.',
    },
  ]

  if (isRent && aiDraft?.rentMarket) {
    blocks.push({
      id: 'rent_market', title: '임대 조건 해석', icon: '📊', source: 'ai', canHide: true,
      body: aiDraft.rentMarket,
      note: '모두가 해석한 참고 의견이에요 — 확정 시세가 아닙니다',
    })
  }
  if (isSale && aiDraft?.saleMarket) {
    blocks.push({
      id: 'sale_market', title: '매매·수익률 해석', icon: '💰', source: 'ai', canHide: true,
      body: aiDraft.saleMarket,
      note: '모두가 해석한 참고 의견이에요 — 확정 수익률이 아닙니다',
    })
  }
  // 특이사항·경쟁력 — 유료 심화 블록(생성은 항상, 표시는 플래그 게이트. 잠금 카드는 화면 담당)
  if (deepBlocks) {
    if (aiDraft?.highlights) {
      blocks.push({
        id: 'highlights', title: '특이사항', icon: '📌', source: 'ai', canHide: true,
        body: aiDraft.highlights, note: '입력하신 정보에서 확인된 특이점이에요.',
      })
    }
    if (aiDraft?.competitiveness) {
      blocks.push({
        id: 'competitiveness', title: '경쟁력 분석', icon: '🏆', source: 'ai', canHide: true,
        body: aiDraft.competitiveness, note: '상권 실데이터 기반 참고 해석이에요.',
      })
    }
  }
  return blocks
}

export default function E1pStep2() {
  const navigate = useNavigate()
  const { data, update, editLoading } = useE1p()
  const editQ = data.editingListingId ? `?edit=${data.editingListingId}` : '' // 단계 이동 시 수정 모드 URL 보존(edit-stability)

  const [loadStep, setLoadStep] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const [aiDraft, setAiDraft] = useState(null)
  const [aiError, setAiError] = useState(null)
  const [market, setMarket] = useState(null) // 국토부 상업용 실거래 (E1과 동일 파이프라인)
  // 초안+검수 1화면 — 항목별 수정·공개 상태 (E1 방식, DraftBlockCard 공용)
  const [editTexts, setEditTexts] = useState(() => data.editedTexts ?? {})
  const [itemVisibility, setItemVisibility] = useState(() => data.itemVisibility ?? {})
  // "모두에게 수정 요청" — 요청당 Gemini 1회(그라운딩 없음). 상한: 세션당 10회(폭주 방지, 초과 시 정직 안내).
  const [rewriteCount, setRewriteCount] = useState(0)
  const [rewriteLog, setRewriteLog] = useState([]) // 학습 기록 — 확정 시 reviewChoices에 함께 저장
  const REWRITE_LIMIT = 10
  const handleModuRewrite = async (block, currentText, request) => {
    if (rewriteCount >= REWRITE_LIMIT) throw new Error('이번 등록에서는 수정 요청을 다 썼어요 — ✏️ 직접 수정은 계속 할 수 있어요')
    const newText = await rewriteDraftBlock({ blockTitle: block.title, currentText, request })
    setRewriteCount(c => c + 1)
    setRewriteLog(l => [...l, { blockId: block.id, request }])
    return newText
  }

  const ready = animDone && (aiDraft !== null || aiError !== null)

  useEffect(() => {
    // 수정 모드 로드 완료 전엔 판단 보류 — /e1p/2?edit= 직접 진입 시 로드 전 Gemini 재호출 방지
    // (한 번-실행 ref 가드는 금지 — StrictMode 이중 마운트에서 cleanup된 타이머가 재설정되지 못해 ready가 영영 안 됨)
    if (editLoading) return

    // 위치·시세·상권 실데이터 — lib/marketData 재사용(E1과 공유). 실패해도 초안 진행엔 영향 없음.
    // includeDistrict: 소진공 상가업소 실값(반경 상가 수·업종 구성)을 초안 프롬프트에 넣기 위해 초안 생성보다 먼저 받는다.
    const marketPromise = fetchMarketData(
      { address: data.address, area: data.area },
      { includeDistrict: true },
    ).catch(() => null)
    marketPromise.then(m => { if (m) setMarket(m.priceData) })

    // 수정 모드 + 저장된 초안 존재 = 편집 기본 — Gemini 재호출 금지, 로딩 극장(3.2초 연출)도 재실행 금지
    if (data.editingListingId && data.aiDraft) {
      setAiDraft(data.aiDraft)
      setEditTexts(data.editedTexts ?? {})
      setItemVisibility(data.itemVisibility ?? {})
      setAnimDone(true)
      setLoadStep(LOAD_STEPS.length)
      return
    }

    const timers = LOAD_STEPS.map((_, i) =>
      setTimeout(() => setLoadStep(i + 1), 700 * (i + 1))
    )
    const done = setTimeout(() => setAnimDone(true), 700 * LOAD_STEPS.length + 400)

    marketPromise
      .then(m => generateLandlordListingDraft(data, m?.districtData))
      .then(draft => {
        setAiDraft(draft)
        update({ aiDraft: draft })
      })
      .catch(e => {
        setAiError(e.message)
        setAiDraft({})
      })

    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [editLoading])  // eslint-disable-line

  // 실거래 실데이터일 때만 노출(더미 금지 — E2 카드와 동일 게이트)
  const marketReal = market && market.dataSource === 'api' && market.transactionCount > 0

  const draftBlocks = buildBlocksFromDraft(aiDraft, data)

  // 검수·수정 확정 기록 후 다음(도면) — E1과 동일: 그대로 수용(수정 0건)도 confirmedAt 기록
  const confirmAndNext = () => {
    update({
      editedTexts: editTexts,
      itemVisibility,
      reviewChoices: {
        confirmedAt: new Date().toISOString(),
        editedCount: Object.keys(editTexts).length,
        ...(rewriteLog.length ? { rewriteRequests: rewriteLog } : {}), // 학습 루프용 — 요청 텍스트 기록
      },
    })
    navigate(`/e1p/3${editQ}`)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate(`/e1p/1${editQ}`)} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-t16 font-bold text-gray-900">상가 등록</h1>
          <span className="text-t13 font-bold" style={{ color: TEAL }}>2 / 4</span>
        </div>
        <ProgressBar />
        <EditStepTabs editId={data.editingListingId} steps={E1P_EDIT_STEPS} accent={'#1e6b6b'} />
      </div>

      <main className="flex-1 overflow-y-auto px-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {!ready ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="flex gap-2 mb-8">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: TEAL,
                    animation: `bounce 0.9s ease-in-out ${i * 0.15}s infinite`,
                  }} />
              ))}
            </div>
            <h2 className="text-t22 font-bold text-gray-900 mb-2"><ModuWord />가 상가 설명을 쓰고 있어요</h2>
            <p className="text-t14 text-gray-400 mb-8">동네·상권을 검색해서 근거 있는 소개를 써드려요</p>

            <div className="w-full flex flex-col gap-3">
              {LOAD_STEPS.map((s, i) => (
                <div key={i}
                  data-testid={`load-step-${i}`}
                  className="flex items-center gap-3 transition-all duration-500"
                  style={{ opacity: loadStep > i ? 1 : 0.25 }}>
                  <span className="text-t18">{s.icon}</span>
                  <span className="text-t13 text-gray-600">{s.text}</span>
                  {/* 완료 체크는 실호출 단계에만 — (예정) 항목엔 안 한 일에 완료 표시 금지 */}
                  {loadStep > i && !s.planned && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" data-testid="load-check" className="ml-auto shrink-0">
                      <circle cx="7" cy="7" r="6" fill={TEAL} />
                      <path d="M4 7l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            {animDone && !aiDraft && !aiError && (
              <p className="mt-6 text-t13 text-gray-400">모두가 마무리하는 중...</p>
            )}
          </div>
        ) : (
          <>
            {aiError && (
              <div className="mt-5 mb-4 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
                <p className="text-t12 text-amber-700">지금은 초안을 못 만들었어요. 아래에서 직접 작성해 계속 진행할 수 있어요.</p>
              </div>
            )}

            <div className="mt-5 mb-5">
              <h2 className="text-t20 font-bold text-gray-900"><ModuWord />가 써본 소개예요</h2>
              <p className="text-t13 text-gray-400 mt-1">항목별로 바로 수정하거나 비공개로 바꿀 수 있어요</p>
            </div>

            {/* 주변 실거래 참고 — 국토부 상업용 실거래(E1·E2와 동일 파이프라인·게이트). 실데이터일 때만. */}
            {marketReal && (
              <div className="rounded-2xl border border-gray-100 p-4 mb-4" data-testid="e1p-market-card" style={{ backgroundColor: '#f8fcfc' }}>
                <p className="text-t12 font-bold mb-2" style={{ color: TEAL }}>📊 주변 실거래 참고 (최근 3개월 {market.transactionCount}건)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-t11 text-gray-400">㎡당 평균 매매가</p><p className="text-t14 font-bold text-gray-800">{manwon(market.avgPricePerM2) ?? '-'}</p></div>
                  <div><p className="text-t11 text-gray-400">거래가 범위</p><p className="text-t14 font-bold text-gray-800">{manwon(market.priceRange?.min) ?? '-'} ~ {manwon(market.priceRange?.max) ?? '-'}</p></div>
                </div>
                <p className="text-t10 text-gray-400 mt-2">국토교통부 상업업무용 실거래가 · 인근 지역 기준 참고용</p>
              </div>
            )}

            {/* 초안+검수 1화면 — 블록별 수정/공개 (E1 방식·공용 카드) */}
            <div className="flex flex-col gap-4">
              {draftBlocks.map(block => (
                <DraftBlockCard
                  key={block.id}
                  block={block}
                  editTexts={editTexts}
                  setEditTexts={setEditTexts}
                  itemVisibility={itemVisibility}
                  setItemVisibility={setItemVisibility}
                  accent={TEAL}
                  accentBg={TEAL_BG}
                  onModuRewrite={handleModuRewrite}
                />
              ))}
              <DeepBlocksLockedCard />
            </div>
          </>
        )}

      </main>

      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button
          disabled={!ready}
          onClick={() => ready && confirmAndNext()}
          className="w-full py-[18px] rounded-2xl text-t16 font-bold transition-all active:scale-[0.99]"
          style={{
            backgroundColor: ready ? TEAL : '#e5e7eb',
            color: ready ? '#ffffff' : '#9ca3af',
          }}>
          다음 — 도면·서류 추가
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
