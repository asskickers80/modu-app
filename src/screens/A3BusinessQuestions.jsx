import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { saveProfile, completeProfileOnboarding } from '../lib/userProfile'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DARK = '#5c3478'

const BIZ_TYPES = [
  { id: 'brokerage', emoji: '🤝', label: '중개·컨설팅', desc: '점포 중개, 창업 컨설팅' },
  { id: 'facility', emoji: '🔨', label: '시설 제공', desc: '인테리어, 간판, 설비, 시공' },
  { id: 'tax', emoji: '🧾', label: '세무·회계·법무', desc: '세무, 회계, 법무, 노무' },
  { id: 'finance', emoji: '💰', label: '금융·보험', desc: '대출, 보험, 정책자금' },
  { id: 'franchise', emoji: '🏪', label: '가맹 본사', desc: '프랜차이즈 가맹 모집' },
  { id: 'service', emoji: '💳', label: '서비스', desc: 'POS, 배달, 마케팅, 구인 등' },
]

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '전국']

// 더미 사업자 인증 결과
const MOCK_BIZ = {
  bizName: '서교동 인테리어',
  bizNumber: '123-45-67890',
  category: '시설',
  region: '서울 마포구',
  founded: '2019',
}

export default function A3BusinessQuestions() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isComplete = searchParams.get('complete') === '1' // 지연 온보딩 보완 모드
  const [bizType, setBizType] = useState(null)
  const [region, setRegion] = useState(null)

  // 사업자등록증 인증 상태: 'idle' | 'verifying' | 'verified'
  const [certState, setCertState] = useState('idle')
  const [dots, setDots] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (certState !== 'verifying') return
    const tick = setInterval(() => setDots(d => (d + 1) % 4), 350)
    const prog = setInterval(() => setProgress(p => Math.min(p + 8, 95)), 120)
    const done = setTimeout(() => {
      clearInterval(tick); clearInterval(prog)
      setProgress(100)
      setTimeout(() => setCertState('verified'), 300)
    }, 2200)
    return () => { clearInterval(tick); clearInterval(prog); clearTimeout(done) }
  }, [certState])

  const allFilled = bizType && region
  const canNext = allFilled && certState === 'verified'

  const STEP_LABELS = ['유형 선택', '지역 선택', '사업자 인증']
  const currentStep = !bizType ? 0 : !region ? 1 : 2

  return (
    <div className="flex flex-col min-h-screen pb-8" style={{ background: 'linear-gradient(180deg, #9FD4FA 0%, #DFF1FE 30%, #F2F9FF 100%)' }}>

      {/* 상단 헤더 */}
      <div className="px-5 pt-12 pb-5">
        <button onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm" style={{ color: 'rgba(18,58,99,0.6)' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 14l-5-5 5-5" stroke="rgba(18,58,99,0.6)" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          이전
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="px-2.5 py-1 rounded-full text-[12px] font-bold text-white"
            style={{ backgroundColor: PURPLE }}>기업회원</div>
          <p className="text-[12px]" style={{ color: 'rgba(18,58,99,0.55)' }}>사업자 전용 가입</p>
        </div>
        <h1 className="text-[22px] font-bold leading-snug" style={{ color: '#123A63' }}>
          기업 정보를 알려주세요 💼
        </h1>
        {/* 단계 도트 */}
        <div className="flex items-center gap-2 mt-3">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: i <= currentStep ? PURPLE : '#e5e7eb',
                  color: i <= currentStep ? 'white' : '#9ca3af',
                }}>
                {i + 1}
              </div>
              <span className="text-[11px] font-medium"
                style={{ color: i <= currentStep ? PURPLE : '#9ca3af' }}>{label}</span>
              {i < 2 && <div className="w-4 h-px bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 pt-5">

        {/* Q1 기업 유형 */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: PURPLE }}>1</span>
            <p className="text-[14px] font-bold text-gray-900">어떤 기업회원이세요?</p>
          </div>
          <div className="flex flex-col gap-2">
            {BIZ_TYPES.map(opt => {
              const sel = bizType === opt.id
              return (
                <button key={opt.id}
                  onClick={() => setBizType(sel ? null : opt.id)}
                  className="w-full text-left rounded-xl border-2 px-3.5 py-3 transition-all active:scale-[0.98]"
                  style={{
                    borderColor: sel ? PURPLE : '#e5e7eb',
                    backgroundColor: sel ? PURPLE_BG : '#ffffff',
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[18px] shrink-0">{opt.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold"
                        style={{ color: sel ? PURPLE : '#111827' }}>{opt.label}</p>
                      <p className="text-[11px]" style={{ color: sel ? PURPLE + '99' : '#9ca3af' }}>
                        {opt.desc}
                      </p>
                    </div>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: sel ? PURPLE : '#e5e7eb' }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Q2 활동 지역 */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: PURPLE }}>2</span>
            <p className="text-[14px] font-bold text-gray-900">주요 활동 지역은요?</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => {
              const sel = region === r
              return (
                <button key={r}
                  onClick={() => setRegion(sel ? null : r)}
                  className="px-4 py-2 rounded-full text-[13px] font-medium border transition-all"
                  style={{
                    borderColor: sel ? PURPLE : '#e5e7eb',
                    backgroundColor: sel ? PURPLE_BG : '#f9fafb',
                    color: sel ? PURPLE : '#374151',
                  }}>
                  {r}
                </button>
              )
            })}
          </div>
        </section>

        {/* Q3 사업자등록증 인증 */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: PURPLE }}>3</span>
            <p className="text-[14px] font-bold text-gray-900">사업자등록증 인증</p>
          </div>
          <p className="text-[12px] text-gray-400 mb-4 ml-7">
            사진 1장으로 자동 추출 · 보라색 기업회원 모드로 전환돼요
          </p>

          {certState === 'idle' && (
            <div className="flex flex-col gap-2.5">
              <button
                disabled={!allFilled}
                onClick={() => allFilled && setCertState('verifying')}
                className="w-full py-4 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2.5 transition-all"
                style={{
                  backgroundColor: allFilled ? PURPLE : '#e5e7eb',
                  color: allFilled ? 'white' : '#9ca3af',
                }}>
                <span className="text-[18px]">📷</span>
                사업자등록증 촬영 (더미 인증)
              </button>
              <button
                disabled={!allFilled}
                onClick={() => allFilled && setCertState('verifying')}
                className="w-full py-3.5 rounded-2xl text-[14px] font-semibold border-2 flex items-center justify-center gap-2 transition-all"
                style={{
                  borderColor: allFilled ? PURPLE : '#e5e7eb',
                  color: allFilled ? PURPLE : '#9ca3af',
                  backgroundColor: 'white',
                }}>
                <span className="text-[16px]">🖼️</span>
                갤러리에서 선택
              </button>
              {!allFilled && (
                <p className="text-center text-[11px] text-gray-400">
                  유형과 지역을 먼저 선택해주세요
                </p>
              )}
            </div>
          )}

          {certState === 'verifying' && (
            <div className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full transition-all"
                      style={{ backgroundColor: PURPLE, opacity: dots >= i ? 1 : 0.25 }} />
                  ))}
                </div>
                <p className="text-[13px] font-semibold" style={{ color: PURPLE }}>
                  국세청 데이터 확인 중{'·'.repeat(dots)}
                </p>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-200"
                  style={{ width: `${progress}%`, backgroundColor: PURPLE }} />
              </div>
              <div className="mt-2.5 space-y-1">
                {[
                  { label: 'OCR 텍스트 추출', done: progress > 25 },
                  { label: '국세청 진위 확인', done: progress > 55 },
                  { label: '12분류 자동 귀속', done: progress > 80 },
                ].map(step => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: step.done ? PURPLE : '#e5e7eb' }}>
                      {step.done && (
                        <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                          <path d="M1 3.5l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[11px]" style={{ color: step.done ? PURPLE : '#9ca3af' }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certState === 'verified' && (
            <div>
              <div className="rounded-2xl border-2 p-4 mb-3"
                style={{ borderColor: PURPLE, backgroundColor: PURPLE_BG }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: PURPLE }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-bold" style={{ color: PURPLE_DARK }}>
                    인증 완료 🎉
                  </p>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white"
                    style={{ color: PURPLE }}>검증 배지</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    ['상호', MOCK_BIZ.bizName],
                    ['등록번호', MOCK_BIZ.bizNumber],
                    ['업종', `${bizType ? BIZ_TYPES.find(b => b.id === bizType)?.label : '시설'}`],
                    ['소재지', `${region} 마포구`],
                    ['개업', `${MOCK_BIZ.founded}년`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="text-[11px] text-gray-400 w-14 shrink-0">{k}</span>
                      <span className="text-[12px] font-semibold" style={{ color: PURPLE_DARK }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 보라색 모드 전환 안내 */}
              <div className="rounded-xl px-3.5 py-2.5 flex items-center gap-2"
                style={{ backgroundColor: PURPLE, color: 'white' }}>
                <span className="text-[16px]">✨</span>
                <p className="text-[12px] font-semibold">기업회원 보라색 모드로 전환됐어요!</p>
              </div>
            </div>
          )}
        </section>

      </div>

      <div className="px-5 mt-6">
        <button
          disabled={!canNext}
          onClick={() => {
            if (!canNext) return
            const bizTypeLabel = BIZ_TYPES.find(b => b.id === bizType)?.label ?? ''
            const bizTypeEmoji = BIZ_TYPES.find(b => b.id === bizType)?.emoji ?? ''
            const answers = { category: 'business', bizType, bizTypeLabel, bizTypeEmoji, region }
            if (isComplete) {
              completeProfileOnboarding('business', searchParams.get('pid')) // 전환 확정 + pending 해제
              saveProfile(answers)
              navigate('/a7/business', { replace: true })
              return
            }
            navigate('/a4', { state: answers })
          }}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all duration-200"
          style={{
            backgroundColor: canNext ? PURPLE : 'rgba(255,255,255,0.7)',
            color: canNext ? '#ffffff' : 'rgba(23,57,92,0.4)',
          }}>
          {certState === 'verified' ? '다음 — 가입 방식 선택' : '사업자 인증 후 진행할 수 있어요'}
        </button>
      </div>

    </div>
  )
}
