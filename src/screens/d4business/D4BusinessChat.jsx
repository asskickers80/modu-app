import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DEEP = '#2d1a4a'

const THREADS = {
  bth1: {
    clientName: '마포 국밥집', propertyName: '인테리어·간판 견적',
    clientPhone: '010-****-7777', bizPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'client', text: '안녕하세요! 국밥집 리모델링 견적 문의드려요 🙏', time: '오전 9:00', date: '오늘' },
      { id: 2, from: 'biz', text: '안녕하세요! 반갑습니다. 면적이 어떻게 되세요?', time: '오전 9:10' },
      { id: 3, from: 'client', text: '약 25평 정도이고, 주방 포함해서 전체 리모델링이요.', time: '오전 9:15' },
      { id: 4, from: 'biz', text: '25평 풀리모델링은 보통 1,500~2,500만원 선이에요. 현장 방문 후 정확한 견적 드릴게요!', time: '오전 9:22' },
      { id: 5, from: 'client', text: '다음 달 공사 시작하고 싶은데, 가능할까요?', time: '오전 9:30' },
    ],
  },
  bth2: {
    clientName: '강남 카페', propertyName: '간판 교체 견적',
    clientPhone: '010-****-8888', bizPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'client', text: '간판 교체 비용이 얼마나 될까요?', time: '오전 8:00', date: '오늘' },
      { id: 2, from: 'biz', text: '간판 종류에 따라 다른데요, 아크릴 채널 기준 50~150만원 선이에요.', time: '오전 8:20' },
    ],
  },
  bth3: {
    clientName: 'AI 매칭 92% 수요', propertyName: '강남구 카페 인테리어',
    clientPhone: '010-****-0000', bizPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'client', text: '카페 인테리어 견적 받고 싶습니다. 50㎡ 이하, 예산 800만원 정도예요.', time: '방금', date: '오늘' },
    ],
  },
}

export default function D4BusinessChat() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const thread = THREADS[threadId] || THREADS['bth1']
  const [messages, setMessages] = useState(thread.messages)
  const [input, setInput] = useState('')
  const [exchangeState, setExchangeState] = useState('idle')
  const [showModal, setShowModal] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, exchangeState])

  const send = () => {
    const t = input.trim()
    if (!t) return
    setMessages(prev => [...prev, { id: Date.now(), from: 'biz', text: t, time: '방금' }])
    setInput('')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button onClick={() => navigate('/d4/business/inbox')}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-bold text-gray-900 truncate">{thread.clientName}</p>
              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: PURPLE_BG, color: PURPLE }}>
                🔒 번호 비공개
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">🔨 {thread.propertyName}</p>
          </div>
        </div>
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: PURPLE_BG }}>
          <p className="text-[11px] font-medium flex-1" style={{ color: PURPLE }}>대화 중 · 번호는 비공개예요 — 연락처 교환 시 양측 동시 공개</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>
        {messages.map((msg, idx) => {
          const isBiz = msg.from === 'biz'
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
              <div className={`flex mb-2 ${isBiz ? 'justify-end' : 'justify-start'}`}>
                {!isBiz && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white mr-2 mt-1 shrink-0"
                    style={{ backgroundColor: '#6b7280' }}>
                    {thread.clientName[0]}
                  </div>
                )}
                <div className={`flex flex-col ${isBiz ? 'items-end' : 'items-start'}`}>
                  <div className="max-w-[240px] px-3.5 py-2.5"
                    style={{
                      backgroundColor: isBiz ? PURPLE : '#f3f4f6',
                      borderRadius: isBiz ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}>
                    <p className="text-[14px] leading-relaxed" style={{ color: isBiz ? 'white' : '#111827' }}>{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 mx-1">{msg.time}</span>
                </div>
              </div>
            </div>
          )
        })}

        {exchangeState === 'pending' && (
          <div className="mx-4 mb-3 rounded-2xl border-2 p-4" style={{ borderColor: PURPLE + '40', backgroundColor: PURPLE_BG }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: PURPLE }} />
              <p className="text-[13px] font-bold" style={{ color: PURPLE }}>연락처 교환 요청 보냄</p>
            </div>
            <p className="text-[12px] text-gray-500 mb-3">상대방이 수락하면 양쪽 번호가 동시에 공개됩니다.</p>
            <button onClick={() => setExchangeState('accepted')}
              className="w-full py-2 rounded-xl text-[12px] font-bold border-2"
              style={{ borderColor: PURPLE, color: PURPLE, backgroundColor: 'white' }}>
              🧪 더미: 상대방이 수락했어요 (데모 버튼)
            </button>
          </div>
        )}
        {exchangeState === 'accepted' && (
          <div className="mx-4 my-3 rounded-2xl border-2 overflow-hidden" style={{ borderColor: PURPLE + '40' }}>
            {/* 기업회원 B2B: 연락처 교환 = 매칭 성사 */}
            <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: PURPLE_BG }}>
              <span className="text-[18px]">🤝</span>
              <div>
                <p className="text-[13px] font-black" style={{ color: PURPLE }}>매칭 성사</p>
                <p className="text-[11px] text-gray-500">연락처가 교환됐어요 · 이제 직접 연락 가능</p>
              </div>
            </div>
            <div className="px-4 py-3.5 bg-white flex gap-4">
              <div className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: PURPLE_BG }}>
                <p className="text-[10px] text-gray-400 mb-1">{thread.clientName}</p>
                <p className="text-[15px] font-bold tracking-wide" style={{ color: PURPLE }}>{thread.clientPhone}</p>
              </div>
              <div className="flex-1 rounded-xl px-3 py-2.5 bg-gray-50">
                <p className="text-[10px] text-gray-400 mb-1">내 번호 (상대 공개)</p>
                <p className="text-[15px] font-bold tracking-wide text-gray-700">{thread.bizPhone}</p>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <div className="shrink-0 bg-white border-t border-gray-100">
        {exchangeState === 'idle' && (
          <div className="px-4 pt-3">
            <button onClick={() => setShowModal(true)}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold border-2 flex items-center justify-center gap-2"
              style={{ borderColor: PURPLE + '50', color: PURPLE, backgroundColor: PURPLE_BG }}>
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
            style={{ backgroundColor: input.trim() ? PURPLE : '#e5e7eb' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9l14-7-7 14V9H2z" fill={input.trim() ? 'white' : '#9ca3af'} />
            </svg>
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <p className="text-[17px] font-bold text-gray-900 mb-1">연락처 교환 요청</p>
            <p className="text-[12px] text-gray-400 mb-4">{thread.clientName}에게 요청을 보냅니다</p>
            <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: '#fff8e1' }}>
              <p className="text-[13px] font-bold text-amber-700 mb-2">⚠️ 교환 전에 꼭 확인하세요</p>
              <ul className="space-y-1.5">
                {['교환하면 양쪽 모두 전화번호가 공개됩니다', '상대방이 수락해야만 공개돼요 (일방 공개 불가)'].map(t => (
                  <li key={t} className="flex items-start gap-2 text-[12px] text-amber-800">
                    <span className="shrink-0 mt-0.5">•</span>{t}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => { setShowModal(false); setExchangeState('pending') }}
              className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white mb-2.5"
              style={{ backgroundColor: PURPLE }}>요청 보내기</button>
            <button onClick={() => setShowModal(false)}
              className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">취소</button>
          </div>
        </div>
      )}
    </div>
  )
}
