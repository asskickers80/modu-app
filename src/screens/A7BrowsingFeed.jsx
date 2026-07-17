import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateBrowsingCopy } from '../lib/gemini'
import { ModuMarkHomeButton } from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'

const BROWSING_COPY_KEY = 'modu_browsing_copy'

const GRAY = '#8a8a8e'
const GRAY_BG = '#f5f5f6'
const GRAY_DARK = '#4b4b4f'

// ── 아이콘 ──────────────────────────────────────────────────
function HomeIcon({ active }) {
  const c = active ? GRAY : '#c4c4c6'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round"
        fill={active ? '#e8e8e9' : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon({ active }) {
  const c = active ? GRAY : '#c4c4c6'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon({ active }) {
  const c = active ? GRAY : '#c4c4c6'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
function MessageIcon({ active }) {
  const c = active ? GRAY : '#c4c4c6'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon({ active }) {
  const c = active ? GRAY : '#c4c4c6'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" />
      <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const NAV_TABS = [
  { id: 'home', label: '홈', Icon: HomeIcon },
  { id: 'explore', label: '탐색', Icon: ExploreIcon },
  { id: 'community', label: '커뮤니티', Icon: CommunityIcon },
  { id: 'message', label: '메시지', Icon: MessageIcon },
  { id: 'my', label: '마이', Icon: MyIcon },
]

// ── 피드 더미 데이터 ────────────────────────────────────────
// 콘텐츠 제작 전 — 매거진 판형 유지용 자리 카드 (가짜 수치·조회수·매물 주장 없음, 실 콘텐츠 연동 시 교체)
const FEED = [
  {
    id: 'v1', type: 'video',
    badge: '🎬 인터뷰', badgeColor: '#1f2937',
    title: '사장님 인터뷰 — 콘텐츠 준비중',
    desc: '실제 사장님들의 창업·양도 이야기를 영상으로 준비하고 있어요.',
  },
  {
    id: 's1', type: 'story',
    badge: '✍️ 사연', badgeColor: '#b45309',
    title: '사장님 사연 — 콘텐츠 준비중',
    preview: '실제 운영·양도 사연이 연재되면 이 자리에 표시돼요.',
  },
  {
    id: 'i1', type: 'insight',
    badge: '📊 인사이트', badgeColor: '#0369a1',
    title: '상권 인사이트 — 데이터 연동 준비중',
    stats: [
      { label: '평균 권리금', val: '준비중' },
      { label: '평균 월세', val: '준비중' },
      { label: '공실률', val: '준비중' },
    ],
    period: '실거래·상권 데이터 연동 후 제공돼요',
  },
  {
    id: 'c1', type: 'chat',
    badge: '💬 오픈채팅', badgeColor: '#15803d',
    title: '사장님 오픈채팅 — 준비중',
    rooms: [
      { name: '자영업 사장님 오픈채팅방을 준비하고 있어요' },
    ],
  },
  {
    id: 'p1', type: 'property',
    badge: '🔥 화제의 매물', badgeColor: '#dc2626',
    title: '화제의 매물 — 준비중',
    emoji: '☕',
    gradientFrom: '#fef3c7', gradientTo: '#fde68a',
    desc: '가입하면 실제 공개 매물을 바로 볼 수 있어요.',
  },
  {
    id: 'g1', type: 'guide',
    badge: '📖 가이드', badgeColor: '#6d28d9',
    title: '창업·양도 가이드 — 콘텐츠 준비중',
    preview: '권리금 계산법 같은 실전 가이드를 준비하고 있어요.',
  },
  {
    id: 'n1', type: 'news',
    badge: '📰 정책', badgeColor: '#374151',
    title: '정책 뉴스 — 콘텐츠 준비중',
    preview: '소상공인 지원 정책 소식이 연동되면 표시돼요.',
  },
]

// ── 카드 컴포넌트들 ─────────────────────────────────────────

function Badge({ label, color }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}>
      {label}
    </span>
  )
}

function VideoCard({ item, onTap }) {
  return (
    <div onClick={onTap}
      className="rounded-2xl overflow-hidden border border-gray-100 bg-white cursor-pointer active:scale-[0.99] transition-transform shadow-sm">
      <div className="relative h-[200px] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' }}>
        {/* 배경 패턴 느낌 */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 70%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1.5px solid rgba(255,255,255,0.3)' }}>
          <svg width="20" height="22" viewBox="0 0 20 22" fill="white">
            <path d="M4 3l14 8-14 8V3z" />
          </svg>
        </div>
        <div className="absolute top-3 left-3">
          <Badge label={item.badge} color={item.badgeColor} />
        </div>
      </div>
      <div className="p-4">
        <p className="text-[15px] font-bold text-gray-900 leading-snug mb-1.5">{item.title}</p>
        <p className="text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>
      </div>
    </div>
  )
}

function StoryCard({ item, onTap }) {
  return (
    <div onClick={onTap}
      className="rounded-2xl border border-gray-100 bg-white p-4 cursor-pointer active:scale-[0.99] transition-transform shadow-sm">
      <Badge label={item.badge} color={item.badgeColor} />
      <p className="text-[15px] font-bold text-gray-900 leading-snug mt-3 mb-2">{item.title}</p>
      <p className="text-[13px] text-gray-400 leading-relaxed line-clamp-2">{item.preview}</p>
    </div>
  )
}

function InsightCard({ item, onTap }) {
  return (
    <div onClick={onTap}
      className="rounded-2xl border border-gray-100 bg-white p-4 cursor-pointer active:scale-[0.99] transition-transform shadow-sm">
      <Badge label={item.badge} color={item.badgeColor} />
      <p className="text-[15px] font-bold text-gray-900 leading-snug mt-3 mb-4">{item.title}</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {item.stats.map(s => (
          <div key={s.label} className="rounded-xl py-3 text-center"
            style={{ backgroundColor: GRAY_BG }}>
            <p className="text-[16px] font-black text-gray-900">{s.val}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400">{item.period}</p>
    </div>
  )
}

function ChatCard({ item, onTap }) {
  return (
    <div onClick={onTap}
      className="rounded-2xl border border-gray-100 bg-white p-4 cursor-pointer active:scale-[0.99] transition-transform shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Badge label={item.badge} color={item.badgeColor} />
      </div>
      <p className="text-[15px] font-bold text-gray-900 mb-3">{item.title}</p>
      <div className="flex flex-col gap-2">
        {item.rooms.map(r => (
          <div key={r.name}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: GRAY_BG }}>
            <span className="text-[13px] text-gray-700">{r.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PropertyCard({ item, onTap }) {
  return (
    <div onClick={onTap}
      className="rounded-2xl border border-gray-100 bg-white overflow-hidden cursor-pointer active:scale-[0.99] transition-transform shadow-sm">
      <div className="h-[130px] flex items-center justify-center relative"
        style={{ background: `linear-gradient(135deg, ${item.gradientFrom}, ${item.gradientTo})` }}>
        <span className="text-[52px]">{item.emoji}</span>
        <div className="absolute top-3 left-3">
          <Badge label={item.badge} color={item.badgeColor} />
        </div>
      </div>
      <div className="p-4">
        <p className="text-[15px] font-bold text-gray-900 mb-1.5">{item.title}</p>
        <p className="text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[12px] text-gray-300 text-center">가입하면 상세 정보를 볼 수 있어요</p>
        </div>
      </div>
    </div>
  )
}

function GuideCard({ item, onTap }) {
  return (
    <div onClick={onTap}
      className="rounded-2xl border border-gray-100 bg-white p-4 cursor-pointer active:scale-[0.99] transition-transform shadow-sm">
      <Badge label={item.badge} color={item.badgeColor} />
      <p className="text-[15px] font-bold text-gray-900 leading-snug mt-3 mb-2">{item.title}</p>
      <p className="text-[13px] text-gray-400 leading-relaxed line-clamp-2">{item.preview}</p>
    </div>
  )
}

function NewsCard({ item, onTap }) {
  return (
    <div onClick={onTap}
      className="rounded-2xl border border-gray-100 bg-white p-4 cursor-pointer active:scale-[0.99] transition-transform shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Badge label={item.badge} color={item.badgeColor} />
      </div>
      <p className="text-[14px] font-bold text-gray-900 leading-snug mb-2">{item.title}</p>
      <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-2">{item.preview}</p>
    </div>
  )
}

// ── 가입 유도 바텀 시트 ─────────────────────────────────────
function SignUpNudge({ onClose, navigate }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <p className="text-[19px] font-bold text-gray-900 text-center mb-1.5">더 보고 싶으세요? 😊</p>
        <p className="text-[14px] text-gray-400 text-center leading-relaxed mb-6">
          가입하면 더 많은 이야기와<br />맞춤 정보를 볼 수 있어요
        </p>
        <button
          onClick={() => { onClose(); navigate('/a4', { state: { category: 'browsing' } }) }}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white mb-2.5"
          style={{ backgroundColor: GRAY_DARK }}>
          가입하기
        </button>
        <button onClick={onClose}
          className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">
          계속 구경할게요
        </button>
      </div>
    </div>
  )
}

// ── 메인 ────────────────────────────────────────────────────
export default function A7BrowsingFeed() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('home')
  const [showNudge, setShowNudge] = useState(false)

  const [browseCopy, setBrowseCopy] = useState(null)
  const [copyLoading, setCopyLoading] = useState(false)

  const fetchCopy = useCallback(async (force = false) => {
    const today = new Date().toISOString().slice(0, 10)
    if (!force) {
      try {
        const cached = localStorage.getItem(BROWSING_COPY_KEY)
        if (cached) {
          const { date, text } = JSON.parse(cached)
          if (date === today) { setBrowseCopy(text); return }
        }
      } catch { /* ignore */ }
    }
    setCopyLoading(true)
    try {
      const text = await generateBrowsingCopy()
      setBrowseCopy(text)
      localStorage.setItem(BROWSING_COPY_KEY, JSON.stringify({ date: today, text }))
    } catch {
      setBrowseCopy(null)
    } finally {
      setCopyLoading(false)
    }
  }, [])

  useEffect(() => { fetchCopy() }, [fetchCopy])

  const handleCardTap = () => setShowNudge(true)

  const renderCard = (item) => {
    const props = { key: item.id, item, onTap: handleCardTap }
    switch (item.type) {
      case 'video':    return <VideoCard {...props} />
      case 'story':    return <StoryCard {...props} />
      case 'insight':  return <InsightCard {...props} />
      case 'chat':     return <ChatCard {...props} />
      case 'property': return <PropertyCard {...props} />
      case 'guide':    return <GuideCard {...props} />
      case 'news':     return <NewsCard {...props} />
      default:         return null
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 — 정체성 없는 사용자, 최소 무채색 */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-5 pt-12 pb-4">
          <div className="flex-1 flex items-center gap-2">
            <ModuMarkHomeButton size={36} color="#1683B8" />
            <div>
              <p style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.04em', color: '#111827', lineHeight: 1 }}>모두</p>
              <p className="text-[11px] text-gray-400 mt-0.5">자영업자들의 이야기</p>
            </div>
          </div>
          <button onClick={() => setShowNudge(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: GRAY_BG }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#9ca3af" strokeWidth="1.5" />
              <path d="M16 16l-2.5-2.5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={() => setShowNudge(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: GRAY_BG }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2a4.5 4.5 0 014.5 4.5v2.25l.9 1.35H3.6l.9-1.35V6.5A4.5 4.5 0 019 2z"
                stroke="#9ca3af" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M7 14.5a2 2 0 004 0" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* 피드 */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 py-4 flex flex-col gap-3">

          {/* AI 오늘의 트렌드 — 진짜 Gemini 호출 */}
          <div className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: '#f0f0f1', border: '1px solid #e5e5e7' }}>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5"
                style={{ backgroundColor: GRAY }}>AI</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-gray-500">오늘의 시장 트렌드</p>
                  <button onClick={() => fetchCopy(true)} className="text-[14px] text-gray-300 leading-none">↺</button>
                </div>
                {copyLoading ? (
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: GRAY, animation: `bounce 0.9s ease-in-out ${i * 0.15}s infinite` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-gray-600 leading-snug">
                    {browseCopy ?? '오늘 소상공인 시장 트렌드를 분석 중이에요.'}
                  </p>
                )}
              </div>
            </div>
          </div>
          <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>

          {FEED.map(renderCard)}

          {/* 피드 끝 — 가입 유도 */}
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <p className="text-[15px] font-bold text-gray-700 mb-1.5">더 많은 이야기가 있어요</p>
            <p className="text-[13px] text-gray-400 mb-5">
              가입하면 맞춤 피드와<br />업계 데이터를 볼 수 있어요
            </p>
            <button
              onClick={() => navigate('/a4', { state: { category: 'browsing' } })}
              className="px-8 py-3.5 rounded-2xl text-[14px] font-bold text-white"
              style={{ backgroundColor: GRAY_DARK }}>
              가입하고 더 보기
            </button>
          </div>

          <div className="h-2" />
        </div>
      </main>

      {/* 하단 네비 */}
      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {NAV_TABS.map(tab => {
            const active = activeNav === tab.id
            return (
              <button key={tab.id}
                onClick={() => {
                  if (tab.id !== 'home') { setShowNudge(true); return }
                  setActiveNav(tab.id)
                }}
                className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95">
                <span className="relative">
                  <tab.Icon active={active} />
                  {tab.id === 'message' && <MessageTabDot />}
                </span>
                <span className="text-[10px] font-semibold"
                  style={{ color: active ? GRAY : '#c4c4c6' }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {showNudge && (
        <SignUpNudge onClose={() => setShowNudge(false)} navigate={navigate} />
      )}

    </div>
  )
}
