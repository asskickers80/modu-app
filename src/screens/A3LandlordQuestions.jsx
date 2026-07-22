import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { saveProfile, completeProfileOnboarding, ensurePendingRole } from '../lib/userProfile'
import { syncRolesToServer } from '../lib/auth'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'

const REGIONS = [
  '서울', '경기', '인천', '부산', '대구',
  '광주', '대전', '울산', '기타',
]

const STATUS_OPTS = [
  { id: 'vacant', label: '공실 대기 중', sub: '새 임차인 찾아요', emoji: '🏢' },
  { id: 'sale', label: '매각 희망', sub: '상가 자체를 팔 계획', emoji: '💰' },
  { id: 'both', label: '둘 다 열려 있어요', sub: '임대도 매각도 가능', emoji: '🤝' },
]

const COUNT_OPTS = [
  { id: '1', label: '1개', sub: '단독 소유' },
  { id: '2-3', label: '2~3개', sub: '소규모 자산' },
  { id: '4+', label: '4개 이상', sub: '다수 보유' },
]

function Chip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-[14px] font-medium border transition-all duration-150 active:scale-[0.97]"
      style={{
        borderColor: selected ? TEAL : '#e5e7eb',
        backgroundColor: selected ? TEAL_BG : '#f9fafb',
        color: selected ? TEAL : '#374151',
      }}
    >
      {label}
    </button>
  )
}

export default function A3LandlordQuestions() {
  useEffect(() => { ensurePendingRole('landlord') }, []) // 진입 즉시 역할 보장(URL 직접 진입 커버)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isComplete = searchParams.get('complete') === '1' // 지연 온보딩 보완 모드
  const [region, setRegion] = useState(null)
  const [status, setStatus] = useState(null)
  const [count, setCount] = useState(null)
  const [regionSearch, setRegionSearch] = useState(false)

  const allAnswered = region !== null && status !== null && count !== null

  return (
    <div className="flex flex-col min-h-screen px-5 pt-14 pb-8" style={{ background: 'linear-gradient(180deg, #9FD4FA 0%, #DFF1FE 30%, #F2F9FF 100%)' }}>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1 text-sm"
        style={{ color: 'rgba(18,58,99,0.6)' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 14l-5-5 5-5" stroke="rgba(18,58,99,0.6)" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        이전
      </button>

      <div className="mb-8">
        <p className="text-sm font-medium mb-1" style={{ color: TEAL }}>소유주</p>
        <h1 className="text-[24px] font-bold leading-snug" style={{ color: '#123A63' }}>
          몇 가지만 여쭤볼게요 🏢
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: 'rgba(18,58,99,0.55)' }}>
          답하신 내용으로 딱 맞는 임차·매수 희망자를 연결해 드려요
        </p>
      </div>

      <div className="flex flex-col gap-8 flex-1">
        {/* Q1 상가 위치 */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: TEAL }}>1</span>
            <p className="text-[15px] font-semibold text-gray-900">
              상가가 어디 있나요?
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <Chip key={r} label={r} selected={region === r}
                onClick={() => setRegion(region === r ? null : r)} />
            ))}
          </div>
          <button
            onClick={() => setRegionSearch(!regionSearch)}
            className="mt-2 text-[13px] font-medium flex items-center gap-1"
            style={{ color: TEAL }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke={TEAL} strokeWidth="1.5" />
              <path d="M9.5 9.5l2 2" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            지역 직접 검색
          </button>
          {regionSearch && (
            <input
              type="text"
              placeholder="시/도를 입력해주세요"
              className="mt-2 w-full border rounded-xl px-4 py-3 text-[14px] outline-none"
              style={{ borderColor: TEAL }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  setRegion(e.target.value.trim())
                  setRegionSearch(false)
                }
              }}
            />
          )}
        </section>

        {/* Q2 상태 */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: TEAL }}>2</span>
            <p className="text-[15px] font-semibold text-gray-900">
              어떤 상황이신가요?
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {STATUS_OPTS.map((opt) => {
              const sel = status === opt.id
              return (
                <button key={opt.id}
                  onClick={() => setStatus(sel ? null : opt.id)}
                  className="w-full text-left rounded-2xl border-2 px-4 py-[14px] transition-all active:scale-[0.98] flex items-center gap-3"
                  style={{
                    borderColor: sel ? TEAL : '#e5e7eb',
                    backgroundColor: sel ? TEAL_BG : '#ffffff',
                  }}>
                  <span className="text-[22px] shrink-0">{opt.emoji}</span>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold" style={{ color: sel ? TEAL : '#111827' }}>
                      {opt.label}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: sel ? TEAL : '#9ca3af' }}>
                      {opt.sub}
                    </p>
                  </div>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: sel ? TEAL : '#e5e7eb' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Q3 몇 개 */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: TEAL }}>3</span>
            <p className="text-[15px] font-semibold text-gray-900">
              상가를 몇 개 소유하고 계세요?
            </p>
          </div>
          <div className="flex gap-2">
            {COUNT_OPTS.map((opt) => {
              const sel = count === opt.id
              return (
                <button key={opt.id}
                  onClick={() => setCount(sel ? null : opt.id)}
                  className="flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all active:scale-[0.97]"
                  style={{
                    borderColor: sel ? TEAL : '#e5e7eb',
                    backgroundColor: sel ? TEAL_BG : '#f9fafb',
                  }}>
                  <span className="text-[18px] font-bold" style={{ color: sel ? TEAL : '#111827' }}>
                    {opt.label}
                  </span>
                  <span className="text-[11px]" style={{ color: sel ? TEAL : '#9ca3af' }}>
                    {opt.sub}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <div className="mt-8">
        <button
          disabled={!allAnswered}
          onClick={() => {
            if (!allAnswered) return
            const answers = { category: 'landlord', region, status, count }
            if (isComplete) {
              completeProfileOnboarding('landlord', searchParams.get('pid')) // 전환 확정 + pending 해제
              syncRolesToServer() // 로그인 상태면 서버 roles 즉시 반영(로그아웃 불필요)
              saveProfile(answers)
              navigate('/a7/landlord', { replace: true })
              return
            }
            navigate('/a4', { state: answers })
          }}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all duration-200"
          style={{
            background: allAnswered ? 'linear-gradient(100deg, #2F9BF0, #5BC0FF)' : 'rgba(255,255,255,0.7)',
            color: allAnswered ? '#ffffff' : 'rgba(23,57,92,0.4)',
            boxShadow: allAnswered ? '0 10px 28px rgba(47,155,240,0.35)' : 'none',
          }}
        >
          다음
        </button>
      </div>
    </div>
  )
}
