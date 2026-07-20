import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'

const GREEN = '#2d7a4f'
const GREEN_BG = '#edf7f1'

const QUICK_AMOUNTS = [100, 150, 200, 250, 300, 350, 400, 500]
const RECENT = [
  { day: '어제', amount: 288000, note: '' },
  { day: '그저께', amount: 260000, note: '' },
  { day: '3일 전', amount: 310000, note: '주말' },
  { day: '4일 전', amount: 290000, note: '' },
  { day: '5일 전', amount: 240000, note: '' },
  { day: '6일 전', amount: 180000, note: '월요일' },
  { day: '7일 전', amount: 324000, note: '' },
]

function TodayBar({ val, max = 400000 }) {
  const pct = Math.min(100, Math.round((val / max) * 100))
  return (
    <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: GREEN }} />
    </div>
  )
}

export default function SalesInputPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState(false)
  const numericVal = parseInt(input.replace(/[^0-9]/g, '')) || 0

  const handleQuick = (amount) => {
    setInput((amount * 10000).toString())
  }

  const handleSave = () => {
    if (!numericVal) { showToast('금액을 입력해주세요'); return }
    setSaved(true)
    showToast(`오늘 매출 ${(numericVal / 10000).toLocaleString()}만원 저장됐어요 ✓`)
    setTimeout(() => navigate(-1), 1500)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 16l-6-6 6-6" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-[13px] text-gray-400">오늘 매출</p>
            <p className="text-[18px] font-black text-gray-900">2026년 6월 29일</p>
          </div>
          <button onClick={() => showToast('POS 연동 준비 중이에요 🚧')}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold border"
            style={{ borderColor: GREEN, color: GREEN }}>
            POS 연동
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{ scrollbarWidth: 'none' }}>

        {/* 입력 영역 */}
        <div className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
          <p className="text-[12px] text-gray-400 mb-1">오늘 매출 입력</p>
          <div className="flex items-baseline gap-1 mb-4">
            <input
              type="number"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="0"
              className="text-[32px] font-black text-gray-900 outline-none w-full"
              style={{ border: 'none', background: 'transparent' }}
            />
            <span className="text-[16px] font-bold text-gray-400 shrink-0">원</span>
          </div>

          {numericVal > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-gray-400">오늘 목표 400만원 대비</span>
                <span className="font-bold" style={{ color: GREEN }}>{Math.min(100, Math.round(numericVal / 40000))}%</span>
              </div>
              <TodayBar val={numericVal} />
            </div>
          )}

          <p className="text-[11px] text-gray-400 mb-2">빠른 선택 (만원 단위)</p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map(amt => (
              <button key={amt}
                onClick={() => handleQuick(amt)}
                className="py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95"
                style={{
                  backgroundColor: numericVal === amt * 10000 ? GREEN : GREEN_BG,
                  color: numericVal === amt * 10000 ? 'white' : GREEN,
                }}>
                {amt}만
              </button>
            ))}
          </div>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saved}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white mb-5"
          style={{ backgroundColor: numericVal ? GREEN : '#d1d5db' }}>
          {saved ? '저장 완료 ✓' : '오늘 매출 저장하기'}
        </button>

        {/* POS 연동 안내 */}
        <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: GREEN_BG }}>
          <p className="text-[13px] font-bold mb-1" style={{ color: GREEN }}>💡 POS 연동하면 자동으로!</p>
          <ul className="space-y-1">
            {['매일 자동 입력 (수기 필요 없어요)', '모두가 매출 패턴 분석', '동종 업종과 자동 비교'].map((t, i) => (
              <li key={i} className="text-[12px] text-gray-600 flex items-center gap-1.5">
                <span style={{ color: GREEN }}>•</span> {t}
              </li>
            ))}
          </ul>
          <button onClick={() => showToast('POS 연동 준비 중이에요 🚧')}
            className="mt-3 w-full py-2.5 rounded-xl text-[13px] font-bold text-white"
            style={{ backgroundColor: GREEN }}>
            POS 연동 신청하기 →
          </button>
        </div>

        {/* 최근 7일 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-[13px] font-bold text-gray-800 mb-3">최근 7일 내역</p>
          <div className="space-y-2">
            {RECENT.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[12px] text-gray-400 w-14 shrink-0">{r.day}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.round(r.amount / 4000)}%`,
                    backgroundColor: GREEN,
                    opacity: 0.7 - i * 0.06,
                  }} />
                </div>
                <span className="text-[12px] font-bold text-gray-700 w-16 text-right shrink-0">
                  {(r.amount / 10000).toFixed(0)}만
                </span>
                {r.note && <span className="text-[10px] text-gray-400 shrink-0">{r.note}</span>}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Toast message={toast} />
    </div>
  )
}
