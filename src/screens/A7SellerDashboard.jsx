import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import MoreSheet from '../components/MoreSheet'
import ModuWord from '../components/ModuWord'
import { buildListingOwnerSheet } from '../lib/moreSheetConfig'
import Toast from '../components/Toast'
import { getProfile, saveProfile } from '../lib/userProfile'
import ProfileChips from '../components/ProfileChips'
import { useProfileSwipe } from '../hooks/useProfileSwipe'
import { useProfileRouteSync } from '../hooks/useProfileRouteSync'
import ProfileSwitchSheet from '../components/ProfileSwitchSheet'
import { ModuMarkHomeButton, ModuMark } from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'
import { supabase, getDeviceId } from '../lib/supabase'
import { isUnread } from '../lib/unread'
import { calcScore, listingToScoreInput } from '../lib/completeness'
import { clearE1Draft } from './e1/E1Context'
import ComingSoon from '../components/common/ComingSoon'
import MyListingCard from '../components/MyListingCard'
import IndustrySubPrompt from '../components/IndustrySubPrompt'
import ClosurePrompt from '../components/ClosurePrompt'
import { sidoFromAddress } from '../lib/regions'
import { industryLabel } from '../lib/categories'

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

// 업종 재질문 닫기 플래그 — sessionStorage라 앱을 다시 열면 초기화된다
const SUB_PROMPT_DISMISS_KEY = 'modu_industry_sub_prompt_dismissed'
const CLOSURE_DISMISS_KEY = 'modu_closure_prompt_dismissed'

const COACHING_FALLBACK ='매물이 공개 중이에요. 사진을 추가하면 양수자 관심이 더 높아져요.'
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

/**
 * 양도 진행 단계 — 전부 DB로 판정 가능한 것만 둔다.
 *
 * 계약서 작성·잔금 이전은 앱 밖 현실이라 추적할 데이터가 없어 뺐다
 * (예전엔 done:false 하드코딩이라 영원히 미완료로 남는 장식이었다).
 *
 * 1~4는 사용자가 직접 움직여 끝내는 단계(CTA 있음),
 * 5~6은 상대가 움직여야 하는 '기다리는 단계'(CTA 없음).
 *
 * @param listing 대표 매물 (example은 미등록 취급)
 * @param signals { inboundCount, ownerReplied } — D4 대화·메시지에서 실측
 */
// 첫 문의 일시 라벨 — "7월 21일 첫 문의 도착"
function inquiryDateLabel(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return `${d.getMonth() + 1}월 ${d.getDate()}일 첫 문의 도착`
}

