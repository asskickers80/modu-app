import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import ProfileSwitchSheet from '../components/ProfileSwitchSheet'
import ModuMark from '../components/ModuMark'
import { getProfile } from '../lib/userProfile'
import { generateStartupInsight, generateStartupDiagnosis } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import { calcScore, listingToScoreInput } from '../lib/completeness'
import { manwon } from '../lib/format'
import TrustBadges from '../components/TrustBadges'
import MessageTabDot from '../components/MessageTabDot'

const SKY = '#2b8ac9'
const SKY_BG = '#eef6fd'
const AMBER = '#d68b2a'
const AMBER_BG = '#fef3e2'
const NAVY = '#1a4d8f'

// ── 더미 카드 데이터 ──────────────────────────────────────

const VACANT_CARDS = [
  { id: 'v1', type: 'vacant', title: '서교동 코너 상가', addr: '서울 마포구 서교동', floor: '1층', area: '33㎡', deposit: 3000, monthly: 180, views: 128, tags: ['카페 적합', '홍대 도보 5분'], img: '#d4e4ff' },
  { id: 'v2', type: 'vacant', title: '연남동 단독상가', addr: '서울 마포구 연남동', floor: '1층', area: '52㎡', deposit: 5000, monthly: 220, views: 94, tags: ['주차 가능', '독립출입구'], img: '#c8d9f5' },
  { id: 'v3', type: 'vacant', title: '분당 정자동 상가', addr: '경기 성남시 분당구', floor: '2층', area: '28㎡', deposit: 2000, monthly: 95, views: 67, tags: ['유동인구 많음', '역세권'], img: '#d0dcf0' },
]

const FEED_LIMIT = 5 // 피드에 노출할 양도 매물 최대 개수

const TRANSFER_LABEL = { full: '영업양도', bare: '바닥권리', undecided: '방식 미정' }

const FRANCHISE_CARDS = [
  {
    id: 'f1', type: 'franchise', brand: '이디야커피', category: '카페', fee: 1500, stores: 3400,
    riskScore: 2, riskLabel: '낮음', riskItems: ['본사 재무 안정', '중저가 전략 검증됨', '계약 조건 표준화'],
    pros: ['낮은 가맹비', '검증된 카페 브랜드'], img: '#fbe8c0', color: AMBER,
  },
  {
    id: 'f2', type: 'franchise', brand: '빽다방', category: '카페', fee: 1000, stores: 1800,
    riskScore: 2, riskLabel: '낮음', riskItems: ['가성비 전략 안정', '가맹점주 만족도 높음'],
    pros: ['업계 최저가 가맹비', '저가 커피 수요 급증'], img: '#fde8b0', color: AMBER,
  },
  {
    id: 'f3', type: 'franchise', brand: '맘스터치', category: '패스트푸드', fee: 3000, stores: 1300,
    riskScore: 3, riskLabel: '보통', riskItems: ['경쟁 심화', '본사 마케팅 변동 가능성'],
    pros: ['버거 시장 성장세', '배달 매출 비중 높음'], img: '#fdd8a0', color: AMBER,
  },
  {
    id: 'f4', type: 'franchise', brand: '스타벅스', category: '카페', fee: 5000, stores: 1800,
    riskScore: 4, riskLabel: '높음', riskItems: ['초기 투자 5천+ 필요', '본사 조건 강제', '인건비 높음', '입지 선점 어려움'],
    pros: ['브랜드 파워 최강'], img: '#fcc890', color: '#c05a00',
  },
]

// ── 공통 컴포넌트 ─────────────────────────────────────────

function HeartBtn({ liked, onClick }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick() }}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
      style={{ backgroundColor: liked ? '#fef0f0' : '#f3f4f6' }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill={liked ? '#ef4444' : 'none'}>
        <path d="M8 13.5S1.5 9.5 1.5 5.5a3.5 3.5 0 017-0 3.5 3.5 0 017 0c0 4-6.5 8-6.5 8z"
          stroke={liked ? '#ef4444' : '#9ca3af'} strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function RiskDots({ score }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="w-2 h-2 rounded-full"
          style={{ backgroundColor: i <= score ? AMBER : '#e5e7eb' }} />
      ))}
    </div>
  )
}

