import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'

const GREEN = '#2d7a4f'
const GREEN_BG = '#edf7f1'

const THREADS = {
  oth1: {
    vendorName: '모두세무사무소',
    vendorEmoji: '🧮',
    category: '세무·회계',
    vendorPhone: '010-2222-****',
    myPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'me', text: '안녕하세요. 부가세 신고 관련해서 도움받고 싶어요.', time: '오전 10:00', date: '오늘' },
      { id: 2, from: 'vendor', text: '안녕하세요 사장님! 말씀만 하세요. 업종이 어떻게 되세요?', time: '오전 10:05' },
      { id: 3, from: 'me', text: '카페 운영 중이에요. 매출이 월 1,200만 정도 됩니다.', time: '오전 10:08' },
      { id: 4, from: 'vendor', text: '네, 간이과세자이신지 일반과세자이신지에 따라 다른데요. 사업자등록증 상 확인해 주시겠어요?', time: '오전 10:12' },
    ],
    contactStatus: 'idle',
  },
  oth2: {
    vendorName: '서교동 인테리어',
    vendorEmoji: '🔧',
    category: '시설·인테리어',
    vendorPhone: '010-3333-****',
    myPhone: '010-1234-****',
    messages: [
      { id: 1, from: 'me', text: '리모델링 견적 부탁드립니다. 카페 30평이에요.', time: '3일 전', date: '3일 전' },
      { id: 2, from: 'vendor', text: '안녕하세요 사장님! 30평 카페 리모델링이면 대략 얼마나 예산을 생각하고 계세요?', time: '3일 전' },
      { id: 3, from: 'me', text: '1,500~2,000만 원 정도 생각하고 있어요.', time: '3일 전' },
      { id: 4, from: 'vendor', text: '네, 가능합니다. 직접 방문해서 상담 후 견적 드릴게요. 언제 가능하세요?', time: '2일 전' },
    ],
    contactStatus: 'accepted',
    contactRevealedAt: '2일 전',
  },
}

const FALLBACK = {
  vendorName: '업체',
  vendorEmoji: '🏢',
  category: '업체',
  messages: [{ id: 1, from: 'vendor', text: '안녕하세요!', time: '방금' }],
  contactStatus: 'idle',
}

