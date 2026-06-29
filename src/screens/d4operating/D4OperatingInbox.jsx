import { useNavigate } from 'react-router-dom'

const GREEN = '#2d7a4f'
const GREEN_BG = '#edf7f1'

// 운영중 사장님은 '업체'에게 견적/문의를 보내는 쪽
const SENT = [
  {
    categoryEmoji: '🧮', categoryName: '세무·회계',
    threads: [
      { id: 'oth1', targetName: '모두세무사무소', initials: '세', lastMsg: '부가세 신고 관련해서 도움받고 싶어요.', time: '1시간 전', unread: 1, status: 'waiting' },
    ],
  },
  {
    categoryEmoji: '🔧', categoryName: '시설·인테리어',
    threads: [
      { id: 'oth2', targetName: '서교동 인테리어', initials: '인', lastMsg: '리모델링 견적 부탁드립니다.', time: '3일 전', unread: 0, status: 'active' },
    ],
  },
]

const totalUnread = SENT.flatMap(p => p.threads).reduce((s, t) => s + t.unread, 0)

function NavIcon({ type, active }) {
  const c = active ? GREEN : '#9ca3af'
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

export default function D4OperatingInbox() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-5 pt-12 pb-4">
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-gray-900">메시지</h1>
            {totalUnread > 0 && (
              <p className="text-[12px] mt-0.5" style={{ color: GREEN }}>답변 대기 {totalUnread}건</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: GREEN }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            운영 중
          </div>
        </div>
      </header>

      <div className="shrink-0 mx-4 mt-3 mb-1 rounded-xl px-3.5 py-2.5 flex items-center gap-2"
        style={{ backgroundColor: GREEN_BG }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="4" width="10" height="7" rx="1.5" stroke={GREEN} strokeWidth="1.2" />
          <path d="M5 4V3a2 2 0 014 0v1" stroke={GREEN} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p className="text-[11px] font-medium" style={{ color: GREEN }}>
          업체와 DM으로 문의 — 번호는 양측 합의 후 공개
        </p>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-4" style={{ scrollbarWidth: 'none' }}>
        {SENT.map(group => (
          <div key={group.categoryName} className="mb-5">
            <div className="flex items-center gap-2 px-1 py-2 mb-1">
              <span className="text-[16px]">{group.categoryEmoji}</span>
              <p className="text-[13px] font-bold text-gray-700">{group.categoryName}</p>
              <div className="flex-1 h-px bg-gray-100 ml-1" />
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {group.threads.map((thread, idx) => (
                <button key={thread.id}
                  onClick={() => navigate(`/d4/operating/chat/${thread.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-all
                    ${idx < group.threads.length - 1 ? 'border-b border-gray-50' : ''}
                    ${thread.unread > 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold text-white relative"
                    style={{ backgroundColor: thread.unread > 0 ? GREEN : '#9ca3af' }}>
                    {thread.initials}
                    {thread.unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-[14px] ${thread.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>{thread.targetName}</p>
                      {thread.status === 'waiting' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#fef3e2', color: '#d68b2a' }}>답변 대기</span>
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
          업체 탭에서 문의를 시작할 수 있어요
        </p>
      </main>

      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {[
            { label: '홈', type: 'home', onClick: () => navigate('/a7/operating') },
            { label: '탐색', type: 'explore', onClick: () => navigate('/explore') },
            { label: '커뮤니티', type: 'community', onClick: () => navigate('/community') },
            { label: '메시지', type: 'message', active: true },
            { label: '마이', type: 'my', onClick: () => navigate('/my') },
          ].map(tab => (
            <button key={tab.label} onClick={tab.onClick}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95">
              <NavIcon type={tab.type} active={tab.active} />
              <span className="text-[10px] font-semibold"
                style={{ color: tab.active ? GREEN : '#9ca3af' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