// 빈 점포 카드
function VacantCard({ card, liked, onLike, onDetail, onInquiry }) {
  return (
    <div onClick={onDetail} className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm active:scale-[0.99] transition-all cursor-pointer">
      <div className="h-28 relative flex items-center justify-center" style={{ backgroundColor: card.img }}>
        <span className="text-[36px]">🏢</span>
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: SKY }}>빈 점포</span>
        </div>
        <div className="absolute top-2.5 right-2.5">
          <HeartBtn liked={liked} onClick={onLike} />
        </div>
        <div className="absolute bottom-2 left-3 text-[11px] text-white font-medium bg-black/30 px-2 py-0.5 rounded-full">
          조회 {card.views}
        </div>
      </div>
      <div className="p-3.5">
        <p className="text-[14px] font-bold text-gray-900">{card.title}</p>
        <p className="text-[12px] text-gray-400 mt-0.5">{card.addr} · {card.floor} · {card.area}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {card.tags.map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: SKY_BG, color: SKY }}>{t}</span>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
          <div>
            <p className="text-[11px] text-gray-400">보증금 <span className="font-bold text-gray-800">{card.deposit.toLocaleString()}만</span></p>
            <p className="text-[11px] text-gray-400 mt-0.5">월세 <span className="font-bold text-gray-800">{card.monthly}만/월</span></p>
          </div>
          <button onClick={e => { e.stopPropagation(); onInquiry() }}
            className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-white"
            style={{ backgroundColor: SKY }}>
            문의 →
          </button>
        </div>
      </div>
    </div>
  )
}

// 양도 매물 카드 — Supabase listings 실데이터
function TransferCard({ listing, liked, onLike, onClick }) {
  const photo = listing.image_urls?.[0]
  const typeLabel = TRANSFER_LABEL[listing.transfer_type]
  const fee = manwon(listing.transfer_fee)
  const deposit = manwon(listing.deposit)
  const monthly = manwon(listing.monthly_rent)
  const subline = [listing.address, listing.floor, listing.area && `${listing.area}㎡`]
    .filter(Boolean).join(' · ')
  return (
    <div onClick={onClick} className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm active:scale-[0.99] transition-all cursor-pointer">
      <div className="h-28 relative overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
        {photo ? (
          <img src={photo} alt={listing.shop_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="3" width="18" height="14" rx="2" stroke="#9ca3af" strokeWidth="1.4" />
              <circle cx="7.5" cy="9" r="2" stroke="#9ca3af" strokeWidth="1.4" />
              <path d="M1 14l5-4 4 3 2.5-2 6.5 5.5" stroke="#9ca3af" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] text-gray-400">사진 없음</span>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: NAVY }}>양도 매물</span>
          {typeLabel && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/90"
              style={{ color: NAVY }}>{typeLabel}</span>
          )}
        </div>
        <div className="absolute top-2.5 right-2.5">
          <HeartBtn liked={liked} onClick={onLike} />
        </div>
      </div>
      <div className="p-3.5">
        <p className="text-[14px] font-bold text-gray-900">{listing.shop_name || '(상호 없음)'}</p>
        {subline && <p className="text-[12px] text-gray-400 mt-0.5">{subline}</p>}
        <TrustBadges listing={listing} />
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
          <div>
            {fee && <p className="text-[11px] text-gray-400">권리금 <span className="font-bold text-gray-800">{fee}</span></p>}
            {(deposit || monthly) && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                {deposit && <>보증 <span className="font-bold text-gray-800">{deposit}</span></>}
                {deposit && monthly && ' · '}
                {monthly && <>월세 <span className="font-bold text-gray-800">{monthly}/월</span></>}
              </p>
            )}
          </div>
          <button className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-white"
            style={{ backgroundColor: SKY }}>
            문의 →
          </button>
        </div>
      </div>
    </div>
  )
}

