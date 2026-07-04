import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'
import { getProfile } from '../../lib/userProfile'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DEEP = '#5c3380'

const TEMPLATES = [
  { id: 't1', title: '첫 인사 & 소개', text: '안녕하세요! {업체명}입니다. 사장님의 상황에 딱 맞는 {서비스}를 제안드리고 싶어서 연락드렸어요. 부담 없이 무료 상담 받아보세요 😊' },
  { id: 't2', title: '할인 프로모션', text: '이번 달에만 {서비스} 20% 할인 이벤트 중이에요! 첫 상담 사장님께는 추가 혜택도 드려요. 지금 문의주시면 바로 안내해드릴게요.' },
  { id: 't3', title: 'AI 추천 맞춤 제안', text: 'AI가 분석한 결과 사장님 가게에 {서비스}가 적합한 것으로 나왔어요. 실제로 비슷한 업종에서 매출 {N}% 향상 사례가 있어요. 한 번 얘기 나눠볼게요!' },
]

// 대상자 수 집계는 실연동 전 — 라벨만 유지 (가짜 인원수 금지)
const TARGETS = [
  { id: 'all', label: '전체 (게이트 1 ON)' },
  { id: 'startup', label: '창업준비 사장님' },
  { id: 'operating', label: '운영 중 사장님' },
]

export default function BusinessPushPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const profile = getProfile()
  const bizTypeLabel = profile.bizTypeLabel ?? '내 업체'
  const [selectedTarget, setSelectedTarget] = useState('all')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [message, setMessage] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const applyTemplate = (tpl) => {
    setSelectedTemplate(tpl.id)
    setMessage(tpl.text.replace('{업체명}', bizTypeLabel).replace('{서비스}', profile.bizTypeLabel ?? '서비스'))
  }

  // 실발신 인프라 연동 전 — 검증까지만 실동작, 가짜 "발신 완료" 화면은 표시하지 않는다
  const handleSend = () => {
    if (!confirmed) {
      showToast('발신 전 확인을 체크해주세요')
      return
    }
    if (!message.trim()) {
      showToast('메시지를 작성해주세요')
      return
    }
    showToast('발신 기능 준비 중이에요 🚧')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0" style={{ backgroundColor: PURPLE_DEEP }}>
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 16l-6-6 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-[13px] text-purple-300">능동 영업하기</p>
            <p className="text-[18px] font-black text-white">Push 발신</p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-purple-400/30 text-purple-300">
            이중 게이트 적용
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{ scrollbarWidth: 'none' }}>

        {/* 이중 게이트 설명 */}
        <div className="rounded-2xl p-4 mb-4 border border-purple-100" style={{ backgroundColor: PURPLE_BG }}>
          <p className="text-[12px] font-bold mb-2" style={{ color: PURPLE }}>🛡️ 이중 게이트 — 폭탄 방지</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0" style={{ backgroundColor: PURPLE }}>1</div>
              <p className="text-[12px] text-gray-700">수요자가 내 분류 알림을 <strong>ON</strong>한 경우만</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0" style={{ backgroundColor: PURPLE }}>2</div>
              <p className="text-[12px] text-gray-700">AI가 적합도 <strong>70%↑</strong>로 판단한 경우만</p>
            </div>
          </div>
        </div>

        {/* 1단계: 대상 선택 */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: PURPLE }}>1</div>
            <p className="text-[13px] font-bold text-gray-800">발신 대상 선택</p>
          </div>
          <div className="space-y-2">
            {TARGETS.map(t => (
              <button key={t.id}
                onClick={() => setSelectedTarget(t.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                style={{
                  borderColor: selectedTarget === t.id ? PURPLE : '#e5e7eb',
                  backgroundColor: selectedTarget === t.id ? PURPLE_BG : 'white',
                }}>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: selectedTarget === t.id ? PURPLE : '#d1d5db', backgroundColor: selectedTarget === t.id ? PURPLE : 'white' }}>
                  {selectedTarget === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-gray-800">{t.label}</p>
                  <p className="text-[11px] text-gray-400">이중 게이트 통과 수요자에게만 발신돼요 (인원 집계 준비중)</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2단계: 메시지 */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: PURPLE }}>2</div>
            <p className="text-[13px] font-bold text-gray-800">메시지 작성</p>
          </div>

          <p className="text-[11px] text-gray-400 mb-2">템플릿 선택</p>
          <div className="space-y-2 mb-3">
            {TEMPLATES.map(tpl => (
              <button key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className="w-full flex items-start gap-2 p-3 rounded-xl border text-left transition-all"
                style={{
                  borderColor: selectedTemplate === tpl.id ? PURPLE : '#e5e7eb',
                  backgroundColor: selectedTemplate === tpl.id ? PURPLE_BG : '#fafafa',
                }}>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ borderColor: selectedTemplate === tpl.id ? PURPLE : '#d1d5db', backgroundColor: selectedTemplate === tpl.id ? PURPLE : 'white' }}>
                  {selectedTemplate === tpl.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-[12px] font-bold text-gray-800">{tpl.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{tpl.text}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="text-[11px] text-gray-400 mb-1">또는 직접 작성</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder="수요자에게 보낼 메시지를 입력하세요..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-800 outline-none resize-none"
            style={{ '--tw-ring-color': PURPLE }}
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{message.length}/200자</p>
        </div>

        {/* 3단계: 발신 확인 */}
        <div className="bg-white rounded-2xl p-4 mb-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: PURPLE }}>3</div>
            <p className="text-[13px] font-bold text-gray-800">발신 확인</p>
          </div>

          <div className="flex gap-3 mb-3 p-3 rounded-xl" style={{ backgroundColor: '#f8f9fa' }}>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-gray-400">발신 대상</p>
              <p className="text-[13px] font-bold text-gray-300 leading-[27px]">준비중</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-gray-400">이번 달 잔여 발신</p>
              <p className="text-[13px] font-bold text-gray-300 leading-[27px]">준비중</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-gray-400">AI 필터 기준</p>
              <p className="text-[18px] font-black" style={{ color: '#16a34a' }}>70%↑</p>
            </div>
          </div>

          <button
            onClick={() => setConfirmed(v => !v)}
            className="flex items-start gap-3 w-full text-left p-3 rounded-xl border"
            style={{ borderColor: confirmed ? PURPLE : '#e5e7eb', backgroundColor: confirmed ? PURPLE_BG : 'white' }}>
            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border-2"
              style={{ borderColor: confirmed ? PURPLE : '#d1d5db', backgroundColor: confirmed ? PURPLE : 'white' }}>
              {confirmed && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p className="text-[12px] text-gray-700 leading-relaxed">
              이중 게이트를 통과한 수요자에게만 발신되며, 발신 후 취소는 불가함을 확인했어요.
            </p>
          </button>
        </div>

        <button
          onClick={handleSend}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white"
          style={{ backgroundColor: confirmed && message.trim() ? PURPLE : '#d1d5db' }}>
          🚀 발신하기
        </button>
      </main>

      <Toast message={toast} />
    </div>
  )
}
