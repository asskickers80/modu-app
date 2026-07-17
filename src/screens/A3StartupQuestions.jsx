import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { saveProfile, completeProfileOnboarding } from '../lib/userProfile'

const SKY = '#2b8ac9'
const SKY_BG = '#eef6fd'
const AMBER = '#d68b2a'
const AMBER_BG = '#fef3e2'

const MODE_OPTS = [
  {
    id: 'direct',
    emoji: '🏪',
    label: '내 브랜드로',
    sub: '직영 창업',
    desc: '내 이름으로 운영 · 자유롭지만 처음부터 혼자',
    color: SKY,
    bg: SKY_BG,
  },
  {
    id: 'franchise',
    emoji: '🍔',
    label: '프랜차이즈로',
    sub: '가맹 창업',
    desc: '검증된 브랜드 · 빠른 시작 · 단, 리스크 확인 필수',
    color: AMBER,
    bg: AMBER_BG,
  },
  {
    id: 'both',
    emoji: '👀',
    label: '둘 다 보고 싶어요',
    sub: '자유롭게 탐색',
    desc: '아직 안 정함 · 매물·브랜드 모두 둘러볼게요',
    color: '#374151',
    bg: '#f9fafb',
  },
]

const REGIONS = [
  '서울', '경기', '인천', '부산', '대구',
  '광주', '대전', '울산', '기타',
]

const BUDGET_OPTS = [
  { id: 'under1k', label: '1천만원 미만' },
  { id: '1k-3k', label: '1천~3천만원' },
  { id: '3k-5k', label: '3천~5천만원' },
  { id: '5k+', label: '5천만원 이상' },
  { id: 'unknown', label: '아직 모름' },
]

function Chip({ label, selected, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-[14px] font-medium border transition-all duration-150 active:scale-[0.97]"
      style={{
        borderColor: selected ? color : '#e5e7eb',
        backgroundColor: selected ? bg : '#f9fafb',
        color: selected ? color : '#374151',
      }}
    >
      {label}
    </button>
  )
}