// 프랜차이즈 브랜드 카드
function FranchiseCard({ card, liked, onLike, onInquiry }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-2xl border-2 overflow-hidden shadow-sm cursor-pointer"
      style={{ borderColor: card.color + '40' }}>
      <div className="h-24 relative flex items-center justify-center" style={{ backgroundColor: card.img }}>
        <span className="text-[32px]">🍔</span>
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 items-center">
          <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: card.color }}>가맹 창업</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90"
            style={{ color: card.color }}>{card.category}</span>
        </div>
        <div className="absolute top-2.5 right-2.5">
          <HeartBtn liked={liked} onClick={onLike} />
        </div>
      </div>

      {/* 리스크 배너 */}
      <div className="flex items-center gap-2 px-3.5 py-2 border-b"
        style={{ backgroundColor: card.color + '12', borderColor: card.color + '20' }}>
        <span className="text-[13px]">⚠️</span>
        <p className="text-[11px] font-bold flex-1" style={{ color: card.color }}>
          본사 리스크 · {card.riskLabel}
        </p>
        <RiskDots score={card.riskScore} />
        <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
          style={{ borderColor: card.color, color: card.color }}>
          {expanded ? '접기' : '상세'}
        </button>
      </div>

      {expanded && (
        <div className="px-3.5 py-3 border-b border-gray-50">
          <p className="text-[11px] font-bold text-gray-500 mb-1.5">⚠ 확인이 필요한 항목</p>
          <ul className="space-y-1">
            {card.riskItems.map(item => (
              <li key={item} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                <span style={{ color: card.color }}>•</span>{item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-3.5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[15px] font-bold text-gray-900">{card.brand}</p>
            <p className="text-[12px] text-gray-400 mt-0.5">전국 {card.stores.toLocaleString()}점</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400">예상 가맹비</p>
            <p className="text-[14px] font-bold" style={{ color: card.color }}>{card.fee.toLocaleString()}만~</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {card.pros.map(p => (
            <span key={p} className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: AMBER_BG, color: AMBER }}>{p}</span>
          ))}
        </div>
        <button onClick={e => { e.stopPropagation(); onInquiry() }}
          className="w-full mt-3 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.98]"
          style={{ backgroundColor: card.color }}>
          알아보기 →
        </button>
      </div>
    </div>
  )
}

// ── 하단 네비 ─────────────────────────────────────────────

function HomeIcon({ active }) {
  const c = active ? SKY : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={active ? SKY_BG : 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function ExploreIcon({ active }) {
  const c = active ? SKY : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function CommunityIcon({ active }) {
  const c = active ? SKY : '#9ca3af'
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
  const c = active ? SKY : '#9ca3af'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MyIcon({ active }) {
  const c = active ? SKY : '#9ca3af'
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

// ── 메인 컴포넌트 ─────────────────────────────────────────

function VacantDmSheet({ card, onClose, onGo }) {
  const TEAL = '#1e6b6b'
  const TEAL_BG = '#eef6f6'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <p className="text-[16px] font-bold text-gray-900 mb-1">임대인에게 DM 문의</p>
        <p className="text-[13px] text-gray-400 mb-4">{card.title} — {card.floor} · {card.area}</p>
        <div className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: TEAL_BG }}>
          <p className="text-[13px] leading-relaxed" style={{ color: TEAL }}>
            문의는 <strong>앱 내 DM</strong>으로만 시작돼요. 연락처는 양쪽 합의 후 공개됩니다.
          </p>
        </div>
        <button onClick={onGo}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white mb-2.5"
          style={{ backgroundColor: TEAL }}>💬 DM 문의 시작하기</button>
        <button onClick={onClose}
          className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">취소</button>
      </div>
    </div>
  )
}

export default function A7StartupFeed() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = getProfile()
  const startupMode = location.state?.startupMode ?? profile.startupMode ?? 'both'
  const regionLabel = location.state?.region ?? profile.region ?? '서울'
  const budgetLabel = location.state?.budget ?? profile.budget ?? null

  const [activeNav, setActiveNav] = useState('home')
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const [likes, setLikes] = useState({})
  const [dmCard, setDmCard] = useState(null)
  const { toast, showToast } = useToast()

  // 양도 매물 실조회 — 완성도순 상위 FEED_LIMIT개
  const [transferListings, setTransferListings] = useState([])
  const [transferLoading, setTransferLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('listings')
      .select('*')
      .eq('status', 'published')
      .then(({ data, error }) => {
        if (error) {
          console.error('[StartupFeed] 매물 조회 오류:', error.message)
        } else {
          const scored = (data ?? []).map(l => ({ ...l, _score: calcScore(listingToScoreInput(l)) }))
          scored.sort((a, b) =>
            (b._score - a._score) ||
            (new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)))
          setTransferListings(scored.slice(0, FEED_LIMIT))
        }
        setTransferLoading(false)
      })
  }, [])

  const toggleLike = (id) => setLikes(prev => ({ ...prev, [id]: !prev[id] }))

  const isDirect = startupMode === 'direct' || startupMode === 'both'
  const isFranchise = startupMode === 'franchise' || startupMode === 'both'

  const modeLabel = startupMode === 'direct' ? '직영 창업'
    : startupMode === 'franchise' ? '프랜차이즈 창업'
    : '전체 탐색'

  const modeColor = startupMode === 'franchise' ? AMBER : SKY

  // Gemini 실패 시 폴백 — 가짜 수치 주장 금지, 안내 문구만 (카드 프레임은 유지)
  const fallbackInsight = '트렌드 분석을 불러오지 못했어요. 잠시 후 다시 시도해주세요.'

  const INSIGHT_CACHE_KEY = `modu_startup_insight_${startupMode}`
  const [aiInsight, setAiInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)

  const fetchInsight = useCallback(async (force = false) => {
    const today = new Date().toISOString().slice(0, 10)
    if (!force) {
      try {
        const cached = localStorage.getItem(INSIGHT_CACHE_KEY)
        if (cached) {
          const { date, text } = JSON.parse(cached)
          if (date === today) { setAiInsight(text); return }
        }
      } catch { /* ignore */ }
    }
    setInsightLoading(true)
    try {
      const text = await generateStartupInsight({ startupMode, region: regionLabel, budget: budgetLabel })
      setAiInsight(text)
      localStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify({ date: today, text }))
    } catch {
      setAiInsight(null)
    } finally {
      setInsightLoading(false)
    }
  }, [startupMode, regionLabel, budgetLabel, INSIGHT_CACHE_KEY])

  const DIAG_CACHE_KEY = `modu_startup_diagnosis_${startupMode}`
  const [aiDiagnosis, setAiDiagnosis] = useState(null)
  const [diagLoading, setDiagLoading] = useState(false)

  const fetchDiagnosis = useCallback(async (force = false) => {
    const today = new Date().toISOString().slice(0, 10)
    if (!force) {
      try {
        const cached = localStorage.getItem(DIAG_CACHE_KEY)
        if (cached) {
          const { date, text } = JSON.parse(cached)
          if (date === today) { setAiDiagnosis(text); return }
        }
      } catch { /* ignore */ }
    }
    setDiagLoading(true)
    try {
      const text = await generateStartupDiagnosis({
        startupMode,
        region: regionLabel,
        budget: budgetLabel,
        progressPct: 30,
      })
      setAiDiagnosis(text)
      localStorage.setItem(DIAG_CACHE_KEY, JSON.stringify({ date: today, text }))
    } catch {
      setAiDiagnosis(null)
    } finally {
      setDiagLoading(false)
    }
  }, [startupMode, regionLabel, budgetLabel, DIAG_CACHE_KEY])

  useEffect(() => {
    fetchInsight()
    fetchDiagnosis()
  }, [fetchInsight, fetchDiagnosis])

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── 헤더 ── */}
      <header className="shrink-0 bg-white border-b border-gray-50">
        <div className="flex items-center gap-2 px-5 pt-12 pb-3">
          {/* 카테고리 칩 */}
          <button onClick={() => setShowProfileSheet(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold text-white active:opacity-80"
            style={{ backgroundColor: modeColor }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />
            창업 준비
          </button>
          {/* 모드 뱃지 */}
          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: modeColor + '18', color: modeColor }}>
            {modeLabel}
          </span>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center">
              <ModuMark size={34} color="#1683B8" />
            </div>
          </div>
          {/* 필터 버튼 */}
          <button onClick={() => navigate('/explore')} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 3h12M3 7h8M5 11h4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={() => showToast('준비 중이에요 🚧')} className="text-gray-400 text-[20px] leading-none tracking-widest ml-1">···</button>
        </div>

        {/* 검색 바 */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="#9ca3af" strokeWidth="1.5" />
              <path d="M9.5 9.5l2 2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] text-gray-400 flex-1">매물·브랜드 검색</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: modeColor + '18', color: modeColor }}>
              서울
            </span>
          </div>
        </div>
      </header>

      {/* ── 피드 스크롤 영역 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6">

          {/* AI 오늘의 한 마디 */}
          <div className="mb-5 rounded-2xl px-4 py-3.5 flex items-start gap-3"
            style={{ background: `linear-gradient(135deg, ${modeColor}18 0%, ${modeColor}08 100%)`, border: `1px solid ${modeColor}25` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black text-white"
              style={{ backgroundColor: modeColor }}>
              AI
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-bold" style={{ color: modeColor }}>AI 오늘의 인사이트</p>
                <button onClick={() => fetchInsight(true)} className="text-[15px] text-gray-300 leading-none">↺</button>
              </div>
              {insightLoading ? (
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: modeColor, animation: `bounce 0.9s ease-in-out ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-gray-700 leading-snug">{aiInsight ?? fallbackInsight}</p>
              )}
            </div>
          </div>

          {/* AI 창업 진단 */}
          {(aiDiagnosis || diagLoading) && (
            <div className="rounded-2xl px-4 py-3 mb-5 border border-gray-100"
              style={{ backgroundColor: `${modeColor}0a` }}>
              <div className="flex items-start gap-2.5">
                <span className="text-[14px] shrink-0 mt-0.5">🔍</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold" style={{ color: modeColor }}>AI 창업 준비 진단</p>
                    <button onClick={() => fetchDiagnosis(true)} className="text-[14px] text-gray-300 leading-none">↺</button>
                  </div>
                  {diagLoading ? (
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: modeColor, animation: `bounce 0.9s ease-in-out ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-gray-600 leading-snug">{aiDiagnosis}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 직영: 빈 점포 섹션 */}
          {isDirect && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SKY }} />
                  <p className="text-[14px] font-bold text-gray-900">빈 점포</p>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: SKY_BG, color: SKY }}>직영·신규</span>
                </div>
                <button onClick={() => navigate('/explore')} className="text-[12px] font-medium" style={{ color: SKY }}>전체보기 →</button>
              </div>
              <p className="text-[12px] text-gray-400 mb-3">임대인이 올린 공실 상가예요. 내 브랜드로 시작할 수 있어요.</p>
              <div className="flex flex-col gap-3">
                {VACANT_CARDS.map(card => (
                  <VacantCard key={card.id} card={card}
                    liked={!!likes[card.id]} onLike={() => toggleLike(card.id)}
                    onDetail={() => navigate('/e2l/' + card.id)}
                    onInquiry={() => setDmCard(card)} />
                ))}
              </div>
            </section>
          )}

          {/* 직영: 양도 매물 섹션 */}
          {isDirect && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NAVY }} />
                  <p className="text-[14px] font-bold text-gray-900">양도 매물</p>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: '#eef2fb', color: NAVY }}>직영·인수</span>
                </div>
                <button onClick={() => navigate('/explore')} className="text-[12px] font-medium" style={{ color: SKY }}>전체보기 →</button>
              </div>
              <p className="text-[12px] text-gray-400 mb-3">기존 가게를 인수해서 운영해요. 단골·설비가 따라와요.</p>
              {transferLoading ? (
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="h-28 bg-gray-100 animate-pulse" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-gray-50 rounded animate-pulse w-full" />
                  </div>
                </div>
              ) : transferListings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center">
                  <p className="text-[13px] font-medium text-gray-400">아직 공개된 매물이 없어요</p>
                  <p className="text-[12px] text-gray-300 mt-1">새 매물이 올라오면 여기에 표시돼요</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {transferListings.map(listing => (
                    <TransferCard key={listing.id} listing={listing}
                      liked={!!likes[listing.id]} onLike={() => toggleLike(listing.id)}
                      onClick={() => navigate(`/e2/${listing.id}`)} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 프랜차이즈: 브랜드 섹션 */}
          {isFranchise && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: AMBER }} />
                  <p className="text-[14px] font-bold text-gray-900">프랜차이즈 브랜드</p>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: AMBER_BG, color: AMBER }}>⚠ 리스크 포함</span>
                </div>
                <button onClick={() => showToast('프랜차이즈 브랜드 목록 준비 중이에요 🚧')} className="text-[12px] font-medium" style={{ color: AMBER }}>전체보기 →</button>
              </div>
              <p className="text-[12px] text-gray-400 mb-3">
                AI가 분석한 본사 리스크 지표를 같이 보여드려요.
                카드를 펼치면 주의할 항목을 확인할 수 있어요.
              </p>
              <div className="flex flex-col gap-3">
                {FRANCHISE_CARDS.map(card => (
                  <FranchiseCard key={card.id} card={card}
                    liked={!!likes[card.id]} onLike={() => toggleLike(card.id)}
                    onInquiry={() => showToast('가맹 문의는 준비 중이에요')} />
                ))}
              </div>
            </section>
          )}

          {/* 프리미엄 안내 */}
          <div className="rounded-2xl px-4 py-4 mb-4"
            style={{ background: `linear-gradient(135deg, ${modeColor}15 0%, ${modeColor}05 100%)`, border: `1px solid ${modeColor}20` }}>
            <p className="text-[13px] font-bold mb-1.5" style={{ color: modeColor }}>
              ✨ 추천의 질이 더 높아져요
            </p>
            <ul className="space-y-1.5">
              {[
                '내 예산·지역에 딱 맞는 매물만 먼저',
                '신규 등록 즉시 알림 (평균 2분 내)',
                'AI 권리금·임대 시세 분석 리포트',
              ].map(t => (
                <li key={t} className="flex items-center gap-2 text-[12px] text-gray-600">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" fill={modeColor} />
                    <path d="M3.5 6l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/my/membership')} className="mt-3 w-full py-2.5 rounded-xl text-[13px] font-bold text-white"
              style={{ backgroundColor: modeColor }}>
              프리미엄 추천 받기
            </button>
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
                  if (tab.id === 'message') { navigate('/d4/startup/inbox'); return }
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
                  style={{ color: active ? SKY : '#9ca3af' }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {dmCard && (
        <VacantDmSheet card={dmCard}
          onClose={() => setDmCard(null)}
          onGo={() => {
            // 빈 점포 카드는 아직 더미(임대인 E1p 미연결) — 실 대화 생성 불가
            setDmCard(null)
            showToast('빈 점포 DM 문의는 준비 중이에요 🚧')
          }} />
      )}
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
