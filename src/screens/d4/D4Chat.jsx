import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const NAVY_DARK = '#0f2d57'

// ── 스레드 더미 데이터 ──────────────────────────────────
const THREADS = {
  th1: {
    buyerName: '예비창업자 김*',
    propertyName: '홍대 고양이 카페',
    propertyEmoji: '🐱',
    buyerPhone: '010-9876-****',
    sellerPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'buyer', text: '안녕하세요! 홍대 카페 인수 관심 있어서 연락드렸어요 😊', time: '오전 10:32', date: '오늘' },
      { id: 2, from: 'seller', text: '안녕하세요! 관심 가져주셔서 감사해요. 어떤 점이 궁금하세요?', time: '오전 10:35' },
      { id: 3, from: 'buyer', text: '일 평균 매출이 얼마나 되는지 여쭤봐도 될까요?', time: '오전 10:38' },
      { id: 4, from: 'seller', text: '일 평균 40만원 정도 됩니다. POS 데이터 기준이에요. 월별로 조금씩 차이는 있어요.', time: '오전 10:41' },
      { id: 5, from: 'buyer', text: '혹시 이번 주말에 직접 방문해서 볼 수 있을까요?', time: '오전 11:02' },
    ],
  },
  th2: {
    buyerName: '이*님',
    propertyName: '홍대 고양이 카페',
    propertyEmoji: '🐱',
    buyerPhone: '010-5555-****',
    sellerPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'buyer', text: '월 매출 자료 공유 가능한가요?', time: '오전 9:15', date: '오늘' },
      { id: 2, from: 'seller', text: 'DM으로 대화 후 직접 방문 시 상세 내역 보여드릴게요 😊', time: '오전 9:40' },
    ],
  },
  th3: {
    buyerName: '익명 방문자',
    propertyName: '홍대 고양이 카페',
    propertyEmoji: '🐱',
    buyerPhone: '010-****-3333',
    sellerPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'buyer', text: '권리금 좀 조정 가능할까요?', time: '어제', date: '어제' },
    ],
  },
  th4: {
    buyerName: '박*님',
    propertyName: '방이동 분식집',
    propertyEmoji: '🍜',
    buyerPhone: '010-7777-****',
    sellerPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'buyer', text: '안녕하세요! 분식집 인수 관련해서 문의드려요.', time: '3일 전', date: '3일 전' },
      { id: 2, from: 'seller', text: '네, 말씀하세요!', time: '3일 전' },
      { id: 3, from: 'buyer', text: '언제 방문해서 볼 수 있을까요?', time: '3일 전' },
    ],
  },
  new: {
    buyerName: '새 문의자',
    propertyName: '홍대 고양이 카페',
    propertyEmoji: '🐱',
    buyerPhone: '010-****-0000',
    sellerPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'buyer', text: '안녕하세요! 매물 상세 보고 연락드렸어요. 아직 양도 진행 중이신가요?', time: '방금', date: '오늘' },
    ],
  },
}

// exchange 상태: idle → confirming → pending → accepted
// accepted 상태에서 채팅창 내 번호 공개 카드 표시

// ── 연락처 교환 확인 모달 ──────────────────────────────
function ExchangeConfirmModal({ onConfirm, onCancel, buyerName }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]"
            style={{ backgroundColor: NAVY_BG }}>
            📇
          </div>
          <div>
            <p className="text-[17px] font-bold text-gray-900">연락처 교환 요청</p>
            <p className="text-[12px] text-gray-400 mt-0.5">{buyerName}에게 요청을 보냅니다</p>
          </div>
        </div>

        {/* 중요 고지 */}
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

        <button
          onClick={onConfirm}
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
      {/* 데모용: 상대방 수락 시뮬레이션 */}
      <button
        onClick={onSimulate}
        className="w-full py-2 rounded-xl text-[12px] font-bold border-2 transition-all"
        style={{ borderColor: NAVY, color: NAVY, backgroundColor: 'white' }}>
        🧪 더미: 상대방이 수락했어요 (데모 버튼)
      </button>
    </div>
  )
}

