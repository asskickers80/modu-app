import { useNavigate } from 'react-router-dom'

const SKY = '#2b8ac9'
const SKY_BG = '#eef6fd'
const NAVY = '#1a4d8f'
const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'

// 창업준비자는 DM을 '보내는' 쪽 — 발신 스레드 목록
const SENT = [
  {
    type: 'vacant', typeColor: TEAL, typeLabel: '빈 점포',
    propertyEmoji: '🏢', propertyName: '서교동 코너 상가',
    threads: [
      { id: 'sth1', targetName: '임대인 박*', initials: '박', lastMsg: '카페 창업 관련해서 여쭤보고 싶어요.', time: '12분 전', unread: 1, status: 'waiting' },
    ],
  },
  {
    type: 'transfer', typeColor: NAVY, typeLabel: '양도 매물',
    propertyEmoji: '🐱', propertyName: '홍대 고양이 카페',
    threads: [
      { id: 'sth2', targetName: '양도자 김*', initials: '김', lastMsg: '이번 주말에 방문해서 볼 수 있을까요?', time: '2시간 전', unread: 0, status: 'active' },
    ],
  },
]

const totalUnread = SENT.flatMap(p => p.threads).reduce((s, t) => s + t.unread, 0)

function NavIcon({ type, active }) {
  const c = active ? SKY : '#9ca3af'
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

export default function D4StartupInbox() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-5 pt-12 pb-4">
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-gray-900">내 문의</h1>
            {totalUnread > 0 && (
              <p className="text-[12px] mt-0.5" style={{ color: SKY }}>답변 대기 {totalUnread}건</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: SKY }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            창업 준비
          </div>
        </div>
      </header>

      <div className="shrink-0 mx-4 mt-3 mb-1 rounded-xl px-3.5 py-2.5 flex items-center gap-2"
        style={{ backgroundColor: SKY_BG }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="4" width="10" height="7" rx="1.5" stroke={SKY} strokeWidth="1.2" />
          <path d="M5 4V3a2 2 0 014 0v1" stroke={SKY} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p className="text-[11px] font-medium" style={{ color: SKY }}>
          전화번호는 비공개 — 모든 문의는 DM으로 시작해요
        </p>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-4" style={{ scrollbarWidth: 'none' }}>
        {SENT.map(group => (
          <div key={group.propertyName} className="mb-5">
            <div className="flex items-center gap-2 px-1 py-2 mb-1">
              <span className="text-[16px]">{group.propertyEmoji}</span>
              <p className="text-[13px] font-bold text-gray-700">{group.propertyName}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: group.typeColor }}>{group.typeLabel}</span>
              <div className="flex-1 h-px bg-gray-100 ml-1" />
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {group.threads.map((thread, idx) => (
                <button key={thread.id}
                  onClick={() => navigate(`/d4/startup/chat/${thread.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-all
                    ${idx < group.threads.length - 1 ? 'border-b border-gray-50' : ''}
                    ${thread.unread > 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold text-white relative"
                    style={{ backgroundColor: thread.unread > 0 ? group.typeColor : '#9ca3af' }}>
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
        <p className="text-center text-[11px] text-gray-300 mt-4 leading-relaxed">
          관심 매물에서 💬 버튼을 눌러<br />새 문의를 시작할 수 있어요
        </p>
      </main>

      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {[
            { label: '홈', type: 'home', onClick: () => navigate('/a7/startup') },
            { label: '탐색', type: 'explore' },
            { label: '커뮤니티', type: 'community' },
            { label: '메시지', type: 'message', active: true },
            { label: '마이', type: 'my' },
          ].map(tab => (
            <button key={tab.label} onClick={tab.onClick}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95">
              <NavIcon type={tab.type} active={tab.active} />
              <span className="text-[10px] font-semibold"
                style={{ color: tab.active ? SKY : '#9ca3af' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
