import { useNavigate } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

// ── 더미 데이터 ──────────────────────────────────────────
const INBOX = [
  {
    propertyId: 't1',
    propertyEmoji: '🐱',
    propertyName: '홍대 고양이 카페',
    threads: [
      {
        id: 'th1',
        buyerName: '예비창업자 김*',
        initials: '김',
        lastMsg: '이번 주말에 직접 방문해서 볼 수 있을까요?',
        time: '7분 전',
        unread: 2,
        fire: 3,
      },
      {
        id: 'th2',
        buyerName: '이*님',
        initials: '이',
        lastMsg: '월 매출 자료 공유 가능한가요?',
        time: '2시간 전',
        unread: 0,
        fire: 2,
      },
      {
        id: 'th3',
        buyerName: '익명 방문자',
        initials: '?',
        lastMsg: '권리금 조정 가능할까요?',
        time: '어제',
        unread: 1,
        fire: 1,
      },
    ],
  },
  {
    propertyId: 't2',
    propertyEmoji: '🍜',
    propertyName: '방이동 분식집',
    threads: [
      {
        id: 'th4',
        buyerName: '박*님',
        initials: '박',
        lastMsg: '언제 방문해서 볼 수 있을까요?',
        time: '3일 전',
        unread: 0,
        fire: 2,
      },
    ],
  },
]

const totalUnread = INBOX.flatMap(p => p.threads).reduce((s, t) => s + t.unread, 0)

// ── 아이콘 ──────────────────────────────────────────────
function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke="#9ca3af" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 20v-7h6v7" stroke="#9ca3af" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke="#9ca3af" strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z"
        stroke="#9ca3af" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5"
        stroke="#9ca3af" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
function MessageIcon({ active }) {
  const c = active ? NAVY : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="4" stroke="#9ca3af" strokeWidth="1.6" />
      <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// ── 메인 ────────────────────────────────────────────────
export default function D4Inbox() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">

      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-5 pt-12 pb-4">
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-gray-900">메시지</h1>
            {totalUnread > 0 && (
              <p className="text-[12px] mt-0.5" style={{ color: NAVY }}>
                읽지 않은 문의 {totalUnread}건
              </p>
            )}
          </div>
          {/* 양도자 칩 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: NAVY }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            양도자
          </div>
        </div>
      </header>

      {/* DM 원칙 안내 배너 */}
      <div className="shrink-0 mx-4 mt-3 mb-1 rounded-xl px-3.5 py-2.5 flex items-center gap-2"
        style={{ backgroundColor: NAVY_BG }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="4" width="10" height="7" rx="1.5" stroke={NAVY} strokeWidth="1.2" />
          <path d="M5 4V3a2 2 0 014 0v1" stroke={NAVY} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p className="text-[11px] font-medium" style={{ color: NAVY }}>
          전화번호는 비공개 — 모든 문의는 DM으로만 시작해요
        </p>
      </div>

      {/* 문의 목록 */}
      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-4" style={{ scrollbarWidth: 'none' }}>
        {INBOX.map(property => (
          <div key={property.propertyId} className="mb-5">

            {/* 매물 섹션 헤더 */}
            <div className="flex items-center gap-2 px-1 py-2 mb-1">
              <span className="text-[16px]">{property.propertyEmoji}</span>
              <p className="text-[13px] font-bold text-gray-700">{property.propertyName}</p>
              <div className="flex-1 h-px bg-gray-100 ml-1" />
              <span className="text-[11px] text-gray-400">
                {property.threads.length}건
              </span>
            </div>

            {/* 스레드 목록 */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {property.threads.map((thread, idx) => (
                <button
                  key={thread.id}
                  onClick={() => navigate(`/d4/chat/${thread.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-all
                    ${idx < property.threads.length - 1 ? 'border-b border-gray-50' : ''}
                    ${thread.unread > 0 ? 'bg-white' : 'bg-gray-50/50'}`}>

                  {/* 아바타 */}
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold text-white relative"
                    style={{ backgroundColor: thread.unread > 0 ? NAVY : '#9ca3af' }}>
                    {thread.initials}
                    {thread.unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                        {thread.unread}
                      </span>
                    )}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-[14px] ${thread.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                        {thread.buyerName}
                      </p>
                      <span className="text-[11px]">{'🔥'.repeat(thread.fire)}</span>
                    </div>
                    <p className={`text-[12px] truncate ${thread.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {thread.lastMsg}
                    </p>
                  </div>

                  {/* 시간 */}
                  <span className="text-[11px] text-gray-400 shrink-0 self-start mt-0.5">
                    {thread.time}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 안내 문구 */}
        <p className="text-center text-[11px] text-gray-300 mt-2">
          모든 문의에 성실히 응답해주세요<br />
          '이 사람으로 정하기' 버튼은 없어요 — 계약은 현실에서 이뤄져요
        </p>
      </main>
      <Toast message={toast} />

      {/* 하단 네비 — 메시지 활성 */}
      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {[
            { label: '홈', Icon: () => <HomeIcon />, onClick: () => navigate('/a7/seller') },
            { label: '탐색', Icon: () => <ExploreIcon />, onClick: () => navigate('/explore') },
            { label: '커뮤니티', Icon: () => <CommunityIcon />, onClick: () => navigate('/community') },
            { label: '메시지', Icon: () => <MessageIcon active />, active: true, onClick: () => {} },
            { label: '마이', Icon: () => <MyIcon />, onClick: () => navigate('/my') },
          ].map(tab => (
            <button key={tab.label}
              onClick={tab.onClick}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95">
              <tab.Icon />
              <span className="text-[10px] font-semibold"
                style={{ color: tab.active ? NAVY : '#9ca3af' }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  )
}
