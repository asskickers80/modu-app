import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'

const THREADS = {
  lth1: {
    tenantName: '예비창업자 김*', propertyName: '서교동 코너 상가', propertyEmoji: '🏢',
    tenantPhone: '010-9876-****', landlordPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'tenant', text: '안녕하세요! 서교동 코너 상가 문의드려요 😊', time: '오전 10:10', date: '오늘' },
      { id: 2, from: 'landlord', text: '안녕하세요! 반갑습니다. 어떤 업종으로 창업 생각하세요?', time: '오전 10:14' },
      { id: 3, from: 'tenant', text: '카페 창업을 생각 중인데요. 주방 덕트 설치 가능한 구조인가요?', time: '오전 10:16' },
      { id: 4, from: 'landlord', text: '덕트는 별도 공사가 필요해요. 건물 외벽까지 빼는 건 허용됩니다. 이전 임차인이 카페였어서 일부 배선은 남아 있어요.', time: '오전 10:20' },
      { id: 5, from: 'tenant', text: '혹시 이번 주 방문해서 직접 볼 수 있을까요?', time: '오전 10:32' },
    ],
  },
  lth2: {
    tenantName: '이*님', propertyName: '서교동 코너 상가', propertyEmoji: '🏢',
    tenantPhone: '010-5555-****', landlordPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'tenant', text: '임대 기간은 최소 몇 년인가요?', time: '오전 9:00', date: '오늘' },
      { id: 2, from: 'landlord', text: '기본 2년 계약이고 연장 협의 가능해요.', time: '오전 9:10' },
    ],
  },
  lth3: {
    tenantName: '박*님', propertyName: '연남동 단독상가', propertyEmoji: '🏬',
    tenantPhone: '010-7777-****', landlordPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'tenant', text: '내부 사진 더 보내주실 수 있나요?', time: '2일 전', date: '2일 전' },
      { id: 2, from: 'landlord', text: '네, 별도로 더 찍어서 보내드릴게요!', time: '2일 전' },
    ],
  },
}

