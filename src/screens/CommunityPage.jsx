import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'

const ROOMS = [
  { id: 1, emoji: '🏪', name: '홍대 상권 양도자 모임', desc: '홍대·합정·연남 일대 양도 정보 공유', members: 312, unread: 5, last: '권리금 얼마 받으셨어요?', ago: '2분 전' },
  { id: 2, emoji: '📊', name: '서울 자영업 AI 정보방', desc: '모두 AI 분석·시장동향 자동 공유', members: 1204, unread: 12, last: '이번 달 카페 권리금 평균 상승했대요', ago: '7분 전' },
  { id: 3, emoji: '⚖️', name: '권리금 협상 Q&A', desc: '권리금 산정·협상 경험자 커뮤니티', members: 574, unread: 0, last: '감정평가서 꼭 받으세요', ago: '1시간 전' },
  { id: 4, emoji: '🔑', name: '계약서·법무 도우미', desc: '양도계약 시 주의사항 공유', members: 289, unread: 3, last: '특약 조항 공유합니다', ago: '3시간 전' },
  { id: 5, emoji: '🍽️', name: '식당·분식 양도자 모임', desc: '식음료업 매장 양도 전문 방', members: 441, unread: 0, last: '주방 설비 포함 가격이요', ago: '어제' },
  { id: 6, emoji: '✂️', name: '뷰티·미용 양도 채널', desc: '미용실·네일숍·피부관리 양도', members: 178, unread: 1, last: '단골 DB 이전 가능한가요?', ago: '어제' },
]

const icons = {
  home: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none" /><path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  explore: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" /><path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>,
  community: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  message: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" /><path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  my: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" /><path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>,
}

export default function CommunityPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  const profile = getProfile()
  const config = CATEGORY_CONFIG[profile.category] ?? CATEGORY_CONFIG.seller
  const { color, bg, home, message } = config

  const tabs = [
    { id: 'home',      label: '홈',     onClick: () => navigate(home) },
    { id: 'explore',   label: '탐색',   onClick: () => navigate('/explore') },
    { id: 'community', label: '커뮤니티', onClick: () => {}, active: true },
    { id: 'message',   label: '메시지', onClick: message ? () => navigate(message) : () => showToast('준비 중이에요 🚧') },
    { id: 'my',        label: '마이',   onClick: () => navigate('/my') },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 pb-3 px-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[20px] font-black text-gray-900">커뮤니티</h1>
          <button onClick={() => showToast()}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: color }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex gap-4">
          {['추천', '오픈채팅', '질문·답변'].map((t, i) => (
            <button key={t} onClick={() => showToast()}
              className="pb-2 text-[13px] font-semibold border-b-2 transition-all"
              style={i === 1
                ? { color, borderColor: color }
                : { color: '#9ca3af', borderColor: 'transparent' }}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-1">
          {ROOMS.map(room => (
            <button key={room.id} onClick={() => navigate(`/community/room/${room.id}`)}
              className="w-full flex items-center gap-3 py-4 border-b border-gray-50 last:border-0 text-left active:bg-gray-50 transition-colors">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px] shrink-0"
                style={{ backgroundColor: bg }}>
                {room.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold text-gray-900 leading-tight">{room.name}</p>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">{room.ago}</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{room.members.toLocaleString()}명 참여 중</p>
                <p className="text-[12px] text-gray-500 mt-1 truncate">{room.last}</p>
              </div>
              {room.unread > 0 && (
                <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: color }}>
                  {room.unread}
                </div>
              )}
            </button>
          ))}
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
