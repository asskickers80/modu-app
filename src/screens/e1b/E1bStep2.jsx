import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1b } from './E1bContext'
import { generateBusinessTriggers } from '../../lib/gemini'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'

// 카테고리별 매칭 트리거 제안
const TRIGGER_BANK = {
  default: [
    '창업 준비 중 전문가가 필요할 때',
    '빠른 견적이 급하게 필요할 때',
    '기존 업체가 마음에 안 들어 바꾸고 싶을 때',
    '가격이 적절한지 비교해보고 싶을 때',
    '처음이라 뭘 부탁해야 할지 모를 때',
  ],
  시설: [
    '인테리어 리뉴얼을 고민할 때',
    '창업 준비 중 인테리어 견적이 필요할 때',
    '간판이 낡아 교체가 필요할 때',
    '공사 중에도 영업을 멈추기 싫을 때',
    '점포 양도 전 원상복구가 필요할 때',
  ],
  '세무·회계·법무': [
    '부가세 신고 기간이 다가올 때',
    '세금계산서 발행이 막막할 때',
    '폐업·양도 전 세무 정리가 필요할 때',
    '세무조사 대응이 걱정될 때',
    '고용 분쟁·노무 문제가 생겼을 때',
  ],
  금융: [
    '소상공인 대출이 필요할 때',
    '점포 보험 가입을 고민할 때',
    '정책자금 신청 방법이 궁금할 때',
    '카드 단말기 수수료를 낮추고 싶을 때',
    '매출 연동 통장 관리가 필요할 때',
  ],
}

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 2 ? PURPLE : '#e5e7eb' }} />
      ))}
    </div>
  )
}

