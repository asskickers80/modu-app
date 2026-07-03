import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'
import { supabase, getDeviceId } from '../../lib/supabase'
import { markConversationSeen } from '../../lib/unread'
import ModuSpinner from '../../components/ModuSpinner'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

function timeLabel(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function dateLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return '오늘'
  if (d.toDateString() === yesterday.toDateString()) return '어제'
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

// ── 연락처 교환 확인 모달 ──────────────────────────────────
function ExchangeConfirmModal({ onConfirm, onCancel, otherName }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]"
            style={{ backgroundColor: NAVY_BG }}>📇</div>
          <div>
            <p className="text-[17px] font-bold text-gray-900">연락처 교환 요청</p>
            <p className="text-[12px] text-gray-400 mt-0.5">{otherName}에게 요청을 보냅니다</p>
          </div>
        </div>
        <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: '#fff8e1' }}>
          <p className="text-[13px] font-bold text-amber-700 mb-2">⚠️ 교환 전에 꼭 확인하세요</p>
          <ul className="space-y-1.5">
            {[
              '교환하면 양쪽 모두 전화번호가 공개됩니다',
              '상대방이 수락해야만 공개돼요 (일방 공개 불가)',
              '거절하면 교환이 취소되고 번호는 공개되지 않아요',
            ].map(txt => (
              <li key={txt} className="flex items-start gap-2 text-[12px] text-amber-800">
                <span className="shrink-0 mt-0.5">•</span>{txt}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={onConfirm}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white mb-2.5"
          style={{ backgroundColor: NAVY }}>
          요청 보내기
        </button>
        <button onClick={onCancel}
          className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">
          취소
        </button>
      </div>
    </div>
  )
}

// ── 수락 대기 중 배너 ────────────────────────────────────
function PendingBanner({ onSimulate }) {
  return (
    <div className="mx-4 mb-3 rounded-2xl border-2 p-4"
      style={{ borderColor: NAVY + '40', backgroundColor: NAVY_BG }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: NAVY }} />
        <p className="text-[13px] font-bold" style={{ color: NAVY }}>연락처 교환 요청 보냄</p>
      </div>
      <p className="text-[12px] text-gray-500 mb-3">
        상대방이 수락하면 양쪽 번호가 동시에 공개됩니다.
      </p>
      <button onClick={onSimulate}
        className="w-full py-2 rounded-xl text-[12px] font-bold border-2 transition-all"
        style={{ borderColor: NAVY, color: NAVY, backgroundColor: 'white' }}>
        🧪 더미: 상대방이 수락했어요 (데모 버튼)
      </button>
    </div>
  )
}

// ── 교환 완료 카드 ──────────────────────────────────────
function ExchangedCard({ senderName }) {
  return (
    <div className="shrink-0 border-b-2 overflow-hidden" style={{ borderColor: '#16a34a30' }}>
      <div className="px-5 py-2.5 flex items-center gap-2" style={{ backgroundColor: '#f0fdf4' }}>
        <span className="text-[14px]">🤝</span>
        <p className="text-[13px] font-bold text-green-700 flex-1">연락처가 교환됐어요</p>
        <span className="text-[10px] text-green-500 font-medium">양측 동시 공개</span>
      </div>
      <div className="px-5 py-3 bg-white">
        <p className="text-[12px] text-gray-500">{senderName} 님과 연락처가 공개되었습니다.</p>
      </div>
      <p className="text-[10px] text-gray-400 text-center pb-2">
        ⓘ 교환 기록은 앱에 남아요 · DM도 계속 이용 가능합니다
      </p>
    </div>
  )
}

