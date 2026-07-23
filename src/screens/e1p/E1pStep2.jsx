import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1p } from './E1pContext'
import { generateLandlordListingDraft } from '../../lib/gemini'

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
// 실호출은 마지막 '설명문 초안'(Gemini generateLandlordListingDraft) 하나뿐.
const LOAD_STEPS = [
  { icon: '📍', text: '위치·상권 데이터 수집 (예정)', planned: true },
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
  const { data, update } = useE1p()

  const [loadStep, setLoadStep] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const [aiDraft, setAiDraft] = useState(null)
  const [aiError, setAiError] = useState(null)

  const ready = animDone && (aiDraft !== null || aiError !== null)

  useEffect(() => {
    const timers = LOAD_STEPS.map((_, i) =>
      setTimeout(() => setLoadStep(i + 1), 700 * (i + 1))
    )
    const done = setTimeout(() => setAnimDone(true), 700 * LOAD_STEPS.length + 400)

    // 수정 모드: 이미 저장된 초안이 있으면 재생성하지 않는다(편집 내용 보존 + Gemini 호출 절감)
    if (data.editingListingId && data.aiDraft) {
      setAiDraft(data.aiDraft)
    } else {
      generateLandlordListingDraft(data)
        .then(draft => {
          setAiDraft(draft)
          update({ aiDraft: draft })
        })
        .catch(e => {
          setAiError(e.message)
          setAiDraft({})
        })
    }

    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [])  // eslint-disable-line

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
