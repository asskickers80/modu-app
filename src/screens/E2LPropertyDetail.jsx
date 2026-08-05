import { useState, useEffect, useRef } from 'react'
import { displayTitle } from '../lib/listingTitle'
import useSafeBack, { homePath } from '../hooks/useSafeBack'
import SectionTabs, { AdSection } from '../components/SectionTabs'
import { DEEP_BLOCKS_ENABLED } from '../lib/memberTier'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'
import { isOwnerOf } from '../lib/ownership'
import MapPanel from '../components/MapPanel'
import { startOrOpenConversation } from '../lib/dmStart'
import { updateListingStatus, softDeleteListing } from '../lib/listingStatus'
import DeleteListingDialog from '../components/DeleteListingDialog'
import { useAuth } from '../contexts/AuthContext'
import { getProfile } from '../lib/userProfile'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'
const AMBER = '#d68b2a'
const AMBER_BG = '#fef3e2'

// 임대인 상가는 협의중까지 방문자 노출 (E2와 동일 정책). 그 외(숨김·완료·예시)는 소유자만.
const VISITOR_VISIBLE = ['published', 'negotiating']
const DEAL_LABEL = { lease: '임대', sale: '매각', both: '임대·매각' }

const won = v => {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? null : `${n.toLocaleString()}만`
}

function DmBottomSheet({ onClose, onGo, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-t22" style={{ backgroundColor: TEAL_BG }}>💬</div>
          <div>
            <p className="text-t16 font-bold text-gray-900">소유주에게 DM 문의</p>
            <p className="text-t12 text-gray-400 mt-0.5">전화번호는 공개되지 않아요</p>
          </div>
        </div>
        <button onClick={onGo} disabled={loading}
          className="w-full py-[16px] rounded-2xl text-t15 font-bold text-white mb-2.5" style={{ backgroundColor: TEAL }}>
          {loading ? '대화방 만드는 중...' : '💬 DM 대화 시작하기'}
        </button>
        <button onClick={onClose} className="w-full py-[14px] rounded-2xl text-t14 font-medium text-gray-400">취소</button>
      </div>
    </div>
  )
}