function buildGuideSteps(listing, signals = {}) {
  const {
    inboundCount = 0, ownerReplied = false,
    firstThreadId = null, firstInquiryAt = null, unansweredCount = 0,
  } = signals
  const registered = !!listing && listing.status !== 'example'
  // 사진 정책: 내부 3장 필수 — 분리 컬럼 기준, 옛 매물(분리 전)은 합본 폴백
  const interiorPhotoCount = registered ? ((listing.interior_image_urls ?? listing.image_urls)?.length ?? 0) : 0
  // 소개글: 검수 화면에서 항목별로 확정한 이력(review_choices)이 남으면 완료로 본다
  const draftReviewed = registered && Object.keys(listing.review_choices ?? {}).length > 0
  const isPublic = registered && ['published', 'negotiating'].includes(listing.status)

  // 완료된 단계도 눌러서 그 화면으로 갈 수 있어야 한다 (되돌아가 고치는 길).
  // 등록 단계만 완료 전후 목적지가 다르다 — 등록 전엔 등록 화면, 등록 후엔 매물 상세.
  const detail = registered ? `/e2/${listing.id}` : null
  const steps = [
    {
      id: 'register', step: '매물 등록', done: registered,
      target: registered ? detail : '/e1/1', cta: '탭하여 등록 →',
    },
    {
      id: 'photos', step: '내부 사진 3장 올리기', done: registered && interiorPhotoCount >= 3,
      target: registered ? `/e1/3?edit=${listing.id}` : null, cta: '탭하여 추가 →',
    },
    {
      id: 'draft', step: '소개글 다듬기', done: draftReviewed,
      target: registered ? `/e1/2?edit=${listing.id}` : null, cta: '탭하여 확인 →',
    },
    {
      id: 'publish', step: '매물 공개하기', done: isPublic,
      target: detail, cta: '탭하여 공개 →',
    },
    {
      // 문의받기 = 첫 문의 수신. 완료 시 첫 문의 일시를 서브텍스트로 노출, 탭하면 그 스레드로 딥링크.
      id: 'inquiry', step: '문의받기', done: inboundCount > 0, waiting: true,
      subtext: inboundCount > 0 ? inquiryDateLabel(firstInquiryAt) : '문의가 오면 모두가 바로 알려드려요',
      target: firstThreadId ? `/d4/chat/${firstThreadId}` : '/d4/inbox',
    },
    {
      // 협의시작 = 소유자 첫 답장(양방향 대화 성립). 관찰 가능. status='negotiating' 전환은 별도(접힘 카드 전용).
      id: 'negotiate', step: '협의시작', done: ownerReplied, cta: '탭하여 답장 →',
      subtext: (!ownerReplied && unansweredCount > 0) ? `답장을 기다리는 문의 ${unansweredCount}건` : null,
      target: '/d4/inbox',   // 답장은 메시지함에서
    },
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
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const marketSectionRef = useRef(null) // 더보기 '시장 동향' 바로가기 목적지
  // 화면 전체 좌우 스와이프로 프로필 전환
  const profileSwipe = useProfileSwipe(() => setShowProfileSheet(true))
  // 라우트-프로필 동기화 — 뒤로가기·복원 등으로 어긋나면 자동 교정
  useProfileRouteSync('seller')

  // AI 코칭: null = 로딩, string = 메시지
  const [coaching, setCoaching] = useState(null)
  const [coachingIsError, setCoachingIsError] = useState(false)
  const [coachingList, setCoachingList] = useState([])
  const [coachingIdx, setCoachingIdx] = useState(0)

  // 양도인 필독
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
  // 진행 가이드 문의 단계(문의받기·협의시작) 판정용 실측 신호
  // firstThreadId/firstInquiryAt: 첫 문의 딥링크·일시, unansweredCount: 아직 답장 안 한 문의 수
  // unconfirmedCount/unconfirmedThreadId: 미확인(새) 문의 — 읽음 판정은 lib/unread.isUnread 단일 소스(메시지 탭 배지와 공유)
  const [guideSignals, setGuideSignals] = useState({
    inboundCount: 0, ownerReplied: false, firstThreadId: null, firstInquiryAt: null, unansweredCount: 0,
    unconfirmedCount: 0, unconfirmedThreadId: null,
  })
  const [guideOpen, setGuideOpen] = useState(false)   // 전 단계 완료 시 접힘 — '전체 보기'로 펼침
  // 업종 재질문 — 이번 접속에서 닫았는지 (sessionStorage라 다음 접속엔 다시 뜬다)
  const [subPromptDismissed, setSubPromptDismissed] = useState(() => {
    try { return sessionStorage.getItem(SUB_PROMPT_DISMISS_KEY) === '1' } catch { return false }
  })
  // 폐업 확인 — 이번 접속에서 닫았는지
  const [closureDismissed, setClosureDismissed] = useState(() => {
    try { return sessionStorage.getItem(CLOSURE_DISMISS_KEY) === '1' } catch { return false }
  })

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
        // daily_contents·market_news는 대분류(category_main) 기준으로 적재된다
        fetchSellerGuide(rows[0]?.category_main || null)
        fetchMarketNews(rows[0]?.category_main || null)
      })
  }, [fetchCoaching, fetchSellerGuide, fetchMarketNews, listingsVersion])

  const primary = myListings[0]

  // 진행 가이드 5~6단계 — 내 매물이 받은 문의 수, 그리고 소유자(나)가 답장한 적이 있는지.
  // 소유자 판정은 device_id가 로그인 동기화로 흔들릴 수 있어, 답장 여부는
  // "문의자(conversation.sender_id)가 아닌 발신"으로 본다(lib/conversation 원칙과 동일).
  const EMPTY_SIGNALS = { inboundCount: 0, ownerReplied: false, firstThreadId: null, firstInquiryAt: null, unansweredCount: 0, unconfirmedCount: 0, unconfirmedThreadId: null }
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
        // 배열이 아닐 수 있다 (에러 페이로드·단건 응답 등) — 방어적으로 처리
        const list = Array.isArray(convs) ? convs : []
        const ids = list.map(c => c.id)
        if (ids.length === 0) { setGuideSignals(EMPTY_SIGNALS); return }
        // 미확인(새) 문의 = 소유자가 아직 안 본 대화 — isUnread 단일 소스(메시지 탭 배지와 동일 판정)
        const unconfirmed = list.filter(c => isUnread(c, myId))
        const inquirerIds = new Set(list.map(c => c.sender_id))
        const { data: msgs } = await supabase
          .from('messages')
          .select('conversation_id, sender_id')
          .in('conversation_id', ids)
        if (cancelled) return
        // '문의자가 아닌' 발신(=소유자 답장)이 있는 대화 = 답장한 대화
        const repliedConvs = new Set(
          (Array.isArray(msgs) ? msgs : [])
            .filter(m => m.sender_id !== 'system' && !inquirerIds.has(m.sender_id))
            .map(m => m.conversation_id)
        )
        // 첫 문의 = 가장 먼저 도착한 대화 (created_at 오름차순)
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
  }, [primary?.id, listingsVersion])

  // 홈 중심 전환 기준 — 예시(example) 매물은 0건으로 취급 (진행 가이드의 registered 기준과 동일)
  const activeListings = myListings.filter(l => l.status !== 'example')

  // 헤더 업종·지역의 진실의 원천 — 매물이 있으면 매물(최근 등록 순 첫 건),
  // 없으면 온보딩 선택값. 온보딩 원본은 프로필에 그대로 보존하고 표시만 분기한다.
  const headerListing = activeListings[0]
  // 업종 표기 — 신규 3필드 기준 "대분류 > 소분류"(소분류 없으면 대분류만),
  // 3필드가 빈 옛 매물은 biz_type 폴백
  const bizLabel = industryLabel(headerListing) ?? headerListing?.biz_type
    ?? profile.bizType ?? '내 가게'
  const regionLabel = (headerListing && sidoFromAddress(headerListing.address))
    ?? profile.region ?? '지역 미설정'

  // 업종 재질문 — 두 종류가 대상이다.
  //  (1) 백필로 대분류까지만 복원된 매물 (소분류만 물으면 됨)
  //  (2) 업종이 아예 없는 매물 (신·구 컬럼 모두 NULL — 대분류부터 물어야 함)
  // example 매물도 포함한다(제외하면 대상이 사라지는 경우가 있다).
  const subPromptTarget = subPromptDismissed
    ? null
    : myListings.find(l => (l.category_main && !l.category_sub) || (!l.category_main && !l.biz_type))

  const saveIndustrySub = async (sub, main) => {
    if (!subPromptTarget) return
    const patch = {
      category_sub: sub.label,
      ksic_code: sub.ksic,
      updated_at: new Date().toISOString(),
    }
    // 대분류부터 고른 경우 — 대분류와 표시용 라벨도 함께 채운다
    if (main) {
      patch.category_main = main
      patch.biz_type = sub.label
    }
    const { error } = await supabase
      .from('listings')
      .update(patch)
      .eq('id', subPromptTarget.id)
      .eq('device_id', getDeviceId())
    if (error) {
      showToast('업종 저장에 실패했어요. 다시 시도해 주세요.')
      return
    }
    showToast('업종을 저장했어요')
    setListingsVersion(v => v + 1)
  }

  // 닫기는 이번 접속에만 유효 — 다음 접속에 다시 묻는다 (강제 게이트 아님)
  const dismissSubPrompt = () => {
    try { sessionStorage.setItem(SUB_PROMPT_DISMISS_KEY, '1') } catch { /* 사파리 프라이빗 등 */ }
    setSubPromptDismissed(true)
  }

  // 폐업 확인 대상 — 배치가 폐업 감지해 hidden으로 내렸고, 아직 소유자가 안 정한 매물.
  // 업종 재질문보다 먼저 보여준다 (더 시급한 데이터 정합성 이슈).
  const closureTarget = closureDismissed
    ? null
    : myListings.find(l => l.closure_detected_at && !l.closure_resolved_at)

  // 3택 결과를 저장하고, 배치가 다시 안 건드리도록 resolved 표식을 찍는다
  const resolveClosure = async (patch, msg) => {
    if (!closureTarget) return
    const { error } = await supabase
      .from('listings')
      .update({ ...patch, closure_resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', closureTarget.id)
      .eq('device_id', getDeviceId())
    if (error) {
      showToast('처리에 실패했어요. 다시 시도해 주세요.')
      return
    }
    showToast(msg)
    setListingsVersion(v => v + 1)
  }
  // ① 양도 완료 → completed  ② 시설·집기 계속 → 재공개 + 양도방식 표기 갱신  ③ 내리기 → hidden 유지
  const closureComplete = () => resolveClosure({ status: 'completed' }, '거래 완료로 정리했어요')
  const closureContinue = () => resolveClosure({ status: 'published', transfer_type: 'bare' }, '시설·집기 양도로 다시 공개했어요')
  const closureKeepHidden = () => resolveClosure({ status: 'hidden' }, '매물을 내린 상태로 뒀어요')

  // 닫기 — 이번 접속만 숨김, 다음 접속에 재노출 (폐업 방치만은 막는다)
  const dismissClosure = () => {
    try { sessionStorage.setItem(CLOSURE_DISMISS_KEY, '1') } catch { /* 사파리 프라이빗 등 */ }
    setClosureDismissed(true)
  }

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
  const guideSteps = buildGuideSteps(primary, guideSignals)
  // '협의 진행 중' 접힘은 실제 status 전환일 때만 (답장·완료 여부와 무관)
  const isNegotiating = !!primary && primary.status === 'negotiating'

  // 더보기(⋯) — [바로가기]+[매물 관리] 공통 골격, 항목 없으면 ⋯ 미노출
  const moreConfig = buildListingOwnerSheet({
    listing: primary,
    navigate,
    showToast,
    updateListingStatus,
    requestComplete: () => setShowCompleteConfirm(true),
    scrollToMarket: () => marketSectionRef.current?.scrollIntoView({ behavior: 'smooth' }),
  })

  return (
    <div className="h-screen flex flex-col overflow-hidden" {...profileSwipe}>

      {/* ── 상단 프로필 칩 헤더 — 프로필들이 가로 스크롤 칩으로 나열, 탭하면 그 프로필로 전환 ── */}
      <header className="shrink-0 pl-5 pr-4 pt-12 pb-3 bg-white border-b border-gray-50">
        <div className="flex items-center gap-2">
          <ProfileChips onActiveTap={() => setShowProfileSheet(true)} />
          <ModuMarkHomeButton size={44} color="#1683B8" />
          <MoreSheet config={moreConfig} />
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

          {/* 폐업 확인 — 배치가 폐업 감지해 내린 매물 (데이터 정합성상 가장 시급, 맨 위) */}
          {!listingsLoading && closureTarget && (
            <ClosurePrompt
              listing={closureTarget}
              onComplete={closureComplete}
              onContinue={closureContinue}
              onKeepHidden={closureKeepHidden}
              onClose={dismissClosure}
            />
          )}

          {/* 업종 소분류 재질문 — 백필로 대분류만 복원된 매물이 있을 때 1회 (닫기 가능) */}
          {!listingsLoading && subPromptTarget && (
            <IndustrySubPrompt
              listing={subPromptTarget}
              onPick={saveIndustrySub}
              onClose={dismissSubPrompt}
            />
          )}

          {/* 홈의 중심 — 매물 0건이면 등록 CTA(온보딩), 1건 이상이면 내 매물 카드로 전환 */}
          {!listingsLoading && activeListings.length > 0 ? (
            <MyListingCard listings={activeListings} />
          ) : (
            <button
              onClick={() => { clearE1Draft(); navigate('/e1/1') }}
              data-testid="register-listing-cta"
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 mb-4 active:scale-[0.99] transition-all"
              style={{ backgroundColor: NAVY }}>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-bold text-white">매물 등록하기</p>
                <p className="text-[12px] text-white/60 mt-0.5">가게 기본 정보만 알려주세요. 소개글은 <ModuWord tone="light" />가 써드려요.</p>
              </div>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M6 3l6 6-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* 양도 진행 가이드 — 다음 할 일이 가장 위에 (CTA 바로 아래) */}
          <section className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">🗺️ 양도 진행 가이드</p>
              {isNegotiating && (
                <button
                  onClick={() => setGuideOpen(o => !o)}
                  className="text-[12px] font-medium" style={{ color: NAVY }}>
                  {guideOpen ? '접기' : '전체 보기'}
                </button>
              )}
            </div>

            {/* '협의 중' 상태로 전환하면 접고 한 줄 요약만 — status 전환이 유일한 트리거 */}
            {isNegotiating && !guideOpen && (
              <div
                data-testid="guide-summary"
                className="rounded-2xl border px-4 py-3.5 flex items-center gap-3"
                style={{ backgroundColor: '#fef3e2', borderColor: '#f0d9b5' }}>
                <span className="text-[16px]">🤝</span>
                <div className="flex-1">
                  <p className="text-[13px] font-bold" style={{ color: '#b3741f' }}>협의 진행 중</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    매물을 '협의 중'으로 바꿨어요
                  </p>
                </div>
              </div>
            )}

            <div className={`rounded-2xl border border-gray-100 overflow-hidden ${isNegotiating && !guideOpen ? 'hidden' : ''}`}>
              {guideSteps.map((item, i) => {
                // 목적지가 있으면 완료 단계도 누를 수 있다 (되돌아가 고치는 길)
                const clickable = !!item.target
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
                    <div className="flex-1 min-w-0">
                      <span className={`text-[13px] ${item.done ? 'line-through text-gray-300' : item.current ? 'font-bold' : 'text-gray-400'}`}
                        style={item.current ? { color: NAVY } : {}}>
                        {item.step}
                      </span>
                      {/* 서브텍스트 — 완료(예: 첫 문의 일시)·현재 단계(예: 기다리는 문의 N건) 상태 안내 */}
                      {item.subtext && (item.done || item.current) && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.subtext}</p>
                      )}
                    </div>
                    {item.current && (
                      item.waiting ? (
                        <span
                          data-testid={`guide-waiting-${item.id}`}
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                          style={{ backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                          기다리는 중
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                          style={{ backgroundColor: NAVY, color: 'white' }}>
                          {item.target ? item.cta : '다음 단계'}
                        </span>
                      )
                    )}
                    {/* 진행 중이 아닌 단계 — 누를 수 있다는 걸 아주 약하게만 (셰브런) */}
                    {!item.current && clickable && (
                      <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="shrink-0"
                        data-testid={`guide-chevron-${item.id}`}>
                        <path d="M6 3l6 6-6 6" stroke="#d1d5db" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
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
                {/* 새 문의(미확인)가 이 카드 최우선 정보 — 강조 표시. 전체(누적)는 서브. 조회·관심은 준비중. */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {['views', 'likes', 'inquiry'].map(key => {
                    if (key !== 'inquiry') {
                      return (
                        <button key={key}
                          onClick={() => showToast('준비 중이에요 🚧')}
                          className="rounded-2xl border border-gray-100 p-3 text-center active:scale-[0.98] transition-transform bg-white">
                          <ComingSoon compact />
                          <p className="text-[11px] text-gray-400 mt-1">{key === 'views' ? '조회' : '관심'}</p>
                        </button>
                      )
                    }
                    const nu = guideSignals.unconfirmedCount
                    const total = guideSignals.inboundCount
                    const hot = nu > 0 // 미확인 있으면 강조, 0이면 해제
                    return (
                      <button key={key}
                        data-testid="metric-inquiry-tile"
                        onClick={() => {
                          // 미확인 1건이면 그 스레드로, 2건 이상(또는 0)이면 인박스
                          if (nu === 1 && guideSignals.unconfirmedThreadId) navigate(`/d4/chat/${guideSignals.unconfirmedThreadId}`)
                          else navigate('/d4/inbox')
                        }}
                        className="rounded-2xl border p-3 text-center active:scale-[0.98] transition-transform"
                        style={hot ? { backgroundColor: NAVY, borderColor: NAVY } : { backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
                        <p data-testid="metric-new-inquiry" className="text-[18px] font-bold leading-none"
                          style={{ color: hot ? '#fff' : '#c4c4c6' }}>{nu}</p>
                        <p className="text-[11px] mt-1" style={{ color: hot ? 'rgba(255,255,255,0.92)' : '#9ca3af' }}>새 문의</p>
                        <p data-testid="metric-inquiry-total" className="text-[10px] mt-0.5"
                          style={{ color: hot ? 'rgba(255,255,255,0.65)' : '#c4c4c6' }}>전체 {total}</p>
                      </button>
                    )
                  })}
                </div>

                {/* 진척도 — 실집계 연동 전 (명칭만 진지도→진척도 교체, 준비중 유지. 새 문의 알림은 위 타일로 통합) */}
                <div className="w-full rounded-2xl p-4"
                  style={{ backgroundColor: NAVY_BG, border: `1.5px solid ${NAVY}25` }}>
                  <ComingSoon title="진척도" desc="협의 진척을 한눈에 볼 수 있도록 준비 중이에요" />
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

          {/* 오늘의 한 마디 — 기계 주어(AI) 대신 모두 심볼로 (ORDER-ai-label-modu-voice) */}
          <div className="rounded-2xl p-4 mb-3"
            style={{ backgroundColor: NAVY_BG, border: `1px solid ${NAVY}22` }}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                style={{ backgroundColor: NAVY }}>
                <ModuMark size={18} color="#ffffff" highlight={NAVY} />
              </div>
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
                  <p className="text-[10px] text-gray-400 mt-1">지금은 연결이 어려워 기본 문구를 보여드려요</p>
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
                title="하나 더 보기"
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

          {/* 모두가 챙겨온 정보 구분선 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[12px] font-semibold text-gray-400">모두가 찾아온 알짜 정보</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* ⑤ 동종 시장 동향 — 네이버 뉴스 API 배치 캐시. 더보기 '시장 동향' 바로가기 목적지 */}
          <section ref={marketSectionRef} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📈 동종 시장 동향</p>
              {/* 업종은 헤더에서 이미 알렸다 — 소분류만 짧게 (390px 폭 확보) */}
              {marketNews.length > 0 && (
                <span className="text-[11px] text-gray-400">
                  {headerListing?.category_sub ?? bizLabel}
                </span>
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

          {/* ⑦ 이것만은 꼭 — daily_contents에서 로드 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900">📝 이것만은 꼭!</p>
              {sellerGuides.length > 1 && (
                <button
                  onClick={() => setGuideIdx(i => (i + 1) % sellerGuides.length)}
                  className="text-[12px] font-medium"
                  style={{ color: NAVY }}>
                  하나 더 보기 →
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

    </div>
  )
}
