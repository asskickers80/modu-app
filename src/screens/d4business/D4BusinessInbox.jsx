import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getDeviceId } from '../../lib/supabase'
import { isUnread } from '../../lib/unread'

const PURPLE = '#7d4ba3'
const PURPLE_DEEP = '#2d1a4a'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

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
  const myId = getDeviceId()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()

    // 리얼타임: 새 대화방 또는 마지막 메시지 업데이트 감지
    const channel = supabase
      .channel('d4_business_inbox')
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
    if (!acc[key]) acc[key] = { emoji: conv.listing_emoji ?? '🔨', threads: [] }
    acc[key].threads.push(conv)
    return acc
  }, {})
  const totalCount = conversations.length

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#faf8ff' }}>

      {/* 보라색 헤더 */}
      <header className="shrink-0" style={{ backgroundColor: PURPLE_DEEP }}>
        <div className="flex items-center gap-3 px-5 pt-12 pb-3">
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-white">문의함</h1>
            {totalCount > 0 && (
              <p className="text-[12px] mt-0.5 text-purple-300">문의 {totalCount}건</p>
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

        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-transparent rounded-full animate-spin"
              style={{ borderTopColor: PURPLE }} />
            <p className="text-[13px] text-gray-400">불러오는 중...</p>
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 mt-4">
            <span className="text-[40px]">💬</span>
            <p className="text-[15px] font-bold text-gray-700">받은 문의가 없어요</p>
            <p className="text-[12px] text-gray-400 text-center leading-relaxed">
              노출 페이지를 통해 수요자 문의가 오면<br />여기에 표시돼요
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
            <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
              {group.threads.map((conv, idx) => {
                const isLast = idx === group.threads.length - 1
                const otherName = conv.sender_id === myId
                  ? (conv.receiver_name ?? '상대방')
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
                      style={{ backgroundColor: exchanged ? '#16a34a' : PURPLE }}>
                      {otherName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[14px] font-bold text-gray-900">{otherName}</p>
                        {unread && (
                          <span data-testid="unread-dot"
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: PURPLE }} />
                        )}
                        {exchanged && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                            🤝 매칭 성사
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
            모든 문의에 빠르게 응대할수록 매칭 확률이 높아져요
          </p>
        )}
      </main>

      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {[
            { label: '홈', type: 'home', onClick: () => navigate('/a7/business') },
            { label: '탐색', type: 'explore', onClick: () => navigate('/explore') },
            { label: '커뮤니티', type: 'community', onClick: () => navigate('/community') },
            { label: '메시지', type: 'message', active: true },
            { label: '마이', type: 'my', onClick: () => navigate('/my') },
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