export default function E1bStep2() {
  const navigate = useNavigate()
  const { data, update } = useE1b()

  const [selected, setSelected] = useState(data.triggers)
  const [custom, setCustom] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const staticSuggestions = TRIGGER_BANK[data.category] || TRIGGER_BANK.default
  const suggestions = aiSuggestions ?? staticSuggestions

  const handleAiGenerate = async () => {
    setAiLoading(true)
    try {
      const result = await generateBusinessTriggers({
        bizName: data.bizName,
        category: data.category,
        subCategory: data.subCategory,
        region: data.region,
      })
      if (result.length > 0) setAiSuggestions(result)
    } catch { /* ignore */ } finally {
      setAiLoading(false)
    }
  }

  const toggle = (t) =>
    setSelected(prev =>
      prev.includes(t)
        ? prev.filter(x => x !== t)
        : prev.length < 5 ? [...prev, t] : prev
    )

  const addCustom = () => {
    const trimmed = custom.trim()
    if (trimmed && !selected.includes(trimmed) && selected.length < 5) {
      setSelected(prev => [...prev, trimmed])
      setCustom('')
      setShowCustom(false)
    }
  }

  const canNext = selected.length >= 2
  const saveAndNext = () => {
    update({ triggers: selected })
    navigate('/e1b/3')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1b/1')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">노출 페이지</h1>
          <span className="text-[13px] font-bold" style={{ color: PURPLE }}>2 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-[20px] font-bold text-gray-900">② 이럴 때 부릅니다</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: PURPLE }}>★심장</span>
          </div>
          <p className="text-[13px] text-gray-400">
            자영업자가 "이 상황이네" 할 때 내가 떠오르도록. 3~5개 골라요.
          </p>
        </div>
      </div>

      {/* 선택 카운터 */}
      <div className="shrink-0 px-5 py-2.5 flex items-center gap-2 bg-white border-b border-gray-50">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(selected.length / 5) * 100}%`, backgroundColor: PURPLE }} />
        </div>
        <span className="text-[12px] font-bold shrink-0" style={{ color: PURPLE }}>
          {selected.length}/5 선택
        </span>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* 핵심 안내 */}
        <div className="rounded-2xl px-3.5 py-3 mb-5 flex items-start gap-2.5"
          style={{ backgroundColor: PURPLE_BG }}>
          <span className="text-[16px] shrink-0 mt-0.5">💡</span>
          <p className="text-[12px] leading-relaxed" style={{ color: PURPLE }}>
            이 항목이 <strong>AI 수요 매칭 키워드</strong>로 쓰여요.
            "창업 준비 중"인 자영업자에게 내 카드가 먼저 뜨게 돼요.
          </p>
        </div>

        {/* AI 맞춤 트리거 생성 */}
        <div className="mb-4 rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: PURPLE_BG }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
              style={{ backgroundColor: PURPLE }}>AI</div>
            <div className="flex-1">
              <p className="text-[12px] font-bold" style={{ color: PURPLE }}>AI 맞춤 트리거 생성</p>
              <p className="text-[11px] text-gray-500">{data.bizName} 업체 특성 기반 개인화</p>
            </div>
            <button
              onClick={handleAiGenerate}
              disabled={aiLoading}
              className="px-3 py-2 rounded-xl text-[12px] font-bold text-white shrink-0 transition-all active:scale-95"
              style={{ backgroundColor: aiLoading ? '#c4a0d4' : PURPLE }}>
              {aiLoading ? (
                <span className="flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-white inline-block"
                      style={{ animation: `bounce 0.9s ease-in-out ${i * 0.15}s infinite` }} />
                  ))}
                </span>
              ) : aiSuggestions ? '재생성' : '생성하기'}
            </button>
          </div>
        </div>

        {/* AI 제안 칩 */}
        <div className="mb-5">
          <p className="text-[12px] font-bold text-gray-400 mb-2.5">
            {aiSuggestions ? `AI 맞춤 추천 (${data.category})` : `${data.category} 업종 추천 상황`}
          </p>
          <div className="flex flex-col gap-2">
            {suggestions.map(t => {
              const sel = selected.includes(t)
              return (
                <button key={t}
                  onClick={() => toggle(t)}
                  className="w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.98]"
                  style={{
                    borderColor: sel ? PURPLE : '#e5e7eb',
                    backgroundColor: sel ? PURPLE_BG : '#ffffff',
                  }}>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[14px] mt-0.5">📍</span>
                    <p className="flex-1 text-[14px] font-medium"
                      style={{ color: sel ? PURPLE : '#374151' }}>
                      {t}
                    </p>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: sel ? PURPLE : '#e5e7eb' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 선택된 목록 */}
        {selected.length > 0 && (
          <div className="mb-5">
            <p className="text-[12px] font-bold text-gray-400 mb-2">선택한 상황 ({selected.length}개)</p>
            <div className="flex flex-col gap-1.5">
              {selected.map((t, i) => (
                <div key={t} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                  style={{ backgroundColor: PURPLE_BG }}>
                  <span className="text-[11px] font-black shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: PURPLE }}>{i + 1}</span>
                  <p className="flex-1 text-[13px] font-medium" style={{ color: PURPLE }}>{t}</p>
                  <button onClick={() => toggle(t)} className="text-gray-300 text-[16px] leading-none">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 직접 추가 */}
        <button onClick={() => setShowCustom(!showCustom)}
          className="text-[13px] font-medium flex items-center gap-1.5 mb-3"
          style={{ color: PURPLE }}>
          <span className="text-[16px]">+</span> 상황 직접 추가
        </button>
        {showCustom && (
          <div className="flex gap-2">
            <input value={custom} onChange={e => setCustom(e.target.value)}
              placeholder="예: 배달 매출을 올리고 싶을 때"
              className="flex-1 border rounded-xl px-3 py-2.5 text-[13px] outline-none"
              style={{ borderColor: PURPLE }}
              onKeyDown={e => e.key === 'Enter' && addCustom()} />
            <button onClick={addCustom}
              className="px-3 py-2.5 rounded-xl text-[13px] font-bold text-white"
              style={{ backgroundColor: PURPLE }}>추가</button>
          </div>
        )}

      </main>

      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        {!canNext && (
          <p className="text-center text-[12px] text-gray-400 mb-2">최소 2개 이상 골라주세요</p>
        )}
        <button
          disabled={!canNext}
          onClick={saveAndNext}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all"
          style={{
            backgroundColor: canNext ? PURPLE : '#e5e7eb',
            color: canNext ? '#ffffff' : '#9ca3af',
          }}>
          다음 — 무엇을 해결하는지
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
