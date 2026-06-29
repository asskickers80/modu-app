import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { generateMarketInsight, generateRentalInsight } from '../lib/gemini'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'
const GREEN = '#16a34a'
const RED = '#dc2626'

// ── 더미 데이터 ────────────────────────────────────────────────
const DUMMY_PRICE = {
  avgKeyMoney: 2800,
  priceRange: { min: 1800, max: 4500 },
  trend: 'up',
  trendPct: 8,
  avgMonthlyRent: 175,
  recentDeals: [
    { month: '2026-04', price: 2500, areaM2: 28 },
    { month: '2026-03', price: 3000, areaM2: 35 },
    { month: '2026-02', price: 2800, areaM2: 30 },
    { month: '2026-01', price: 2600, areaM2: 32 },
  ],
}
const DUMMY_DISTRICT = {
  similarBizCount: 28,
  footTraffic: { weekday: 8500, weekend: 15000 },
  vacancyRate: 4.2,
  survivalRate: { oneYear: 72, threeYear: 45 },
}

const SELLER_STATS = [
  { label: '권리금 평균', value: '2,800만원', delta: '▲ 8%', up: true, desc: '전월 2,590만원 대비' },
  { label: '이번 달 거래', value: '43건', delta: '▲ 5건', up: true, desc: '전월 38건 대비 증가' },
  { label: '주말 유동인구', value: '15,000명', delta: '▲ 22%', up: true, desc: '홍대·합정 주말 기준' },
  { label: '업종 1년 생존율', value: '72%', delta: '▲ 3%p', up: true, desc: '서울 카페 기준' },
]

const LANDLORD_STATS = [
  { label: '소형 상가 평균 월세', value: '185만원', delta: '▲ 3%', up: true, desc: '30㎡ 이하 서울 기준' },
  { label: '공실률', value: '4.2%', delta: '▼ 0.8%p', up: false, desc: '전분기 5.0% 대비 개선' },
  { label: '캡레이트 평균', value: '4.8%', delta: '▼ 0.2%p', up: false, desc: '수익률 소폭 하락' },
  { label: '보증금 평균', value: '4,800만원', delta: '▲ 5%', up: true, desc: '마포구 1층 기준' },
]

const SELLER_DEALS = [
  { title: '홍대 카페 A', fee: 2800, date: '2026.06.20', type: '영업양도' },
  { title: '신촌 분식집 B', fee: 1500, date: '2026.06.18', type: '바닥권리' },
  { title: '합정 베이커리 C', fee: 3100, date: '2026.06.15', type: '영업양도' },
  { title: '마포 편의점 D', fee: 900, date: '2026.06.12', type: '바닥권리' },
  { title: '연남 와인바 E', fee: 4200, date: '2026.06.08', type: '영업양도' },
]

const LANDLORD_DEALS = [
  { title: '서교동 코너 상가 1층', fee: 200, date: '2026.06.22', type: '월세', area: '42㎡' },
  { title: '합정 근생 2층', fee: 140, date: '2026.06.19', type: '월세', area: '28㎡' },
  { title: '연남동 단독상가 1층', fee: 260, date: '2026.06.14', type: '월세', area: '55㎡' },
  { title: '홍대 골목 상가', fee: 170, date: '2026.06.09', type: '월세', area: '33㎡' },
]

const AREAS = ['홍대·합정·연남', '강남·역삼', '신촌·이대', '이태원·경리단']
const BIZTYPES = ['카페·디저트', '식당·분식', '미용·뷰티', '주류·주점']
const AREATYPES = ['30㎡ 이하', '30~60㎡', '60~100㎡', '100㎡ 이상']

