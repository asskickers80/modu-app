import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

const GATE_CONFIGS = {
  contact_exchange: {
    title: '연락처 교환 전 인증',
    desc: '연락처 교환은 본인 인증 후 이용할 수 있어요',
    reason: '양측의 번호를 안전하게 보호해요',
    icon: '📞',
  },
  listing_register: {
    title: '매물 등록 전 인증',
    desc: '매물 등록을 위해 사업자 또는 본인 인증이 필요해요',
    reason: '허위 매물을 방지하고 신뢰 있는 거래를 위해서예요',
    icon: '🏪',
  },
  premium: {
    title: '프리미엄 결제 전 인증',
    desc: '결제를 진행하기 전 본인 인증이 필요해요',
    reason: '안전한 결제를 위한 절차예요',
    icon: '💳',
  },
  business_verify: {
    title: '기업회원 인증',
    desc: '기업회원 서비스 이용을 위해 사업자 인증이 필요해요',
    reason: '신뢰 있는 영업 환경을 위해서예요',
    icon: '🛡️',
  },
}

const DEFAULT_GATE = {
  title: '본인 인증',
  desc: '이 기능을 이용하려면 인증이 필요해요',
  reason: '안전한 서비스 이용을 위한 절차예요',
  icon: '✅',
}

const METHODS = [
  { id: 'kakao', label: '카카오 인증', emoji: '💛', desc: '카카오톡으로 1초 인증' },
  { id: 'phone', label: '휴대폰 인증', emoji: '📱', desc: 'SMS 인증번호' },
  { id: 'business', label: '사업자 인증', emoji: '🏢', desc: '사업자등록번호 입력' },
]

export default function FAuthGate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast, showToast } = useToast()
  const [step, setStep] = useState(1)
  const [selectedMethod, setSelectedMethod] = useState(null)

  const trigger = searchParams.get('trigger') || 'default'
  const returnTo = searchParams.get('return') || '/'
  const gate = GATE_CONFIGS[trigger] || DEFAULT_GATE

  const handleVerify = () => {
    if (!selectedMethod) { showToast('인증 방법을 선택해주세요'); return }
    setStep(2)
  }

  const handleComplete = () => {
    showToast('인증 완료! 이동합니다 ✓')
    setTimeout(() => navigate(returnTo), 1000)
  }

  if (step === 2) return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button onClick={() => setStep(1)}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 16l-6-6 6-6" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-[18px] font-bold text-gray-900">인증 진행 중</h1>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-[40px] mb-4">{METHODS.find(m => m.id === selectedMethod)?.emoji}</p>
        <p className="text-[18px] font-bold text-gray-900 mb-2 text-center">
          {METHODS.find(m => m.id === selectedMethod)?.label}
        </p>
        <p className="text-[13px] text-gray-500 text-center mb-8 leading-relaxed">
          {selectedMethod === 'phone' ? '인증번호를 입력해주세요\n(테스트: 000000)' : '앱에서 인증을 완료해주세요'}
        </p>
        {selectedMethod === 'phone' && (
          <div className="w-full mb-6">
            <input type="number" placeholder="인증번호 6자리"
              className="w-full text-center text-[20px] font-bold py-4 rounded-2xl border border-gray-200 outline-none bg-white" />
          </div>
        )}
        <button onClick={handleComplete}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white"
          style={{ backgroundColor: '#1a4d8f' }}>
          {selectedMethod === 'phone' ? '인증 완료' : '인증 확인하기'}
        </button>
      </main>
      <Toast message={toast} />
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 16l-6-6 6-6" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-[18px] font-bold text-gray-900">인증 필요</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: 'none' }}>

        {/* 이유 설명 */}
        <div className="text-center mb-8">
          <p className="text-[40px] mb-3">{gate.icon}</p>
          <p className="text-[20px] font-bold text-gray-900 mb-2">{gate.title}</p>
          <p className="text-[14px] text-gray-500 leading-relaxed">{gate.desc}</p>
          <div className="mt-4 mx-4 rounded-2xl px-4 py-3" style={{ backgroundColor: '#eef2fb' }}>
            <p className="text-[12px] text-gray-600">
              💡 {gate.reason}
            </p>
          </div>
        </div>

        {/* 인증 방법 선택 */}
        <p className="text-[13px] font-bold text-gray-700 mb-3">인증 방법 선택</p>
        <div className="space-y-2 mb-8">
          {METHODS.map(m => (
            <button key={m.id}
              onClick={() => setSelectedMethod(m.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all"
              style={{
                borderColor: selectedMethod === m.id ? '#1a4d8f' : '#e5e7eb',
                backgroundColor: selectedMethod === m.id ? '#eef2fb' : 'white',
              }}>
              <span className="text-[28px] shrink-0">{m.emoji}</span>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-gray-900">{m.label}</p>
                <p className="text-[12px] text-gray-400">{m.desc}</p>
              </div>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: selectedMethod === m.id ? '#1a4d8f' : '#d1d5db', backgroundColor: selectedMethod === m.id ? '#1a4d8f' : 'white' }}>
                {selectedMethod === m.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>

        <button onClick={handleVerify}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white"
          style={{ backgroundColor: selectedMethod ? '#1a4d8f' : '#d1d5db' }}>
          인증 시작하기
        </button>

        <button onClick={() => navigate(-1)}
          className="w-full py-3 text-[13px] text-gray-400 mt-3">
          나중에 하기
        </button>
      </main>

      <Toast message={toast} />
    </div>
  )
}