// ── 교환 완료 카드 (헤더 아래 고정 패널) ────────────────
function ExchangedCard({ thread }) {
  return (
    <div className="shrink-0 border-b-2 overflow-hidden" style={{ borderColor: '#16a34a30' }}>
      {/* 타이틀 바 */}
      <div className="px-5 py-2.5 flex items-center gap-2" style={{ backgroundColor: '#f0fdf4' }}>
        <span className="text-[14px]">🤝</span>
        <p className="text-[13px] font-bold text-green-700 flex-1">연락처가 교환됐어요</p>
        <span className="text-[10px] text-green-500 font-medium">양측 동시 공개</span>
      </div>
      {/* 번호 2열 */}
      <div className="px-5 py-3.5 bg-white flex gap-4">
        <div className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: NAVY_BG }}>
          <p className="text-[10px] text-gray-400 mb-1">{thread.buyerName}</p>
          <p className="text-[15px] font-bold tracking-wide" style={{ color: NAVY }}>
            {thread.buyerPhone}
          </p>
        </div>
        <div className="flex-1 rounded-xl px-3 py-2.5 bg-gray-50">
          <p className="text-[10px] text-gray-400 mb-1">내 번호 (상대 공개)</p>
          <p className="text-[15px] font-bold tracking-wide text-gray-700">
            {thread.sellerPhone}
          </p>
        </div>
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
  const thread = THREADS[threadId] || THREADS['th1']

  const [messages, setMessages] = useState(thread.messages)
  const [input, setInput] = useState('')
  const [exchangeState, setExchangeState] = useState('idle') // idle | confirming | pending | accepted
  const bottomRef = useRef(null)
  const { toast, showToast } = useToast()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, exchangeState])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    setMessages(prev => [...prev, {
      id: Date.now(), from: 'seller', text, time: '방금',
    }])
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

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
              <p className="text-[15px] font-bold text-gray-900 truncate">{thread.buyerName}</p>
              {/* 번호 상태 배지 */}
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
              {thread.propertyEmoji} {thread.propertyName}
            </p>
          </div>

          <button
            onClick={() => showToast()}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f3f4f6' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="3" r="1.2" fill="#6b7280" />
              <circle cx="8" cy="8" r="1.2" fill="#6b7280" />
              <circle cx="8" cy="13" r="1.2" fill="#6b7280" />
            </svg>
          </button>
        </div>

        {/* DM 원칙 배너 — 교환 전에만 */}
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

      {/* 연락처 교환 완료 카드 — 헤더 바로 아래 고정 */}
      {exchangeState === 'accepted' && <ExchangedCard thread={thread} />}

      {/* 메시지 영역 */}
      <main className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>

        {messages.map((msg, idx) => {
          const isSeller = msg.from === 'seller'
          const showDate = msg.date && (idx === 0 || messages[idx - 1]?.date !== msg.date)
          return (
            <div key={msg.id}>
              {/* 날짜 구분선 */}
              {showDate && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] text-gray-400 font-medium">{msg.date}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}

              <div className={`flex mb-2 ${isSeller ? 'justify-end' : 'justify-start'}`}>
                {/* 상대방 아바타 */}
                {!isSeller && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white mr-2 mt-1 shrink-0"
                    style={{ backgroundColor: '#6b7280' }}>
                    {thread.buyerName[0]}
                  </div>
                )}

                <div className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}>
                  <div className="max-w-[240px] px-3.5 py-2.5 rounded-2xl"
                    style={{
                      backgroundColor: isSeller ? NAVY : '#f3f4f6',
                      borderRadius: isSeller
                        ? '18px 18px 4px 18px'
                        : '18px 18px 18px 4px',
                    }}>
                    <p className="text-[14px] leading-relaxed"
                      style={{ color: isSeller ? 'white' : '#111827' }}>
                      {msg.text}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 mx-1">{msg.time}</span>
                </div>
              </div>
            </div>
          )
        })}

        {/* 수락 대기 배너 */}
        {exchangeState === 'pending' && (
          <PendingBanner onSimulate={() => setExchangeState('accepted')} />
        )}

        {/* 교환 완료 타임라인 마커 */}
        {exchangeState === 'accepted' && (
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-green-100" />
            <span className="text-[11px] text-green-500 font-medium">🤝 연락처 교환 완료</span>
            <div className="flex-1 h-px bg-green-100" />
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* 하단 — 연락처 교환 버튼 + 입력창 */}
      <div className="shrink-0 bg-white border-t border-gray-100">

        {/* 연락처 교환 버튼 (교환 전에만) */}
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

        {/* 교환 완료 후 버튼 */}
        {exchangeState === 'accepted' && (
          <div className="px-4 pt-3">
            <div className="w-full py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2"
              style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              ✅ 연락처 교환 완료
            </div>
          </div>
        )}

        {/* 입력창 */}
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
            disabled={!input.trim()}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
            style={{ backgroundColor: input.trim() ? NAVY : '#e5e7eb' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9l14-7-7 14V9H2z"
                fill={input.trim() ? 'white' : '#9ca3af'} />
            </svg>
          </button>
        </div>
      </div>

      {/* 연락처 교환 확인 모달 */}
      {exchangeState === 'confirming' && (
        <ExchangeConfirmModal
          buyerName={thread.buyerName}
          onConfirm={() => setExchangeState('pending')}
          onCancel={() => setExchangeState('idle')}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
