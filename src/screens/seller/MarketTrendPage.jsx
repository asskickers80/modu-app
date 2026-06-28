import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const GREEN = '#22c55e'
const RED = '#ef4444'

const STATS = [
  { label: '인근 카페 평균 권리금', value: '3,200만원', delta: '+8%', up: true, desc: '전월 2,960만원 대비 상승' },
  { label: '서울 카페 이번 달 거래', value: '43건', delta: '+5건', up: true, desc: '전월 38건 대비 증가' },
  { label: '홍대 유동인구', value: '+22%', delta: '주말 기준', up: true, desc: '전주 대비 토·일 기준' },
  { label: '서울 자영업 폐업률', value: '1.2%', delta: '-0.3%p', up: false, desc: '전월 1.5% 대비 하락 (호조)' },
  { label: '카페 평균 월매출', value: '1,100만원', delta: '+3%', up: true, desc: '서울 기준 중위값' },
  { label: '권리금 회수율 예상', value: '87%', delta: '60일 기준', up: true, desc: 'AI 추산, 참고용' },
]

const RECENT_DEALS = [
  { title: '홍대 카페 A', fee: 2800, date: '2026.06.20', type: '영업양도' },
  { title: '신촌 분식집 B', fee: 1500, date: '2026.06.18', type: '바닥권리' },
  { title: '합정 베이커리 C', fee: 3100, date: '2026.06.15', type: '영업양도' },
  { title: '마포 편의점 D', fee: 900, date: '2026.06.12', type: '바닥권리' },
  { title: '연남 와인바 E', fee: 4200, date: '2026.06.08', type: '영업양도' },
]

const AREAS = ['홍대·합정·연남', '강남·역삼', '신촌·이대', '이태원·경리단']
const BIZTYPES = ['카페·디저트', '식당·분식', '미용·뷰티', '주류·주점']

export default function MarketTrendPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [area, setArea] = useState(AREAS[0])
  const [bizType, setBizType] = useState(BIZTYPES[0])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 px-4 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f3f4f6' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-[18px] font-bold text-gray-900">동종 시장 동향</h1>
        </div>
        {/* 지역 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-2" style={{ scrollbarWidth: 'none' }}>
          {AREAS.map(a => (
            <button key={a} onClick={() => setArea(a)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={area === a ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {BIZTYPES.map(b => (
            <button key={b} onClick={() => setBizType(b)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
              style={bizType === b ? { backgroundColor: NAVY_BG, color: NAVY } : { backgroundColor: '#f9fafb', color: '#9ca3af', border: '1px solid #e5e7eb' }}>
              {b}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'none' }}>
        {/* 핵심 지표 */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">핵심 지표</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {STATS.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3.5 border border-gray-100">
              <p className="text-[10px] text-gray-400 leading-snug mb-2">{s.label}</p>
              <p className="text-[20px] font-black leading-none" style={{ color: '#111827' }}>{s.value}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[11px] font-bold" style={{ color: s.up ? GREEN : RED }}>
                  {s.up ? '▲' : '▼'} {s.delta}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* AI 한줄 분석 */}
        <div className="bg-white rounded-2xl p-4 border mb-6" style={{ borderColor: `${NAVY}25` }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: NAVY }}>
              AI 분석
            </span>
            <span className="text-[10px] text-gray-400">2026.06.29 기준</span>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            {area} 지역 {bizType} 업종은 현재 <strong>매도자 우위</strong> 시장입니다.
            권리금 시세가 전월 대비 8% 상승 중이며, 진지 매수자 유입이 증가하고 있어
            지금 등록하면 60일 내 매칭 확률이 높은 편입니다.
          </p>
        </div>

        {/* 인근 최근 거래 */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">인근 최근 거래</p>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          {RECENT_DEALS.map((d, i) => (
            <div key={d.title} className={`flex items-center gap-3 px-4 py-3.5 ${i < RECENT_DEALS.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800">{d.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{d.date} · {d.type}</p>
              </div>
              <p className="text-[14px] font-bold shrink-0" style={{ color: NAVY }}>
                {d.fee.toLocaleString()}만
              </p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-300 text-center pb-2">
          * AI 추산 데이터이며, 실제 거래 조건과 다를 수 있습니다.
        </p>
      </main>

      <Toast message={toast} />
    </div>
  )
}
