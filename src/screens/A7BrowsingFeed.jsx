import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
const FEED = [
  {
    id: 'v1', type: 'video',
    badge: '🎬 인터뷰', badgeColor: '#1f2937',
    title: '"편의점 15년, 이제 정말 놓을 때가 된 것 같아요"',
    views: '4.2만 회', duration: '7분',
    desc: '경기도 수원에서 편의점을 15년간 운영한 박사장님의 이야기. 손님이 줄고 있는데 직원처럼 일하고 있다는 그 말이 울컥했습니다.',
  },
  {
    id: 's1', type: 'story',
    badge: '✍️ 사연', badgeColor: '#b45309',
    title: '월세 200에 시작했는데 4년 만에 권리금이 3천이 됐어요',
    sympathy: '공감 2,341', comments: '댓글 128',
    preview: '처음엔 그냥 동네 작은 카페였어요. 직접 리모델링하고, 메뉴도 계속 바꾸면서 단골을 하나씩 모았는데...',
  },
  {
    id: 'i1', type: 'insight',
    badge: '📊 인사이트', badgeColor: '#0369a1',
    title: '서울 홍대·합정 권리금, 전년 대비 ↑18%',
    stats: [
      { label: '평균 권리금', val: '4,200만' },
      { label: '평균 월세', val: '280만' },
      { label: '공실률', val: '3.2%' },
    ],
    period: '2024년 2분기 기준 · 모두 데이터',
  },
  {
    id: 'c1', type: 'chat',
    badge: '💬 오픈채팅', badgeColor: '#15803d',
    title: '지금 사장님들이 이야기 중이에요',
    rooms: [
      { name: '자영업 사장님 수다방', count: 847 },
      { name: '창업 준비생 Q&A', count: 234 },
      { name: '폐업·양도 고민방', count: 156 },
    ],
  },
  {
    id: 'p1', type: 'property',
    badge: '🔥 화제의 매물', badgeColor: '#dc2626',
    title: '홍대입구 카페, 권리금 5,500만',
    emoji: '☕',
    gradientFrom: '#fef3c7', gradientTo: '#fde68a',
    area: '42㎡ · 1층', monthly: '월세 280만',
    desc: '일 평균 매출 180만원, 업력 4년. 사장님 건강 사유 양도.',
  },
  {
    id: 'g1', type: 'guide',
    badge: '📖 가이드', badgeColor: '#6d28d9',
    title: '창업 전 꼭 알아야 할 권리금 계산법 A to Z',
    readTime: '읽는 시간 5분',
    preview: '권리금에는 바닥권리금, 영업권리금, 시설권리금 세 종류가 있어요. 각각 뭔지, 어떻게 협상하는지 알아봐요.',
  },
  {
    id: 'n1', type: 'news',
    badge: '📰 정책', badgeColor: '#374151',
    title: '소상공인 경영안정자금 하반기 신청 시작 — 최대 2,000만원',
    source: '중소벤처기업부', date: '2024.07.01',
    preview: '저금리 융자 형태로 지원. 연 2.5%, 5년 상환. 업력 1년 이상 소상공인 대상.',
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
        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-[11px] font-bold text-white"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          {item.duration}
        </div>
        <div className="absolute top-3 left-3">
          <Badge label={item.badge} color={item.badgeColor} />
        </div>
      </div>
      <div className="p-4">
        <p className="text-[15px] font-bold text-gray-900 leading-snug mb-1.5">{item.title}</p>
        <p className="text-[11px] text-gray-400 mb-2">{item.views}</p>
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
      <p className="text-[13px] text-gray-400 leading-relaxed mb-3 line-clamp-2">{item.preview}</p>
      <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-3 border-t border-gray-50">
        <span>❤️ {item.sympathy}</span>
        <span>💬 {item.comments}</span>
      </div>
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
        <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          LIVE
        </span>
      </div>
      <p className="text-[15px] font-bold text-gray-900 mb-3">{item.title}</p>
      <div className="flex flex-col gap-2">
        {item.rooms.map(r => (
          <div key={r.name}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: GRAY_BG }}>
            <span className="text-[13px] text-gray-700">{r.name}</span>
            <span className="text-[12px] font-bold text-gray-500">{r.count.toLocaleString()}명</span>
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
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[12px] text-gray-400">{item.area}</span>
          <span className="text-[12px] text-gray-400">{item.monthly}</span>
        </div>
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
      <p className="text-[13px] text-gray-400 leading-relaxed mb-3 line-clamp-2">{item.preview}</p>
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="#d1d5db" strokeWidth="1.2" />
          <path d="M6 3.5V6l1.5 1.5" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {item.readTime}
      </div>
    </div>
  )
}

function NewsCard({ item, onTap }) {
  return (
    <div onClick={onTap}
      className="rounded-2xl border border-gray-100 bg-white p-4 cursor-pointer active:scale-[0.99] transition-transform shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Badge label={item.badge} color={item.badgeColor} />
        <span className="text-[11px] text-gray-400">{item.source}</span>
        <span className="ml-auto text-[11px] text-gray-300">{item.date}</span>
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
          onClick={() => { onClose(); navigate('/a4') }}
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
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: GRAY_BG }}>

      {/* 헤더 — 정체성 없는 사용자, 최소 무채색 */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-5 pt-12 pb-4">
          <div className="flex-1">
            <p className="text-[22px] font-black text-gray-900">모두</p>
            <p className="text-[11px] text-gray-400 mt-0.5">자영업자들의 이야기</p>
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
          {FEED.map(renderCard)}

          {/* 피드 끝 — 가입 유도 */}
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <p className="text-[15px] font-bold text-gray-700 mb-1.5">더 많은 이야기가 있어요</p>
            <p className="text-[13px] text-gray-400 mb-5">
              가입하면 맞춤 피드와<br />업계 데이터를 볼 수 있어요
            </p>
            <button
              onClick={() => setShowNudge(true)}
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
                <tab.Icon active={active} />
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
