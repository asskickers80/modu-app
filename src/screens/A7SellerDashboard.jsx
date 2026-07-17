import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, saveProfile } from '../lib/userProfile'
import ProfileChips from '../components/ProfileChips'
import { useProfileSwipe } from '../hooks/useProfileSwipe'
import ProfileSwitchSheet from '../components/ProfileSwitchSheet'
import { ModuMarkHomeButton } from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'
import { supabase, getDeviceId } from '../lib/supabase'
import { calcScore, listingToScoreInput } from '../lib/completeness'
import { clearE1Draft } from './e1/E1Context'
import ComingSoon from '../components/common/ComingSoon'

// 부드러운 접힘/펼침 (A3·A4와 동일 기법)
function Collapse({ open, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
      <div style={{ overflow: 'hidden', visibility: open ? 'visible' : 'hidden', transition: 'visibility 0.3s' }}>{children}</div>
    </div>
  )
}

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const GREEN = '#22c55e'

function formatManwon(val) {
  if (!val) return null
  const n = parseInt(String(val).replace(/[^0-9]/g, ''), 10)
  if (!n || isNaN(n)) return String(val)
  return `${n.toLocaleString()}만원`
}

// ── 하단 네비 아이콘 ───────────────────────────────────────
function HomeIcon({ active }) {
  const c = active ? NAVY : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round"
        fill={active ? NAVY_BG : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon({ active }) {
  const c = active ? NAVY : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon({ active }) {
  const c = active ? NAVY : '#9ca3af'
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
  const c = active ? NAVY : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon({ active }) {
  const c = active ? NAVY : '#9ca3af'
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

const COACHING_FALLBACK = '매물이 공개 중이에요. 사진을 추가하면 양수자 관심이 더 높아져요.'
const COACHING_EMPTY = '첫 매물을 등록해보세요. 등록만 해도 절반은 시작이에요.'

function formatPubDate(pubDate) {
  if (!pubDate) return ''
  try {
    const d = new Date(pubDate)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  } catch { return '' }
}

function buildCoachSituation(listing) {
  const photoCount = listing.image_urls?.length ?? 0
  return {
    completeness: calcScore(listingToScoreInput(listing)),
    shopName: listing.shop_name,
    transferType: listing.transfer_type,
    photoCount,
    bizType: listing.biz_type || null,
    missingItems: photoCount === 0 ? ['매물 사진'] : [],
  }
}

// 실데이터 기반 진행 단계 — 매물 존재·사진 수만 실측 가능, 이후 단계는 추적 데이터가 없어 미시작 고정
// 예시(example) 매물은 실등록이 아니므로 '매물 등록' 미완료 취급
function buildGuideSteps(listing) {
  const registered = !!listing && listing.status !== 'example'
  const photoCount = registered ? (listing.image_urls?.length ?? 0) : 0
  const steps = [
    { id: 'register', step: '매물 등록', done: registered, target: '/e1/1', cta: '탭하여 등록 →' },
    { id: 'photos', step: '사진 3장 추가하기', done: registered && photoCount >= 3, target: registered ? `/e1/4?edit=${listing.id}` : null, cta: '탭하여 추가 →' },
    { id: 'price', step: '가격 협의', done: false, target: null },
    { id: 'contract', step: '계약서 작성', done: false, target: null },
    { id: 'closing', step: '잔금·이전 완료', done: false, target: null },
  ]
  const next = steps.find(s => !s.done)
  if (next) next.current = true
  return steps
}

export default function A7SellerDashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('home')
  const { toast, showToast } = useToast()
  const profile = getProfile()
  const regionLabel = profile.region ?? '지역 미설정'
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  // 화면 전체 좌우 스와이프로 프로필 전환
  const profileSwipe = useProfileSwipe(() => setShowProfileSheet(true))

  // AI 코칭: null = 로딩, string = 메시지
  const [coaching, setCoaching] = useState(null)
  const [coachingIsError, setCoachingIsError] = useState(false)
  const [coachingList, setCoachingList] = useState([])
  const [coachingIdx, setCoachingIdx] = useState(0)

  // 양도자 필독
  const [sellerGuides, setSellerGuides] = useState([])
  const [guideIdx, setGuideIdx] = useState(0)

  // 동종 시장 동향 뉴스
  const [marketNews, setMarketNews] = useState([])
  const [marketNewsLoading, setMarketNewsLoading] = useState(true)

  // 내 매물 목록
  const [myListings, setMyListings] = useState([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [listingsVersion, setListingsVersion] = useState(0) // 상태 변경 후 재조회 트리거
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)

  // 가게 지표 묶음 — 매물 없으면 접힘(잊지 않게 접힌 카드로 유지), 매물 생기면 자동 펼침
  const [metricsOpen, setMetricsOpen] = useState(false)
  useEffect(() => {
    if (!listingsLoading && myListings.length > 0) setMetricsOpen(true)
  }, [listingsLoading, myListings.length])

  // 매출 카드 — 기본 숨김. 영업 중이면서 양도 준비하는 사장님만 옵트인 (프로필에 저장)
  const [salesCard, setSalesCard] = useState(getProfile().sales_card === true)
  const toggleSalesCard = (on) => {
    saveProfile({ sales_card: on })
    setSalesCard(on)
  }

  // daily_contents에서 coaching 조회 — 오늘 없으면 최신 날짜 폴백
  const fetchCoaching = useCallback(async (situation) => {
    if (!situation) {
      setCoaching(COACHING_EMPTY)
      setCoachingIsError(false)
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const bizType = situation.bizType || null

    // biz 지정 시 해당 업종, null 이면 공통(IS NULL) 조회
    const buildQuery = (biz, dateFilter, limitN = 3) => {
      const q = supabase
        .from('daily_contents')
        .select('body, display_order, content_date')
        .eq('content_type', 'coaching')
        .order('content_date', { ascending: false })
        .order('display_order')
        .limit(limitN)
      const withDate = dateFilter ? q.eq('content_date', today) : q
      return biz ? withDate.eq('biz_type', biz) : withDate.is('biz_type', null)
    }
    // 날짜 혼합 방지: 폴백 결과에서 가장 최신 날짜의 같은 날짜 세트만 추출
    const sameDate = (rows) => {
      if (!rows?.length) return []
      const d = rows[0].content_date
      return rows.filter(r => r.content_date === d)
    }

    // 1) 오늘 날짜 + 업종
    let { data } = await buildQuery(bizType, true)
    // 2) 오늘 날짜 + 공통 (업종별 미생성 시)
    if ((!data || data.length === 0) && bizType) {
      ;({ data } = await buildQuery(null, true))
    }
    // 3) 최신 날짜 전체 세트 + 업종 (오늘 배치 미실행 시)
    if (!data || data.length === 0) {
      const { data: raw } = await buildQuery(bizType, false, 10)
      data = sameDate(raw)
    }
    // 4) 최신 날짜 전체 세트 + 공통
    if ((!data || data.length === 0) && bizType) {
      const { data: raw } = await buildQuery(null, false, 10)
      data = sameDate(raw)
    }

    if (data?.length) {
      const msgs = data.map(r => r.body)
      setCoachingList(msgs)
      setCoachingIdx(0)
      setCoaching(msgs[0])
      setCoachingIsError(false)
    } else {
      setCoaching(COACHING_FALLBACK)
      setCoachingIsError(false)
    }
  }, [])

  // daily_contents에서 seller_guide 조회 — 오늘 없으면 최신 날짜 폴백
  const fetchSellerGuide = useCallback(async (bizType) => {
    const today = new Date().toISOString().slice(0, 10)

    const buildQuery = (biz, dateFilter, limitN = 3) => {
      const q = supabase
        .from('daily_contents')
        .select('body, display_order, content_date')
        .eq('content_type', 'seller_guide')
        .order('content_date', { ascending: false })
        .order('display_order')
        .limit(limitN)
      const withDate = dateFilter ? q.eq('content_date', today) : q
      return biz ? withDate.eq('biz_type', biz) : withDate.is('biz_type', null)
    }
    const sameDate = (rows) => {
      if (!rows?.length) return []
      const d = rows[0].content_date
      return rows.filter(r => r.content_date === d)
    }

    // 1) 오늘 + 업종
    let { data } = await buildQuery(bizType, true)
    // 2) 오늘 + 공통
    if ((!data || data.length === 0) && bizType) {
      ;({ data } = await buildQuery(null, true))
    }
    // 3) 최신 날짜 전체 세트 + 업종
    if (!data || data.length === 0) {
      const { data: raw } = await buildQuery(bizType, false, 10)
      data = sameDate(raw)
    }
    // 4) 최신 날짜 전체 세트 + 공통
    if ((!data || data.length === 0) && bizType) {
      const { data: raw } = await buildQuery(null, false, 10)
      data = sameDate(raw)
    }

    if (data?.length) {
      setSellerGuides(data.map(r => r.body))
      setGuideIdx(0)
    }
  }, [])

  // market_news에서 동종 시장 동향 조회 — 업종별, 없으면 공통 폴백
  const fetchMarketNews = useCallback(async (bizType) => {
    const buildQuery = (biz) => {
      const q = supabase
        .from('market_news')
        .select('id, title, description, link, pub_date')
        .order('collected_at', { ascending: false })
        .limit(5)
      return biz ? q.eq('biz_type', biz) : q.is('biz_type', null)
    }
    let { data } = await buildQuery(bizType)
    if ((!data || data.length === 0) && bizType) {
      ;({ data } = await buildQuery(null))
    }
    setMarketNews(data ?? [])
    setMarketNewsLoading(false)
  }, [])

  useEffect(() => {
    const myId = getDeviceId()
    supabase
      .from('listings')
      .select('*')
      .eq('device_id', myId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('[A7] 매물 조회 오류:', error.message)
          setListingsLoading(false)
          fetchCoaching(null)
          return
        }
        const rows = data ?? []
        console.log('[A7] myListings:', rows)
        setMyListings(rows)
        setListingsLoading(false)
        const situation = rows[0] ? buildCoachSituation(rows[0]) : null
        fetchCoaching(situation)
        fetchSellerGuide(rows[0]?.biz_type || null)
        fetchMarketNews(rows[0]?.biz_type || null)
      })
  }, [fetchCoaching, fetchSellerGuide, fetchMarketNews, listingsVersion])

  const primary = myListings[0]
  const bizLabel = primary?.biz_type ?? profile.bizType ?? '내 가게'

  // 매물 상태 변경 — 소유권(device_id) 확인 하에서만 update
  const updateListingStatus = async (next, msg) => {
    if (!primary) return
    const { error } = await supabase
      .from('listings')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', primary.id)
      .eq('device_id', getDeviceId())
    if (error) {
      showToast('상태 변경에 실패했어요. 다시 시도해 주세요.')
      return
    }
    showToast(msg)
    setListingsVersion(v => v + 1)
  }
  const completeness = primary ? calcScore(listingToScoreInput(primary)) : 0
  const hasPhotos = (primary?.image_urls?.length ?? 0) > 0
  const guideSteps = buildGuideSteps(primary)

  return (
    <div className="h-screen flex flex-col overflow-hidden" {...profileSwipe}>

      {/* ── 상단 프로필 칩 헤더 — 프로필들이 가로 스크롤 칩으로 나열, 탭하면 그 프로필로 전환 ── */}
      <header className="shrink-0 pl-5 pr-4 pt-12 pb-3 bg-white border-b border-gray-50">
        <div className="flex items-center gap-2">
          <ProfileChips onActiveTap={() => setShowProfileSheet(true)} />
          <ModuMarkHomeButton size={44} color="#1683B8" />
          {/* 더보기 */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className="text-gray-400 text-[20px] leading-none tracking-widest">
            ···
          </button>
        </div>
      </header>

      {/* ── 스크롤 영역 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-5 pt-5 pb-4">

          {/* 인사 */}
          <div className="mb-5">
            <p className="text-[13px] text-gray-400">안녕하세요{profile.name ? `, ${profile.name}님` : ''} 👋</p>
            <h2 className="text-[21px] font-bold text-gray-900 mt-0.5 leading-snug">
              {bizLabel} 양도 준비 중
            </h2>
            <p className="text-[13px] text-gray-400 mt-0.5">{regionLabel} 지역</p>
          </div>

          {/* E1 진입 CTA — 매물 있으면 수정 모드, 거래완료면 신규 등록으로 */}
          <button
            onClick={() => {
              if (primary && primary.status !== 'completed') navigate(`/e1/1?edit=${primary.id}`)
              else { clearE1Draft(); navigate('/e1/1') }
            }}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 mb-4 active:scale-[0.99] transition-all"
            style={{ backgroundColor: NAVY }}>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-bold text-white">매물 등록 · 수정하기</p>
              <p className="text-[12px] text-white/60 mt-0.5">기본 팩트 입력 → AI 초안 → 공개</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6 3l6 6-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* 양도 진행 가이드 — 다음 할 일이 가장 위에 (CTA 바로 아래) */}
          <section className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">🗺️ 양도 진행 가이드</p>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {guideSteps.map((item, i) => {
                const clickable = item.current && item.target
                return (
                  <div
                    key={item.id}
                    data-testid={`guide-${item.id}`}
                    data-done={item.done}
                    role={clickable ? 'button' : undefined}
                    onClick={() => {
                      if (clickable) navigate(item.target)
                    }}
                    className={`flex items-center gap-3 px-4 py-3.5 ${i < guideSteps.length - 1 ? 'border-b border-gray-50' : ''} ${clickable ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}
                    style={item.current ? { backgroundColor: NAVY_BG } : {}}>
                    <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{
                        backgroundColor: item.done ? GREEN : item.current ? NAVY : '#e5e7eb',
                        color: 'white',
                      }}>
                      {item.done ? '✓' : item.current ? '→' : ''}
                    </div>
                    <span className={`text-[13px] flex-1 ${item.done ? 'line-through text-gray-300' : item.current ? 'font-bold' : 'text-gray-400'}`}
                      style={item.current ? { color: NAVY } : {}}>
                      {item.step}
                    </span>
                    {item.current && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: NAVY, color: 'white' }}>
                        {item.target ? item.cta : '다음 단계'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* 이번 달 매출 — 옵트인 카드 (영업 중이면서 양도 준비하는 사장님용) */}
          {salesCard && (
            <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: '#f7f9ff', border: '1px solid #e0e8f9' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-medium text-gray-400">이번 달 매출</p>
                <button onClick={() => toggleSalesCard(false)} className="text-[11px] text-gray-300 underline underline-offset-2">
                  숨기기
                </button>
              </div>
              <ComingSoon desc="POS·카드매출을 연동하면 실제 매출이 표시돼요" />
            </div>
          )}

          {/* 가게 지표 묶음 — 매물 없으면 접힌 카드, 매물 생기면 자동 펼침 */}
          <section className="rounded-2xl border border-gray-100 mb-3 overflow-hidden bg-white/60">
            <button
              onClick={() => setMetricsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <div>
                <p className="text-[13px] font-bold text-gray-700">📊 가게 지표 · 문의 알림</p>
                {!metricsOpen && myListings.length === 0 && (
                  <p className="text-[11px] text-gray-400 mt-0.5">매물을 등록하면 채워져요 · 탭해서 미리보기</p>
                )}
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ transform: metricsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M3 5l4 4 4-4" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <Collapse open={metricsOpen}>
              <div className="px-4 pb-4">
                {/* 조회·관심·문의 — 집계 연동 전이라 수치 자리만 유지 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: '조회', navy: false },
                    { label: '관심', navy: false },
                    { label: '문의', navy: true },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => item.navy ? navigate('/d4/inbox') : showToast('준비 중이에요 🚧')}
                      className="rounded-2xl border border-gray-100 p-3 text-center active:scale-[0.98] transition-transform bg-white"
                      style={item.navy ? { backgroundColor: NAVY_BG, borderColor: `${NAVY}30` } : {}}>
                      <ComingSoon compact />
                      <p className="text-[11px] text-gray-400 mt-1">{item.label}</p>
                    </button>
                  ))}
                </div>

                {/* 새 문의 알림·진지도 — 실집계 연동 전 (문의 확인은 메시지 탭) */}
                <div className="w-full rounded-2xl p-4"
                  style={{ backgroundColor: NAVY_BG, border: `1.5px solid ${NAVY}25` }}>
                  <ComingSoon title="새 문의 알림 · 진지도" desc="받은 문의는 메시지 탭에서 확인할 수 있어요" />
                </div>

                {/* 매출 카드 옵트인 — 아직 영업 중인 사장님용 */}
                {!salesCard && (
                  <button
                    onClick={() => toggleSalesCard(true)}
                    className="mt-3 text-[12px] text-gray-400 underline underline-offset-2"
                  >
                    🧾 매출 카드 추가 — 아직 영업 중이라면
                  </button>
                )}
              </div>
            </Collapse>
          </section>

          {/* AI 오늘의 한 마디 */}
          <div className="rounded-2xl p-4 mb-3"
            style={{ backgroundColor: NAVY_BG, border: `1px solid ${NAVY}22` }}>
            <div className="flex items-start gap-3">
              {/* AI 뱃지 */}
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black mt-0.5"
                style={{ backgroundColor: NAVY }}>AI</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold mb-1.5" style={{ color: NAVY }}>오늘의 한 마디</p>
                {coaching === null ? (
                  /* 로딩 점 3개 */
                  <div className="flex gap-1.5 items-center h-5">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: NAVY, animation: `bounce 0.9s ease-in-out ${delay}s infinite` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-gray-800 leading-relaxed">{coaching}</p>
                )}
                {coachingIsError && (
                  <p className="text-[10px] text-gray-400 mt-1">AI 연결 오류 — 기본 문구를 표시해요</p>
                )}
              </div>
              {/* 다음 코칭 문구 버튼 (DB 로테이션, Gemini 재호출 없음) */}
              <button
                onClick={() => {
                  if (!coachingList.length) return
                  const next = (coachingIdx + 1) % coachingList.length
                  setCoachingIdx(next)
                  setCoaching(coachingList[next])
                }}
                disabled={coaching === null || coachingList.length <= 1}
                title="다른 조언 보기"
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                style={{ backgroundColor: `${NAVY}18`, opacity: (coaching === null || coachingList.length <= 1) ? 0.4 : 1 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M11 6.5a4.5 4.5 0 11-1.4-3.2" stroke={NAVY} strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M11 3v3.5H7.5" stroke={NAVY} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* ④ 매물 완성도 → E1 진입점 (매물 있으면 수정 모드, 거래완료는 수정 차단) */}
          <div
            role="button"
            onClick={() => {
              if (primary?.status === 'completed') { showToast('거래완료된 매물은 수정할 수 없어요'); return }
              navigate(primary ? `/e1/1?edit=${primary.id}` : '/e1/1')
            }}
            className="rounded-2xl border border-gray-100 p-4 mb-7 cursor-pointer active:scale-[0.99] transition-transform"
            style={{ backgroundColor: '#fafbff' }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[13px] font-semibold text-gray-700">내 매물 완성도</p>
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-bold" style={{ color: NAVY }}>
                {listingsLoading ? '...' : `${completeness}%`}
              </p>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: NAVY_BG, color: NAVY }}>수정 →</span>
              </div>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${listingsLoading ? 0 : completeness}%`, backgroundColor: NAVY, transition: 'width 0.4s ease' }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {!listingsLoading && !primary
                ? '아직 등록한 매물이 없어요 · 탭해서 등록하기'
                : primary && !hasPhotos
                  ? '사진을 추가하면 완성도가 12% 올라가요 · 탭해서 수정'
                  : '💡 사진을 추가하면 완성도가 올라가요 · 탭해서 매물 수정'}
            </p>
          </div>

          {/* 내 공개 매물 — 양수자 눈으로 보기 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📋 내 공개 매물</p>
              {!listingsLoading && primary && (
                <button
                  onClick={() => navigate(`/e2/${primary.id}`)}
                  className="text-[12px] font-medium" style={{ color: NAVY }}>
                  양수자 화면 보기 →
                </button>
              )}
            </div>

            {/* 로딩 중 — 스켈레톤 */}
            {listingsLoading && (
              <div className="w-full rounded-2xl overflow-hidden border border-gray-100">
                <div className="h-[80px] bg-gray-100 animate-pulse" />
                <div className="px-4 py-3 bg-gray-50 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                </div>
              </div>
            )}

            {/* 매물 없음 */}
            {!listingsLoading && !primary && (
              <button
                onClick={() => { clearE1Draft(); navigate('/e1/1') }}
                className="w-full rounded-2xl border border-dashed border-gray-200 py-6 text-center active:bg-gray-50 transition-colors">
                <p className="text-[13px] font-medium text-gray-400">아직 등록한 매물이 없어요</p>
                <p className="text-[12px] text-gray-300 mt-1">매물을 등록해보세요 →</p>
              </button>
            )}

            {/* 대표 매물 카드 */}
            {!listingsLoading && primary && (
              <button
                onClick={() => navigate(`/e2/${primary.id}`)}
                className="w-full rounded-2xl border overflow-hidden text-left active:scale-[0.99] transition-transform"
                style={{ borderColor: `${NAVY}30` }}>
                {/* 이미지 영역 */}
                <div className="h-[80px] relative overflow-hidden"
                  style={{ backgroundColor: '#e5e7eb' }}>
                  {primary.image_urls?.length > 0 ? (
                    <img
                      src={primary.image_urls[0]}
                      alt={primary.shop_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="1" y="3" width="18" height="14" rx="2" stroke="#9ca3af" strokeWidth="1.4" />
                        <circle cx="7.5" cy="9" r="2" stroke="#9ca3af" strokeWidth="1.4" />
                        <path d="M1 14l5-4 4 3 2.5-2 6.5 5.5" stroke="#9ca3af" strokeWidth="1.4" strokeLinejoin="round" />
                      </svg>
                      <span className="text-[10px] text-gray-400">사진 없음</span>
                    </div>
                  )}
                  {primary.transfer_type && (
                    <span className="absolute top-2 left-3 text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: NAVY }}>{primary.transfer_type}</span>
                  )}
                  <span className="absolute top-2 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      color: primary.status === 'completed' ? '#16a34a'
                        : primary.status === 'published' ? NAVY : '#6b7280',
                    }}>
                    {primary.status === 'published' ? '공개 중'
                      : primary.status === 'hidden' ? '숨김'
                      : primary.status === 'completed' ? '거래완료'
                      : primary.status === 'example' ? '예시' : primary.status}
                  </span>
                </div>
                {/* 본문 */}
                <div className="px-4 py-3" style={{ backgroundColor: NAVY_BG }}>
                  <p className="text-[14px] font-bold text-gray-900">
                    {primary.shop_name || '(상호 없음)'}
                  </p>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    {[
                      primary.transfer_fee ? `권리금 ${formatManwon(primary.transfer_fee)}` : null,
                      primary.address,
                    ].filter(Boolean).join(' · ')}
                  </p>
                  <div className="flex items-center mt-2">
                    {!hasPhotos && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#fff4e5', color: '#d68b2a' }}>
                        📷 사진 없음
                      </span>
                    )}
                    <span className="ml-auto text-[11px] font-semibold" style={{ color: NAVY }}>
                      양수자 뷰 미리보기 →
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* AI 큐레이션 구분선 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[12px] font-semibold text-gray-400">✨ AI 맞춤 정보</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* ⑤ 동종 시장 동향 — 네이버 뉴스 API 배치 캐시 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📈 동종 시장 동향</p>
              {marketNews.length > 0 && (
                <span className="text-[11px] text-gray-400">{bizLabel} 최신 뉴스</span>
              )}
            </div>
            {marketNews.length > 0 ? (
              <div className="space-y-2">
                {marketNews.map(news => (
                  <a
                    key={news.id}
                    href={news.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl p-4 border border-gray-100 active:bg-gray-50"
                  >
                    <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">{news.title}</p>
                    {news.description && (
                      <p className="text-[12px] text-gray-500 mt-1 leading-relaxed line-clamp-2">{news.description}</p>
                    )}
                    {news.pub_date && (
                      <p className="text-[11px] text-gray-400 mt-1">{formatPubDate(news.pub_date)}</p>
                    )}
                  </a>
                ))}
              </div>
            ) : !marketNewsLoading ? (
              <div className="rounded-2xl border border-gray-100">
                <ComingSoon desc="시장 동향 뉴스를 수집하고 있어요" />
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 p-5 text-center">
                <p className="text-[12px] text-gray-400">뉴스를 불러오는 중...</p>
              </div>
            )}
          </section>

          {/* ⑥ 거래처·지원 업체 — 기업회원 입점 전 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">🏢 거래처·지원 업체</p>
            </div>
            <div className="rounded-2xl border border-gray-100">
              <ComingSoon desc="기업회원 입점 후 실제 업체가 표시돼요" />
            </div>
          </section>

          {/* ⑦ 양도자 필독 — daily_contents에서 로드 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📝 양도자 필독</p>
              {sellerGuides.length > 1 && (
                <button
                  onClick={() => setGuideIdx(i => (i + 1) % sellerGuides.length)}
                  className="text-[12px] font-medium"
                  style={{ color: NAVY }}>
                  다른 조언 보기 →
                </button>
              )}
            </div>
            {sellerGuides.length > 0 ? (
              <div className="rounded-2xl p-4" style={{ backgroundColor: '#fafbff', border: '1px solid #e0e8f9' }}>
                <p className="text-[14px] text-gray-800 leading-relaxed">{sellerGuides[guideIdx]}</p>
                {sellerGuides.length > 1 && (
                  <p className="text-[11px] text-gray-400 mt-2">{guideIdx + 1} / {sellerGuides.length}</p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100">
                <ComingSoon desc="양도 노하우 콘텐츠를 준비하고 있어요" />
              </div>
            )}
          </section>

        </div>
      </main>

      {/* ── 하단 네비게이션 5탭 ── */}
      <nav className="shrink-0 bg-white border-t border-gray-100 flex">
        {NAV_TABS.map(({ id, label, Icon }) => {
          const active = activeNav === id
          return (
            <button
              key={id}
              onClick={() => {
                if (id === 'home') return
                if (id === 'explore') { navigate('/explore'); return }
                if (id === 'community') { navigate('/community'); return }
                if (id === 'message') { navigate('/d4/inbox'); return }
                if (id === 'my') { navigate('/my'); return }
              }}
              className="flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors"
            >
              <span className="relative">
                <Icon active={active} />
                {id === 'message' && <MessageTabDot />}
              </span>
              <span className="text-[10px] font-medium"
                style={{ color: active ? NAVY : '#9ca3af' }}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      <Toast message={toast} />

      {/* ── 프로필 전환 시트 ── */}
      <ProfileSwitchSheet isOpen={showProfileSheet} onClose={() => setShowProfileSheet(false)} />

      {/* ── 거래 완료 확인 다이얼로그 (실수 방지) ── */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCompleteConfirm(false)} />
          <div className="relative bg-white rounded-3xl mx-6 p-6 w-full max-w-[320px]">
            <p className="text-[17px] font-bold text-gray-900 mb-2">거래 완료 처리할까요?</p>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
              완료 처리하면 탐색에서 내려가고<br />다시 수정할 수 없어요
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowCompleteConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold text-gray-500 bg-gray-100">
                취소
              </button>
              <button
                onClick={() => { setShowCompleteConfirm(false); updateListingStatus('completed', '거래 완료 처리했어요 🤝') }}
                className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold text-white"
                style={{ backgroundColor: NAVY }}>
                완료 처리
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ··· 더보기 바텀시트 ── */}
      {showMoreMenu && (
        <div className="absolute inset-0 z-50" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-3 pb-8"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[14px] font-bold text-gray-900 mb-4">더보기</p>
            {[
              { icon: '🔗', label: '링크 복사', action: () => { setShowMoreMenu(false); showToast('링크 복사됨 ✓') } },
              { icon: '📤', label: '공유하기', action: () => { setShowMoreMenu(false); showToast('공유 기능 준비 중 🚧') } },
              { icon: '✏️', label: '매물 수정하기', action: () => {
                setShowMoreMenu(false)
                if (primary?.status === 'completed') { showToast('거래완료된 매물은 수정할 수 없어요'); return }
                if (primary) navigate(`/e1/1?edit=${primary.id}`)
                else { clearE1Draft(); navigate('/e1/1') }
              } },
              // 상태 변경 — 현재 상태에 따라 가능한 액션만 노출
              ...(primary?.status === 'published' ? [{
                icon: '🙈', label: '매물 숨기기',
                action: () => { setShowMoreMenu(false); updateListingStatus('hidden', '매물을 숨겼어요 — 탐색에서 보이지 않아요') },
              }] : []),
              ...(primary?.status === 'hidden' ? [{
                icon: '👀', label: '다시 공개하기',
                action: () => { setShowMoreMenu(false); updateListingStatus('published', '매물을 다시 공개했어요') },
              }] : []),
              ...(primary && (primary.status === 'published' || primary.status === 'hidden') ? [{
                icon: '🤝', label: '거래 완료 처리',
                action: () => { setShowMoreMenu(false); setShowCompleteConfirm(true) },
              }] : []),
              { icon: '📊', label: '시장 동향 보기', action: () => { setShowMoreMenu(false); showToast('준비 중이에요 🚧') } },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0 text-left active:bg-gray-50 transition-colors">
                <span className="text-[20px] w-8 text-center">{item.icon}</span>
                <span className="text-[14px] font-medium text-gray-800">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
