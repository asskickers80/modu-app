import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import MoreSheet from '../components/MoreSheet'
import HomeHeaderBar from '../components/HomeHeaderBar'
import { buildBusinessSheet } from '../lib/moreSheetConfig'
import Toast from '../components/Toast'
import ProfileSwitchSheet from '../components/ProfileSwitchSheet'
import { useProfileSwipe } from '../hooks/useProfileSwipe'
import { useProfileRouteSync } from '../hooks/useProfileRouteSync'
import { ModuMark } from '../components/ModuMark'
import BottomNav from '../components/BottomNav'
import { getProfile } from '../lib/userProfile'
import { supabase, getDeviceId } from '../lib/supabase'
import { countPhoneInquiries } from '../lib/inquiryLedger'
import ComingSoon from '../components/common/ComingSoon'
import DemandSignalCard from '../components/DemandSignalCard'

// 노출·전환 실집계 연동 전 — 가짜 수치 코칭 대신 고정 문구 (Gemini 미호출)
const COACHING_EMPTY = '노출 페이지를 다듬어보세요. 트리거를 채울수록 매칭이 정확해져요.'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DARK = '#5c3478'
const PURPLE_DEEP = '#2d1a4a'

// ── 아이콘 ─────────────────────────────────────────────────

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
        <span className="w-4 h-4 rounded-sm flex items-center justify-center text-t9 font-black text-white"
          style={{ backgroundColor: PURPLE }}>{num}</span>
        <p className="text-t14 font-bold text-gray-900">{title}</p>
      </div>
      {action && (
        <button onClick={onAction} className="text-t12 font-medium" style={{ color: PURPLE }}>
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
        <ComingSoon desc="실제 문의(DM)·모두가 추천한 수요가 도착하면 여기 표시돼요" />
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
            <p className="text-t10 text-gray-400">{label}</p>
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
          className="w-full py-3 rounded-xl text-t13 font-bold text-white"
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
        <p className="text-t11 text-gray-400">{bizTypeLabel} · {regionLabel}</p>
        <ComingSoon desc="동종 업체 성과 비교 데이터를 준비하고 있어요" />
      </Card>
    </section>
  )
}

// ── 슬롯 ⑥ 구독·결제 ───────────────────────────────────