export default function E2LPropertyDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const safeBack = useSafeBack('/a7/landlord') // 인증 콜백 등 막다른 곳으로 되돌아가지 않게 (back-nav-fix)
  const { user } = useAuth()
  const { toast, showToast } = useToast()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showDm, setShowDm] = useState(false)
  const [showDmGate, setShowDmGate] = useState(false)
  const [dmLoading, setDmLoading] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const scrollRef = useRef(null) // 섹션 앵커 탭 점프 기준 (ad-frame)

  // 소유자 상태 전환 — 공용 lib/listingStatus (E2 양도인과 동일 패턴, 복제 금지)
  const changeStatus = async (next, msg) => {
    setStatusBusy(true)
    const { error } = await updateListingStatus(listing.id, next)
    setStatusBusy(false)
    if (error) { showToast('상태 변경에 실패했어요. 다시 시도해 주세요.'); return }
    setListing(l => ({ ...l, status: next }))
    showToast(msg)
  }

  // 소프트 삭제 — status='deleted' (하드 삭제는 FK 정책 확정 시). 확인 다이얼로그 필수.
  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    setStatusBusy(true)
    const { error } = await softDeleteListing(listing.id)
    setStatusBusy(false)
    if (error) { showToast('삭제에 실패했어요. 다시 시도해 주세요.'); return }
    showToast('상가를 내렸어요')
    navigate('/a7/landlord', { replace: true })
  }

  useEffect(() => {
    supabase.from('listings').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else if (data.status === 'deleted') setNotFound(true) // 소프트 삭제 = 소유자에게도 비노출(영구)
        else if (!VISITOR_VISIBLE.includes(data.status) && !isOwnerOf(data, user?.id)) setNotFound(true)
        else {
          const { business_number, bizno_verified_at, ...safe } = data // eslint-disable-line no-unused-vars
          setListing(safe)
        }
        setLoading(false)
      })
  }, [id, user?.id]) // user 로드 후 소유 판정 재평가 — 렌더 isOwner와 일치

  // 가입 게이트에서 돌아온 경우(?contact=1) 문의 시트 자동 오픈 (소유자면 무시)
  useEffect(() => {
    if (!listing) return
    if (searchParams.get('contact') === '1' && !isOwnerOf(listing, user?.id)) setShowDm(true)
  }, [listing, searchParams])

  // 열람 개방. 행동(문의)만 [F] 게이트 — 계정(세션) 판정 하나로 통일 (IDENTITY-MODEL).
  const handleContact = () => {
    if (!user) { setShowDmGate(true); return }
    setShowDm(true)
  }
  const handleStartDm = async () => {
    setDmLoading(true)
    const { ok } = await startOrOpenConversation({ listing, navigate, emoji: '🏢', receiverFallback: '소유주' })
    if (!ok) { setDmLoading(false); showToast('문의 시작 중 오류가 났어요. 다시 시도해 주세요.') }
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-t13 text-gray-400">불러오는 중...</div>
  if (notFound || !listing) return (
    <div className="h-screen flex flex-col items-center justify-center gap-3">
      <span className="text-[40px]">🏢</span>
      <p className="text-t15 font-bold text-gray-700">상가를 찾을 수 없어요</p>
      <button onClick={() => navigate('/a7/landlord')} className="mt-2 px-6 py-3 rounded-2xl text-t14 font-bold text-white" style={{ backgroundColor: TEAL }}>홈으로</button>
    </div>
  )

  const isOwner = isOwnerOf(listing, user?.id)
  const deal = listing.deal_type
  const showLease = deal === 'lease' || deal === 'both' || (!deal && (listing.deposit || listing.monthly_rent))
  const showSale = deal === 'sale' || deal === 'both'
  const photo = listing.image_urls?.[0]
  const draft = listing.ai_draft || {}
  // 검수 결과 실반영(draft-quality 표기 버그 수정): edited_texts 우선 + item_visibility(비공개) 존중.
  // 예전엔 rent_market·sale_market을 아예 읽지 않아 검수 화면에는 있는 해석 블록이 광고에서 사라졌다.
  const edited = listing.edited_texts || {}
  const visibility = listing.item_visibility || {}
  const blockVal = (key, draftVal) => visibility[key] === false ? null : (edited[key] ?? draftVal ?? null)
  const displayDescription = blockVal('description', draft.description || draft.fact)
  const rentMarketText = showLease ? blockVal('rent_market', draft.rentMarket) : null
  const saleMarketText = showSale ? blockVal('sale_market', draft.saleMarket) : null
  // 심화 블록(특이사항·경쟁력) — 멤버십 플래그 게이트 (memberTier.DEEP_BLOCKS_ENABLED 전환 시 활성)
  const highlightsText = DEEP_BLOCKS_ENABLED ? blockVal('highlights', draft.highlights) : null
  const competitivenessText = DEEP_BLOCKS_ENABLED ? blockVal('competitiveness', draft.competitiveness) : null
  const recommended = Array.isArray(listing.recommended_biz) ? listing.recommended_biz : []
  const canContact = !!listing.device_id

  // 섹션 그룹 (ad-frame): 기본 정보 → 시설·건물 → 거래 조건 → 입지 → 상권 → 경쟁력 → 위치.
  // 내용이 있는 섹션만 목록에 넣는다 — 빈 섹션 헤더 금지.
  const spotText = blockVal('location_spot', draft.locationSpot)
  // 시설·건물 (e1p-facility) — AI 서술 + 입력 칩. 재료 있어야 섹션 노출(빈 섹션 탭 금지)
  const facilityText = blockVal('facility', draft.facility)
  const remaining = Array.isArray(listing.remaining_facilities) ? listing.remaining_facilities : []
  const buildingFacilities = Array.isArray(listing.building_facilities) ? listing.building_facilities : []
  const hasDeal = (showLease && (listing.deposit || listing.monthly_rent)) || (showSale && (listing.sale_price || listing.cap_rate))
  // 시설·건물 섹션 — 실내용(면적·층·권장업종·시설 서술·설비 칩)이 하나라도 있어야 탭 노출 (빈 섹션 헤더 금지)
  const hasBuilding = !!(listing.area || listing.floor || recommended.length
    || facilityText || listing.interior_state || remaining.length || buildingFacilities.length)
  const hasMap = listing.show_map !== false
  const SECTIONS = [
    displayDescription && { id: 'basic', label: '기본 정보' },
    hasBuilding && { id: 'building', label: '시설·건물' },
    hasDeal && { id: 'deal', label: '거래 조건' },
    spotText && { id: 'spot', label: '입지' },
    (rentMarketText || saleMarketText) && { id: 'market', label: '상권' },
    (highlightsText || competitivenessText) && { id: 'edge', label: '경쟁력' },
    hasMap && { id: 'map', label: '위치' },
  ].filter(Boolean)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 히어로 */}
      <div className="shrink-0 relative h-52" style={{ background: photo ? undefined : `linear-gradient(135deg, #b8d4d4, #8ab8b8)` }}>
        {photo && <img src={photo} alt="" className="w-full h-full object-cover" />}
        {!photo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-[56px]">🏢</span>
            <span className="text-white/80 text-t13 font-medium">{[listing.floor, listing.area && `${listing.area}㎡`].filter(Boolean).join(' · ')}</span>
          </div>
        )}
        <button onClick={safeBack} className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 14l-5-5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        {/* 홈으로 — 하단 탭이 없는 깊은 화면의 탈출구 (back-nav-fix) */}
        <button onClick={() => navigate(homePath(), { replace: true })}
          data-testid="go-home"
          aria-label="홈으로"
          className="absolute top-12 left-16 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <svg width="17" height="17" viewBox="0 0 22 22" fill="none">
            <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="white" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M8 20v-7h6v7" stroke="white" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="absolute top-12 right-4 flex gap-2">
          <div className="px-2.5 py-1 rounded-full text-t11 font-bold text-white" style={{ backgroundColor: TEAL + 'cc' }}>소유주 매물</div>
          {DEAL_LABEL[deal] && <div className="px-2.5 py-1 rounded-full text-t11 font-bold text-white" style={{ backgroundColor: AMBER + 'cc' }}>{DEAL_LABEL[deal]}</div>}
        </div>
      </div>

      <SectionTabs sections={SECTIONS} scrollRef={scrollRef} accent={TEAL} accentBg={TEAL_BG} />

      <main ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-5 pt-5 pb-28">
          {/* 소유자 안내 바 */}
          {isOwner && (
            <div data-testid="owner-notice-bar" className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: TEAL_BG }}>
              <p className="text-t12 font-bold" style={{ color: TEAL }}>🏢 내 상가예요 · 방문자에게 이렇게 보여요</p>
            </div>
          )}
          {!isOwner && listing.status === 'negotiating' && (
            <div className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: AMBER_BG }}>
              <p className="text-t12 font-bold" style={{ color: AMBER }}>🤝 협의 중인 상가예요 — 문의는 계속 받고 있어요</p>
            </div>
          )}

          <h1 className="text-t22 font-black text-gray-900 leading-snug mb-1">{displayTitle(listing)}</h1>
          {listing.address && <p className="text-t13 text-gray-400 mb-4">{listing.address}</p>}

          {hasDeal && <div id="sec-deal" className="scroll-mt-2" />}
          {/* 임대 조건 */}
          {showLease && (listing.deposit || listing.monthly_rent) && (
            <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: TEAL_BG }}>
              <p className="text-t12 font-bold mb-3" style={{ color: TEAL }}>임대 조건</p>
              <div className="grid grid-cols-3 gap-3">
                {[{ label: '보증금', v: won(listing.deposit) }, { label: '월세', v: won(listing.monthly_rent) }, { label: '관리비', v: won(listing.maintenance) }].map(x => (
                  <div key={x.label} className="text-center">
                    <p className="text-t11 text-gray-500 mb-1">{x.label}</p>
                    <p className="text-t15 font-black" style={{ color: TEAL }}>{x.v ?? '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 매각 조건 */}
          {showSale && (listing.sale_price || listing.cap_rate) && (
            <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: AMBER_BG }}>
              <p className="text-t12 font-bold mb-3" style={{ color: AMBER }}>매각 조건</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center"><p className="text-t11 text-gray-500 mb-1">희망 매매가</p><p className="text-t15 font-black" style={{ color: AMBER }}>{won(listing.sale_price) ?? '-'}</p></div>
                {/* 실계약 '수익률' / 공실 '예상 수익률' — 매수자가 실/예상 오인 금지(정직) */}
                <div className="text-center">
                  <p className="text-t11 text-gray-500 mb-1" data-testid="e2l-yield-label">{listing.occupancy === 'vacant' ? '예상 수익률' : '수익률'}</p>
                  <p className="text-t15 font-black" style={{ color: AMBER }}>{listing.cap_rate ? `${listing.cap_rate}%` : '-'}</p>
                </div>
              </div>
              {listing.occupancy && (
                <p className="text-t10 text-gray-400 mt-2 text-center">
                  {listing.occupancy === 'vacant' ? '예상 시세 기준 수익률이에요' : '현 임차인 계약 기준 수익률이에요'}
                </p>
              )}
            </div>
          )}

          {/* 시설·건물 — 면적·층수·시설 현황·권장 업종 (ad-frame 섹션 그룹, 내용 있을 때만) */}
          {hasBuilding && <div id="sec-building" className="scroll-mt-2" />}
          {(listing.area || listing.floor) && (
            <div className="rounded-2xl border border-gray-100 p-4 mb-4">
              <p className="text-t15 font-bold text-gray-900 mb-3">기본 정보</p>
              <div className="grid grid-cols-2 gap-y-3">
                {[{ label: '면적', v: listing.area && `${listing.area}㎡` }, { label: '층수', v: listing.floor }].map(x => (
                  <div key={x.label}><p className="text-t11 text-gray-400">{x.label}</p><p className="text-t13 font-semibold text-gray-800">{x.v || '-'}</p></div>
                ))}
              </div>
            </div>
          )}

          {/* 시설 현황 — 내부 상태·잔존 설비·건물 설비 + AI 서술 (e1p-facility) */}
          {(facilityText || listing.interior_state || remaining.length > 0 || buildingFacilities.length > 0) && (
            <div className="rounded-2xl border border-gray-100 p-4 mb-4" data-testid="e2l-facility">
              <p className="text-t15 font-bold text-gray-900 mb-2">🔧 시설 현황</p>
              {listing.interior_state && (
                <span className="inline-block text-t11 font-bold px-2 py-0.5 rounded-full mb-2"
                  style={{ backgroundColor: TEAL_BG, color: TEAL }}>
                  {listing.interior_state === 'empty' ? '내부 공실 — 새로 구성 가능' : '설비·집기 일부 잔존'}
                </span>
              )}
              {remaining.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {remaining.map(t => <span key={t} className="text-t12 px-2.5 py-1 rounded-full border border-gray-100 text-gray-600">{t}</span>)}
                </div>
              )}
              {buildingFacilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {buildingFacilities.map(t => <span key={t} className="text-t12 px-2.5 py-1 rounded-full text-gray-600" style={{ backgroundColor: '#f8fafc' }}>{t}</span>)}
                </div>
              )}
              {facilityText && <p className="ad-body text-gray-700">{facilityText}</p>}
            </div>
          )}

          {/* 권장 업종 */}
          {recommended.length > 0 && (
            <div className="mb-4">
              <p className="text-t13 font-bold text-gray-900 mb-2">권장 업종</p>
              <div className="flex flex-wrap gap-1.5">
                {recommended.map(t => <span key={t} className="text-t12 font-medium px-3 py-1 rounded-full" style={{ backgroundColor: TEAL_BG, color: TEAL }}>{t}</span>)}
              </div>
            </div>
          )}

          {/* 소개글 = 기본 정보 섹션의 본문 */}
          {displayDescription && (
            <div className="mb-4" id="sec-basic">
              <div className="flex items-center gap-2 mb-2"><span className="text-t14">✨</span><p className="text-t15 font-bold text-gray-900">모두가 정리한 상가 설명</p></div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: TEAL_BG }}>
                <p className="ad-body text-gray-700">{displayDescription}</p>
              </div>
            </div>
          )}

          {/* 입지 — 이 건물·이 자리 (지도 바로 앞: 서술 → 시각 확인 흐름) */}
          {spotText && (
            <div className="mb-4" id="sec-spot" data-testid="e2l-location-spot">
              <div className="flex items-center gap-2 mb-2"><span className="text-t14">📍</span><p className="text-t15 font-bold text-gray-900">입지</p></div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: TEAL_BG }}>
                <p className="ad-body text-gray-700">{spotText}</p>
                <p className="ad-note mt-2 text-gray-400">ⓘ 층수·접면·주차 등 소유주 입력과 반경 100m 실데이터 기반이에요</p>
              </div>
            </div>
          )}

          {/* 임대·매매 해석 블록 — 검수 화면(rent_market/sale_market)과 동일 내용을 광고에도 표시 */}
          {(rentMarketText || saleMarketText) && <div id="sec-market" className="scroll-mt-2" />}
          {rentMarketText && (
            <div className="mb-4" data-testid="e2l-rent-market">
              <div className="flex items-center gap-2 mb-2"><span className="text-t14">📊</span><p className="text-t15 font-bold text-gray-900">임대 조건 해석</p></div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: TEAL_BG }}>
                <p className="ad-body text-gray-700">{rentMarketText}</p>
                <p className="ad-note mt-2 text-gray-400">ⓘ 모두가 해석한 참고 의견이에요 — 확정 시세가 아닙니다</p>
              </div>
            </div>
          )}
          {saleMarketText && (
            <div className="mb-4" data-testid="e2l-sale-market">
              <div className="flex items-center gap-2 mb-2"><span className="text-t14">💰</span><p className="text-t15 font-bold text-gray-900">매매·수익률 해석</p></div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: TEAL_BG }}>
                <p className="ad-body text-gray-700">{saleMarketText}</p>
                <p className="ad-note mt-2 text-gray-400">ⓘ 모두가 해석한 참고 의견이에요 — 확정 수익률이 아닙니다</p>
              </div>
            </div>
          )}

          {(highlightsText || competitivenessText) && <div id="sec-edge" className="scroll-mt-2" />}
          {highlightsText && (
            <div className="mb-4" data-testid="e2l-highlights">
              <div className="flex items-center gap-2 mb-2"><span className="text-t14">📌</span><p className="text-t15 font-bold text-gray-900">특이사항</p></div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: TEAL_BG }}>
                <p className="ad-body text-gray-700">{highlightsText}</p>
              </div>
            </div>
          )}
          {competitivenessText && (
            <div className="mb-4" data-testid="e2l-competitiveness">
              <div className="flex items-center gap-2 mb-2"><span className="text-t14">🏆</span><p className="text-t15 font-bold text-gray-900">경쟁력 분석</p></div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: TEAL_BG }}>
                <p className="ad-body text-gray-700">{competitivenessText}</p>
                <p className="ad-note mt-2 text-gray-400">ⓘ 상권 실데이터 기반 참고 해석이에요</p>
              </div>
            </div>
          )}

          {/* 위치 — 지도·거리뷰 (공개 opt-in ON일 때만). 입지 서술 뒤에서 시각 확인. */}
          {hasMap && (
            <div className="mb-4" id="sec-map">
              <div className="flex items-center gap-2 mb-2"><span className="text-t14">🗺️</span><p className="text-t15 font-bold text-gray-900">위치</p></div>
              <MapPanel lat={listing.latitude} lng={listing.longitude} address={listing.address} show />
            </div>
          )}

          <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#f8fafc' }}>
            <p className="text-t11 text-gray-400">전화번호는 공개되지 않아요 — 양쪽 합의 후에만 교환됩니다</p>
          </div>
        </div>
      </main>

      {/* 하단 바 — 소유자: 관리 / 방문자: 문의 */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4">
        {isOwner ? (
          <div className="flex flex-col gap-2">
            <button data-testid="owner-edit-button" onClick={() => navigate(`/e1p/1?edit=${listing.id}`)}
              className="w-full py-[16px] rounded-2xl text-t15 font-bold text-white" style={{ backgroundColor: TEAL }}>
              상가 수정하기
            </button>
            <div className="flex gap-2">
              {listing.status === 'hidden' ? (
                <button data-testid="owner-status-publish" onClick={() => changeStatus('published', '상가를 다시 공개했어요')}
                  disabled={statusBusy}
                  className="flex-1 py-3 rounded-2xl text-t13 font-bold border-2" style={{ borderColor: TEAL, color: TEAL, backgroundColor: TEAL_BG }}>
                  다시 공개하기
                </button>
              ) : (
                <button data-testid="owner-status-hide" onClick={() => changeStatus('hidden', '상가를 잠깐 숨겼어요 — 언제든 다시 공개할 수 있어요')}
                  disabled={statusBusy}
                  className="flex-1 py-3 rounded-2xl text-t13 font-bold border border-gray-200 text-gray-600 bg-white">
                  잠깐 숨기기
                </button>
              )}
            </div>
            {/* 파괴적 액션 — 최하단 분리, 레드 토큰(#ef4444) */}
            <button data-testid="owner-delete" onClick={() => setShowDeleteConfirm(true)}
              disabled={statusBusy}
              className="w-full py-3 rounded-2xl text-t13 font-bold bg-white border-2"
              style={{ borderColor: '#ef4444', color: '#ef4444' }}>
              상가 내리기 (삭제하기)
            </button>
          </div>
        ) : canContact ? (
          <button onClick={handleContact}
            className="w-full py-[16px] rounded-2xl text-t15 font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: TEAL }}>
            💬 소유주에게 DM 문의하기
          </button>
        ) : (
          <div className="w-full py-[16px] rounded-2xl text-center bg-gray-100">
            <p className="text-t15 font-bold text-gray-400">이 상가는 문의할 수 없어요</p>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <DeleteListingDialog noun="상가" onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />
      )}

      {showDm && <DmBottomSheet onClose={() => setShowDm(false)} onGo={handleStartDm} loading={dmLoading} />}

      {showDmGate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDmGate(false)} />
          <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <p className="text-t19 font-bold text-gray-900 text-center mb-1.5">문의하려면 가입이 필요해요</p>
            <p className="text-t14 text-gray-400 text-center leading-relaxed mb-6">상가는 계속 둘러보실 수 있어요.<br />문의를 남기면 소유주와 대화가 시작돼요.</p>
            <button onClick={() => { localStorage.setItem('modu_return_to', `/e2l/${id}?contact=1`); navigate('/a4', { state: { category: getProfile().category || 'browsing' } }) }}
              className="w-full py-[16px] rounded-2xl text-t15 font-bold text-white mb-2.5" style={{ backgroundColor: TEAL }}>
              가입하고 문의하기
            </button>
            <button onClick={() => setShowDmGate(false)} className="w-full py-[14px] rounded-2xl text-t14 font-medium text-gray-400">계속 둘러보기</button>
          </div>
        </div>
      )}
      <Toast message={toast} />
    </div>
  )
}
