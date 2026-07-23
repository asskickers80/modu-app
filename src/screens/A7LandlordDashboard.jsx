import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import MoreSheet from '../components/MoreSheet'
import { buildListingOwnerSheet } from '../lib/moreSheetConfig'
import Toast from '../components/Toast'
import ProfileSwitchSheet from '../components/ProfileSwitchSheet'
import ProfileChips from '../components/ProfileChips'
import { useProfileSwipe } from '../hooks/useProfileSwipe'
import { useProfileRouteSync } from '../hooks/useProfileRouteSync'
import { ModuMarkHomeButton } from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'
import { getProfile } from '../lib/userProfile'
import ComingSoon from '../components/common/ComingSoon'
import ListingCardRow from '../components/ListingCardRow'
import ProgressGuide from '../components/ProgressGuide'
import MetricsPanel from '../components/MetricsPanel'
import { buildLandlordGuideSteps, landlordIntent } from '../lib/guideSteps'
import { supabase, getDeviceId } from '../lib/supabase'
import { isUnread } from '../lib/unread'
import { manwon } from '../lib/format'
import { sidoFromAddress } from '../lib/regions'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'

function HomeIcon({ active }) {
  const c = active ? TEAL : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={active ? TEAL_BG : 'none'} />
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

const EMPTY_SIGNALS = { inboundCount: 0, ownerReplied: false, firstThreadId: null, firstInquiryAt: null, unansweredCount: 0, unconfirmedCount: 0, unconfirmedThreadId: null }

function dealLabel(deal) {
  return deal === 'sale' ? '매각' : deal === 'both' ? '임대·매각' : '임대'
}

// 헤더 헤드라인 — 의도(0건: A3 답변) → 실상가 집계 승격. 어휘가 의도를 따른다(임대 고정 금지).
function landlordHeadline(count, activeListings, intent, regionPrefix) {
  if (count === 0) {
    if (intent === 'rent') return `${regionPrefix}상가 임차인 찾는 중`
    if (intent === 'sale') return `${regionPrefix}상가 매각 준비 중`
    if (intent === 'both') return '상가 임대·매매 준비 중'
    return '상가 관리 중'
  }
  if (count === 1) {
    const d = activeListings[0].deal_type
    const dl = d === 'sale' ? '매각' : d === 'both' ? '임대·매매' : '임대'
    return `상가 1개 · ${dl}`
  }
  // occupancy 저장 생김 → 공실/임대 중(점유 상태) + 매각(deal) 집계. 0은 생략(과밀 방지).
  const vacantN = activeListings.filter(l => l.occupancy === 'vacant').length
  const occupiedN = activeListings.filter(l => l.occupancy === 'occupied').length
  const saleN = activeListings.filter(l => l.deal_type === 'sale' || l.deal_type === 'both').length
  const parts = [
    vacantN ? `공실 ${vacantN}` : null,
    occupiedN ? `임대 중 ${occupiedN}` : null,
    saleN ? `매각 ${saleN}` : null,
  ].filter(Boolean).join(' · ')
  return `상가 ${count}개${parts ? ` · ${parts}` : ''}`
}
// 빈 상태 등록 CTA — 의도 추종
function ctaLabelFor(intent) {
  return intent === 'rent' ? '상가 등록하고 임차인 찾기'
    : intent === 'sale' ? '상가 등록하고 매수자 찾기' : '상가 등록하기'
}
// 상가 카드 메타 — 임대는 보증/월세, 매각은 매매가, + 주소 (없는 값은 표기 제외 — 더미 금지)
function landlordMeta(l) {
  let money = null
  if (l.deal_type === 'sale') {
    const sale = manwon(l.sale_price)
    money = sale ? `매매 ${sale}` : null
  } else {
    const dep = manwon(l.deposit)
    const rent = manwon(l.monthly_rent)
    if (dep || rent) money = `보증 ${dep ?? '-'} / 월 ${rent ?? '-'}`
  }
  return [dealLabel(l.deal_type), money, l.address].filter(Boolean).join(' · ')
}

export default function A7LandlordDashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('home')
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const profileSwipe = useProfileSwipe(() => setShowProfileSheet(true))
  useProfileRouteSync('landlord')
  const profile = getProfile()
  const { toast, showToast } = useToast()

  const [myListings, setMyListings] = useState([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [guideSignals, setGuideSignals] = useState(EMPTY_SIGNALS)
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [cardsExpanded, setCardsExpanded] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  // 내 상가 조회 — 기기 ID 기준 + listing_type='landlord' (내 상가만)
  useEffect(() => {
    const myId = getDeviceId()
    supabase
      .from('listings')
      .select('*')
      .eq('device_id', myId)
      .eq('listing_type', 'landlord')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setListingsLoading(false); return }
        setMyListings(Array.isArray(data) ? data : [])
        setListingsLoading(false)
      })
  }, [])

  // 예시(example)는 0건 취급 — 진행 판정·헤더 파생의 기준
  const activeListings = myListings.filter(l => l.status !== 'example')
  const primary = activeListings[0]

  // 매물 생기면 지표 자동 펼침
  useEffect(() => {
    if (!listingsLoading && activeListings.length > 0) setMetricsOpen(true)
  }, [listingsLoading, activeListings.length])

  // 문의 판정 신호 — primary 상가가 받은 대화(문의받기·협의시작·새 문의)
  useEffect(() => {
    if (!primary?.id) { setGuideSignals(EMPTY_SIGNALS); return }
    const myId = getDeviceId()
    let cancelled = false
    supabase
      .from('conversations')
      .select('id, sender_id, created_at, last_message_at, sender_last_read_at, receiver_last_read_at')
      .eq('listing_id', primary.id)
      .eq('receiver_id', myId)
      .then(async ({ data: convs, error }) => {
        if (cancelled || error) return
        const list = Array.isArray(convs) ? convs : []
        const ids = list.map(c => c.id)
        if (ids.length === 0) { setGuideSignals(EMPTY_SIGNALS); return }
        const unconfirmed = list.filter(c => isUnread(c, myId))
        const inquirerIds = new Set(list.map(c => c.sender_id))
        const { data: msgs } = await supabase
          .from('messages').select('conversation_id, sender_id').in('conversation_id', ids)
        if (cancelled) return
        const repliedConvs = new Set(
          (Array.isArray(msgs) ? msgs : [])
            .filter(m => m.sender_id !== 'system' && !inquirerIds.has(m.sender_id))
            .map(m => m.conversation_id)
        )
        const first = [...list].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))[0]
        setGuideSignals({
          inboundCount: ids.length,
          ownerReplied: repliedConvs.size > 0,
          firstThreadId: first?.id ?? null,
          firstInquiryAt: first?.created_at ?? null,
          unansweredCount: ids.filter(id => !repliedConvs.has(id)).length,
          unconfirmedCount: unconfirmed.length,
          unconfirmedThreadId: unconfirmed[0]?.id ?? null,
        })
      })
    return () => { cancelled = true }
  }, [primary?.id])

  // 헤더 — 진실의 원천: 등록 상가 있으면 실 deal_type, 없으면 A3 답변(profile.status).
  // 어휘가 의도를 따른다(임대 고정 금지). 점유 상태 '공실/임대중'은 소스 없어 제외(더미 금지).
  const intent = landlordIntent(activeListings, profile.status)
  const count = activeListings.length
  const primaryRegion = primary && sidoFromAddress(primary.address)
  const regionLabel = primaryRegion ?? profile.region ?? '지역 미설정'
  const regionPrefix = regionLabel && regionLabel !== '지역 미설정' ? `${regionLabel} ` : ''
  const headline = landlordHeadline(count, activeListings, intent, regionPrefix)

  const guideSteps = buildLandlordGuideSteps(primary, guideSignals, intent)
  const isNegotiating = !!primary && primary.status === 'negotiating'

  // 최대 3개 표시, 4개째부터 접힘
  const visibleCards = cardsExpanded ? activeListings : activeListings.slice(0, 3)
  const hiddenCount = activeListings.length - visibleCards.length

  return (
    <div className="h-screen flex flex-col overflow-hidden" {...profileSwipe}>

      {/* ── 헤더 ── */}
      <header className="shrink-0 pl-5 pr-4 pt-12 pb-3 bg-white border-b border-gray-50">
        <div className="flex items-center gap-2">
          <ProfileChips onActiveTap={() => setShowProfileSheet(true)} />
          <ModuMarkHomeButton size={44} color="#1683B8" />
          <MoreSheet config={buildListingOwnerSheet({
            listing: null, navigate, showToast,
            updateListingStatus: () => {}, requestComplete: () => {}, scrollToMarket: null,
          })} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-5 pt-5 pb-4">

          {/* ① 인사 + 헤더 (실데이터 파생) */}
          <div className="mb-5">
            <p className="text-[13px] text-gray-400">안녕하세요{profile.name ? `, ${profile.name}님` : ''} 👋</p>
            <h2 className="text-[21px] font-bold text-gray-900 mt-0.5 leading-snug" data-testid="landlord-headline">{headline}</h2>
            <p className="text-[13px] text-gray-400 mt-0.5">{regionLabel} 일대</p>
          </div>

          {/* ② 내 상가 카드 — 0건 등록 CTA / 1건+ 세로 스택(최대 3, 외 N개 접힘) */}
          {!listingsLoading && activeListings.length > 0 ? (
            <div className="mb-4 space-y-2">
              {visibleCards.map(l => (
                <ListingCardRow
                  key={l.id}
                  listing={l}
                  accent={TEAL}
                  accentBg={TEAL_BG}
                  meta={landlordMeta(l)}
                  onClick={() => navigate(`/e2l/${l.id}`)}
                  testId="landlord-listing-card"
                />
              ))}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setCardsExpanded(true)}
                  data-testid="landlord-cards-more"
                  className="w-full text-[13px] font-semibold py-2.5 rounded-2xl border border-gray-100"
                  style={{ color: TEAL, backgroundColor: TEAL_BG }}>
                  외 {hiddenCount}개 더보기
                </button>
              )}
              <button
                onClick={() => navigate('/e1p/1')}
                data-testid="new-landlord-listing"
                className="ml-1 text-[12px] font-semibold active:opacity-60 transition-opacity"
                style={{ color: TEAL }}>
                + 새 상가 등록
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/e1p/1')}
              data-testid="register-landlord-cta"
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 mb-4 active:scale-[0.99] transition-all"
              style={{ backgroundColor: TEAL }}>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-bold text-white" data-testid="landlord-cta-label">{ctaLabelFor(intent)}</p>
                <p className="text-[12px] text-white/60 mt-0.5">주소만 알려주세요. 소개글은 모두가 써드려요.</p>
              </div>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M6 3l6 6-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* ③ 진행 가이드 — 공유 컴포넌트, 임대인 단계 정의. 제목 고정, 문의 어휘는 의도 추종 */}
          <ProgressGuide
            title="🗺️ 상가 진행 가이드"
            steps={guideSteps}
            accent={TEAL}
            accentBg={TEAL_BG}
            negotiating={isNegotiating}
            guideOpen={guideOpen}
            onToggleGuide={() => setGuideOpen(o => !o)}
            summarySub="상가를 '협의 중'으로 바꿨어요"
          />

          {/* ④ 상가 현황 요약 — 실데이터 소스(계약·현황) 없음 → 정직한 준비중. 어휘 중립(임대/매각 공통) */}
          <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: TEAL_BG, border: `1px solid ${TEAL}20` }}>
            <p className="text-[12px] font-medium mb-1" style={{ color: TEAL }}>상가 현황</p>
            <ComingSoon desc="상가별 현황을 한눈에 볼 수 있도록 준비 중이에요" />
          </div>

          {/* ⑤ 상가 지표 · 문의 알림 — 공유 컴포넌트(양도인과 동일 구조) */}
          <MetricsPanel
            title="📊 상가 지표 · 문의 알림"
            accent={TEAL}
            accentBg={TEAL_BG}
            open={metricsOpen}
            onToggle={() => setMetricsOpen(o => !o)}
            signals={guideSignals}
            inboxRoute="/d4/landlord/inbox"
            listingsCount={activeListings.length}
            showToast={showToast}
          />

          {/* ⑥ 오늘의 한 마디 — 임대인 대상 코칭 배치가 아직 없어 준비중 (배치 확장 필요, 보고 참조) */}
          <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: TEAL_BG, border: `1px solid ${TEAL}22` }}>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: TEAL }}>오늘의 한 마디</p>
            <ComingSoon desc="임대인 맞춤 코칭을 준비 중이에요" />
          </div>

          {/* ⑦ 완성도 — "내 상가 정보 완성도"(의도 무관 중립 고정). calcScoreLandlord 배점 미확정(스텁) → 준비중 */}
          <div className="rounded-2xl border border-gray-100 p-4 mb-7" style={{ backgroundColor: '#fafbfb' }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[13px] font-semibold text-gray-700">내 상가 정보 완성도</p>
            </div>
            <ComingSoon desc="상가 정보 완성도 배점을 준비 중이에요" />
          </div>

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
                <span className="text-[10px] font-semibold" style={{ color: active ? TEAL : '#9ca3af' }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
      <Toast message={toast} />
      <ProfileSwitchSheet isOpen={showProfileSheet} onClose={() => setShowProfileSheet(false)} />
    </div>
  )
}