// ── 메인 ────────────────────────────────────────────────
export default function D4Chat() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const myId = getDeviceId()

  const [conv, setConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [exchangeState, setExchangeState] = useState('idle') // idle | confirming | pending | accepted
  const [showMore, setShowMore] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const { toast, showToast } = useToast()

  useEffect(() => {
    loadData()

    // 리얼타임: 새 메시지 구독
    const channel = supabase
      .channel(`chat_${threadId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${threadId}` },
        (payload) => {
          markConversationSeen(threadId) // 보고 있는 중 수신 → 즉시 열람 처리
          setMessages(prev => {
            // 이미 낙관적으로 추가된 메시지면 중복 방지
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${threadId}` },
        (payload) => {
          setConv(payload.new)
          if (payload.new.contact_status === 'accepted') setExchangeState('accepted')
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [threadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, exchangeState])

  async function loadData() {
    const [{ data: convData }, { data: msgData }] = await Promise.all([
      supabase.from('conversations').select('*').eq('id', threadId).single(),
      supabase.from('messages').select('*').eq('conversation_id', threadId).order('created_at'),
    ])
    if (convData) {
      setConv(convData)
      if (convData.contact_status === 'accepted') setExchangeState('accepted')
      else if (convData.contact_status === 'requested' && convData.contact_requester === myId) {
        setExchangeState('pending')
      }
    }
    if (msgData) setMessages(msgData)
    setLoading(false)
    markConversationSeen(threadId) // 대화 진입 = 읽음
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')

    // 낙관적 업데이트 (즉시 화면에 표시)
    const optimistic = { id: `opt_${Date.now()}`, conversation_id: threadId, sender_id: myId, content: text, type: 'text', created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])

    try {
      const { data: newMsg, error } = await supabase
        .from('messages')
        .insert({ conversation_id: threadId, sender_id: myId, content: text, type: 'text' })
        .select()
        .single()

      if (error) throw error

      // 낙관적 메시지를 실제 메시지로 교체
      setMessages(prev => prev.map(m => m.id === optimistic.id ? newMsg : m))

      // 대화방 last_message 업데이트
      await supabase.from('conversations').update({
        last_message: text,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', threadId)

      // 내가 보낸 메시지는 안읽음 대상이 아님 — 갱신된 last_message_at 이후로 열람 처리
      markConversationSeen(threadId)

    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      showToast('메시지 전송 실패. 다시 시도해주세요.')
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleExchangeConfirm = async () => {
    setExchangeState('pending')
    await supabase.from('conversations').update({
      contact_status: 'requested',
      contact_requester: myId,
    }).eq('id', threadId)
    // 시스템 메시지
    await supabase.from('messages').insert({
      conversation_id: threadId,
      sender_id: myId,
      content: '📇 연락처 교환을 요청했습니다. 상대방의 수락을 기다리는 중이에요.',
      type: 'contact_request',
    })
    loadData()
  }

  const handleExchangeSimulate = async () => {
    setExchangeState('accepted')
    await supabase.from('conversations').update({ contact_status: 'accepted' }).eq('id', threadId)
    await supabase.from('messages').insert({
      conversation_id: threadId,
      sender_id: 'system',
      content: '🤝 연락처 교환이 완료됐습니다. 양쪽 번호가 공개되었어요.',
      type: 'contact_accepted',
    })
    loadData()
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-white">
        <ModuSpinner size={64} />
        <p className="text-[13px] text-gray-400">대화 불러오는 중...</p>
      </div>
    )
  }

  if (!conv) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-white px-8">
        <span className="text-[40px]">😅</span>
        <p className="text-[15px] font-bold text-gray-700">대화를 찾을 수 없어요</p>
        <button onClick={() => navigate('/d4/inbox')}
          className="mt-2 px-6 py-3 rounded-2xl text-[14px] font-bold text-white"
          style={{ backgroundColor: NAVY }}>
          받은 메시지함으로
        </button>
      </div>
    )
  }

  const otherName = conv.sender_id === myId ? (conv.receiver_name ?? '양도자') : (conv.sender_name ?? '문의자')
  const iAmSender = conv.sender_id === myId

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">

      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button onClick={() => navigate('/d4/inbox')}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f3f4f6' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#374151" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-bold text-gray-900 truncate">{otherName}</p>
              {exchangeState === 'accepted' ? (
                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                  📇 연락처 교환됨
                </span>
              ) : (
                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: NAVY_BG, color: NAVY }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <rect x="1.5" y="4" width="7" height="5" rx="1" stroke={NAVY} strokeWidth="1" />
                    <path d="M3 4V3a2 2 0 014 0v1" stroke={NAVY} strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  번호 비공개
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
              {conv.listing_emoji} {conv.listing_name}
            </p>
          </div>

          <button onClick={() => setShowMore(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f3f4f6' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="3" r="1.2" fill="#6b7280" />
              <circle cx="8" cy="8" r="1.2" fill="#6b7280" />
              <circle cx="8" cy="13" r="1.2" fill="#6b7280" />
            </svg>
          </button>
        </div>

        {exchangeState !== 'accepted' && (
          <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: NAVY_BG }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1" y="3.5" width="11" height="7.5" rx="1.5" stroke={NAVY} strokeWidth="1.2" />
              <path d="M4 3.5V2.5a2.5 2.5 0 015 0v1" stroke={NAVY} strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] font-medium flex-1" style={{ color: NAVY }}>
              대화 중 · 번호는 비공개예요 — 연락처 교환 시 양측 동시 공개
            </p>
          </div>
        )}
      </header>

      {/* 교환 완료 카드 */}
      {exchangeState === 'accepted' && <ExchangedCard senderName={conv.sender_name ?? '문의자'} />}

      {/* 메시지 영역 */}
      <main className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-[13px] text-gray-400">아직 메시지가 없어요</p>
            <p className="text-[12px] text-gray-300">첫 메시지를 보내보세요 👋</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === myId
          const isSystem = msg.sender_id === 'system'
          const msgDate = dateLabel(msg.created_at)
          const prevDate = idx > 0 ? dateLabel(messages[idx - 1]?.created_at) : null
          const showDate = msgDate && msgDate !== prevDate

          if (isSystem) {
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[11px] text-gray-400 font-medium">{msgDate}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                )}
                <div className="flex justify-center my-3">
                  <span className="text-[11px] text-gray-400 px-3 py-1 rounded-full bg-gray-50">
                    {msg.content}
                  </span>
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] text-gray-400 font-medium">{msgDate}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}

              <div className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white mr-2 mt-1 shrink-0"
                    style={{ backgroundColor: '#6b7280' }}>
                    {otherName[0]}
                  </div>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="max-w-[240px] px-3.5 py-2.5"
                    style={{
                      backgroundColor: isMe ? NAVY : '#f3f4f6',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}>
                    <p className="text-[14px] leading-relaxed"
                      style={{ color: isMe ? 'white' : '#111827' }}>
                      {msg.content}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 mx-1">
                    {timeLabel(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {exchangeState === 'pending' && (
          <PendingBanner onSimulate={handleExchangeSimulate} />
        )}

        {exchangeState === 'accepted' && (
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-green-100" />
            <span className="text-[11px] text-green-500 font-medium">🤝 연락처 교환 완료</span>
            <div className="flex-1 h-px bg-green-100" />
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* 하단 입력 영역 */}
      <div className="shrink-0 bg-white border-t border-gray-100">

        {exchangeState === 'idle' && (
          <div className="px-4 pt-3">
            <button
              onClick={() => setExchangeState('confirming')}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold border-2 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              style={{ borderColor: NAVY + '50', color: NAVY, backgroundColor: NAVY_BG }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="4" width="13" height="8" rx="1.5" stroke={NAVY} strokeWidth="1.3" />
                <path d="M5 4V3a2.5 2.5 0 015 0v1" stroke={NAVY} strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              📇 연락처 교환 요청
              <span className="text-[10px] font-medium opacity-70">(양측 합의 필요)</span>
            </button>
          </div>
        )}

        {exchangeState === 'accepted' && (
          <div className="px-4 pt-3">
            <div className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2"
              style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              ✅ 연락처 교환 완료
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 px-4 py-3">
          <div className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 flex items-center"
            style={{ minHeight: '44px' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력..."
              rows={1}
              className="flex-1 resize-none text-[14px] text-gray-900 placeholder-gray-400 outline-none bg-transparent leading-relaxed"
              style={{ maxHeight: '100px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
            style={{ backgroundColor: input.trim() && !sending ? NAVY : '#e5e7eb' }}>
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9l14-7-7 14V9H2z" fill={input.trim() ? 'white' : '#9ca3af'} />
              </svg>
            )}
          </button>
        </div>
      </div>

      {exchangeState === 'confirming' && (
        <ExchangeConfirmModal
          otherName={otherName}
          onConfirm={handleExchangeConfirm}
          onCancel={() => setExchangeState('idle')}
        />
      )}

      <Toast message={toast} />

      {showMore && (
        <div className="absolute inset-0 z-50" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-3 pb-8"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[14px] font-bold text-gray-900 mb-4">{otherName} 님과의 대화</p>
            {[
              { icon: '🚫', label: '대화 차단', action: () => { setShowMore(false); showToast('차단 기능 준비 중이에요 🚧') } },
              { icon: '⚠️', label: '신고하기', action: () => { setShowMore(false); showToast('신고 기능 준비 중이에요 🚧') } },
              { icon: '🗑️', label: '대화 삭제', action: () => { setShowMore(false); showToast('삭제 기능 준비 중이에요 🚧') } },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0 text-left active:bg-gray-50">
                <span className="text-[20px] w-8 text-center">{item.icon}</span>
                <span className="text-[14px] font-medium text-gray-800">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