function Slot6Subscription({ navigate }) {
  // 현재 플랜 '무료'는 사실이라 표시. 미출시 프리미엄(업그레이드·🔒잠금)은 팔지 않는다 — 정직한 준비중.
  return (
    <section className="mb-5">
      <SlotHeader num="⑥" title="구독·결제" action="관리 →" onAction={() => navigate('/my')} />
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-t22">🟣</span>
          <div className="flex-1">
            <p className="text-t13 font-bold text-gray-900">무료 플랜</p>
            <p className="text-t11 text-gray-400">지금은 12분류 표준 알림을 무료로 쓰고 있어요</p>
          </div>
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
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  // 화면 전체 좌우 스와이프로 프로필 전환
  const profileSwipe = useProfileSwipe(() => setShowProfileSheet(true))
  // 라우트-프로필 동기화 — 뒤로가기·복원 등으로 어긋나면 자동 교정
  useProfileRouteSync('business')
  const { toast, showToast } = useToast()
  const profile = getProfile()
  const bizTypeLabel = profile.bizTypeLabel ?? '내 업체'
  const bizTypeEmoji = profile.bizTypeEmoji ?? '🏢'
  const regionLabel = profile.region ?? '지역 미설정'
  // 전화 문의 건수 — 원장 집계만 (누가 걸었는지는 조회하지 않는다, PRICING §2-b). 원장 부재·실패면 표시 생략
  const [phoneCount, setPhoneCount] = useState(null)
  const [isRealestate, setIsRealestate] = useState(false) // 수요 신호 카드 대상(부동산·양도 상담 카테고리)
  useEffect(() => {
    let alive = true
    supabase.from('listings').select('*').eq('device_id', getDeviceId()).eq('listing_type', 'business')
      .then(({ data }) => {
        const rows = data ?? []
        if (alive) setIsRealestate(rows.some(r => r.biz_category === 'realestate'))
        return countPhoneInquiries(rows.map(r => r.id))
      })
      .then(n => { if (alive) setPhoneCount(n) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden" {...profileSwipe}>

      {/* ── 헤더 (보라색 모드) ── */}
      <header className="shrink-0" style={{ backgroundColor: PURPLE_DEEP }}>
        {/* 알림 벨(껍데기+가짜 점) 제거 — header-unify. 검증 뱃지는 badge 슬롯(축 데이터 차이) */}
        <HomeHeaderBar
          showToast={showToast}
          dark markColor="rgba(255,255,255,0.9)" markHighlight="none"
          onProfileTap={() => setShowProfileSheet(true)}
          badge={
            <span className="shrink-0 text-t11 font-bold text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-900/40">
              🛡️ 검증됨
            </span>
          }
          more={<MoreSheet dark className="ml-1" config={buildBusinessSheet({ navigate, showToast })} />}
        />

        <div className="px-5 pb-4">
          <p className="text-t13 text-purple-300 mb-0.5">{profile.name ? `${profile.name}님의 ` : ''}영업 상황판</p>
          <p className="text-t20 font-black text-white">{bizTypeEmoji} {bizTypeLabel}</p>
          <p className="text-t12 text-purple-300 mt-0.5">{regionLabel} · {bizTypeLabel}</p>
        </div>

        {/* 오늘 요약 — 집계 연동 전이라 수치 자리만 유지 (다크 헤더라 compact 대신 직접 표기) */}
        <div className="px-5 pb-3 grid grid-cols-3 gap-2">
          {['오늘 조회', '신규 문의', '모두 추천'].map(label => (
            <div key={label}
              className="rounded-xl py-2.5 text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-t13 font-bold text-purple-300 leading-[18px]">준비중</p>
              <p className="text-t10 text-purple-300">{label}</p>
            </div>
          ))}
        </div>

        {Number.isFinite(phoneCount) && (
          <p className="px-5 pb-2 text-t12 text-purple-300" data-testid="phone-inquiry-count">전화 문의 {phoneCount}건</p>
        )}

        {/* Push 영업하기 버튼 */}
        <div className="px-5 pb-4">
          <button onClick={() => navigate('/business/push')}
            className="w-full py-3 rounded-2xl text-t13 font-bold flex items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span>🚀</span> 능동 영업하기 (Push 발신)
          </button>
        </div>
      </header>

      {/* ── 스크롤 피드 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6">

          <div className="text-t11 font-bold text-gray-300 mb-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span>영업 상황판</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* AI 오늘의 한 마디 */}
          <div className="rounded-2xl px-4 py-3.5 mb-5"
            style={{ background: `linear-gradient(135deg, #7d4ba318 0%, #7d4ba308 100%)`, border: '1px solid #7d4ba325' }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: PURPLE }}>
                <ModuMark size={18} color="#ffffff" highlight={PURPLE} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-t12 font-bold" style={{ color: PURPLE }}>오늘의 한 마디</p>
                </div>
                {/* 노출 데이터 실연결 전 — 가짜 수치 코칭 대신 고정 문구 (Gemini 미호출) */}
                <p className="text-t13 text-gray-700 leading-snug">{COACHING_EMPTY}</p>
              </div>
            </div>
          </div>

          {/* 양도 검토 신호 집계 — 부동산·양도 상담 기업회원에게만, 표본 미달이면 없음 (파트 C4) */}
          <DemandSignalCard enabled={isRealestate} />
          <Slot1Alerts navigate={navigate} />
          <Slot2Performance navigate={navigate} />

          {/* AI 노출 성과 해석 — 노출 데이터(실집계) 연동 전 */}
          <div className="rounded-2xl px-4 py-3 mb-5 border border-gray-100"
            style={{ backgroundColor: PURPLE_BG }}>
            <div className="flex items-start gap-2.5">
              <span className="text-t14 shrink-0 mt-0.5">🔍</span>
              <div className="flex-1">
                <p className="text-t11 font-bold" style={{ color: PURPLE }}>모두가 보는 성과 해석</p>
                <ComingSoon desc="노출 데이터가 쌓이면 모두가 성과를 해석해드려요" />
              </div>
            </div>
          </div>

          <Slot3Missed />
          <Slot4Page navigate={navigate} />

          <div className="text-t11 font-bold text-gray-300 my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span>모두가 찾아온 알짜 정보</span>
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
      <BottomNav active="home" accent={PURPLE} />

    </div>
  )
}
