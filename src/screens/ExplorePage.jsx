import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import ModuMark from '../components/ModuMark'

const ALL_LISTINGS = [
  { id: 't1', emoji: '🐱', biz: '카페·디저트', title: '홍대 고양이 카페', loc: '서울 마포구 · 홍대입구 5분', area: '마포', type: '영업양도', fee: 2500, deposit: 3000, monthly: 200, views: 1234, likes: 34 },
  { id: 't2', emoji: '🍜', biz: '분식·포장마차', title: '방이동 분식집', loc: '서울 송파구 · 방이동', area: '송파', type: '바닥권리', fee: 1800, deposit: 2000, monthly: 150, views: 892, likes: 21 },
  { id: 't3', emoji: '✂️', biz: '미용·뷰티', title: '강남 미용실', loc: '서울 강남구 · 역삼동', area: '강남', type: '영업양도', fee: 3200, deposit: 4000, monthly: 280, views: 654, likes: 18 },
  { id: 't4', emoji: '🍷', biz: '주류·와인바', title: '합정 와인바', loc: '서울 마포구 · 합정역 3분', area: '마포', type: '영업양도', fee: 4500, deposit: 5000, monthly: 350, views: 423, likes: 12 },
  { id: 't5', emoji: '🏪', biz: '편의점·마트', title: '을지로 편의점', loc: '서울 중구 · 을지로3가역', area: '중구', type: '바닥권리', fee: 800, deposit: 1000, monthly: 120, views: 312, likes: 8 },
  { id: 't6', emoji: '🍗', biz: '치킨·프라이드', title: '신촌 치킨집', loc: '서울 서대문구 · 신촌역 5분', area: '서대문', type: '프랜차이즈', fee: 1200, deposit: 2000, monthly: 180, views: 278, likes: 6 },
  { id: 't7', emoji: '🏋️', biz: '헬스·피트니스', title: '강남 소형 헬스장', loc: '서울 강남구 · 선릉역 3분', area: '강남', type: '영업양도', fee: 5500, deposit: 6000, monthly: 400, views: 198, likes: 15 },
  { id: 't8', emoji: '🍱', biz: '도시락·弁当', title: '여의도 도시락집', loc: '서울 영등포구 · 여의도', area: '영등포', type: '바닥권리', fee: 600, deposit: 800, monthly: 100, views: 143, likes: 5 },
]

const TYPES = ['전체', '영업양도', '바닥권리', '프랜차이즈']
const AREAS_FILTER = ['전체 지역', '마포', '강남', '송파', '중구', '서대문', '영등포']
const SORT_OPTIONS = ['최신순', '권리금 낮은순', '권리금 높은순', '조회 많은순']

const icons = {
  home: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none" /><path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  explore: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" /><path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>,
  community: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  message: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" /><path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  my: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" /><path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>,
}

