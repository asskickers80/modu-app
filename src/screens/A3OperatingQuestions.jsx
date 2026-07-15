import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const GREEN = '#2d7a4f'
const GREEN_BG = '#edf7f1'

const BIZ_OPTS = [
  { id: 'cafe', emoji: '☕', label: '카페·디저트' },
  { id: 'food', emoji: '🍽️', label: '음식점' },
  { id: 'cvs', emoji: '🏪', label: '편의점·마트' },
  { id: 'beauty', emoji: '💄', label: '미용·뷰티' },
  { id: 'fashion', emoji: '👗', label: '의류·잡화' },
  { id: 'edu', emoji: '📚', label: '학원·교육' },
  { id: 'health', emoji: '🏋️', label: '헬스·스포츠' },
  { id: 'delivery', emoji: '📦', label: '배달 전문' },
  { id: 'online', emoji: '💻', label: '온라인·무점포' },
  { id: 'etc', emoji: '···', label: '기타' },
]

const REGIONS = [
  '서울', '경기', '인천', '부산', '대구',
  '광주', '대전', '울산', '기타',
]

const SALES_OPTS = [
  {
    id: 'connected',
    icon: '🔗',
    label: 'POS·장부앱 연동',
    sub: '자동으로 매출이 들어와요',
    desc: '캐시노트·키오스크·카드단말기 등',
  },
  {
    id: 'manual',
    icon: '✏️',
    label: '수동 입력',
    sub: '직접 기록해요',
    desc: '앱에서 매일 입력 → AI 분석까지',
  },
  {
    id: 'none',
    icon: '🙈',
    label: '아직 안 해요',
    sub: '관리 안 하고 있어요',
    desc: '일단 시작은 여기서. 언제든 바꿀 수 있어요',
  },
]

function Chip({ emoji, label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all duration-150 active:scale-[0.97]"
      style={{
        borderColor: selected ? GREEN : '#e5e7eb',
        backgroundColor: selected ? GREEN_BG : '#f9fafb',
        color: selected ? GREEN : '#374151',
      }}
    >
      <span className="text-[14px]">{emoji}</span>
      {label}
    </button>
  )
}

export default function A3OperatingQuestions() {
  const navigate = useNavigate()
  const [biz, setBiz] = useState(null)
  const [region, setRegion] = useState(null)
  const [sales, setSales] = useState(null)

  const allAnswered = biz !== null && region !== null && sales !== null

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
        <p className="text-sm font-medium mb-1" style={{ color: GREEN }}>운영 중</p>
        <h1 className="text-[24px] font-bold leading-snug" style={{ color: '#123A63' }}>
          어떤 가게를 운영 중이에요? 🍳
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: 'rgba(18,58,99,0.55)' }}>
          가게에 딱 맞는 데이터와 업체를 찾아드려요
        </p>
      </div>

      <div className="flex flex-col gap-8 flex-1">

        {/* Q1 업종 */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: GREEN }}>1</span>
            <p className="text-[15px] font-semibold text-gray-900">
              어떤 장사를 하고 계세요?
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {BIZ_OPTS.map(opt => (
              <Chip key={opt.id}
                emoji={opt.emoji} label={opt.label}
                selected={biz === opt.id}
                onClick={() => setBiz(biz === opt.id ? null : opt.id)} />
            ))}
          </div>
        </section>

        {/* Q2 지역 */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: GREEN }}>2</span>
            <p className="text-[15px] font-semibold text-gray-900">
              가게는 어디에 있나요?
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <Chip key={r} emoji="" label={r}
                selected={region === r}
                onClick={() => setRegion(region === r ? null : r)} />
            ))}
            <Chip emoji="💻" label="온라인·무점포"
              selected={region === 'online'}
              onClick={() => setRegion(region === 'online' ? null : 'online')} />
          </div>
        </section>

        {/* Q3 매출 관리 */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: GREEN }}>3</span>
            <p className="text-[15px] font-semibold text-gray-900">
              매출을 어떻게 관리하고 계세요?
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {SALES_OPTS.map(opt => {
              const sel = sales === opt.id
              return (
                <button key={opt.id}
                  onClick={() => setSales(sel ? null : opt.id)}
                  className="w-full text-left rounded-2xl border-2 px-4 py-[14px] transition-all active:scale-[0.98]"
                  style={{
                    borderColor: sel ? GREEN : '#e5e7eb',
                    backgroundColor: sel ? GREEN_BG : '#ffffff',
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[22px] shrink-0">{opt.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold"
                          style={{ color: sel ? GREEN : '#111827' }}>
                          {opt.label}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            backgroundColor: sel ? GREEN + '20' : '#f3f4f6',
                            color: sel ? GREEN : '#6b7280',
                          }}>
                          {opt.sub}
                        </span>
                      </div>
                      <p className="text-[12px] mt-0.5" style={{ color: sel ? GREEN : '#9ca3af' }}>
                        {opt.desc}
                      </p>
                    </div>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: sel ? GREEN : '#e5e7eb' }}>
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
          {sales === 'connected' && (
            <div className="mt-3 px-3 py-2.5 rounded-xl flex items-start gap-2"
              style={{ backgroundColor: GREEN_BG }}>
              <span className="text-[14px] shrink-0 mt-0.5">✨</span>
              <p className="text-[12px] leading-relaxed" style={{ color: GREEN }}>
                가입 후 대시보드에서 POS·캐시노트 연동을 설정할 수 있어요. 매출이 자동으로 집계돼요.
              </p>
            </div>
          )}
        </section>

      </div>

      <div className="mt-8">
        <button
          disabled={!allAnswered}
          onClick={() => {
            if (!allAnswered) return
            const bizLabel = BIZ_OPTS.find(o => o.id === biz)?.label ?? biz
            navigate('/a4', { state: { category: 'operating', biz, bizLabel, region, sales } })
          }}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all duration-200"
          style={{
            background: allAnswered ? 'linear-gradient(100deg, #2F9BF0, #5BC0FF)' : 'rgba(255,255,255,0.7)',
            color: allAnswered ? '#ffffff' : 'rgba(23,57,92,0.4)',
            boxShadow: allAnswered ? '0 10px 28px rgba(47,155,240,0.35)' : 'none',
          }}>
          다음 — 내 대시보드 만들기
        </button>
      </div>
    </div>
  )
}
