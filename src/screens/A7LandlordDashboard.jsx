import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import MoreSheet from '../components/MoreSheet'
import { buildListingOwnerSheet } from '../lib/moreSheetConfig'
import Toast from '../components/Toast'
import ProfileSwitchSheet from '../components/ProfileSwitchSheet'
import ProfileChips from '../components/ProfileChips'
import { useProfileSwipe } from '../hooks/useProfileSwipe'
import { useProfileRouteSync } from '../hooks/useProfileRouteSync'
import { ModuMarkHomeButton, ModuMark } from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'
import { getProfile } from '../lib/userProfile'
import ComingSoon from '../components/common/ComingSoon'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'

function HomeIcon({ active }) {
  const c = active ? TEAL : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round"
        fill={active ? TEAL_BG : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon({ active }) {
  const c = active ? TEAL : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon({ active }) {
  const c = active ? TEAL : '#9ca3af'
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
  const c = active ? TEAL : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon({ active }) {
  const c = active ? TEAL : '#9ca3af'
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

// 임대인은 E1p(상가 등록) Supabase 미연결 — 실자산 데이터가 없어 AI 코칭은 고정 문구
const COACHING_EMPTY = '첫 상가를 등록해보세요. 등록만 해도 절반은 시작이에요.'

const GUIDE_STEPS = [
  { step: '상가 등록', done: true },
  { step: '도면 사진 추가', done: false, current: true },
  { step: '임차인 문의 응대', done: false },
  { step: '조건 협의', done: false },
  { step: '계약서 작성', done: false },
]

export default function A7LandlordDashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('home')
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  // 화면 전체 좌우 스와이프로 프로필 전환
  const profileSwipe = useProfileSwipe(() => setShowProfileSheet(true))
  // 라우트-프로필 동기화 — 뒤로가기·복원 등으로 어긋나면 자동 교정
  useProfileRouteSync('landlord')
  const profile = getProfile()
  const regionLabel = profile.region ?? '지역 미설정'
  const { toast, showToast } = useToast()

  return (
    <div className="h-screen flex flex-col overflow-hidden" {...profileSwipe}>

      {/* ── 상단 헤더 ── */}
      <header className="shrink-0 px-5 pt-12 pb-3 bg-white border-b border-gray-50">
        <div className="flex items-center gap-2">
          <ProfileChips onActiveTap={() => setShowProfileSheet(true)} />
          <ModuMarkHomeButton size={44} color="#1683B8" />
          {/* 양도인과 동일 골격 — 소유주 매물 조회 도입 시 listing 등 실값 연결하면 자동 노출 */}
          <MoreSheet config={buildListingOwnerSheet({
            listing: null, navigate, showToast,
            updateListingStatus: () => {}, requestComplete: () => {}, scrollToMarket: null,
          })} />
        </div>
      </header>

      {/* ── 스크롤 영역 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-5 pt-5 pb-4">

          {/* 인사 */}
          <div className="mb-5">
            <p className="text-[13px] text-gray-400">안녕하세요{profile.name ? `, ${profile.name}님` : ''} 👋</p>
            <h2 className="text-[21px] font-bold text-gray-900 mt-0.5 leading-snug">
              상가 임대 관리 중
            </h2>
            <p className="text-[13px] text-gray-400 mt-0.5">{regionLabel} 일대</p>
          </div>

          {/* AI 오늘의 한 마디 */}
          <div className="rounded-2xl px-4 py-3.5 mb-4"
            style={{ background: `linear-gradient(135deg, #1e6b6b18 0%, #1e6b6b08 100%)`, border: '1px solid #1e6b6b25' }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: TEAL }}>
                <ModuMark size={18} color="#ffffff" highlight={TEAL} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-bold" style={{ color: TEAL }}>오늘의 한 마디</p>
                </div>
                {/* 실자산 데이터 없음 — 가짜 수치 코칭 대신 고정 문구 (Gemini 미호출) */}
                <p className="text-[13px] text-gray-700 leading-snug">{COACHING_EMPTY}</p>
              </div>
            </div>
          </div>

          {/* AI 임대 시세 해석 — 등록 상가(실데이터) 연동 전 */}
          <div className="rounded-2xl px-4 py-3 mb-4 border border-gray-100"
            style={{ backgroundColor: '#f8fcfc' }}>
            <div className="flex items-start gap-2.5">
              <span className="text-[14px] shrink-0 mt-0.5">📊</span>
              <div className="flex-1">
                <p className="text-[11px] font-bold" style={{ color: TEAL }}>모두가 보는 임대 시세</p>
                <ComingSoon desc="상가를 등록하면 모두가 임대 시세를 읽어드려요" />
              </div>
            </div>
          </div>

          {/* E1' 진입 CTA */}
          <button
            onClick={() => navigate('/e1p/1')}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 mb-4 active:scale-[0.99] transition-all"
            style={{ backgroundColor: TEAL }}>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-bold text-white">상가 등록 · 수정하기</p>
              <p className="text-[12px] text-white/60 mt-0.5">주소만 알려주세요. 소개글은 모두가 써드려요.</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6 3l6 6-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* ① 자산 현황 — E1p 실연결 전 */}
          <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: TEAL_BG, border: `1px solid ${TEAL}20` }}>
            <p className="text-[12px] font-medium mb-1" style={{ color: TEAL }}>보유 자산</p>
            <ComingSoon desc="상가를 등록하면 자산 현황이 표시돼요" />
          </div>

          {/* ② 조회·관심·문의 — 집계 연동 전이라 수치 자리만 유지 */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: '조회', teal: false },
              { label: '관심', teal: false },
              { label: '문의', teal: true },
            ].map(item => (
              <div key={item.label}
                className="rounded-2xl border border-gray-100 p-3 text-center"
                style={item.teal ? { backgroundColor: TEAL_BG, borderColor: `${TEAL}30` } : {}}>
                <ComingSoon compact />
                <p className="text-[11px] text-gray-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {/* ③ 임차·매수 문의 분기 — 실 문의는 인박스에서 확인 (건수 집계 연동 전) */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div onClick={() => navigate('/d4/landlord/inbox')}
              className="rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform"
              style={{ backgroundColor: TEAL_BG, border: `1.5px solid ${TEAL}25` }}>
              <p className="text-[12px] text-gray-400 mb-1">임차 문의</p>
              <ComingSoon compact />
              <p className="text-[11px] text-gray-400 mt-1.5 font-semibold">확인 →</p>
            </div>
            <div onClick={() => navigate('/d4/landlord/inbox')}
              className="rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform"
              style={{ backgroundColor: '#fef9f0', border: '1.5px solid #f0d080' }}>
              <p className="text-[12px] text-gray-400 mb-1">매수 문의</p>
              <ComingSoon compact />
              <p className="text-[11px] text-gray-400 mt-1.5 font-semibold">확인 →</p>
            </div>
          </div>

          {/* ④ 자산별 카드 */}
          <div className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">자산별 현황</p>
              <button onClick={() => navigate('/e1p/1')} className="text-[12px] font-medium" style={{ color: TEAL }}>+ 상가 추가</button>
            </div>
            <div className="rounded-2xl border border-gray-100" style={{ backgroundColor: '#fafbff' }}>
              <ComingSoon desc="+ 상가 추가로 등록하면 자산별 현황이 표시돼요" />
            </div>
          </div>

          {/* AI 큐레이션 구분선 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[12px] font-semibold text-gray-400">모두가 찾아온 알짜 정보</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* ⑤ 임대 시장 동향 — 실거래·상권 데이터 연동 전 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📈 임대 시장 동향</p>
            </div>
            <div className="rounded-2xl border border-gray-100">
              <ComingSoon desc="임대 시세·공실률 데이터를 연동하고 있어요" />
            </div>
          </section>

          {/* ⑥ 관련 업체 추천 — 기업회원 입점 전 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">🤝 관련 업체</p>
            </div>
            <div className="rounded-2xl border border-gray-100">
              <ComingSoon desc="기업회원 입점 후 실제 업체가 표시돼요" />
            </div>
          </section>

          {/* ⑦ 관심 콘텐츠 — 콘텐츠 제작 전 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📰 이것만은 꼭!</p>
            </div>
            <div className="rounded-2xl border border-gray-100">
              <ComingSoon desc="임대 노하우 콘텐츠를 준비하고 있어요" />
            </div>
          </section>

          {/* ⑧ 임대 가이드 */}
          <section className="mb-4">
            <p className="text-[14px] font-bold text-gray-900 mb-3">📋 임대 진행 단계</p>
            <div className="relative pl-5">
              {GUIDE_STEPS.map((s, i) => (
                <div key={s.step} className="flex items-start gap-3 pb-4 last:pb-0">
                  <div className="absolute left-0 top-0 bottom-0 w-px"
                    style={{ backgroundColor: '#e5e7eb', marginTop: '10px' }} />
                  <div className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: s.done ? TEAL : s.current ? TEAL_BG : '#e5e7eb',
                      border: s.current ? `2px solid ${TEAL}` : 'none',
                    }}>
                    {s.done ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: s.current ? TEAL : '#9ca3af' }} />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold"
                      style={{ color: s.done ? '#6b7280' : s.current ? TEAL : '#9ca3af' }}>
                      {s.step}
                    </p>
                    {s.current && (
                      <p className="text-[11px] mt-0.5" style={{ color: TEAL }}>← 지금 여기</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

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
                  if (tab.id === 'message') { navigate('/d4/landlord/inbox'); return }
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
                  style={{ color: active ? TEAL : '#9ca3af' }}>
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
