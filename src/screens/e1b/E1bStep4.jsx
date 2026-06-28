import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1b } from './E1bContext'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 4 ? PURPLE : '#e5e7eb' }} />
      ))}
    </div>
  )
}

const BADGE_LIST = [
  { id: 'verified', icon: '🛡️', label: '사업자 인증', desc: '국세청 데이터 연동', done: true },
  { id: 'nofake', icon: '✅', label: '허위 매물 없음', desc: '모두 품질 검증', done: true },
]

export default function E1bStep4() {
  const navigate = useNavigate()
  const { data, update } = useE1b()
  const years = new Date().getFullYear() - parseInt(data.founded)

  const [count, setCount] = useState(data.completedCount)
  const [portfolio, setPortfolio] = useState(data.portfolioAdded)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const saveAndNext = () => {
    update({ completedCount: count, portfolioAdded: portfolio })
    navigate('/e1b/5')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1b/3')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">노출 페이지</h1>
          <span className="text-[13px] font-bold" style={{ color: PURPLE }}>4 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">④ 믿을 근거</h2>
          <p className="text-[13px] text-gray-400 mt-1">검증 배지는 자동. 실적·포트폴리오를 더하면 신뢰도가 올라가요.</p>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* 검증 배지 (자동) */}
        <div className="mb-5">
          <p className="text-[12px] font-bold text-gray-400 mb-2">검증 배지 (자동 부여)</p>
          <div className="flex flex-col gap-2.5">
            {BADGE_LIST.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{ borderColor: PURPLE + '30', backgroundColor: PURPLE_BG }}>
                <span className="text-[20px]">{b.icon}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-bold" style={{ color: PURPLE }}>{b.label}</p>
                  <p className="text-[11px] text-gray-400">{b.desc}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill={PURPLE} />
                  <path d="M4.5 8l2.5 2.5 4-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* 업력 (자동) */}
        <div className="mb-5">
          <p className="text-[12px] font-bold text-gray-400 mb-2">업력 (자동 — 사업자등록증 개업일)</p>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border"
            style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
            <span className="text-[20px]">📅</span>
            <div>
              <p className="text-[13px] font-bold text-gray-800">{years}년 경력</p>
              <p className="text-[11px] text-gray-400">{data.founded}년 개업 · {data.region}</p>
            </div>
          </div>
        </div>

        {/* 완료 건수 (직접 입력) */}
        <div className="mb-5">
          <p className="text-[12px] font-bold text-gray-400 mb-2">완료 실적 (직접 입력)</p>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border"
            style={{ borderColor: count ? PURPLE : '#e5e7eb' }}>
            <span className="text-[20px]">📋</span>
            <input
              type="number"
              inputMode="numeric"
              value={count}
              onChange={e => setCount(e.target.value)}
              placeholder="완료 건수 (예: 150)"
              className="flex-1 text-[14px] font-semibold outline-none bg-transparent"
              style={{ color: count ? PURPLE : '#9ca3af' }} />
            <span className="text-[13px] text-gray-400 shrink-0">건</span>
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">입력 안 해도 돼요. 추후 언제든 추가 가능.</p>
        </div>

        {/* 포트폴리오 사진 */}
        <div className="mb-5">
          <p className="text-[12px] font-bold text-gray-400 mb-2">포트폴리오 사진 (선택)</p>
          <div className="flex gap-2">
            {portfolio ? (
              <div className="w-20 h-20 rounded-xl flex items-center justify-center relative"
                style={{ backgroundColor: PURPLE_BG }}>
                <span className="text-[28px]">🏗️</span>
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: PURPLE }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ) : null}
            {[1, 2, portfolio ? 2 : 3].map((_, i) => (
              <button key={i}
                onClick={() => { setPortfolio(true); showToast('사진이 추가됐어요') }}
                className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center"
                style={{ borderColor: '#d1d5db' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v12M4 10h12" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">시공 전·후 사진, 완성 사례 등 (최대 10장)</p>
        </div>

        {/* 후기 안내 */}
        <div className="rounded-2xl bg-gray-50 px-4 py-3.5">
          <p className="text-[12px] font-bold text-gray-600 mb-1">⭐ 후기는 자동으로 쌓여요</p>
          <p className="text-[12px] text-gray-400 leading-relaxed">
            매칭 완료 후 자영업자가 남긴 후기가 자동으로 이 페이지에 붙어요.
            지금은 아직 없어요.
          </p>
        </div>

      </main>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-[13px] font-semibold text-white shadow-lg z-50 whitespace-nowrap"
          style={{ backgroundColor: PURPLE }}>
          ✓ {toast}
        </div>
      )}

      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button onClick={saveAndNext}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white"
          style={{ backgroundColor: PURPLE }}>
          다음 — 견적·문의 설정
        </button>
      </div>
    </div>
  )
}
