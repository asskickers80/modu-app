import { useState, useEffect } from 'react'
import { timeAgo } from '../../lib/time'
import { useNavigate } from 'react-router-dom'
import { supabase, getDeviceId } from '../../lib/supabase'
import { isUnread } from '../../lib/unread'

const GREEN = '#2d7a4f'
const GREEN_BG = '#edf7f1'

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
  const myId = getDeviceId()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()

    // 리얼타임: 새 대화방 또는 마지막 메시지 업데이트 감지
    const channel = supabase
      .channel('d4_operating_inbox')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => loadConversations()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
      .order('last_message_at', { ascending: false, nullsLast: true })

    if (!error) setConversations(data ?? [])
    setLoading(false)
  }

  // listing_name 기준으로 그룹핑
  const grouped = conversations.reduce((acc, conv) => {
    const key = conv.listing_name ?? '기타'
    if (!acc[key]) acc[key] = { emoji: conv.listing_emoji ?? '🔧', threads: [] }
    acc[key].threads.push(conv)
    return acc
  }, {})
  const totalCount = conversations.length

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-5 pt-12 pb-4">
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-gray-900">메시지</h1>
            {totalCount > 0 && (
              <p className="text-[12px] mt-0.5" style={{ color: GREEN }}>문의 {totalCount}건</p>
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

        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-transparent rounded-full animate-spin"
              style={{ borderTopColor: GREEN }} />
            <p className="text-[13px] text-gray-400">불러오는 중...</p>
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 mt-4">
            <span className="text-[40px]">💬</span>
            <p className="text-[15px] font-bold text-gray-700">보낸 문의가 없어요</p>
            <p className="text-[12px] text-gray-400 text-center leading-relaxed">
              업체 탭에서 문의를 시작하면<br />여기에 표시돼요
            </p>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([listingName, group]) => (
          <div key={listingName} className="mb-5">
            <div className="flex items-center gap-2 px-1 py-2 mb-1">
              <span className="text-[16px]">{group.emoji}</span>
              <p className="text-[13px] font-bold text-gray-700">{listingName}</p>
              <div className="flex-1 h-px bg-gray-100 ml-1" />
              <span className="text-[11px] text-gray-400">{group.threads.length}건</span>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {group.threads.map((conv, idx) => {
                const isLast = idx === group.threads.length - 1
                const otherName = conv.sender_id === myId
                  ? (conv.receiver_name ?? '업체')
                  : (conv.sender_name ?? '문의자')
                const exchanged = conv.contact_status === 'accepted'
                const unread = isUnread(conv)
                return (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/d4/chat/${conv.id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-all bg-white
                      ${!isLast ? 'border-b border-gray-50' : ''}`}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold text-white relative"
                      style={{ backgroundColor: exchanged ? '#16a34a' : GREEN }}>
                      {otherName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[14px] font-bold text-gray-900">{otherName}</p>
                        {unread && (
                          <span data-testid="unread-dot"
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: GREEN }} />
                        )}
                        {exchanged && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                            📇 연락처 교환됨
                          </span>
                        )}
                      </div>
                      <p className={`text-[12px] truncate ${unread ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                        {conv.last_message ?? '대화를 시작해보세요'}
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0 self-start mt-0.5">
                      {timeAgo(conv.last_message_at)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {!loading && conversations.length > 0 && (
          <p className="text-center text-[11px] text-gray-300 mt-2">
            업체 탭에서 새 문의를 시작할 수 있어요
          </p>
        )}
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