export default function E3PriceLookup() {
  const { mode } = useParams()
  const navigate = useNavigate()
  const isSeller = mode !== 'landlord'

  const COLOR = isSeller ? NAVY : TEAL
  const COLOR_BG = isSeller ? NAVY_BG : TEAL_BG
  const CACHE_KEY = `modu_e3_insight_${mode ?? 'seller'}`

  const [area, setArea] = useState(AREAS[0])
  const [subFilter, setSubFilter] = useState(isSeller ? BIZTYPES[0] : AREATYPES[0])
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchInsight = useCallback(async (force = false) => {
    const today = new Date().toISOString().slice(0, 10)
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { date, text } = JSON.parse(cached)
          if (date === today) { setInsight(text); return }
        }
      } catch { /* ignore */ }
    }
    setLoading(true)
    try {
      let text
      if (isSeller) {
        text = await generateMarketInsight(
          { priceData: DUMMY_PRICE, districtData: DUMMY_DISTRICT },
          { transferFee: '2800', monthlyRent: '175', area: '30', address: area }
        )
      } else {
        text = await generateRentalInsight({
          address: `서울 마포구 서교동 (${area})`,
          area: '42',
          listingType: 'rent',
          deposit: '5000',
          monthlyRent: '185',
          salePrice: null,
          capRate: null,
        })
      }
      setInsight(text)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, text }))
    } catch {
      setInsight(null)
    } finally {
      setLoading(false)
    }
  }, [isSeller, area, CACHE_KEY])

  useEffect(() => { fetchInsight() }, [fetchInsight])

  const stats = isSeller ? SELLER_STATS : LANDLORD_STATS
  const deals = isSeller ? SELLER_DEALS : LANDLORD_DEALS
  const subFilters = isSeller ? BIZTYPES : AREATYPES
  const priceLabel = isSeller ? '권리금 시세 범위' : '월세 시세 범위'
  const priceMin = isSeller ? '1,800만원' : '120만원'
  const priceMax = isSeller ? '4,500만원' : '300만원'
  const priceAvg = isSeller ? '평균 2,800만원' : '평균 185만원'
  const title = isSeller ? '권리금 시세 조회' : '임대 시세 조회'
  const subtitle = isSeller ? '양도자 · 매수자 공통' : '임대인 · 임차인 공통'

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 px-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-[12px] font-semibold" style={{ color: COLOR }}>{subtitle}</p>
            <h1 className="text-[17px] font-bold text-gray-900">{title}</h1>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: COLOR }}>
            더미 데이터
          </span>
        </div>

        {/* 지역 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 mb-1.5" style={{ scrollbarWidth: 'none' }}>
          {AREAS.map(a => (
            <button key={a} onClick={() => setArea(a)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={area === a
                ? { backgroundColor: COLOR, color: 'white' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              {a}
            </button>
          ))}
        </div>

        {/* 업종/면적 필터 */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {subFilters.map(f => (
            <button key={f} onClick={() => setSubFilter(f)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border"
              style={subFilter === f
                ? { backgroundColor: COLOR_BG, color: COLOR, borderColor: `${COLOR}40` }
                : { backgroundColor: '#f9fafb', color: '#9ca3af', borderColor: '#e5e7eb' }}>
              {f}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'none' }}>

        {/* 시세 범위 요약 카드 */}
        <div className="rounded-2xl p-4 mb-4 border-2" style={{ borderColor: `${COLOR}30`, backgroundColor: COLOR_BG }}>
          <p className="text-[11px] font-bold mb-1" style={{ color: COLOR }}>{priceLabel}</p>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-[26px] font-black text-gray-900">{priceMin}</span>
            <span className="text-[14px] text-gray-400 mb-1">~</span>
            <span className="text-[26px] font-black text-gray-900">{priceMax}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold" style={{ color: COLOR }}>{priceAvg}</span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${GREEN}15`, color: GREEN }}>
              ▲ 전월 대비 8%↑
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">{area} 지역 · {subFilter} · 2026.06 기준</p>
        </div>

        {/* 핵심 지표 4개 */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">핵심 지표</p>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3.5 border border-gray-100">
              <p className="text-[10px] text-gray-400 leading-snug mb-2">{s.label}</p>
              <p className="text-[18px] font-black text-gray-900 leading-none">{s.value}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[11px] font-bold" style={{ color: s.up ? GREEN : RED }}>
                  {s.delta}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* AI 시세 해석 */}
        <div className="rounded-2xl p-4 mb-5 border" style={{ borderColor: `${COLOR}30`, backgroundColor: `${COLOR}08` }}>
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5"
              style={{ backgroundColor: COLOR }}>AI</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold" style={{ color: COLOR }}>AI 시세 해석</p>
                <button onClick={() => fetchInsight(true)}
                  className="text-[16px] text-gray-300 leading-none">↺</button>
              </div>
              {loading ? (
                <div className="flex gap-1.5 py-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: COLOR, animation: `bounce 0.9s ease-in-out ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              ) : insight ? (
                <p className="text-[13px] text-gray-700 leading-relaxed">{insight}</p>
              ) : (
                <p className="text-[12px] text-gray-400">{area} 지역 시세를 분석 중이에요.</p>
              )}
            </div>
          </div>
        </div>

        {/* 최근 거래 */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
          {isSeller ? '인근 최근 권리금 거래' : '인근 최근 임대 계약'}
        </p>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-5">
          {deals.map((d, i) => (
            <div key={d.title}
              className={`flex items-center gap-3 px-4 py-3.5 ${i < deals.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 truncate">{d.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {d.date} · {d.type}{d.area ? ` · ${d.area}` : ''}
                </p>
              </div>
              <p className="text-[14px] font-bold shrink-0" style={{ color: COLOR }}>
                {d.fee.toLocaleString()}{isSeller ? '만' : '만원/월'}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-300 text-center pb-4">
          * AI 추산 + 더미 데이터이며, 실제 거래 조건과 다를 수 있습니다.
        </p>
      </main>

      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
    </div>
  )
}
