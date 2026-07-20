import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1b } from './E1bContext'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DARK = '#5c3478'

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full" style={{ backgroundColor: PURPLE }} />
      ))}
    </div>
  )
}

const SPEED_OPTS = [
  { id: 'instant', label: '즉시 응답', sub: '1시간 내', icon: '⚡' },
  { id: 'fast', label: '빠름', sub: '4시간 내', icon: '🏃' },
  { id: 'normal', label: '보통', sub: '영업일 기준 1일', icon: '🚶' },
]

export default function E1bStep5() {
  const navigate = useNavigate()
  const { data, update } = useE1b()

  const [speed, setSpeed] = useState(data.dmSpeed)
  const [deposit, setDeposit] = useState(data.dmDeposit)
  const [active, setActive] = useState(data.dmActive)
  const [modal, setModal] = useState(false)
  const [done, setDone] = useState(false)

  const years = new Date().getFullYear() - parseInt(data.founded)

  const handlePublish = () => {
    update({ dmSpeed: speed, dmDeposit: deposit, dmActive: active })
    setModal(true)
  }

  const handleDone = () => {
    setDone(true)
    setTimeout(() => navigate('/a7/business'), 1200)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1b/4')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">노출 페이지</h1>
          <span className="text-[13px] font-bold" style={{ color: PURPLE }}>5 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">⑤ 견적·문의 설정</h2>
          <p className="text-[13px] text-gray-400 mt-1">연락처 비공개 · DM으로만 문의받아요</p>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* 페이지 미리보기 */}
        <div className="mb-5">
          <p className="text-[12px] font-bold text-gray-400 mb-2">노출 페이지 미리보기</p>
          <div className="rounded-2xl border-2 p-4 overflow-hidden"
            style={{ borderColor: PURPLE + '40' }}>
            {/* 업체 카드 */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: PURPLE_BG }}>
                <span className="text-[22px]">🔨</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-black text-gray-900">{data.bizName}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: PURPLE }}>검증</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {data.region} · {years}년 · {data.category}
                </p>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {(data.triggers.slice(0, 2)).map(t => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded-full border"
                      style={{ borderColor: PURPLE + '40', color: PURPLE }}>{t.slice(0, 15)}…</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
              <div>
                <p className="text-[10px] text-gray-400">응답 속도</p>
                <p className="text-[12px] font-bold" style={{ color: PURPLE }}>
                  {SPEED_OPTS.find(s => s.id === speed)?.sub}
                </p>
              </div>
              <button className="px-4 py-2 rounded-xl text-[13px] font-bold text-white"
                style={{ backgroundColor: PURPLE }}>
                DM 문의
              </button>
            </div>
          </div>
        </div>

        {/* 응답 속도 */}
        <div className="mb-5">
          <p className="text-[12px] font-bold text-gray-400 mb-2">응답 속도</p>
          <div className="flex gap-2">
            {SPEED_OPTS.map(opt => (
              <button key={opt.id}
                onClick={() => setSpeed(opt.id)}
                className="flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all"
                style={{
                  borderColor: speed === opt.id ? PURPLE : '#e5e7eb',
                  backgroundColor: speed === opt.id ? PURPLE_BG : '#ffffff',
                }}>
                <span className="text-[16px]">{opt.icon}</span>
                <p className="text-[12px] font-bold" style={{ color: speed === opt.id ? PURPLE : '#374151' }}>
                  {opt.label}
                </p>
                <p className="text-[10px]" style={{ color: speed === opt.id ? PURPLE : '#9ca3af' }}>
                  {opt.sub}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 예약금 */}
        <div className="mb-5">
          <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl border"
            style={{ borderColor: deposit ? PURPLE + '40' : '#e5e7eb', backgroundColor: deposit ? PURPLE_BG : '#ffffff' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-[18px]">💳</span>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">예약금 받기</p>
                <p className="text-[11px] text-gray-400">노쇼 방지 · 금액 직접 협의</p>
              </div>
            </div>
            <button onClick={() => setDeposit(!deposit)}
              className="w-12 h-6 rounded-full transition-all relative"
              style={{ backgroundColor: deposit ? PURPLE : '#e5e7eb' }}>
              <div className="w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all"
                style={{ left: deposit ? 'calc(100% - 22px)' : '2px' }} />
            </button>
          </div>
        </div>

        {/* DM 활성화 */}
        <div className="mb-5">
          <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl border"
            style={{ borderColor: active ? PURPLE + '40' : '#e5e7eb', backgroundColor: active ? PURPLE_BG : '#ffffff' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-[18px]">💬</span>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">DM 문의 수신 활성화</p>
                <p className="text-[11px] text-gray-400">OFF 시 문의를 받지 않아요</p>
              </div>
            </div>
            <button onClick={() => setActive(!active)}
              className="w-12 h-6 rounded-full transition-all relative"
              style={{ backgroundColor: active ? PURPLE : '#e5e7eb' }}>
              <div className="w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all"
                style={{ left: active ? 'calc(100% - 22px)' : '2px' }} />
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 px-4 py-3 text-[12px] text-gray-400 leading-relaxed">
          전화번호는 공개되지 않아요. 자영업자가 DM으로 문의하고, 양쪽이 연락처 교환에 동의했을 때만 번호가 공개돼요.
        </div>

      </main>

      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button onClick={handlePublish}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white transition-all"
          style={{ backgroundColor: PURPLE }}>
          노출 시작하기
        </button>
        <p className="text-center text-[11px] text-gray-300 mt-2">언제든 비공개로 전환 가능해요</p>
      </div>

      {/* 노출 시작 모달 */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-5 pb-8">
          <div className="w-full bg-white rounded-3xl p-6 text-center">
            {done ? (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: PURPLE_BG }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M5 14l6 6L23 8" stroke={PURPLE} strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-[18px] font-black text-gray-900">노출이 시작됐어요!</p>
                <p className="text-[13px] text-gray-400 mt-1">대시보드로 이동 중...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: PURPLE_BG }}>
                  <span className="text-[30px]">🚀</span>
                </div>
                <p className="text-[18px] font-black text-gray-900">이제 자영업자에게<br />노출돼요</p>
                <p className="text-[13px] text-gray-500 mt-2 mb-5 leading-relaxed">
                  모두가 딱 맞는 수요를 찾아 알림을 보내드려요.<br />
                  연락처는 DM 교환 후에만 공개돼요.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setModal(false)}
                    className="flex-1 py-3.5 rounded-2xl border-2 text-[14px] font-bold text-gray-500"
                    style={{ borderColor: '#e5e7eb' }}>
                    더 수정할게요
                  </button>
                  <button onClick={handleDone}
                    className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold text-white"
                    style={{ backgroundColor: PURPLE }}>
                    대시보드로 이동
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
