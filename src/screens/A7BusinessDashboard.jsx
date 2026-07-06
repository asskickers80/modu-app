import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import ProfileSwitchSheet from '../components/ProfileSwitchSheet'
import ModuMark from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'
import { getProfile } from '../lib/userProfile'
import ComingSoon from '../components/common/ComingSoon'

// 노출·전환 실집계 연동 전 — 가짜 수치 코칭 대신 고정 문구 (Gemini 미호출)
const COACHING_EMPTY = '노출 페이지를 다듬어보세요. 트리거를 채울수록 매칭이 정확해져요.'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DARK = '#5c3478'
const PURPLE_DEEP = '#2d1a4a'

// ── 아이콘 ─────────────────────────────────────────────────
function HomeIcon({ active }) {
  const c = active ? PURPLE : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={active ? PURPLE_BG : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon({ active }) {
  const c = active ? PURPLE : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon({ active }) {
  const c = active ? PURPLE : '#9ca3af'
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
  const c = active ? PURPLE : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon({ active }) {
  const c = active ? PURPLE : '#9ca3af'
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

function Card({ children, className = '', style = {} }) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-100 p-4 ${className}`} style={style}>
      {children}
    </div>
  )
}

function SlotHeader({ num, title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black text-white"
          style={{ backgroundColor: PURPLE }}>{num}</span>
        <p className="text-[14px] font-bold text-gray-900">{title}</p>
      </div>
      {action && (
        <button onClick={onAction} className="text-[12px] font-medium" style={{ color: PURPLE }}>
          {action}
        </button>
      )}
    </div>
  )
}

// ── 슬롯 ① 오늘의 알림 ───────────────────────────────────

function Slot1Alerts({ navigate }) {
  return (
    <section className="mb-5">
      <SlotHeader num="①" title="오늘의 알림" action="메시지함 →" onAction={() => navigate('/d4/business/inbox')} />
      <Card>
        <ComingSoon desc="실제 문의(DM)·AI 추천 수요가 도착하면 여기 표시돼요" />
      </Card>
    </section>
  )
}

// ── 슬롯 ② 내 노출 성과 ───────────────────────────────────

function Slot2Performance({ navigate }) {
  return (
    <section className="mb-5">
      <SlotHeader num="②" title="내 노출 성과" action="상세 →" onAction={() => navigate('/business/performance')} />
      <div className="grid grid-cols-4 gap-2">
        {['본', '검색', '문의', '전환'].map(label => (
          <Card key={label} className="!p-3 text-center">
            <p className="text-[10px] text-gray-400">{label}</p>
            <div className="mt-1"><ComingSoon compact /></div>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ── 슬롯 ③ 놓친 수요 (FOMO 미끼) ─────────────────────────

function Slot3Missed() {
  return (
    <section className="mb-5">
      <SlotHeader num="③" title="놓친 수요" />
      <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white">
        <ComingSoon desc="지역별 놓친 수요 집계를 준비하고 있어요" />
      </div>
    </section>
  )
}

// ── 슬롯 ④ 내 노출 페이지 다듬기 ─────────────────────────

function Slot4Page({ navigate }) {
  return (
    <section className="mb-5">
      <SlotHeader num="④" title="내 노출 페이지" action="수정하기" onAction={() => navigate('/e1b/1')} />
      <Card>
        <ComingSoon desc="노출 페이지를 등록하면 완성도가 표시돼요" />
        <button onClick={() => navigate('/e1b/1')}
          className="w-full py-3 rounded-xl text-[13px] font-bold text-white"
          style={{ backgroundColor: PURPLE }}>
          페이지 다듬기
        </button>
      </Card>
    </section>
  )
}

// ── 슬롯 ⑤ 동종 비교 ────────────────────────────────────

function Slot5Compare({ bizTypeLabel, regionLabel }) {
  return (
    <section className="mb-5">
      <SlotHeader num="⑤" title="동종 비교" />
      <Card>
        <p className="text-[11px] text-gray-400">{bizTypeLabel} · {regionLabel}</p>
        <ComingSoon desc="동종 업체 성과 비교 데이터를 준비하고 있어요" />
      </Card>
    </section>
  )
}

// ── 슬롯 ⑥ 구독·결제 ───────────────────────────────────

function Slot6Subscription({ navigate, showToast }) {
  return (
    <section className="mb-5">
      <SlotHeader num="⑥" title="구독·결제" action="관리 →" onAction={() => navigate('/my')} />
      <Card>
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
          <span className="text-[22px]">🟣</span>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-gray-900">무료 플랜</p>
            <p className="text-[11px] text-gray-400">12분류 표준 알림 · 표준 속도</p>
          </div>
          <button onClick={() => navigate('/my/membership')} className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white"
            style={{ backgroundColor: PURPLE }}>
            업그레이드
          </button>
        </div>
        <div className="space-y-2">
          {[
            { label: '인접 분류 알림 (프리미엄)', locked: true },
            { label: '먼저 받기 · 속도 우선', locked: true },
            { label: '놓친 수요 상세 열람', locked: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-[12px] text-gray-400">
              <span>🔒</span>{item.label}
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}

// ── 슬롯 ⑦ 업계 동향 ───────────────────────────────────

function Slot7Trends() {
  return (
    <section className="mb-5">
      <SlotHeader num="⑦" title="업계 동향" />
      <Card>
        <ComingSoon desc="업계 리포트·뉴스 콘텐츠를 준비하고 있어요" />
      </Card>
    </section>
  )
}

// ── 슬롯 ⑧ 광고 팁 ─────────────────────────────────────

function Slot8Tips() {
  return (
    <section className="mb-2">
      <SlotHeader num="⑧" title="노출 팁" />
      <div className="rounded-2xl border border-gray-100 bg-white">
        <ComingSoon desc="노출 최적화 팁을 준비하고 있어요" />
      </div>
    </section>
  )
}

// ── 메인 ─────────────────────────────────────────────────

export default function A7BusinessDashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('home')
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const { toast, showToast } = useToast()
  const profile = getProfile()
  const bizTypeLabel = profile.bizTypeLabel ?? '내 업체'
  const bizTypeEmoji = profile.bizTypeEmoji ?? '🏢'
  const regionLabel = profile.region ?? '지역 미설정'

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#faf8ff' }}>

      {/* ── 헤더 (보라색 모드) ── */}
      <header className="shrink-0" style={{ backgroundColor: PURPLE_DEEP }}>
        <div className="flex items-center gap-2 px-5 pt-12 pb-3">
          <button onClick={() => setShowProfileSheet(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border border-white/20 active:opacity-80"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'white' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-300" />
            기업회원
          </button>
          <span className="text-[11px] font-bold text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-900/40">
            🛡️ 검증됨
          </span>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <ModuMark size={26} color="rgba(255,255,255,0.9)" highlight="none" />
              <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.9)' }}>모두</span>
            </div>
          </div>
          <button onClick={() => showToast('알림 준비 중이에요 🚧')} className="relative w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a5 5 0 015 5v2.5l1 1.5H2l1-1.5V7a5 5 0 015-5z"
                stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M6.5 13a1.5 1.5 0 003 0" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-400" />
          </button>
        </div>

        <div className="px-5 pb-4">
          <p className="text-[13px] text-purple-300 mb-0.5">영업 상황판</p>
          <p className="text-[20px] font-black text-white">{bizTypeEmoji} {bizTypeLabel}</p>
          <p className="text-[12px] text-purple-300 mt-0.5">{regionLabel} · {bizTypeLabel}</p>
        </div>

        {/* 오늘 요약 — 집계 연동 전이라 수치 자리만 유지 (다크 헤더라 compact 대신 직접 표기) */}
        <div className="px-5 pb-3 grid grid-cols-3 gap-2">
          {['오늘 조회', '신규 문의', 'AI 추천'].map(label => (
            <div key={label}
              className="rounded-xl py-2.5 text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-[13px] font-bold text-purple-300 leading-[18px]">준비중</p>
              <p className="text-[10px] text-purple-300">{label}</p>
            </div>
          ))}
        </div>

        {/* Push 영업하기 버튼 */}
        <div className="px-5 pb-4">
          <button onClick={() => navigate('/business/push')}
            className="w-full py-3 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span>🚀</span> 능동 영업하기 (Push 발신)
          </button>
        </div>
      </header>

      {/* ── 스크롤 피드 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6">

          <div className="text-[11px] font-bold text-gray-300 mb-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span>영업 상황판</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* AI 오늘의 한 마디 */}
          <div className="rounded-2xl px-4 py-3.5 mb-5"
            style={{ background: `linear-gradient(135deg, #7d4ba318 0%, #7d4ba308 100%)`, border: '1px solid #7d4ba325' }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black text-white"
                style={{ backgroundColor: PURPLE }}>
                AI
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-bold" style={{ color: PURPLE }}>오늘의 한 마디</p>
                </div>
                {/* 노출 데이터 실연결 전 — 가짜 수치 코칭 대신 고정 문구 (Gemini 미호출) */}
                <p className="text-[13px] text-gray-700 leading-snug">{COACHING_EMPTY}</p>
              </div>
            </div>
          </div>

          <Slot1Alerts navigate={navigate} />
          <Slot2Performance navigate={navigate} />

          {/* AI 노출 성과 해석 — 노출 데이터(실집계) 연동 전 */}
          <div className="rounded-2xl px-4 py-3 mb-5 border border-gray-100"
            style={{ backgroundColor: PURPLE_BG }}>
            <div className="flex items-start gap-2.5">
              <span className="text-[14px] shrink-0 mt-0.5">🔍</span>
              <div className="flex-1">
                <p className="text-[11px] font-bold" style={{ color: PURPLE }}>AI 성과 해석</p>
                <ComingSoon desc="노출 데이터가 쌓이면 AI가 성과를 해석해드려요" />
              </div>
            </div>
          </div>

          <Slot3Missed />
          <Slot4Page navigate={navigate} />

          <div className="text-[11px] font-bold text-gray-300 my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span>AI 큐레이션</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <Slot5Compare bizTypeLabel={bizTypeLabel} regionLabel={regionLabel} />
          <Slot6Subscription navigate={navigate} showToast={showToast} />
          <Slot7Trends />
          <Slot8Tips />

        </div>
      </main>

      <Toast message={toast} />
      <ProfileSwitchSheet isOpen={showProfileSheet} onClose={() => setShowProfileSheet(false)} />
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
      {/* ── 하단 네비 ── */}
      <nav className="shrink-0 bg-white border-t border-gray-100">
        <div className="flex items-center">
          {NAV_TABS.map(tab => {
            const active = activeNav === tab.id
            return (
              <button key={tab.id}
                onClick={() => {
                  if (tab.id === 'message') { navigate('/d4/business/inbox'); return }
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
                  style={{ color: active ? PURPLE : '#9ca3af' }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

    </div>
  )
}
