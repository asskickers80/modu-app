import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import ProfileSwitchSheet from '../components/ProfileSwitchSheet'
import ProfileChips from '../components/ProfileChips'
import { useProfileSwipe } from '../hooks/useProfileSwipe'
import { useProfileRouteSync } from '../hooks/useProfileRouteSync'
import { ModuMarkHomeButton } from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'
import { getProfile } from '../lib/userProfile'
import ComingSoon from '../components/common/ComingSoon'

const GREEN = '#2d7a4f'
const GREEN_BG = '#edf7f1'

// 운영 데이터(POS·매출 입력) 실연결 전 — 가짜 수치 코칭 대신 고정 문구 (Gemini 미호출)
const COACHING_EMPTY = '오늘 매출을 입력해보세요. 기록이 쌓이면 AI가 코칭해드려요.'

// ── 아이콘 ─────────────────────────────────────────────────

function HomeIcon({ active }) {
  const c = active ? GREEN : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={active ? GREEN_BG : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon({ active }) {
  const c = active ? GREEN : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon({ active }) {
  const c = active ? GREEN : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
function MessageIcon({ active }) {
  const c = active ? GREEN : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon({ active }) {
  const c = active ? GREEN : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" />
      <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const NAV_TABS = [
  { id: 'home', label: '홈', Icon: HomeIcon },
  { id: 'explore', label: '탐색', Icon: ExploreIcon },
  { id: 'community', label: '커뮤니티', Icon: CommunityIcon },
  { id: 'message', label: '메시지', Icon: MessageIcon },
  { id: 'my', label: '마이', Icon: MyIcon },
]

// ── 섹션 헤더 ─────────────────────────────────────────────

function SlotHeader({ num, title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black text-white"
          style={{ backgroundColor: GREEN }}>
          {num}
        </span>
        <p className="text-[14px] font-bold text-gray-900">{title}</p>
      </div>
      {action && (
        <button onClick={onAction} className="text-[12px] font-medium" style={{ color: GREEN }}>
          {action}
        </button>
      )}
    </div>
  )
}

// ── 공통 카드 래퍼 ─────────────────────────────────────────

function Card({ children, className = '', style = {} }) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-100 p-4 ${className}`} style={style}>
      {children}
    </div>
  )
}

// ── 슬롯 ① 오늘 매출 ──────────────────────────────────────

function Slot1Sales({ navigate }) {
  return (
    <section className="mb-5">
      <Card style={{ background: `linear-gradient(135deg, ${GREEN}10 0%, ${GREEN}05 100%)`, borderColor: GREEN + '20' }}>
        <div className="flex items-start justify-between">
          <p className="text-[12px] font-semibold text-gray-400">오늘 매출</p>
          <button onClick={() => navigate('/operating/sales-input')}
            className="px-3 py-1.5 rounded-xl text-[12px] font-bold border-2"
            style={{ borderColor: GREEN, color: GREEN }}>
            입력
          </button>
        </div>
        <ComingSoon desc="매출을 입력하면 오늘 현황과 주간 추이가 표시돼요" />
      </Card>
    </section>
  )
}

// ── 슬롯 ② 이번 주 진행 ───────────────────────────────────

function Slot2Weekly() {
  return (
    <section className="mb-5">
      <SlotHeader num="②" title="이번 주 모두 앱" />
      <div className="grid grid-cols-3 gap-2.5">
        {['조회', '찜', '문의'].map(label => (
          <Card key={label}>
            <p className="text-[11px] text-gray-400 mb-1">{label}</p>
            <ComingSoon compact />
          </Card>
        ))}
      </div>
    </section>
  )
}

// ── 슬롯 ③ 오늘 할 일 ─────────────────────────────────────

function Slot3Todo() {
  return (
    <section className="mb-5">
      <SlotHeader num="③" title="오늘 할 일" />
      <Card>
        <ComingSoon desc="할 일 관리 기능을 준비하고 있어요" />
      </Card>
    </section>
  )
}

// ── 슬롯 ④ 가게 데이터 완성도 ────────────────────────────

function Slot4Completeness() {
  return (
    <section className="mb-5">
      <SlotHeader num="④" title="가게 프로필 완성도" />
      <Card>
        <ComingSoon desc="가게 프로필 기능을 준비하고 있어요" />
      </Card>
    </section>
  )
}

// ── 슬롯 ⑤ 동종 비교 + 양도 시세 ────────────────────────

function Slot5Market({ bizLabel, regionLabel }) {
  return (
    <section className="mb-5">
      <SlotHeader num="⑤" title="동종 업종 시장 동향" />
      <Card>
        <p className="text-[11px] text-gray-400">{bizLabel} · {regionLabel}</p>
        <ComingSoon desc="동종 시세·상권 데이터를 연동하고 있어요" />
      </Card>
    </section>
  )
}

// ── 슬롯 ⑥ 자주 찾는 업체 ────────────────────────────────

function Slot6Vendors() {
  return (
    <section className="mb-5">
      <SlotHeader num="⑥" title="자주 찾는 업체" />
      <Card>
        <ComingSoon desc="기업회원 입점 후 실제 업체가 표시돼요" />
      </Card>
    </section>
  )
}

// ── 슬롯 ⑦ 운영 콘텐츠 ───────────────────────────────────

function Slot7Contents() {
  return (
    <section className="mb-5">
      <SlotHeader num="⑦" title="운영 콘텐츠" />
      <Card>
        <ComingSoon desc="운영 노하우 콘텐츠를 준비하고 있어요" />
      </Card>
    </section>
  )
}

// ── 슬롯 ⑧ 운영 가이드 ───────────────────────────────────

function Slot8Guides() {
  return (
    <section className="mb-2">
      <SlotHeader num="⑧" title="운영 가이드" />
      <Card>
        <ComingSoon desc="세무·정책자금 가이드를 준비하고 있어요" />
      </Card>
    </section>
  )
}

// ── 메인 ─────────────────────────────────────────────────

export default function A7OperatingDashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('home')
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  // 화면 전체 좌우 스와이프로 프로필 전환
  const profileSwipe = useProfileSwipe(() => setShowProfileSheet(true))
  // 라우트-프로필 동기화 — 뒤로가기·복원 등으로 어긋나면 자동 교정
  useProfileRouteSync('operating')
  const { toast, showToast } = useToast()
  const profile = getProfile()
  const bizLabel = profile.bizLabel ?? '내 가게'
  const regionLabel = profile.region ?? '지역 미설정'


  return (
    <div className="h-screen flex flex-col overflow-hidden" {...profileSwipe}>

      {/* ── 헤더 ── */}
      <header className="shrink-0 bg-white border-b border-gray-50">
        <div className="flex items-center gap-2 px-5 pt-12 pb-3">
          <ProfileChips onActiveTap={() => setShowProfileSheet(true)} />
          <ModuMarkHomeButton size={44} color="#1683B8" />
          {/* 알림 */}
          <button onClick={() => showToast('알림 준비 중이에요 🚧')} className="relative w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a5 5 0 015 5v2.5l1 1.5H2l1-1.5V7a5 5 0 015-5z"
                stroke="#6b7280" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M6.5 13a1.5 1.5 0 003 0" stroke="#6b7280" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
          </button>
          {/* 설정 */}
          <button onClick={() => navigate('/my')} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center ml-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="#6b7280" strokeWidth="1.4" />
              <path d="M8 2v1M8 13v1M2 8h1M13 8h1M3.76 3.76l.71.71M11.53 11.53l.71.71M3.76 12.24l.71-.71M11.53 4.47l.71-.71"
                stroke="#6b7280" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* 가게 이름 행 */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2">
            <p className="text-[18px] font-black text-gray-900">{profile.name ? `${profile.name}님의 가게` : '내 가게'}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: GREEN }}>영업중</span>
          </div>
          <p className="text-[12px] text-gray-400 mt-0.5">{regionLabel} · {bizLabel}</p>
        </div>
      </header>

      {/* ── 스크롤 피드 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6">

          {/* 구분선 */}
          <div className="text-[11px] font-bold text-gray-300 mb-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span>내 가게 데이터</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* AI 오늘의 한 마디 */}
          <div className="rounded-2xl px-4 py-3.5 mb-5"
            style={{ background: `linear-gradient(135deg, #2d7a4f18 0%, #2d7a4f08 100%)`, border: '1px solid #2d7a4f25' }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black text-white"
                style={{ backgroundColor: GREEN }}>
                AI
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-bold" style={{ color: GREEN }}>오늘의 한 마디</p>
                </div>
                <p className="text-[13px] text-gray-700 leading-snug">{COACHING_EMPTY}</p>
              </div>
            </div>
          </div>

          <Slot1Sales navigate={navigate} />

          {/* AI 운영 진단 — 매출 데이터(실입력) 연동 전 */}
          <div className="rounded-2xl px-4 py-3 mb-5 border border-gray-100"
            style={{ backgroundColor: '#f5fbf7' }}>
            <div className="flex items-start gap-2.5">
              <span className="text-[14px] shrink-0 mt-0.5">🔍</span>
              <div className="flex-1">
                <p className="text-[11px] font-bold" style={{ color: GREEN }}>AI 운영 진단</p>
                <ComingSoon desc="매출 기록이 쌓이면 AI가 운영을 진단해드려요" />
              </div>
            </div>
          </div>

          <Slot2Weekly />
          <Slot3Todo />
          <Slot4Completeness />

          <div className="text-[11px] font-bold text-gray-300 my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span>AI 큐레이션</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <Slot5Market bizLabel={bizLabel} regionLabel={regionLabel} />
          <Slot6Vendors />
          <Slot7Contents />
          <Slot8Guides />

        </div>
      </main>

      {/* ── 하단 네비 ── */}
      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {NAV_TABS.map(tab => {
            const active = activeNav === tab.id
            return (
              <button key={tab.id}
                onClick={() => {
                  if (tab.id === 'message') { navigate('/d4/operating/inbox'); return }
                  if (tab.id === 'explore') { navigate('/explore'); return }
                  if (tab.id === 'community') { navigate('/community'); return }
                  if (tab.id === 'my') { navigate('/my'); return }
                  setActiveNav(tab.id)
                }}
                className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95">
                <span className="relative">
                  <tab.Icon active={active} />
                  {tab.id === 'message' && <MessageTabDot />}
                </span>
                <span className="text-[10px] font-semibold"
                  style={{ color: active ? GREEN : '#9ca3af' }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
      <Toast message={toast} />
      <ProfileSwitchSheet isOpen={showProfileSheet} onClose={() => setShowProfileSheet(false)} />
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