function ContactBanner({ status, vendorPhone, myPhone, onRequest, onClose }) {
  if (status === 'accepted') return (
    <div className="mx-4 mb-2 rounded-2xl p-3.5" style={{ backgroundColor: '#dcfce7' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[13px]">✅</span>
        <p className="text-[13px] font-bold text-green-800">연락처 교환 완료</p>
      </div>
      <p className="text-[12px] text-green-700">업체: {vendorPhone}</p>
      <p className="text-[12px] text-green-700 mt-0.5">내 번호: {myPhone} (상대에게 공개됨)</p>
    </div>
  )
  if (status === 'pending') return (
    <div className="mx-4 mb-2 rounded-2xl p-3.5" style={{ backgroundColor: '#fef3e2' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-bold text-amber-800">연락처 교환 요청 보냄</p>
          <p className="text-[11px] text-amber-600 mt-0.5">업체가 수락하면 번호가 공개돼요</p>
        </div>
        <button onClick={onClose} className="text-[11px] text-amber-600 font-medium px-2 py-1 rounded-lg border border-amber-300">취소</button>
      </div>
    </div>
  )
  return null
}

function ContactModal({ vendor, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-[390px] mx-auto bg-white rounded-t-3xl px-5 pt-6 pb-10">
        <div className="text-center mb-5">
          <p className="text-[22px] mb-2">📞</p>
          <p className="text-[18px] font-bold text-gray-900 mb-1">연락처를 교환할까요?</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            요청을 보내면 업체가 수락할 때 서로의<br />
            전화번호가 동시에 공개돼요
          </p>
        </div>
        <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: GREEN_BG }}>
          <p className="text-[12px] text-gray-500 mb-1">교환 대상</p>
          <p className="text-[14px] font-bold text-gray-900">{vendor.vendorEmoji} {vendor.vendorName}</p>
          <p className="text-[12px] text-gray-400 mt-1">{vendor.category}</p>
        </div>
        <button onClick={onConfirm}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white mb-2"
          style={{ backgroundColor: GREEN }}>
          연락처 교환 요청 보내기
        </button>
        <button onClick={onCancel}
          className="w-full py-3.5 rounded-2xl text-[14px] font-medium text-gray-500 border border-gray-200">
          취소
        </button>
      </div>
    </div>
  )
}

export default function D4OperatingChat() {
  const navigate = useNavigate()
  const { threadId } = useParams()
  const { toast, showToast } = useToast()
  const thread = THREADS[threadId] || FALLBACK
  const [messages, setMessages] = useState(thread.messages)
  const [inputText, setInputText] = useState('')
  const [contactStatus, setContactStatus] = useState(thread.contactStatus || 'idle')
  const [showModal, setShowModal] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!inputText.trim()) return
    setMessages(prev => [...prev, {
      id: Date.now(), from: 'me', text: inputText.trim(),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    }])
    setInputText('')
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, from: 'vendor',
        text: '네, 말씀드릴게요!',
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }])
    }, 1200)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button onClick={() => navigate('/d4/operating/inbox')}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 16l-6-6 6-6" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] font-bold"
            style={{ backgroundColor: GREEN_BG }}>
            {thread.vendorEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-gray-900">{thread.vendorName}</p>
            <p className="text-[11px] text-gray-400">{thread.category} · 번호 비공개</p>
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
      </header>

      {/* 연락처 배너 */}
      {contactStatus !== 'idle' && (
        <ContactBanner
          status={contactStatus}
          vendorPhone={thread.vendorPhone}
          myPhone={thread.myPhone}
          onRequest={() => setShowModal(true)}
          onClose={() => setContactStatus('idle')}
        />
      )}

      {/* 메시지 목록 */}
      <main className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'none' }}>
        {messages.map((msg, idx) => {
          const isMe = msg.from === 'me'
          const showDate = idx === 0 || messages[idx - 1]?.date !== msg.date
          return (
            <div key={msg.id}>
              {showDate && msg.date && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <p className="text-[11px] text-gray-400 whitespace-nowrap">{msg.date}</p>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}
              <div className={`flex mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 mr-2 mt-1"
                    style={{ backgroundColor: GREEN_BG }}>
                    {thread.vendorEmoji}
                  </div>
                )}
                <div className={`max-w-[72%]`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                    isMe ? 'text-white rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                  }`}
                    style={isMe ? { backgroundColor: GREEN } : {}}>
                    {msg.text}
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{msg.time}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </main>

      {/* 연락처 교환 바 */}
      {contactStatus === 'idle' && (
        <div className="shrink-0 mx-4 mb-2 rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: GREEN_BG }}>
          <p className="text-[12px] font-medium" style={{ color: GREEN }}>
            🔒 번호 비공개 · DM으로 대화 중
          </p>
          <button onClick={() => setShowModal(true)}
            className="text-[11px] font-bold px-3 py-1.5 rounded-full text-white"
            style={{ backgroundColor: GREEN }}>
            연락처 교환
          </button>
        </div>
      )}

      {/* 입력창 */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-3">
        <button onClick={() => showToast('준비 중이에요 🚧')}
          className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
          style={{ backgroundColor: GREEN_BG }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3v12M3 9h12" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex-1 flex items-end gap-2 bg-gray-100 rounded-2xl px-4 py-2.5 min-h-[44px]">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="메시지 입력..."
            className="flex-1 bg-transparent text-[14px] text-gray-800 outline-none resize-none"
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={!inputText.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{ backgroundColor: inputText.trim() ? GREEN : '#e5e7eb' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 3l2.5 5L2 13l12-5z" fill="white" />
          </svg>
        </button>
      </div>

      {showModal && (
        <ContactModal
          vendor={thread}
          onConfirm={() => { setShowModal(false); setContactStatus('pending') }}
          onCancel={() => setShowModal(false)}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
