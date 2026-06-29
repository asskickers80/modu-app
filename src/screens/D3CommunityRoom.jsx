import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'

const ROOMS = {
  '1': {
    emoji: '🏪', name: '홍대 상권 양도자 모임', members: 312,
    messages: [
      { id: 1, author: '마포구 사장님', text: '권리금 얼마 받으셨어요?', time: '10:02', isMe: false },
      { id: 2, author: '연남동 카페', text: '저는 3,500만 받았어요. 단골 DB 이전 조건 걸었어요.', time: '10:05', isMe: false },
      { id: 3, author: '나', text: '아 그렇군요! 저도 3,000 정도 생각 중인데 낮은 편인가요?', time: '10:12', isMe: true },
      { id: 4, author: '홍대 치킨집', text: '요즘 홍대 카페 기준으로는 3000~4000 정도가 평균이에요', time: '10:15', isMe: false },
      { id: 5, author: '마포구 사장님', text: '단골 많으면 더 받을 수 있어요. 월 매출 얼마예요?', time: '10:18', isMe: false },
    ],
  },
  '2': {
    emoji: '📊', name: '서울 자영업 AI 정보방', members: 1204,
    messages: [
      { id: 1, author: 'AI 모두봇', text: '이번 달 마포구 카페 권리금 평균 2,800만원입니다. 전월 대비 +3.2%', time: '09:00', isMe: false },
      { id: 2, author: '강남 국밥집', text: '이번 달 카페 권리금 평균 상승했대요', time: '09:45', isMe: false },
      { id: 3, author: '나', text: '마포구 분식집은 어떤가요?', time: '10:20', isMe: true },
      { id: 4, author: 'AI 모두봇', text: '마포구 분식 평균 권리금은 1,200만원입니다. 전월 대비 -1.5%', time: '10:21', isMe: false },
    ],
  },
  '3': {
    emoji: '⚖️', name: '권리금 협상 Q&A', members: 574,
    messages: [
      { id: 1, author: '법무통', text: '감정평가서 꼭 받으세요. 나중에 분쟁 시 필수예요.', time: '어제', isMe: false },
      { id: 2, author: '이건 중요', text: '상가 임대차보호법 제10조4 꼭 확인하세요', time: '어제', isMe: false },
      { id: 3, author: '나', text: '감정평가서 비용이 얼마나 되나요?', time: '오전 08:00', isMe: true },
      { id: 4, author: '법무통', text: '보통 30~50만원 정도 해요. 분쟁 대비하면 싸게 먹히는 비용이에요.', time: '오전 08:15', isMe: false },
    ],
  },
  '4': {
    emoji: '🔑', name: '계약서·법무 도우미', members: 289,
    messages: [
      { id: 1, author: '계약 베테랑', text: '특약 조항 공유합니다. 양도 후 6개월 내 동종업 제한 꼭 넣으세요', time: '어제', isMe: false },
      { id: 2, author: '나', text: '범위를 어떻게 잡으면 좋을까요?', time: '오전 09:00', isMe: true },
      { id: 3, author: '계약 베테랑', text: '반경 500m, 2년 이내가 일반적이에요. 업종 명시하면 더 강력해요.', time: '오전 09:10', isMe: false },
    ],
  },
  '5': {
    emoji: '🍽️', name: '식당·분식 양도자 모임', members: 441,
    messages: [
      { id: 1, author: '국밥집 사장', text: '주방 설비 포함 가격이요? 설비 분리해서 받는 게 나을 때도 있어요', time: '어제', isMe: false },
      { id: 2, author: '나', text: '설비 중고 시세가 어떻게 되나요?', time: '오전 10:00', isMe: true },
      { id: 3, author: '국밥집 사장', text: '튀김기 100만, 냉장고 80만 정도. 업체 통해 받으면 더 정확해요.', time: '오전 10:15', isMe: false },
    ],
  },
  '6': {
    emoji: '✂️', name: '뷰티·미용 양도 채널', members: 178,
    messages: [
      { id: 1, author: '강남 헤어', text: '단골 DB 이전 가능한가요? 카카오채널로 연결되어 있어요', time: '어제', isMe: false },
      { id: 2, author: '나', text: '네이버 예약 DB는 어떻게 하셨나요?', time: '오전 11:00', isMe: true },
      { id: 3, author: '강남 헤어', text: '네이버는 예약건 내보내기 후 공유해드렸어요. 고객 동의 절차는 별도로 안내해드렸고요.', time: '오전 11:20', isMe: false },
    ],
  },
}

