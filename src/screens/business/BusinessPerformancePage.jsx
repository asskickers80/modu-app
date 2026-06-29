import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'
import { generateBusinessPerformanceInsight } from '../../lib/gemini'

const PERF_INSIGHT_KEY = 'modu_business_perf_insight_detail'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DEEP = '#5c3380'

const WEEKLY = [
  { day: '월', views: 142, inquiries: 1 },
  { day: '화', views: 195, inquiries: 2 },
  { day: '수', views: 168, inquiries: 1 },
  { day: '목', views: 210, inquiries: 3 },
  { day: '금', views: 280, inquiries: 2 },
  { day: '토', views: 145, inquiries: 1 },
  { day: '일', views: 100, inquiries: 2 },
]

const TOTAL = WEEKLY.reduce((s, d) => ({ views: s.views + d.views, inquiries: s.inquiries + d.inquiries }), { views: 0, inquiries: 0 })
const MAX_VIEW = Math.max(...WEEKLY.map(d => d.views))

function BarChart({ data }) {
  return (
    <div className="flex items-end gap-1 h-[90px]">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-md transition-all"
            style={{
              height: `${Math.max(6, (d.views / MAX_VIEW) * 80)}px`,
              backgroundColor: d.day === '금' ? PURPLE : PURPLE_BG,
            }} />
          <span className="text-[9px] text-gray-400">{d.day}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, val, change, up, unit = '' }) {
  return (
    <div className="rounded-2xl p-4 bg-white border border-gray-100">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-[24px] font-black text-gray-900">{val.toLocaleString()}<span className="text-[13px] font-normal text-gray-400 ml-0.5">{unit}</span></p>
        <span className="mb-1 inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: up ? '#dcfce7' : '#fee2e2', color: up ? '#16a34a' : '#dc2626' }}>
          {up ? '↑' : '↓'}{Math.abs(change)}%
        </span>
      </div>
      <p className="text-[10px] text-gray-300 mt-1">전주 대비</p>
    </div>
  )
}

const FUNNEL = [
  { label: '노출', val: 1240, pct: 100 },
  { label: '클릭', val: 347, pct: 28 },
  { label: '문의', val: 12, pct: 3.5 },
  { label: '전환', val: 4, pct: 1.1 },
]

const KEYWORDS = [
  { kw: '홍대 인테리어', rank: 3, change: 1 },
  { kw: '카페 시공', rank: 7, change: -2 },
  { kw: '마포구 간판', rank: 12, change: 0 },
  { kw: '소상공인 인테리어', rank: 19, change: 3 },
]

export default function BusinessPerformancePage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  const [perfInsight, setPerfInsight] = useState(null)
  const [perfLoading, setPerfLoading] = useState(false)

  const fetchInsight = useCallback(async (force = false) => {
    const today = new Date().toISOString().slice(0, 10)
    if (!force) {
      try {
        const cached = localStorage.getItem(PERF_INSIGHT_KEY)
        if (cached) {
          const { date, text } = JSON.parse(cached)
          if (date === today) { setPerfInsight(text); return }
        }
      } catch { /* ignore */ }
    }
    setPerfLoading(true)
    try {
      const text = await generateBusinessPerformanceInsight({
        views: TOTAL.views,
        viewsChange: 18,
        dmCount: TOTAL.inquiries,
        conversionRate: 1.1,
        category: '인테리어·간판',
      })
      setPerfInsight(text)
      localStorage.setItem(PERF_INSIGHT_KEY, JSON.stringify({ date: today, text }))
    } catch {
      setPerfInsight(null)
    } finally {
      setPerfLoading(false)
    }
  }, [])

  useEffect(() => { fetchInsight() }, [fetchInsight])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0" style={{ backgroundColor: PURPLE_DEEP }}>
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 16l-6-6 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-[13px] text-purple-300">내 노출 성과</p>
            <p className="text-[18px] font-black text-white">이번 주 분석</p>
          </div>
          <button onClick={() => showToast('준비 중이에요 🚧')}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}>
            기간 선택
          </button>
        </div>

        {/* 요약 */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl py-2.5 px-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-[10px] text-purple-300">총 조회</p>
            <p className="text-[20px] font-black text-white">{TOTAL.views.toLocaleString()}</p>
          </div>
          <div className="rounded-xl py-2.5 px-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-[10px] text-purple-300">총 문의</p>
            <p className="text-[20px] font-black text-white">{TOTAL.inquiries}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{ scrollbarWidth: 'none' }}>

        {/* 주간 바차트 */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-gray-800">일별 조회 수</p>
            <p className="text-[11px] text-gray-400">최고 금요일 280회</p>
          </div>
          <BarChart data={WEEKLY} />
        </div>

        {/* 4개 주요 지표 */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <StatCard label="주간 조회" val={1240} change={18} up={true} />
          <StatCard label="주간 검색 유입" val={347} change={5} up={true} />
          <StatCard label="주간 문의" val={12} change={3} up={false} />
          <StatCard label="전환율" val={1.1} change={33} up={true} unit="%" />
        </div>

        {/* AI 성과 해석 */}
        {(perfInsight || perfLoading) && (
          <div className="rounded-2xl px-4 py-3 mb-4 border border-gray-100"
            style={{ backgroundColor: `${PURPLE}0a` }}>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5"
                style={{ backgroundColor: PURPLE }}>AI</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold" style={{ color: PURPLE }}>AI 성과 해석</p>
                  <button onClick={() => fetchInsight(true)} className="text-[14px] text-gray-300 leading-none">↺</button>
                </div>
                {perfLoading ? (
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: PURPLE, animation: `bounce 0.9s ease-in-out ${i * 0.15}s infinite` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-gray-600 leading-snug">{perfInsight}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 전환 퍼널 */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <p className="text-[13px] font-bold text-gray-800 mb-3">전환 퍼널</p>
          <div className="space-y-2">
            {FUNNEL.map((f, i) => (
              <div key={f.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-gray-700">{f.label}</span>
                  <span className="text-[12px] font-bold text-gray-900">{f.val.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${f.pct}%`, backgroundColor: i === 0 ? PURPLE_BG : PURPLE, opacity: 1 - i * 0.15 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">업종 평균 전환율 3.2% · 내 전환율 1.1%</p>
        </div>

        {/* 키워드 순위 */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-gray-800">검색 키워드 순위</p>
            <span className="text-[11px] text-gray-400">모두 검색 기준</span>
          </div>
          <div className="space-y-2">
            {KEYWORDS.map((k, i) => (
              <div key={k.kw} className="flex items-center gap-3">
                <span className="text-[12px] font-black w-5 text-center" style={{ color: i < 2 ? PURPLE : '#9ca3af' }}>{i + 1}</span>
                <p className="flex-1 text-[13px] text-gray-800">{k.kw}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-bold text-gray-900">{k.rank}위</span>
                  {k.change !== 0 && (
                    <span className="text-[10px] font-bold"
                      style={{ color: k.change > 0 ? '#16a34a' : '#dc2626' }}>
                      {k.change > 0 ? `↑${k.change}` : `↓${Math.abs(k.change)}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button onClick={() => navigate('/e1b/1')}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white"
          style={{ backgroundColor: PURPLE }}>
          페이지 다듬어 전환율 올리기 →
        </button>
      </main>

      <Toast message={toast} />
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
    </div>
  )
}
