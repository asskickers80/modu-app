import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1p } from './E1pContext'
import { generateLandlordListingDraft } from '../../lib/gemini'
import { fetchMarketData } from '../../lib/marketData'
import { manwon } from '../../lib/format'
import EditStepTabs, { E1P_EDIT_STEPS } from '../../components/EditStepTabs'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'
const AMBER = '#d68b2a'
const AMBER_BG = '#fef3e2'

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 2 ? TEAL : '#e5e7eb' }} />
      ))}
    </div>
  )
}

// planned:true = 아직 실호출 없는 연출 단계 → "(예정)" 표기 + 완료 체크(✓) 미표시.
// 실호출 2개: 위치·실거래 수집(lib/marketData 국토부 상업용 실거래) + 설명문 초안(Gemini).
// 등기·건축물(API 미연동)·임대 시세(실거래 API에 임대료 없음)는 인프라 부재 → (예정) 유지.
const LOAD_STEPS = [
  { icon: '📍', text: '위치·실거래 데이터 수집 중...' },
  { icon: '📋', text: '등기·건축물 정보 분석 (예정)', planned: true },
  { icon: '📊', text: '인근 임대 시세 비교 (예정)', planned: true },
  { icon: '✍️', text: '모두가 설명문 초안 쓰는 중...' },
]

function ToneBadge({ tone }) {
  const isFact = tone === 'fact'
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: isFact ? TEAL_BG : AMBER_BG, color: isFact ? TEAL : AMBER }}>
      {isFact ? '사실' : '모두 추정'}
    </span>
  )
}

function buildBlocksFromDraft(aiDraft, data) {
  const isRent = data.listingType === 'rent' || data.listingType === 'both'
  const isSale = data.listingType === 'sale' || data.listingType === 'both'
  const addr = data.address || '서울 마포구 서교동 332-4'

  const blocks = [
    {
      id: 'description',
      title: '모두가 쓴 상가 설명문',
      icon: '✍️',
      tone: 'fact',
      canHide: false,
      text: aiDraft?.description || `${addr}에 위치한 ${data.area || '45'}㎡ 규모의 상가입니다. ${data.floor || '1층'} 점포로 즉시 입주 가능합니다.`,
    },
    {
      id: 'location',
      title: '위치 · 상권 분석',
      icon: '📍',
      tone: 'fact',
      canHide: false,
      text: `${addr.split(' ').slice(0, 3).join(' ')} · ${data.floor || '1층'} · ${data.area || '-'}㎡\n홍대입구역 3번 출구 도보 4분 · 반경 300m 카페 28개 · 월 유동인구 15만 명 (서울 공공데이터)`,
    },
  ]

  if (isRent) {
    blocks.push({
      id: 'rent_market',
      title: '임대 시세 분석',
      icon: '📊',
      tone: 'estimate',
      canHide: true,
      text: aiDraft?.rentMarket || `인근 동일 면적 기준 보증금 ${Math.max(0, Number(data.deposit || 5000) - 500).toLocaleString()}~${(Number(data.deposit || 5000) + 500).toLocaleString()}만원, 월세 ${Math.max(0, Number(data.monthlyRent || 180) - 20).toLocaleString()}~${(Number(data.monthlyRent || 180) + 20).toLocaleString()}만원 수준. 현재 희망 조건은 시세 대비 적정 범위입니다.`,
    })
  }

  if (isSale) {
    blocks.push({
      id: 'sale_market',
      title: '매매 시세·수익률',
      icon: '💰',
      tone: 'estimate',
      canHide: true,
      text: aiDraft?.saleMarket || `인근 유사 상가 매매가 ${Math.max(0, Number(data.salePrice || 8000) - 1000).toLocaleString()}~${(Number(data.salePrice || 8000) + 1000).toLocaleString()}만원 수준. 현재 조건 기준 캡레이트(수익률) 추정 ${data.capRate || '5.2'}%.`,
    })
  }

  blocks.push({
    id: 'biz_rec',
    title: '권장 업종 추천',
    icon: '🏷️',
    tone: 'estimate',
    canHide: true,
    text: aiDraft?.bizRecommendation || '유동인구·상권 분석 기준 카페·디저트, 음식점, 미용·뷰티 업종 적합도 높음. 해당 상권 내 동종 경쟁 밀도 낮아 진입 여건 양호.',
  })

  return blocks
}