const FALLBACK = {
  emoji: '💬', name: '오픈채팅', members: 100,
  messages: [{ id: 1, author: '참여자', text: '안녕하세요!', time: '방금', isMe: false }],
}

export default function D3CommunityRoom() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const { toast, showToast } = useToast()
  const room = ROOMS[roomId] || FALLBACK
  const [messages, setMessages] = useState(room.messages)
  const [inputText, setInputText] = useState('')
  const bottomRef = useRef(null)

  const profile = getProfile()
  const config = CATEGORY_CONFIG[profile.category] ?? CATEGORY_CONFIG.seller
  const { color, bg } = config

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!inputText.trim()) return
    setMessages(prev => [...prev, {
      id: Date.now(), author: '나', text: inputText.trim(),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    }])
    setInputText('')
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, author: '참여자',
        text: '네, 맞아요! 저도 비슷한 경험이 있어요.',
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        isMe: false,
      }])
    }, 1500)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button onClick={() => navigate('/community')}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 16l-6-6 6-6" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[18px]"
            style={{ backgroundColor: bg }}>
            {room.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-gray-900 truncate">{room.name}</p>
            <p className="text-[11px] text-gray-400">{room.members.toLocaleString()}명 참여 중</p>
          </div>
          <button onClick={() => showToast('준비 중이에요 🚧')}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="5" r="1.2" fill="#9ca3af" />
              <circle cx="10" cy="10" r="1.2" fill="#9ca3af" />
              <circle cx="10" cy="15" r="1.2" fill="#9ca3af" />
            </svg>
          </button>
        </div>

        {/* 공지 배너 */}
        <div className="mx-4 mb-3 rounded-xl px-3.5 py-2 flex items-center gap-2" style={{ backgroundColor: bg }}>
          <span className="text-[12px]">📌</span>
          <p className="text-[11px] font-medium truncate" style={{ color }}>
            모든 대화는 익명으로 진행돼요. 전화번호 공유 금지.
          </p>
        </div>
      </header>

      {/* 메시지 목록 */}
      <main className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'none' }}>
        {messages.map((msg) => {
          const isMe = msg.isMe
          return (
            <div key={msg.id} className={`flex mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mr-2 mt-1 bg-gray-200 text-gray-600">
                  {msg.author.charAt(0)}
                </div>
              )}
              <div className={`max-w-[72%]`}>
                {!isMe && <p className="text-[10px] text-gray-400 mb-0.5 ml-0.5">{msg.author}</p>}
                <div className={`px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed ${
                  isMe ? 'text-white rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                }`}
                  style={isMe ? { backgroundColor: color } : {}}>
                  {msg.text}
                </div>
                <p className={`text-[10px] text-gray-400 mt-0.5 ${isMe ? 'text-right' : 'text-left'}`}>{msg.time}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </main>

      {/* 입력창 */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-3">
        <button onClick={() => showToast('준비 중이에요 🚧')}
          className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
          style={{ backgroundColor: bg }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3v12M3 9h12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex-1 flex items-end gap-2 bg-gray-100 rounded-2xl px-4 py-2.5 min-h-[44px]">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="메시지 입력..."
            className="flex-1 bg-transparent text-[14px] text-gray-800 outline-none"
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={!inputText.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{ backgroundColor: inputText.trim() ? color : '#e5e7eb' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 3l2.5 5L2 13l12-5z" fill="white" />
          </svg>
        </button>
      </div>

      <Toast message={toast} />
    </div>
  )
}