function PropertyCard({ item, onClick, color, bg }) {
  return (
    <button onClick={onClick}
      className="w-full flex gap-3 py-4 text-left border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[26px] shrink-0"
        style={{ background: 'linear-gradient(135deg, #dce8f8, #b8cce8)' }}>
        {item.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 mb-0.5">{item.biz}</p>
            <p className="text-[15px] font-bold text-gray-900 leading-tight truncate">{item.title}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{item.loc}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 mt-0.5"
            style={{ backgroundColor: bg, color }}>{item.type}</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[12px] font-bold" style={{ color }}>권리금 {item.fee.toLocaleString()}만</span>
          <span className="text-[11px] text-gray-400">보증 {item.deposit.toLocaleString()}만</span>
          <span className="text-[11px] text-gray-400">월세 {item.monthly}만</span>
        </div>
        <p className="text-[10px] text-gray-300 mt-1">조회 {item.views.toLocaleString()} · 관심 {item.likes}</p>
      </div>
    </button>
  )
}

export default function ExplorePage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('전체')
  const [areaFilter, setAreaFilter] = useState('전체 지역')
  const [sort, setSort] = useState('최신순')
  const [showFilter, setShowFilter] = useState(false)

  const profile = getProfile()
  const config = CATEGORY_CONFIG[profile.category] ?? CATEGORY_CONFIG.seller
  const { color, bg, home, message } = config

  const filtered = useMemo(() => {
    let list = ALL_LISTINGS
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.biz.toLowerCase().includes(q) ||
        l.loc.toLowerCase().includes(q)
      )
    }
    if (type !== '전체') list = list.filter(l => l.type === type)
    if (areaFilter !== '전체 지역') list = list.filter(l => l.area === areaFilter)
    if (sort === '권리금 낮은순') list = [...list].sort((a, b) => a.fee - b.fee)
    else if (sort === '권리금 높은순') list = [...list].sort((a, b) => b.fee - a.fee)
    else if (sort === '조회 많은순') list = [...list].sort((a, b) => b.views - a.views)
    return list
  }, [query, type, areaFilter, sort])

  const tabs = [
    { id: 'home',      label: '홈',     onClick: () => navigate(home) },
    { id: 'explore',   label: '탐색',   onClick: () => {}, active: true },
    { id: 'community', label: '커뮤니티', onClick: () => navigate('/community') },
    { id: 'message',   label: '메시지', onClick: message ? () => navigate(message) : () => showToast('가입 후 이용 가능해요') },
    { id: 'my',        label: '마이',   onClick: () => navigate('/my') },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 pb-2 px-4">
        <h1 className="text-[20px] font-black text-gray-900 mb-3">탐색</h1>

        {/* 검색바 */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-100 mb-2.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" />
            <path d="M13 13l-2-2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="업종·지역·상호명 검색"
            className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 text-[16px] leading-none">×</button>
          )}
        </div>

        {/* 양도 유형 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-1" style={{ scrollbarWidth: 'none' }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={type === t
                ? { backgroundColor: color, color: 'white' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              {t}
            </button>
          ))}
          <button onClick={() => setShowFilter(v => !v)}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
            style={showFilter
              ? { backgroundColor: color, color: 'white', borderColor: color }
              : { backgroundColor: '#f9fafb', color: '#9ca3af', borderColor: '#e5e7eb' }}>
            필터 ▾
          </button>
        </div>

        {/* 확장 필터 */}
        {showFilter && (
          <div className="pb-2">
            <p className="text-[10px] font-bold text-gray-400 mb-1.5">지역</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2" style={{ scrollbarWidth: 'none' }}>
              {AREAS_FILTER.map(a => (
                <button key={a} onClick={() => setAreaFilter(a)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={areaFilter === a
                    ? { backgroundColor: color, color: 'white' }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  {a}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-bold text-gray-400 mb-1.5">정렬</p>
            <div className="flex gap-1.5 flex-wrap">
              {SORT_OPTIONS.map(s => (
                <button key={s} onClick={() => setSort(s)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={sort === s
                    ? { backgroundColor: color, color: 'white' }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4">
          <div className="flex items-center justify-between py-3">
            <p className="text-[12px] text-gray-400">
              {query ? `"${query}" 검색 결과 ${filtered.length}건` : `매물 ${filtered.length}건`}
            </p>
            <span className="text-[11px] text-gray-400">{sort}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ModuMark size={52} color="#0E6589" style={{ opacity: 0.22 }} />
              <p className="text-[14px] font-semibold text-gray-500">검색 결과가 없어요</p>
              <p className="text-[12px] text-gray-400">다른 키워드나 필터를 시도해보세요</p>
              <button onClick={() => { setQuery(''); setType('전체'); setAreaFilter('전체 지역') }}
                className="mt-2 px-4 py-2 rounded-full text-[12px] font-bold text-white"
                style={{ backgroundColor: color }}>
                필터 초기화
              </button>
            </div>
          ) : (
            filtered.map(item => (
              <PropertyCard key={item.id} item={item} color={color} bg={bg}
                onClick={() => navigate(`/e2/${item.id}`)} />
            ))
          )}
          <div className="h-6" />
        </div>
      </main>

      <nav className="shrink-0 bg-white border-t border-gray-100 flex">
        {tabs.map(t => {
          const c = t.active ? color : '#9ca3af'
          return (
            <button key={t.id} onClick={t.onClick}
              className="flex-1 flex flex-col items-center py-3 gap-0.5">
              {icons[t.id](c)}
              <span className="text-[10px] font-medium" style={{ color: c }}>{t.label}</span>
            </button>
          )
        })}
      </nav>

      <Toast message={toast} />
    </div>
  )
}
