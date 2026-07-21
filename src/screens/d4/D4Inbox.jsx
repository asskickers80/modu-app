import { useState, useEffect } from 'react'
import { timeAgo } from '../../lib/time'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'
import { supabase, getDeviceId } from '../../lib/supabase'
import { otherPartyName } from '../../lib/conversation'
import { isUnread } from '../../lib/unread'
import UnreadDot from '../../components/UnreadDot'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

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

export default function D4Inbox() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()

    // 리얼타임: 새 대화방 또는 마지막 메시지 업데이트 감지
    const channel = supabase
      .channel('d4_inbox')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => loadConversations()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadConversations() {
    const myId = getDeviceId()
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
    if (!acc[key]) acc[key] = { emoji: conv.listing_emoji ?? '🏪', threads: [] }
    acc[key].threads.push(conv)
    return acc
  }, {})
  const totalCount = conversations.length

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-5 pt-12 pb-4">
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-gray-900">메시지</h1>
            {totalCount > 0 && (
              <p className="text-[12px] mt-0.5" style={{ color: NAVY }}>
                대화 {totalCount}건
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: NAVY }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            양도인
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

      {/* 목록 */}
      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-4" style={{ scrollbarWidth: 'none' }}>

        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-transparent rounded-full animate-spin"
              style={{ borderTopColor: NAVY }} />
            <p className="text-[13px] text-gray-400">불러오는 중...</p>
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 mt-4">
            <span className="text-[40px]">💬</span>
            <p className="text-[15px] font-bold text-gray-700">아직 문의가 없어요</p>
            <p className="text-[12px] text-gray-400 text-center leading-relaxed">
              매물 상세에서 "DM으로 문의하기"를<br />누르면 대화가 시작돼요
            </p>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([listingName, group]) => (
          <div key={listingName} className="mb-5">

            {/* 매물 섹션 헤더 */}
            <div className="flex items-center gap-2 px-1 py-2 mb-1">
              <span className="text-[16px]">{group.emoji}</span>
              <p className="text-[13px] font-bold text-gray-700">{listingName}</p>
              <div className="flex-1 h-px bg-gray-100 ml-1" />
              <span className="text-[11px] text-gray-400">{group.threads.length}건</span>
            </div>

            {/* 대화 목록 */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {group.threads.map((conv, idx) => {
                const isLast = idx === group.threads.length - 1
                const otherName = otherPartyName(conv)
                const initials = otherName[0] ?? '?'
                const exchanged = conv.contact_status === 'accepted'
                const unread = isUnread(conv)
                return (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/d4/chat/${conv.id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-all bg-white
                      ${!isLast ? 'border-b border-gray-50' : ''}`}>

                    {/* 아바타 */}
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold text-white relative"
                      style={{ backgroundColor: exchanged ? '#16a34a' : NAVY }}>
                      {initials}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[14px] font-bold text-gray-900">
                          {otherName}
                        </p>
                        {unread && (
                          <UnreadDot testId="unread-dot"
                            className="w-2 h-2 rounded-full shrink-0"
                            color={NAVY} />
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

                    {/* 시간 */}
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
            모든 문의에 성실히 응답해주세요<br />
            '이 사람으로 정하기' 버튼은 없어요 — 계약은 현실에서 이뤄져요
          </p>
        )}
      </main>

      <Toast message={toast} />

      {/* 하단 네비 */}
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