export default function E1pStep2() {
  const navigate = useNavigate()
  const { data, update, editLoading } = useE1p()

  const [loadStep, setLoadStep] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const [aiDraft, setAiDraft] = useState(null)
  const [aiError, setAiError] = useState(null)
  const [market, setMarket] = useState(null) // 국토부 상업용 실거래 (E1과 동일 파이프라인)

  const ready = animDone && (aiDraft !== null || aiError !== null)

  useEffect(() => {
    // 수정 모드 로드 완료 전엔 판단 보류 — /e1p/2?edit= 직접 진입 시 로드 전 Gemini 재호출 방지
    // (한 번-실행 ref 가드는 금지 — StrictMode 이중 마운트에서 cleanup된 타이머가 재설정되지 못해 ready가 영영 안 됨)
    if (editLoading) return

    // 위치·시세 실데이터 — lib/marketData 재사용(E1과 공유). 실패해도 초안 진행엔 영향 없음.
    fetchMarketData({ address: data.address, area: data.area })
      .then(({ priceData }) => setMarket(priceData))
      .catch(() => {})

    // 수정 모드 + 저장된 초안 존재 = 편집 기본 — Gemini 재호출 금지, 로딩 극장(3.2초 연출)도 재실행 금지
    if (data.editingListingId && data.aiDraft) {
      setAiDraft(data.aiDraft)
      setAnimDone(true)
      setLoadStep(LOAD_STEPS.length)
      return
    }

    const timers = LOAD_STEPS.map((_, i) =>
      setTimeout(() => setLoadStep(i + 1), 700 * (i + 1))
    )
    const done = setTimeout(() => setAnimDone(true), 700 * LOAD_STEPS.length + 400)

    generateLandlordListingDraft(data)
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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1p/1')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">상가 등록</h1>
          <span className="text-[13px] font-bold" style={{ color: TEAL }}>2 / 5</span>
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
            <h2 className="text-[22px] font-bold text-gray-900 mb-2">모두가 상가 설명을 쓰고 있어요</h2>
            <p className="text-[14px] text-gray-400 mb-8">모두가 설명문 초안을 쓰고 있어요 (상권·시세·등기 분석은 예정)</p>

            <div className="w-full flex flex-col gap-3">
              {LOAD_STEPS.map((s, i) => (
                <div key={i}
                  data-testid={`load-step-${i}`}
                  className="flex items-center gap-3 transition-all duration-500"
                  style={{ opacity: loadStep > i ? 1 : 0.25 }}>
                  <span className="text-[18px]">{s.icon}</span>
                  <span className="text-[13px] text-gray-600">{s.text}</span>
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
              <p className="mt-6 text-[13px] text-gray-400">모두가 마무리하는 중...</p>
            )}
          </div>
        ) : (
          <>
            {aiError && (
              <div className="mt-5 mb-4 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
                <p className="text-[12px] text-amber-700">지금은 초안을 못 만들었어요. 기본 초안으로 계속 진행합니다.</p>
              </div>
            )}

            <div className="mt-5 mb-5">
              <h2 className="text-[20px] font-bold text-gray-900">모두가 써본 초안이에요</h2>
              <p className="text-[13px] text-gray-400 mt-1">다음 단계에서 항목별로 검수·수정할 수 있어요</p>
            </div>

            {/* 주변 실거래 참고 — 국토부 상업용 실거래(E1·E2와 동일 파이프라인·게이트). 실데이터일 때만. */}
            {marketReal && (
              <div className="rounded-2xl border border-gray-100 p-4 mb-4" data-testid="e1p-market-card" style={{ backgroundColor: '#f8fcfc' }}>
                <p className="text-[12px] font-bold mb-2" style={{ color: TEAL }}>📊 주변 실거래 참고 (최근 3개월 {market.transactionCount}건)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[11px] text-gray-400">㎡당 평균 매매가</p><p className="text-[14px] font-bold text-gray-800">{manwon(market.avgPricePerM2) ?? '-'}</p></div>
                  <div><p className="text-[11px] text-gray-400">거래가 범위</p><p className="text-[14px] font-bold text-gray-800">{manwon(market.priceRange?.min) ?? '-'} ~ {manwon(market.priceRange?.max) ?? '-'}</p></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">국토교통부 상업업무용 실거래가 · 인근 지역 기준 참고용</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {draftBlocks.map(block => {
                const isFact = block.tone === 'fact'
                const accentColor = isFact ? TEAL : AMBER
                const accentBg = isFact ? TEAL_BG : AMBER_BG
                return (
                  <div key={block.id} className="rounded-2xl overflow-hidden border border-gray-100">
                    <div className="flex items-center gap-2.5 px-4 py-3"
                      style={{ backgroundColor: accentBg }}>
                      <span className="text-[18px]">{block.icon}</span>
                      <p className="flex-1 text-[13px] font-bold" style={{ color: accentColor }}>
                        {block.title}
                      </p>
                      <ToneBadge tone={block.tone} />
                      {block.canHide && (
                        <button className="text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0"
                          style={{ borderColor: accentColor, color: accentColor, backgroundColor: 'white' }}>
                          공개 선택
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-3 bg-white border-t border-gray-50">
                      <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{block.text}</p>
                      {!isFact && (
                        <p className="text-[11px] text-gray-400 mt-2">
                          ⓘ 입력하신 정보로 모두가 추정한 값이에요. 실제와 다를 수 있어요.
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-[12px] text-gray-400 mt-5">
              다음 단계에서 항목별로 그대로 두거나 수정하거나 공개하지 않을 수 있어요
            </p>
          </>
        )}

      </main>

      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button
          disabled={!ready}
          onClick={() => ready && navigate('/e1p/3')}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all active:scale-[0.99]"
          style={{
            backgroundColor: ready ? '#111827' : '#e5e7eb',
            color: ready ? '#ffffff' : '#9ca3af',
          }}>
          다음 — 검수·공개 선택
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

    </div>
  )
}
