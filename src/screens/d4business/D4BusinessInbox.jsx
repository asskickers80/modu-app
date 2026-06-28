import { useNavigate } from 'react-router-dom'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DEEP = '#2d1a4a'

const INBOX = [
  {
    categoryEmoji: '🔨', categoryName: '인테리어·간판',
    threads: [
      { id: 'bth1', clientName: '마포 국밥집', initials: '국', lastMsg: '다음 달 리모델링 견적 부탁드려요.', time: '7분 전', unread: 2, hot: true },
      { id: 'bth2', clientName: '강남 카페', initials: '카', lastMsg: '간판 교체 비용이 얼마나 될까요?', time: '2시간 전', unread: 0, hot: false },
    ],
  },
  {
    categoryEmoji: '✨', categoryName: 'AI 추천 수요',
    threads: [
      { id: 'bth3', clientName: 'AI 매칭 92% 수요', initials: 'AI', lastMsg: '서울 강남구 · 카페 인테리어 견적 필요', time: '방금', unread: 1, hot: true, ai: true },
    ],
  },
]

const totalUnread = INBOX.flatMap(g => g.threads).reduce((s, t) => s + t.unread, 0)

function NavIcon({ type, active }) {
  const c = active ? PURPLE : '#9ca3af'
  if (type === 'home') return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
  if (type === 'message') return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" />
      <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default function D4BusinessInbox() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#faf8ff' }}>

      {/* 보라색 헤더 */}
      <header className="shrink-0" style={{ backgroundColor: PURPLE_DEEP }}>
        <div className="flex items-center gap-3 px-5 pt-12 pb-3">
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-white">문의함</h1>
            {totalUnread > 0 && (
              <p className="text-[12px] mt-0.5 text-purple-300">읽지 않은 문의 {totalUnread}건</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-purple-500/30"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-300" />
            기업회원
          </div>
        </div>
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="4" width="10" height="7" rx="1.5" stroke="rgba(200,180,255,0.8)" strokeWidth="1.2" />
            <path d="M5 4V3a2 2 0 014 0v1" stroke="rgba(200,180,255,0.8)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <p className="text-[11px] font-medium text-purple-200">
            전화번호는 비공개 — 모든 문의는 DM으로 시작해요
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-3 pb-4" style={{ scrollbarWidth: 'none' }}>
        {INBOX.map(group => (
          <div key={group.categoryName} className="mb-5">
            <div className="flex items-center gap-2 px-1 py-2 mb-1">
              <span className="text-[16px]">{group.categoryEmoji}</span>
              <p className="text-[13px] font-bold text-gray-700">{group.categoryName}</p>
              <div className="flex-1 h-px bg-gray-100 ml-1" />
              <span className="text-[11px] text-gray-400">{group.threads.length}건</span>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
              {group.threads.map((thread, idx) => (
                <button key={thread.id}
                  onClick={() => navigate(`/d4/business/chat/${thread.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-all
                    ${idx < group.threads.length - 1 ? 'border-b border-gray-50' : ''}
                    ${thread.unread > 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  style={thread.hot ? { backgroundColor: PURPLE_BG } : {}}>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold text-white relative"
                    style={{ backgroundColor: thread.ai ? '#16a34a' : thread.hot ? PURPLE : '#9ca3af' }}>
                    {thread.initials}
                    {thread.unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-[14px] ${thread.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>{thread.clientName}</p>
                      {thread.hot && !thread.ai && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: PURPLE }}>🔥 뜨거운 리드</span>
                      )}
                    </div>
                    <p className={`text-[12px] truncate ${thread.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{thread.lastMsg}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0 self-start mt-0.5">{thread.time}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-center text-[11px] text-gray-300 mt-4">
          모든 문의에 빠르게 응대할수록 매칭 확률이 높아져요
        </p>
      </main>

      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {[
            { label: '홈', type: 'home', onClick: () => navigate('/a7/business') },
            { label: '탐색', type: 'explore' },
            { label: '커뮤니티', type: 'community' },
            { label: '메시지', type: 'message', active: true },
            { label: '마이', type: 'my' },
          ].map(tab => (
            <button key={tab.label} onClick={tab.onClick}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95">
              <NavIcon type={tab.type} active={tab.active} />
              <span className="text-[10px] font-semibold"
                style={{ color: tab.active ? PURPLE : '#9ca3af' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