export default function A3StartupQuestions() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isComplete = searchParams.get('complete') === '1' // 지연 온보딩 보완 모드
  const [mode, setMode] = useState(null)
  const [region, setRegion] = useState(null)
  const [budget, setBudget] = useState(null)
  const [regionSearch, setRegionSearch] = useState(false)

  const allAnswered = mode !== null && region !== null && budget !== null
  const activeColor = mode === 'franchise' ? AMBER : SKY
  const activeBg = mode === 'franchise' ? AMBER_BG : SKY_BG

  return (
    <div className="flex flex-col min-h-screen px-5 pt-14 pb-8" style={{ background: 'linear-gradient(180deg, #9FD4FA 0%, #DFF1FE 30%, #F2F9FF 100%)' }}>
      <button onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1 text-sm" style={{ color: 'rgba(18,58,99,0.6)' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 14l-5-5 5-5" stroke="rgba(18,58,99,0.6)" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        이전
      </button>

      <div className="mb-8">
        <p className="text-sm font-medium mb-1" style={{ color: SKY }}>창업 준비</p>
        <h1 className="text-[24px] font-bold leading-snug" style={{ color: '#123A63' }}>
          어떻게 창업하실 계획이에요? 🚀
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: 'rgba(18,58,99,0.55)' }}>
          선택에 따라 딱 맞는 매물과 브랜드를 추천해 드려요
        </p>
      </div>

      <div className="flex flex-col gap-8 flex-1">

        {/* Q1 방식 */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: SKY }}>1</span>
            <p className="text-[15px] font-semibold text-gray-900">
              어떤 방식으로 창업하실 생각이에요?
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {MODE_OPTS.map(opt => {
              const sel = mode === opt.id
              return (
                <button key={opt.id}
                  onClick={() => setMode(sel ? null : opt.id)}
                  className="w-full text-left rounded-2xl border-2 px-4 py-[14px] transition-all active:scale-[0.98]"
                  style={{
                    borderColor: sel ? opt.color : '#e5e7eb',
                    backgroundColor: sel ? opt.bg : '#ffffff',
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[22px] shrink-0">{opt.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold"
                          style={{ color: sel ? opt.color : '#111827' }}>
                          {opt.label}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor: sel ? opt.color + '20' : '#f3f4f6',
                            color: sel ? opt.color : '#6b7280',
                          }}>
                          {opt.sub}
                        </span>
                      </div>
                      <p className="text-[12px] mt-0.5" style={{ color: sel ? opt.color : '#9ca3af' }}>
                        {opt.desc}
                      </p>
                    </div>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: sel ? opt.color : '#e5e7eb' }}>
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
          {mode === 'franchise' && (
            <div className="mt-3 px-3 py-2.5 rounded-xl flex items-start gap-2"
              style={{ backgroundColor: AMBER_BG }}>
              <span className="text-[14px] shrink-0 mt-0.5">⚠️</span>
              <p className="text-[12px] leading-relaxed" style={{ color: AMBER }}>
                프랜차이즈는 브랜드·입지·계약 조건에 따라 수익성 차이가 커요. 모두는 AI가 분석한 <strong>본사 리스크 지표</strong>를 카드마다 같이 보여드려요.
              </p>
            </div>
          )}
        </section>

        {/* Q2 지역 */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: SKY }}>2</span>
            <p className="text-[15px] font-semibold text-gray-900">
              어느 지역에서 창업하고 싶으세요?
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <Chip key={r} label={r}
                selected={region === r}
                color={activeColor} bg={activeBg}
                onClick={() => setRegion(region === r ? null : r)} />
            ))}
          </div>
          <button onClick={() => setRegionSearch(!regionSearch)}
            className="mt-2 text-[13px] font-medium flex items-center gap-1"
            style={{ color: activeColor }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke={activeColor} strokeWidth="1.5" />
              <path d="M9.5 9.5l2 2" stroke={activeColor} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            지역 직접 검색
          </button>
          {regionSearch && (
            <input type="text" placeholder="시/도를 입력해주세요"
              className="mt-2 w-full border rounded-xl px-4 py-3 text-[14px] outline-none"
              style={{ borderColor: activeColor }}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  setRegion(e.target.value.trim()); setRegionSearch(false)
                }
              }} />
          )}
        </section>

        {/* Q3 예산 */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: SKY }}>3</span>
            <p className="text-[15px] font-semibold text-gray-900">
              총 창업 예산은요? (권리금+보증금 포함)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTS.map(b => (
              <Chip key={b.id} label={b.label}
                selected={budget === b.id}
                color={activeColor} bg={activeBg}
                onClick={() => setBudget(budget === b.id ? null : b.id)} />
            ))}
          </div>
          <p className="mt-2 text-[12px] text-gray-400">
            💡 예산 범위 안의 매물만 먼저 보여드려요. 나중에 바꿀 수 있어요.
          </p>
        </section>

      </div>

      <div className="mt-8">
        <button
          disabled={!allAnswered}
          onClick={() => {
            if (!allAnswered) return
            const answers = { category: 'startup', startupMode: mode, region, budget }
            if (isComplete) {
              completeProfileOnboarding('startup', searchParams.get('pid')) // 전환 확정 + pending 해제
              saveProfile(answers)
              navigate('/a7/startup', { replace: true })
              return
            }
            navigate('/a4', { state: answers })
          }}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all duration-200"
          style={{
            background: allAnswered ? 'linear-gradient(100deg, #2F9BF0, #5BC0FF)' : 'rgba(255,255,255,0.7)',
            color: allAnswered ? '#ffffff' : 'rgba(23,57,92,0.4)',
            boxShadow: allAnswered ? '0 10px 28px rgba(47,155,240,0.35)' : 'none',
          }}>
          다음 — 추천 피드 보러 가기
        </button>
      </div>
    </div>
  )
}
