import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1b } from './E1bContext'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DARK = '#5c3478'

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 1 ? PURPLE : '#e5e7eb' }} />
      ))}
    </div>
  )
}

export default function E1bStep1() {
  const navigate = useNavigate()
  const { data } = useE1b()
  const [loading, setLoading] = useState(true)
  const [dots, setDots] = useState(0)

  const years = new Date().getFullYear() - parseInt(data.founded)
  const tagline = `${data.region} · 업력 ${years}년 · ${data.category}(${data.subCategory})`

  useEffect(() => {
    const tick = setInterval(() => setDots(d => (d + 1) % 4), 400)
    const done = setTimeout(() => { setLoading(false); clearInterval(tick) }, 1800)
    return () => { clearInterval(tick); clearTimeout(done) }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/a7/business')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">노출 페이지</h1>
          <span className="text-[13px] font-bold" style={{ color: PURPLE }}>1 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">① 한 줄 정체성</h2>
          <p className="text-[13px] text-gray-400 mt-1">
            사업자등록증으로 자동 생성돼요 · 수정 불가 (검증된 사실)
          </p>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* 사업자 검증 정보 */}
        <div className="rounded-2xl border-2 p-4 mb-5"
          style={{ borderColor: PURPLE + '40', backgroundColor: PURPLE_BG }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px]">🛡️</span>
            <p className="text-[13px] font-bold" style={{ color: PURPLE }}>사업자 인증 완료</p>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white"
              style={{ color: PURPLE }}>검증 배지</span>
          </div>
          <div className="space-y-1.5">
            {[
              ['상호', data.bizName],
              ['등록번호', data.bizNumber],
              ['분류', `${data.category} / ${data.subCategory}`],
              ['소재지', data.region],
              ['개업일', `${data.founded}년 (업력 ${years}년)`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-[11px] text-gray-400 w-16 shrink-0">{k}</span>
                <span className="text-[12px] font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 자동 생성 한 줄 */}
        <div className="mb-5">
          <p className="text-[12px] font-bold text-gray-400 mb-2">자동 생성된 한 줄 정체성</p>
          {loading ? (
            <div className="rounded-2xl border border-gray-200 px-4 py-5 flex items-center gap-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: PURPLE, opacity: dots >= i ? 1 : 0.3 }} />
                ))}
              </div>
              <p className="text-[13px] text-gray-400">사업자 정보 분석 중{'·'.repeat(dots)}</p>
            </div>
          ) : (
            <div className="rounded-2xl border-2 px-4 py-4"
              style={{ borderColor: PURPLE, backgroundColor: PURPLE_BG }}>
              <p className="text-[16px] font-black leading-snug" style={{ color: PURPLE_DARK }}>
                {tagline}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" fill={PURPLE} />
                  <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-[11px] text-gray-500">
                  수정 불가 — 검증된 사실 기반. 매칭 1차 필터로 활용돼요.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="rounded-2xl bg-gray-50 px-4 py-3.5">
          <p className="text-[13px] font-bold text-gray-700 mb-1.5">왜 수정할 수 없나요?</p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            한 줄 정체성은 <strong>국세청 인증 데이터</strong>에서 자동 생성돼요.
            사실이 아닌 정보를 막아 자영업자들이 안심하고 매칭받을 수 있도록 설계됐어요.
          </p>
        </div>

      </main>

      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button
          disabled={loading}
          onClick={() => !loading && navigate('/e1b/2')}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all"
          style={{
            backgroundColor: loading ? '#e5e7eb' : PURPLE,
            color: loading ? '#9ca3af' : '#ffffff',
          }}>
          {loading ? '정보 확인 중...' : '다음 — 이럴 때 부릅니다'}
        </button>
      </div>
    </div>
  )
}