function ExchangeModal({ onConfirm, onCancel, tenantName }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]"
            style={{ backgroundColor: TEAL_BG }}>📇</div>
          <div>
            <p className="text-[17px] font-bold text-gray-900">연락처 교환 요청</p>
            <p className="text-[12px] text-gray-400 mt-0.5">{tenantName}에게 요청을 보냅니다</p>
          </div>
        </div>
        <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: '#fff8e1' }}>
          <p className="text-[13px] font-bold text-amber-700 mb-2">⚠️ 교환 전에 꼭 확인하세요</p>
          <ul className="space-y-1.5">
            {['교환하면 양쪽 모두 전화번호가 공개됩니다', '상대방이 수락해야만 공개돼요 (일방 공개 불가)', '거절하면 교환이 취소되고 번호는 공개되지 않아요'].map(t => (
              <li key={t} className="flex items-start gap-2 text-[12px] text-amber-800">
                <span className="shrink-0 mt-0.5">•</span>{t}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={onConfirm}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white mb-2.5"
          style={{ backgroundColor: TEAL }}>요청 보내기</button>
        <button onClick={onCancel}
          className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">취소</button>
      </div>
    </div>
  )
}

export default function D4LandlordChat() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const thread = THREADS[threadId] || THREADS['lth1']
  const [messages, setMessages] = useState(thread.messages)
  const [input, setInput] = useState('')
  const [exchangeState, setExchangeState] = useState('idle')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, exchangeState])

  const send = () => {
    const t = input.trim()
    if (!t) return
    setMessages(prev => [...prev, { id: Date.now(), from: 'landlord', text: t, time: '방금' }])
    setInput('')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button onClick={() => navigate('/d4/landlord/inbox')}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-bold text-gray-900 truncate">{thread.tenantName}</p>
              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: TEAL_BG, color: TEAL }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="1.5" y="4" width="7" height="5" rx="1" stroke={TEAL} strokeWidth="1" />
                  <path d="M3 4V3a2 2 0 014 0v1" stroke={TEAL} strokeWidth="1" strokeLinecap="round" />
                </svg>
                번호 비공개
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{thread.propertyEmoji} {thread.propertyName}</p>
          </div>
        </div>
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: TEAL_BG }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1" y="3.5" width="11" height="7.5" rx="1.5" stroke={TEAL} strokeWidth="1.2" />
            <path d="M4 3.5V2.5a2.5 2.5 0 015 0v1" stroke={TEAL} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <p className="text-[11px] font-medium flex-1" style={{ color: TEAL }}>대화 중 · 번호는 비공개예요</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>
        {messages.map((msg, idx) => {
          const isLandlord = msg.from === 'landlord'
          const showDate = msg.date && (idx === 0 || messages[idx - 1]?.date !== msg.date)
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] text-gray-400">{msg.date}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}
              <div className={`flex mb-2 ${isLandlord ? 'justify-end' : 'justify-start'}`}>
                {!isLandlord && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white mr-2 mt-1 shrink-0"
                    style={{ backgroundColor: '#6b7280' }}>
                    {thread.tenantName[0]}
                  </div>
                )}
                <div className={`flex flex-col ${isLandlord ? 'items-end' : 'items-start'}`}>
                  <div className="max-w-[240px] px-3.5 py-2.5"
                    style={{
                      backgroundColor: isLandlord ? TEAL : '#f3f4f6',
                      borderRadius: isLandlord ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}>
                    <p className="text-[14px] leading-relaxed" style={{ color: isLandlord ? 'white' : '#111827' }}>{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 mx-1">{msg.time}</span>
                </div>
              </div>
            </div>
          )
        })}

        {exchangeState === 'pending' && (
          <div className="mx-4 mb-3 rounded-2xl border-2 p-4" style={{ borderColor: TEAL + '40', backgroundColor: TEAL_BG }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: TEAL }} />
              <p className="text-[13px] font-bold" style={{ color: TEAL }}>연락처 교환 요청 보냄</p>
            </div>
            <p className="text-[12px] text-gray-500 mb-3">상대방이 수락하면 양쪽 번호가 동시에 공개됩니다.</p>
            <button onClick={() => setExchangeState('accepted')}
              className="w-full py-2 rounded-xl text-[12px] font-bold border-2"
              style={{ borderColor: TEAL, color: TEAL, backgroundColor: 'white' }}>
              🧪 더미: 상대방이 수락했어요 (데모 버튼)
            </button>
          </div>
        )}

        {exchangeState === 'accepted' && (
          <div className="mx-4 my-3 rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#16a34a40' }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: '#f0fdf4' }}>
              <span className="text-[14px]">🤝</span>
              <p className="text-[12px] font-bold text-green-700">연락처가 교환됐어요</p>
            </div>
            <div className="px-4 py-3.5 bg-white flex gap-4">
              <div className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: TEAL_BG }}>
                <p className="text-[10px] text-gray-400 mb-1">{thread.tenantName}</p>
                <p className="text-[15px] font-bold tracking-wide" style={{ color: TEAL }}>{thread.tenantPhone}</p>
              </div>
              <div className="flex-1 rounded-xl px-3 py-2.5 bg-gray-50">
                <p className="text-[10px] text-gray-400 mb-1">내 번호 (상대 공개)</p>
                <p className="text-[15px] font-bold tracking-wide text-gray-700">{thread.landlordPhone}</p>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <div className="shrink-0 bg-white border-t border-gray-100">
        {exchangeState === 'idle' && (
          <div className="px-4 pt-3">
            <button onClick={() => setExchangeState('confirming')}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold border-2 flex items-center justify-center gap-2"
              style={{ borderColor: TEAL + '50', color: TEAL, backgroundColor: TEAL_BG }}>
              📇 연락처 교환 요청 <span className="text-[10px] opacity-70">(양측 합의 필요)</span>
            </button>
          </div>
        )}
        {exchangeState === 'accepted' && (
          <div className="px-4 pt-3">
            <div className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2"
              style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>✅ 연락처 교환 완료</div>
          </div>
        )}
        <div className="flex items-end gap-2 px-4 py-3">
          <div className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 flex items-center" style={{ minHeight: '44px' }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="메시지 입력..." rows={1}
              className="flex-1 resize-none text-[14px] text-gray-900 placeholder-gray-400 outline-none bg-transparent leading-relaxed"
              style={{ maxHeight: '100px' }} />
          </div>
          <button onClick={send} disabled={!input.trim()}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: input.trim() ? TEAL : '#e5e7eb' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9l14-7-7 14V9H2z" fill={input.trim() ? 'white' : '#9ca3af'} />
            </svg>
          </button>
        </div>
      </div>

      {exchangeState === 'confirming' && (
        <ExchangeModal tenantName={thread.tenantName}
          onConfirm={() => setExchangeState('pending')}
          onCancel={() => setExchangeState('idle')} />
      )}
    </div>
  )
}
