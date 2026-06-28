import { useNavigate } from 'react-router-dom'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'

const INBOX = [
  {
    propertyId: 'v1', propertyEmoji: '🏢', propertyName: '서교동 코너 상가',
    threads: [
      { id: 'lth1', name: '예비창업자 김*', initials: '김', lastMsg: '혹시 카페 창업도 가능한 구조인가요?', time: '12분 전', unread: 2, fire: 3 },
      { id: 'lth2', name: '이*님', initials: '이', lastMsg: '임대 기간은 최소 몇 년인가요?', time: '1시간 전', unread: 0, fire: 2 },
    ],
  },
  {
    propertyId: 'v2', propertyEmoji: '🏬', propertyName: '연남동 단독상가',
    threads: [
      { id: 'lth3', name: '박*님', initials: '박', lastMsg: '내부 사진 더 보내주실 수 있나요?', time: '2일 전', unread: 1, fire: 2 },
    ],
  },
]

const totalUnread = INBOX.flatMap(p => p.threads).reduce((s, t) => s + t.unread, 0)

function NavIcon({ type, active }) {
  const c = active ? TEAL : '#9ca3af'
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

export default function D4LandlordInbox() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-5 pt-12 pb-4">
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-gray-900">메시지</h1>
            {totalUnread > 0 && (
              <p className="text-[12px] mt-0.5" style={{ color: TEAL }}>읽지 않은 임차 문의 {totalUnread}건</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: TEAL }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            임대인
          </div>
        </div>
      </header>

      <div className="shrink-0 mx-4 mt-3 mb-1 rounded-xl px-3.5 py-2.5 flex items-center gap-2"
        style={{ backgroundColor: TEAL_BG }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="4" width="10" height="7" rx="1.5" stroke={TEAL} strokeWidth="1.2" />
          <path d="M5 4V3a2 2 0 014 0v1" stroke={TEAL} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p className="text-[11px] font-medium" style={{ color: TEAL }}>
          전화번호는 비공개 — 임차·매수 문의 모두 DM으로 시작해요
        </p>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-4" style={{ scrollbarWidth: 'none' }}>
        {INBOX.map(property => (
          <div key={property.propertyId} className="mb-5">
            <div className="flex items-center gap-2 px-1 py-2 mb-1">
              <span className="text-[16px]">{property.propertyEmoji}</span>
              <p className="text-[13px] font-bold text-gray-700">{property.propertyName}</p>
              <div className="flex-1 h-px bg-gray-100 ml-1" />
              <span className="text-[11px] text-gray-400">{property.threads.length}건</span>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {property.threads.map((thread, idx) => (
                <button key={thread.id}
                  onClick={() => navigate(`/d4/landlord/chat/${thread.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-all
                    ${idx < property.threads.length - 1 ? 'border-b border-gray-50' : ''}
                    ${thread.unread > 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold text-white relative"
                    style={{ backgroundColor: thread.unread > 0 ? TEAL : '#9ca3af' }}>
                    {thread.initials}
                    {thread.unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-[14px] ${thread.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>{thread.name}</p>
                      <span className="text-[11px]">{'🔥'.repeat(thread.fire)}</span>
                    </div>
                    <p className={`text-[12px] truncate ${thread.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{thread.lastMsg}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0 self-start mt-0.5">{thread.time}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-center text-[11px] text-gray-300 mt-2">
          모든 임차 문의에 성실히 응답해주세요<br />
          계약은 앱 밖 현실에서 이루어져요
        </p>
      </main>

      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {[
            { label: '홈', type: 'home', onClick: () => navigate('/a7/landlord') },
            { label: '탐색', type: 'explore' },
            { label: '커뮤니티', type: 'community' },
            { label: '메시지', type: 'message', active: true },
            { label: '마이', type: 'my' },
          ].map(tab => (
            <button key={tab.label} onClick={tab.onClick}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95">
              <NavIcon type={tab.type} active={tab.active} />
              <span className="text-[10px] font-semibold"
                style={{ color: tab.active ? TEAL : '#9ca3af' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
