import { useState, useEffect } from 'react'
import BottomNav from '../../components/BottomNav'
import { timeAgo } from '../../lib/time'
import { useNavigate } from 'react-router-dom'
import { supabase, getDeviceId } from '../../lib/supabase'
import { isUnread } from '../../lib/unread'
import UnreadDot from '../../components/UnreadDot'
import { viewerIsInquirer } from '../../lib/conversation'
import { fetchLedgerByConversations, updateInquiryStatus } from '../../lib/inquiryLedger'
import { logEvent } from '../../lib/eventLog'

const PURPLE = '#7d4ba3'
const PURPLE_DEEP = '#2d1a4a'

export default function D4BusinessInbox() {
  const navigate = useNavigate()
  const myId = getDeviceId()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  // 문의 원장(inquiry_ledger) — 대화방별 출처·상태. 라벨만 붙이고 순서는 바꾸지 않는다 (파트 B4)
  const [ledger, setLedger] = useState({})
  const [outcome, setOutcome] = useState({}) // 이 화면에서 고른 칩 (closed 는 '성사'와 '해당 없음' 둘 다라 구분용)

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
    if (!error) fetchLedgerByConversations((data ?? []).map(c => c.id)).then(setLedger)
  }

  // 결과 표시 칩 — 선택 사항, 강제 아님. 답했어요→replied / 성사됐어요→closed / 해당 없음→closed(이벤트로 구분)
  const OUTCOMES = [
    { key: 'replied', label: '답했어요', status: 'replied' },
    { key: 'closed', label: '성사됐어요', status: 'closed' },
    { key: 'not_applicable', label: '해당 없음', status: 'closed' },
  ]
  const markOutcome = async (convId, entry, o) => {
    setOutcome(prev => ({ ...prev, [convId]: o.key }))
    const r = await updateInquiryStatus(entry.id, o.status)
    if (r.ok) setLedger(prev => ({ ...prev, [convId]: { ...entry, status: o.status } }))
    logEvent('vendor_inquiry_status', { vendor_id: entry.vendor_id ?? null, status: o.key })
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
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 보라색 헤더 */}
      <header className="shrink-0" style={{ backgroundColor: PURPLE_DEEP }}>
        <div className="flex items-center gap-3 px-5 pt-12 pb-3">
          <div className="flex-1">
            <h1 className="text-t20 font-bold text-white">문의함</h1>
            {totalCount > 0 && (
              <p className="text-t12 mt-0.5 text-purple-300">문의 {totalCount}건</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-t11 font-bold border border-purple-500/30"
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
          <p className="text-t11 font-medium text-purple-200">
            앱 내 문의가 기본 — 번호를 등록하면 전화 문의도 함께 받아요
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-3 pb-4" style={{ scrollbarWidth: 'none' }}>

        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-transparent rounded-full animate-spin"
              style={{ borderTopColor: PURPLE }} />
            <p className="text-t13 text-gray-400">불러오는 중...</p>
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 mt-4">
            <span className="text-[40px]">💬</span>
            <p className="text-t15 font-bold text-gray-700">받은 문의가 없어요</p>
            <p className="text-t12 text-gray-400 text-center leading-relaxed">
              노출 페이지를 통해 수요자 문의가 오면<br />여기에 표시돼요
            </p>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([listingName, group]) => (
          <div key={listingName} className="mb-5">
            <div className="flex items-center gap-2 px-1 py-2 mb-1">
              <span className="text-t16">{group.emoji}</span>
              <p className="text-t13 font-bold text-gray-700">{listingName}</p>
              <div className="flex-1 h-px bg-gray-100 ml-1" />
              <span className="text-t11 text-gray-400">{group.threads.length}건</span>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
              {group.threads.map((conv, idx) => {
                const isLast = idx === group.threads.length - 1
                const otherName = viewerIsInquirer(conv)
                  ? (conv.receiver_name ?? '상대방')
                  : (conv.sender_name ?? '문의자')
                const exchanged = conv.contact_status === 'accepted'
                const unread = isUnread(conv)
                const entry = ledger[conv.id] ?? null
                const picked = outcome[conv.id] ?? (entry?.status === 'replied' ? 'replied' : entry?.status === 'closed' ? 'closed' : null)
                return (
                  <div key={conv.id} className={`bg-white ${!isLast ? 'border-b border-gray-50' : ''}`} data-testid="business-inquiry-row">
                  <button
                    onClick={() => navigate(`/d4/chat/${conv.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-all">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-t15 font-bold text-white relative"
                      style={{ backgroundColor: exchanged ? '#16a34a' : PURPLE }}>
                      {otherName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-t14 font-bold text-gray-900">{otherName}</p>
                        {entry?.source === 'sales_card' && (
                          <span className="text-t10 px-1.5 py-0.5 rounded-full font-bold" data-testid="inquiry-source-label"
                            style={{ backgroundColor: '#edf7f1', color: '#2d7a4f' }}>
                            매출 상황에서 온 문의
                          </span>
                        )}
                        {unread && (
                          <UnreadDot testId="unread-dot"
                            className="w-2 h-2 rounded-full shrink-0"
                            color={PURPLE} />
                        )}
                        {exchanged && (
                          <span className="text-t10 px-1.5 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                            🤝 매칭 성사
                          </span>
                        )}
                      </div>
                      <p className={`text-t12 truncate ${unread ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                        {conv.last_message ?? '대화를 시작해보세요'}
                      </p>
                    </div>
                    <span className="text-t11 text-gray-400 shrink-0 self-start mt-0.5">
                      {timeAgo(conv.last_message_at)}
                    </span>
                  </button>
                  {entry && (
                    <div className="flex gap-1.5 px-4 pb-3" data-testid="inquiry-outcome-chips">
                      {OUTCOMES.map(o => (
                        <button key={o.key} type="button" onClick={() => markOutcome(conv.id, entry, o)}
                          data-testid={`inquiry-outcome-${o.key}`}
                          className="px-2.5 py-1.5 rounded-full text-t11 font-semibold border min-h-9"
                          style={picked === o.key
                            ? { backgroundColor: PURPLE, color: 'white', borderColor: PURPLE }
                            : { backgroundColor: 'white', color: '#4b5563', borderColor: '#e5e7eb' }}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {!loading && conversations.length > 0 && (
          <p className="text-center text-t11 text-gray-300 mt-2">
            모든 문의에 빠르게 응대할수록 매칭 확률이 높아져요
          </p>
        )}
      </main>

      <BottomNav active="message" accent={PURPLE} homePath="/a7/business" />
    </div>
  )
}
