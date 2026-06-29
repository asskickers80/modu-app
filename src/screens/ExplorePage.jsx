import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'

const LISTINGS = [
  { id: 't1', emoji: '🐱', biz: '카페·디저트', title: '홍대 고양이 카페', loc: '서울 마포구 · 홍대입구 5분', type: '영업양도', fee: 2500, deposit: 3000, monthly: 200, views: 1234, likes: 34 },
  { id: 't2', emoji: '🍜', biz: '분식·포장마차', title: '방이동 분식집', loc: '서울 송파구 · 방이동', type: '바닥권리', fee: 1800, deposit: 2000, monthly: 150, views: 892, likes: 21 },
  { id: 't3', emoji: '✂️', biz: '미용·뷰티', title: '강남 미용실', loc: '서울 강남구 · 역삼동', type: '영업양도', fee: 3200, deposit: 4000, monthly: 280, views: 654, likes: 18 },
  { id: 't4', emoji: '🍷', biz: '주류·와인바', title: '합정 와인바', loc: '서울 마포구 · 합정역 3분', type: '영업양도', fee: 4500, deposit: 5000, monthly: 350, views: 423, likes: 12 },
  { id: 't5', emoji: '🏪', biz: '편의점·마트', title: '을지로 편의점', loc: '서울 중구 · 을지로3가역', type: '바닥권리', fee: 800, deposit: 1000, monthly: 120, views: 312, likes: 8 },
  { id: 't6', emoji: '🍗', biz: '치킨·프라이드', title: '신촌 치킨집', loc: '서울 서대문구 · 신촌역 5분', type: '프랜차이즈', fee: 1200, deposit: 2000, monthly: 180, views: 278, likes: 6 },
]

const TYPES = ['전체', '영업양도', '바닥권리', '프랜차이즈']

const icons = {
  home: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none" /><path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  explore: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" /><path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>,
  community: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  message: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" /><path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  my: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" /><path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>,
}

function NavBar({ navigate, showToast, config }) {
  const { color, home, message } = config
  const tabs = [
    { id: 'home',      label: '홈',     onClick: () => navigate(home) },
    { id: 'explore',   label: '탐색',   onClick: () => {}, active: true },
    { id: 'community', label: '커뮤니티', onClick: () => navigate('/community') },
    { id: 'message',   label: '메시지', onClick: message ? () => navigate(message) : () => showToast('준비 중이에요 🚧') },
    { id: 'my',        label: '마이',   onClick: () => navigate('/my') },
  ]
  return (
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
  )
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
          <div>
            <p className="text-[11px] text-gray-400 mb-0.5">{item.biz}</p>
            <p className="text-[15px] font-bold text-gray-900 leading-tight">{item.title}</p>
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
  const [type, setType] = useState('전체')

  const profile = getProfile()
  const config = CATEGORY_CONFIG[profile.category] ?? CATEGORY_CONFIG.seller
  const { color, bg } = config

  const filtered = LISTINGS.filter(l => type === '전체' || l.type === type)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 pb-3 px-4">
        <h1 className="text-[20px] font-black text-gray-900 mb-3">탐색</h1>
        <button onClick={() => showToast()}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-100 mb-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" />
            <path d="M13 13l-2-2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] text-gray-400">업종·지역·상호명 검색</span>
        </button>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={type === t
                ? { backgroundColor: color, color: 'white' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4">
          <div className="flex items-center justify-between py-3">
            <p className="text-[12px] text-gray-400">매물 {filtered.length}건</p>
            <button onClick={() => showToast()} className="text-[12px] font-medium" style={{ color }}>
              필터·정렬
            </button>
          </div>
          {filtered.map(item => (
            <PropertyCard key={item.id} item={item} color={color} bg={bg}
              onClick={() => navigate(`/e2/${item.id}`)} />
          ))}
          <div className="h-6" />
        </div>
      </main>

      <NavBar navigate={navigate} showToast={showToast} config={config} />
      <Toast message={toast} />
    </div>
  )
}
