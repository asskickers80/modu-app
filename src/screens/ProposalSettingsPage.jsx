import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

const STORAGE_KEY = 'modu_proposal_settings'

const CATEGORIES = [
  {
    id: 'interior',
    emoji: '🔨',
    name: '인테리어·간판',
    desc: '매장 인테리어, 리모델링, 간판 시공',
  },
  {
    id: 'facility',
    emoji: '🧰',
    name: '설비·시공',
    desc: '주방설비, 냉난방, 전기·소방 공사',
  },
  {
    id: 'payment_it',
    emoji: '💳',
    name: '결제·IT·보안',
    desc: 'POS, 키오스크, CCTV, 통신·네트워크',
  },
  {
    id: 'food_supply',
    emoji: '📦',
    name: '식자재·물품',
    desc: '식자재 공급, 포장재, 소모품 납품',
  },
  {
    id: 'cleaning',
    emoji: '🧹',
    name: '청소·위생',
    desc: '정기 청소 대행, 방역, 위생 관리',
  },
  {
    id: 'marketing',
    emoji: '📣',
    name: '마케팅·홍보',
    desc: 'SNS 운영, 배너·전단, 사진 촬영',
  },
  {
    id: 'delivery',
    emoji: '🚚',
    name: '배달·물류',
    desc: '배달 대행, 물류 연계, 배송 시스템',
  },
  {
    id: 'staffing',
    emoji: '🧑‍🍳',
    name: '구인·인력',
    desc: '알바·직원 채용, 인력 파견',
  },
  {
    id: 'tax_legal',
    emoji: '🧾',
    name: '세무·회계·법무·노무',
    desc: '세금 신고, 노무 관리, 계약·분쟁',
  },
  {
    id: 'finance',
    emoji: '💰',
    name: '금융·보험',
    desc: '소상공인 대출, 점포 보험, 카드 수수료',
  },
  {
    id: 'brokerage',
    emoji: '🤝',
    name: '중개·컨설팅',
    desc: '창업 컨설팅, 점포 중개, 업종 전환 자문',
  },
  {
    id: 'franchise',
    emoji: '🏪',
    name: '프랜차이즈 본사',
    desc: '가맹 모집, 브랜드 안내, 창업 설명회',
  },
]

const DEFAULT_SETTINGS = Object.fromEntries(CATEGORIES.map(c => [c.id, true]))

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

function Toggle({ on, onChange, color }) {
  return (
    <button
      onClick={onChange}
      className="w-12 h-6 rounded-full transition-all duration-300 relative shrink-0"
      style={{ backgroundColor: on ? color : '#d1d5db' }}>
      <div
        className="absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-300 shadow-sm"
        style={{ left: on ? '26px' : '2px' }}
      />
    </button>
  )
}

export default function ProposalSettingsPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  const profile = getProfile()
  const config = CATEGORY_CONFIG[profile.category] ?? CATEGORY_CONFIG.seller
  const { color, bg } = config

  const [settings, setSettings] = useState(loadSettings)
  const [dirty, setDirty] = useState(false)

  const allOn = CATEGORIES.every(c => settings[c.id])
  const onCount = CATEGORIES.filter(c => settings[c.id]).length

  const toggle = (id) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }))
    setDirty(true)
  }

  const toggleAll = () => {
    const next = !allOn
    setSettings(Object.fromEntries(CATEGORIES.map(c => [c.id, next])))
    setDirty(true)
  }

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    setDirty(false)
    showToast('설정이 저장됐어요 ✅')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-[17px] font-bold text-gray-900">제안 받기 설정</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {onCount === 12 ? '전체 허용 중' : onCount === 0 ? '전체 차단 중' : `${onCount}개 분류 허용 중`}
            </p>
          </div>
          {dirty && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: bg, color }}>
              미저장
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* 안내 카드 */}
        <div className="mx-4 mt-4 mb-4 rounded-2xl p-4 border" style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
          <div className="flex items-start gap-3">
            <span className="text-[20px] shrink-0 mt-0.5">📬</span>
            <div>
              <p className="text-[13px] font-bold text-gray-900 mb-1">기업회원 제안 이중 게이트</p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                ON한 분류의 업체만 저에게 먼저 DM을 보낼 수 있어요.
                OFF하면 해당 분류 업체의 제안이 차단됩니다.
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                  게이트 1 · 내 명시적 동의
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  게이트 2 · 적합도 (자동)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 마스터 전체 토글 */}
        <div className="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[18px] shrink-0"
              style={{ backgroundColor: bg }}>
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-gray-900">전체 허용</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {allOn ? '모든 분류 업체 제안 허용 중' : '일부 분류 차단 중'}
              </p>
            </div>
            <Toggle on={allOn} onChange={toggleAll} color={color} />
          </div>
        </div>

        {/* 12개 분류 토글 */}
        <div className="mx-4 bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {CATEGORIES.map((cat) => {
            const on = settings[cat.id]
            return (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] shrink-0"
                  style={{ backgroundColor: on ? bg : '#f3f4f6' }}>
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-snug"
                    style={{ color: on ? '#111827' : '#9ca3af' }}>
                    {cat.name}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug truncate">{cat.desc}</p>
                </div>
                <Toggle on={on} onChange={() => toggle(cat.id)} color={color} />
              </div>
            )
          })}
        </div>

        {/* 주의사항 */}
        <div className="mx-4 mt-4 rounded-2xl p-3.5 bg-amber-50 border border-amber-100">
          <p className="text-[11px] font-bold text-amber-700 mb-1.5">⚠️ 알아두세요</p>
          <ul className="space-y-1">
            {[
              '기업회원도 게이트 2(적합도)를 통과해야 발신 가능해요',
              'OFF해도 내가 먼저 문의한 경우엔 정상 답변 가능해요',
              '설정 변경은 저장 후 즉시 반영됩니다',
            ].map(t => (
              <li key={t} className="flex items-start gap-1.5 text-[11px] text-amber-700">
                <span className="shrink-0 mt-0.5">•</span>{t}
              </li>
            ))}
          </ul>
        </div>

      </main>

      {/* 저장 버튼 */}
      <div className="shrink-0 px-4 py-4 bg-white border-t border-gray-100">
        <button
          onClick={save}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white transition-all active:scale-[0.98]"
          style={{ backgroundColor: dirty ? color : '#d1d5db' }}>
          {dirty ? '설정 저장하기' : '저장됨'}
        </button>
      </div>

      <Toast message={toast} />
    </div>
  )
}
