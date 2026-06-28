import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const SKY = '#2b8ac9'
const SKY_BG = '#eef6fd'
const NAVY = '#1a4d8f'
const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'

const THREADS = {
  sth1: {
    targetName: '임대인 박*', targetColor: TEAL,
    propertyName: '서교동 코너 상가', propertyEmoji: '🏢',
    targetPhone: '010-****-1234', myPhone: '010-9876-****',
    messages: [
      { id: 1, from: 'me', text: '안녕하세요! 서교동 코너 상가 임대 문의드립니다. 카페 창업을 생각 중인데요 😊', time: '오전 10:20', date: '오늘' },
      { id: 2, from: 'other', text: '안녕하세요! 반갑습니다. 어떤 컨셉의 카페를 생각하세요?', time: '오전 10:28' },
      { id: 3, from: 'me', text: '소규모 스페셜티 카페요. 덕트 설치가 가능한지 확인하고 싶어요.', time: '오전 10:32' },
    ],
  },
  sth2: {
    targetName: '양도자 김*', targetColor: NAVY,
    propertyName: '홍대 고양이 카페', propertyEmoji: '🐱',
    targetPhone: '010-****-5678', myPhone: '010-9876-****',
    messages: [
      { id: 1, from: 'me', text: '안녕하세요! 홍대 카페 양도 관련해서 연락드렸어요.', time: '오전 9:00', date: '오늘' },
      { id: 2, from: 'other', text: '안녕하세요! 관심 가져주셔서 감사해요. 어떤 점이 궁금하신가요?', time: '오전 9:15' },
      { id: 3, from: 'me', text: '일 평균 매출과 단골 고객 규모가 궁금합니다.', time: '오전 9:20' },
      { id: 4, from: 'other', text: '일 평균 40만원, 인스타 팔로워 기반 고정 손님이 많아요.', time: '오전 9:35' },
      { id: 5, from: 'me', text: '이번 주말에 방문해서 직접 볼 수 있을까요?', time: '오전 9:50' },
    ],
  },
}

function ExchangeModal({ onConfirm, onCancel, targetName }) {
  const accentColor = '#2b8ac9'
  const accentBg = '#eef6fd'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]"
            style={{ backgroundColor: accentBg }}>📇</div>
          <div>
            <p className="text-[17px] font-bold text-gray-900">연락처 교환 요청</p>
            <p className="text-[12px] text-gray-400 mt-0.5">{targetName}에게 요청을 보냅니다</p>
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
          style={{ backgroundColor: accentColor }}>요청 보내기</button>
        <button onClick={onCancel}
          className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">취소</button>
      </div>
    </div>
  )
}

export default function D4StartupChat() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const thread = THREADS[threadId] || THREADS['sth1']
  const [messages, setMessages] = useState(thread.messages)
  const [input, setInput] = useState('')
  const [exchangeState, setExchangeState] = useState('idle')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, exchangeState])

  const send = () => {
    const t = input.trim()
    if (!t) return
    setMessages(prev => [...prev, { id: Date.now(), from: 'me', text: t, time: '방금' }])
    setInput('')
  }

  const accent = thread.targetColor
  const accentBg = accent === TEAL ? TEAL_BG : accent === NAVY ? '#eef2fb' : SKY_BG

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button onClick={() => navigate('/d4/startup/inbox')}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-bold text-gray-900 truncate">{thread.targetName}</p>
              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: accentBg, color: accent }}>
                🔒 번호 비공개
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{thread.propertyEmoji} {thread.propertyName}</p>
          </div>
        </div>
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: accentBg }}>
          <p className="text-[11px] font-medium flex-1" style={{ color: accent }}>대화 중 · 번호는 비공개예요 — 연락처 교환 시 양측 동시 공개</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>
        {messages.map((msg, idx) => {
          const isMe = msg.from === 'me'
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
              <div className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white mr-2 mt-1 shrink-0"
                    style={{ backgroundColor: accent }}>
                    {thread.targetName[0]}
                  </div>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="max-w-[240px] px-3.5 py-2.5"
                    style={{
                      backgroundColor: isMe ? SKY : '#f3f4f6',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}>
                    <p className="text-[14px] leading-relaxed" style={{ color: isMe ? 'white' : '#111827' }}>{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 mx-1">{msg.time}</span>
                </div>
              </div>
            </div>
          )
        })}

        {exchangeState === 'pending' && (
          <div className="mx-4 mb-3 rounded-2xl border-2 p-4" style={{ borderColor: SKY + '40', backgroundColor: SKY_BG }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: SKY }} />
              <p className="text-[13px] font-bold" style={{ color: SKY }}>연락처 교환 요청 보냄</p>
            </div>
            <p className="text-[12px] text-gray-500 mb-3">상대방이 수락하면 양쪽 번호가 동시에 공개됩니다.</p>
            <button onClick={() => setExchangeState('accepted')}
              className="w-full py-2 rounded-xl text-[12px] font-bold border-2"
              style={{ borderColor: SKY, color: SKY, backgroundColor: 'white' }}>
              🧪 더미: 상대방이 수락했어요 (데모 버튼)
            </button>
          </div>
        )}

        {exchangeState === 'accepted' && (
          <div className="mx-4 my-3 rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#16a34a40' }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: '#f0fdf4' }}>
              <span>🤝</span>
              <p className="text-[12px] font-bold text-green-700">연락처가 교환됐어요</p>
            </div>
            <div className="px-4 py-3.5 bg-white flex gap-4">
              <div className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: accentBg }}>
                <p className="text-[10px] text-gray-400 mb-1">{thread.targetName}</p>
                <p className="text-[15px] font-bold tracking-wide" style={{ color: accent }}>{thread.targetPhone}</p>
              </div>
              <div className="flex-1 rounded-xl px-3 py-2.5 bg-gray-50">
                <p className="text-[10px] text-gray-400 mb-1">내 번호 (상대 공개)</p>
                <p className="text-[15px] font-bold tracking-wide text-gray-700">{thread.myPhone}</p>
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
              style={{ borderColor: SKY + '50', color: SKY, backgroundColor: SKY_BG }}>
              📇 연락처 교환 요청 <span className="text-[10px] opacity-70">(양측 합의 필요)</span>
            </button>
          </div>
        )}
        {exchangeState === 'accepted' && (
          <div className="px-4 pt-3">
            <div className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center"
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
            style={{ backgroundColor: input.trim() ? SKY : '#e5e7eb' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9l14-7-7 14V9H2z" fill={input.trim() ? 'white' : '#9ca3af'} />
            </svg>
          </button>
        </div>
      </div>

      {exchangeState === 'confirming' && (
        <ExchangeModal targetName={thread.targetName}
          onConfirm={() => setExchangeState('pending')}
          onCancel={() => setExchangeState('idle')} />
      )}
    </div>
  )
}
