import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { supabase, getDeviceId } from '../lib/supabase'
import { getProfile } from '../lib/userProfile'
import { fetchMarketData } from '../lib/marketData'
import { displayShopName } from '../lib/format'
import { industryLabel } from '../lib/categories'
import TrustBadges from '../components/TrustBadges'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
// 방문자에게 보이는 상태 — 협의중은 문의를 계속 받는다
const VISITOR_VISIBLE = ['published', 'negotiating']

// ── 유틸 ──────────────────────────────────────────────────
const won = (v) => {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? null : `${n.toLocaleString()}만원`
}

const TRANSFER_LABEL = { full: '영업양도', bare: '바닥권리', undecided: '방식 미정' }

// ── 하단 DM 토스트 ─────────────────────────────────────────
function DmBottomSheet({ onClose, onGo, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-10">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]"
            style={{ backgroundColor: NAVY_BG }}>
            💬
          </div>
          <div>
            <p className="text-[16px] font-bold text-gray-900">DM으로 문의 시작</p>
            <p className="text-[12px] text-gray-400 mt-0.5">전화번호는 공개되지 않아요</p>
          </div>
        </div>
        <div className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: NAVY_BG }}>
          <p className="text-[13px] leading-relaxed" style={{ color: NAVY }}>
            문의는 <strong>앱 내 DM</strong>으로만 시작돼요. 번호는 양쪽이 합의해야만 공개됩니다.
            양도자도 여러 문의에 자유롭게 응대할 수 있어요.
          </p>
        </div>
        <button
          onClick={onGo}
          disabled={loading}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white mb-2.5 disabled:opacity-60"
          style={{ backgroundColor: NAVY }}>
          {loading ? '대화방 만드는 중...' : '💬 DM 대화 시작하기'}
        </button>
        <button onClick={onClose}
          className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">
          취소
        </button>
      </div>
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────
export default function E2PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [showDm, setShowDm] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [dmLoading, setDmLoading] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [market, setMarket] = useState(null)       // 실거래 컨텍스트 (API 성공 시에만)
  const [marketOpen, setMarketOpen] = useState(false)
  const { toast, showToast } = useToast()

  useEffect(() => {
    supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          // 존재하지 않는 id(옛 더미 t1~t8 포함) → not found 처리
          setNotFound(true)
        } else if (!VISITOR_VISIBLE.includes(data.status) && data.device_id !== getDeviceId()) {
          // 숨김·거래완료 매물은 주인에게만 보임 — 남이면 없는 매물 취급.
          // 협의중은 탐색에 계속 노출되므로 방문자도 볼 수 있다 (협의 결렬 대비 대기 수요).
          setNotFound(true)
        } else {
          setListing(data)
          // 본인 매물이 아닌 경우에만 조회수 증가 (views 컬럼 미존재 시 조용히 실패)
          if (data.device_id !== getDeviceId()) {
            supabase.from('listings')
              .update({ views: (data.views ?? 0) + 1 })
              .eq('id', id)
              .then().catch()
          }
        }
        setLoading(false)
      })
  }, [id])

  // 주변 실거래 컨텍스트 — 실데이터(dataSource 'api')일 때만 카드 표시, 실패·더미는 숨김
  useEffect(() => {
    if (!listing?.address) return
    fetchMarketData({ address: listing.address, area: listing.area })
      .then(({ priceData }) => {
        if (priceData?.dataSource === 'api' && priceData.transactionCount > 0) {
          setMarket(priceData)
        }
      })
      .catch(() => {})
  }, [listing])

  const handleStartDm = async () => {
    setDmLoading(true)
    try {
      const myId = getDeviceId()
      // 이미 이 매물에 대한 대화가 있으면 재사용 (매물 id + 내 기기 기준)
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('sender_id', myId)
        .eq('listing_id', listing.id)
        .maybeSingle()

      if (existing) {
        navigate(`/d4/chat/${existing.id}`)
        return
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          listing_id: listing.id,
          listing_name: listing.shop_name,
          listing_emoji: '🏠',
          sender_id: myId,
          receiver_id: listing.device_id,
          sender_name: getProfile().name ?? '문의자',
          receiver_name: listing.owner_nickname ?? '양도인',
        })
        .select('id')
        .single()

      if (error) throw error
      navigate(`/d4/chat/${data.id}`)
    } catch {
      setDmLoading(false)
      showToast('문의 시작 중 오류가 났어요. 다시 시도해 주세요.')
    }
  }

  // ── 로딩 스켈레톤 ──
  if (loading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="h-[240px] bg-gray-100 animate-pulse shrink-0" />
        <div className="px-5 pt-5 space-y-3">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-2/3" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
          <div className="h-32 bg-gray-50 rounded-2xl animate-pulse mt-4" />
        </div>
      </div>
    )
  }

  // ── 매물 없음 ──
  if (notFound) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 gap-5 text-center">
        <div className="text-[40px]">🔍</div>
        <p className="text-[17px] font-bold text-gray-900">매물을 찾을 수 없어요</p>
        <p className="text-[14px] text-gray-500 leading-relaxed">
          삭제됐거나 잘못된 주소일 수 있어요
        </p>
        <button onClick={() => navigate(-1)}
          className="w-full max-w-xs py-4 rounded-2xl text-[15px] font-bold text-white"
          style={{ backgroundColor: NAVY }}>
          돌아가기
        </button>
      </div>
    )
  }

  const photos = listing.image_urls ?? []
  // 소유자 모드 — 본문은 방문자와 동일하게 두고 액션만 교체한다 (공개 모습 확인 목적).
  // 판정은 조회 단계(useEffect)와 같은 device_id 기준.
  const isOwner = !!listing.device_id && listing.device_id === getDeviceId()

  // 상태 전환 — A7 더보기 시트와 같은 규칙·같은 소유권 조건
  const changeStatus = async (next, msg) => {
    setStatusBusy(true)
    const { error } = await supabase
      .from('listings')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
      .eq('device_id', getDeviceId())
    setStatusBusy(false)
    if (error) {
      showToast('상태 변경에 실패했어요. 다시 시도해 주세요.')
      return
    }
    setListing(l => ({ ...l, status: next }))
    setShowCompleteConfirm(false)
    showToast(msg)
  }

  // 전환 규칙: published ↔ negotiating ↔ completed, hidden은 현행 유지, completed는 종착
  const statusActions = !isOwner ? [] : [
    listing.status === 'published' && {
      id: 'negotiate', label: '🤝 협의 시작',
      onClick: () => changeStatus('negotiating', '협의 중으로 바꿨어요'),
    },
    listing.status === 'negotiating' && {
      id: 'republish', label: '↩️ 공개 중으로',
      onClick: () => changeStatus('published', '다시 공개 중으로 바꿨어요'),
    },
    listing.status === 'published' && {
      id: 'hide', label: '🙈 숨기기',
      onClick: () => changeStatus('hidden', '매물을 숨겼어요'),
    },
    listing.status === 'hidden' && {
      id: 'publish', label: '👀 공개 전환',
      onClick: () => changeStatus('published', '매물을 다시 공개했어요'),
    },
    ['published', 'negotiating', 'hidden'].includes(listing.status) && {
      id: 'complete', label: '✅ 거래 완료',
      onClick: () => setShowCompleteConfirm(true),
    },
  ].filter(Boolean)
  // 옛 매물(device_id 없이 저장된 익명 매물)은 양도자를 특정할 수 없어 문의 불가
  const canContact = !!listing.device_id
  const transferLabel = TRANSFER_LABEL[listing.transfer_type] ?? null
  const isBusinessTransfer = listing.transfer_type === 'full'

  // AI 초안 블록: 항목별 비공개(item_visibility[key]===false) 또는 검수 '숨김'이면 미표시
  const draft = listing.ai_draft || {}
  const choices = listing.review_choices || {}
  const edited = listing.edited_texts || {}
  const visibility = listing.item_visibility || {}
  const blockText = key => {
    if (visibility[key] === false) return null
    if (choices[key] === 'hide') return null
    return edited[key] ?? draft[key] ?? null
  }
  const description = blockText('description')
  const facilityText = blockText('facility')
  const salesText = blockText('salesAnalysis')

  const facts = [
    transferLabel && { label: '양도방식', value: transferLabel },
    (industryLabel(listing) ?? listing.biz_type) &&
      { label: '업종', value: industryLabel(listing) ?? listing.biz_type },
    listing.is_franchise === true && {
      label: '프랜차이즈',
      value: listing.franchise_brand_name || '가맹점',
    },
    (listing.floor || listing.area) && {
      label: '층 / 면적',
      value: [listing.floor, listing.area && `${listing.area}㎡`].filter(Boolean).join(' / '),
    },
    won(listing.deposit) && { label: '보증금', value: won(listing.deposit) },
    won(listing.monthly_rent) && { label: '월세', value: won(listing.monthly_rent) },
    won(listing.maintenance) && { label: '관리비', value: won(listing.maintenance) },
  ].filter(Boolean)

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── 소유자 안내 바 — 지금 보는 화면이 방문자에게 보이는 모습임을 알린다 ── */}
      {isOwner && (
        <div
          data-testid="owner-notice-bar"
          className="shrink-0 px-5 py-2 text-center"
          style={{ backgroundColor: NAVY_BG }}>
          <p className="text-[12px] font-medium" style={{ color: NAVY }}>
            내 매물이에요 · 방문자에게 이렇게 보여요
          </p>
        </div>
      )}

      {/* ── 스크롤 영역 ── */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

        {/* ① 히어로 이미지 */}
        <div className="relative h-[240px] shrink-0 overflow-hidden"
          style={{ backgroundColor: '#e5e7eb' }}>
          {photos.length > 0 ? (
            <img
              src={photos[photoIdx]}
              alt={listing.shop_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <svg width="36" height="36" viewBox="0 0 20 20" fill="none">
                <rect x="1" y="3" width="18" height="14" rx="2" stroke="#9ca3af" strokeWidth="1.2" />
                <circle cx="7.5" cy="9" r="2" stroke="#9ca3af" strokeWidth="1.2" />
                <path d="M1 14l5-4 4 3 2.5-2 6.5 5.5" stroke="#9ca3af" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              <span className="text-[12px] text-gray-400">등록된 사진이 없어요</span>
            </div>
          )}

          {/* 상단 버튼들 */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12">
            <button onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 14l-5-5 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex gap-2">
              {/* 찜은 방문자 전용 — 내 매물엔 뜨지 않는다 */}
              {!isOwner && (
                <button
                  onClick={() => setBookmarked(b => !b)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
                  <svg width="16" height="18" viewBox="0 0 16 18" fill={bookmarked ? 'white' : 'none'}>
                    <path d="M2 2h12v14l-6-4-6 4V2z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setShowShare(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <circle cx="3" cy="8.5" r="2" stroke="white" strokeWidth="1.5" />
                  <circle cx="14" cy="3" r="2" stroke="white" strokeWidth="1.5" />
                  <circle cx="14" cy="14" r="2" stroke="white" strokeWidth="1.5" />
                  <path d="M5 7.5l7-4M5 9.5l7 4" stroke="white" strokeWidth="1.4" />
                </svg>
              </button>
            </div>
          </div>

          {/* 양도방식 배지 */}
          {transferLabel && (
            <div className="absolute bottom-3 left-4">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white"
                style={{ backgroundColor: isBusinessTransfer ? NAVY : '#374151' }}>
                {transferLabel}
              </span>
            </div>
          )}

          {/* 사진 인디케이터 */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
              {photos.map((_, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: i === photoIdx ? 'white' : 'rgba(255,255,255,0.45)' }} />
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pt-5 pb-36">

          {/* 비공개 상태 안내 (주인에게만 보이는 경우) */}
          {listing.status !== 'published' && (
            <div
              data-testid="status-banner"
              className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: '#fef3e2' }}>
              <p className="text-[12px] font-bold" style={{ color: '#d68b2a' }}>
                {listing.status === 'negotiating'
                  // 협의중은 방문자에게도 보이는 상태 — 주인/방문자 문구를 나눈다
                  ? (isOwner
                      ? '🤝 협의 중이에요 — 탐색에 계속 노출되고 문의도 받을 수 있어요'
                      : '🤝 협의 중인 매물이에요 — 문의는 계속 받고 있어요')
                  : listing.status === 'completed'
                  ? '🤝 거래완료된 매물이에요 — 나에게만 보여요'
                  : listing.status === 'example'
                  ? '✦ 예시 매물이에요 — 실제 등록하려면 상호명·주소를 실제 값으로 바꿔 다시 등록해주세요'
                  : '🙈 숨김 상태예요 — 탐색에 노출되지 않고 나에게만 보여요'}
              </p>
            </div>
          )}

          {/* ② 핵심 헤드라인 */}
          <div className="mb-5">
            <h1 className="text-[22px] font-bold text-gray-900 mb-1">
              {displayShopName(listing, '(상호 미입력)')}
            </h1>
            {listing.address && (
              <p className="text-[13px] text-gray-400">{listing.address}</p>
            )}
            <TrustBadges listing={listing} />
            {won(listing.transfer_fee) && (
              <div className="flex items-end gap-2 mt-3">
                <span className="text-[13px] text-gray-500">희망 권리금</span>
                <span className="text-[28px] font-black leading-none" style={{ color: NAVY }}>
                  {won(listing.transfer_fee)}
                </span>
              </div>
            )}
          </div>

          {/* ③ 기본 팩트 그리드 */}
          {facts.length > 0 && (
            <div className="rounded-2xl border border-gray-100 p-4 mb-4">
              <p className="text-[12px] font-bold text-gray-400 mb-3">기본 팩트</p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                {facts.map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[11px] text-gray-400">{label}</p>
                    <p className="text-[13px] font-semibold text-gray-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* 양도방식 설명 */}
              {transferLabel && listing.transfer_type !== 'undecided' && (
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-start gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0"
                    style={{ backgroundColor: NAVY_BG, color: NAVY }}>ⓘ</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {isBusinessTransfer
                      ? '영업양도: 매출·단골·브랜드까지 통째로 넘겨요. 매출 증빙을 요청할 수 있어요.'
                      : '바닥권리: 자리값과 시설 잔존가만 넘겨요. 영업 내용은 포함 안 돼요.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ④ AI 생성 설명문 */}
          {description && (
            <div className="rounded-2xl border border-gray-100 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold text-white bg-gray-700">
                  🤖 AI 생성
                </span>
                <span className="text-[11px] text-gray-400">
                  {Object.keys(listing.review_choices ?? {}).length > 0
                    ? 'AI 작성 · 양도자 검수 완료'
                    : 'AI가 작성한 초안이에요'}
                </span>
              </div>
              <p className="text-[13px] text-gray-700 leading-relaxed">
                {description}
              </p>
            </div>
          )}

          {/* ⑤ 시설 정보 */}
          {(listing.facilities?.length > 0 || facilityText) && (
            <div className="rounded-2xl border border-gray-100 p-4 mb-4">
              <p className="text-[13px] font-bold text-gray-900 mb-3">🔧 시설 정보</p>
              {listing.facilities?.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {listing.facilities.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: NAVY }} />
                      <p className="text-[13px] text-gray-700">{f}</p>
                    </div>
                  ))}
                </div>
              )}
              {facilityText && (
                <p className="text-[12px] text-gray-500 leading-relaxed">{facilityText}</p>
              )}
            </div>
          )}

          {/* ⑥ 매출 정보 */}
          {won(listing.monthly_sales) && (
            <div className="rounded-2xl border border-gray-100 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[13px] font-bold text-gray-900">💰 매출 정보</p>
                {listing.sales_proof && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                    증빙 연동
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-[13px] text-gray-500">월 평균 매출</span>
                <span className="text-[24px] font-black leading-none text-gray-900">
                  {won(listing.monthly_sales)}
                </span>
              </div>
              {salesText && (
                <p className="text-[12px] text-gray-500 leading-relaxed mb-2">{salesText}</p>
              )}
              <div className="mt-2 pt-3 border-t border-gray-50">
                <p className="text-[11px] text-gray-400">
                  ⓘ DM 문의 후 진지한 양수자에게만 세부 내역을 공개합니다.
                </p>
              </div>
            </div>
          )}

          {/* 주변 실거래 참고 — 접을 수 있는 카드, 실데이터 있을 때만 */}
          {market && (
            <div className="rounded-2xl border border-gray-100 mb-4 overflow-hidden">
              <button
                onClick={() => setMarketOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left">
                <p className="text-[13px] font-bold text-gray-900">📊 주변 실거래 참고</p>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                  style={{ transform: marketOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M3 5l4 4 4-4" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {marketOpen && (
                <div className="px-4 pb-4">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[11px] text-gray-400">최근 3개월 실거래</p>
                      <p className="text-[15px] font-bold text-gray-900 mt-0.5">{market.transactionCount}건</p>
                    </div>
                    {market.avgPricePerM2 && (
                      <div>
                        <p className="text-[11px] text-gray-400">㎡당 평균 매매가</p>
                        <p className="text-[15px] font-bold text-gray-900 mt-0.5">
                          {market.avgPricePerM2.toLocaleString()}만원
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3">
                    국토교통부 실거래가 공개시스템 · 같은 시군구 상업용 부동산 기준 참고용
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 주의 문구 */}
          <p className="text-[11px] text-gray-300 text-center leading-relaxed">
            이 페이지의 정보는 양도자가 직접 입력했습니다.<br />
            모두는 거래 당사자가 아니며, 계약 전 반드시 직접 확인하세요.
          </p>

        </div>
      </main>

      {/* ── 하단 고정 액션 바 — 소유자는 관리 액션, 방문자는 DM ── */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-5 py-4">
        {isOwner ? (
          <div data-testid="owner-actions">
            {/* 상태 전환 — 현행 정의(published↔hidden, →completed)를 그대로 따른다 */}
            {statusActions.length > 0 && (
              <div className="flex gap-2 mb-3">
                {statusActions.map(a => (
                  <button
                    key={a.id}
                    onClick={a.onClick}
                    disabled={statusBusy}
                    data-testid={`owner-status-${a.id}`}
                    className="flex-1 py-3 rounded-xl text-[13px] font-semibold border active:scale-[0.98] transition-transform disabled:opacity-50"
                    style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
            {listing.status === 'completed' ? (
              <div className="w-full py-[18px] rounded-2xl text-center bg-gray-100">
                <p className="text-[15px] font-bold text-gray-400">거래완료된 매물이에요</p>
                <p className="text-[11px] text-gray-400 mt-1">완료 처리한 매물은 수정할 수 없어요</p>
              </div>
            ) : (
              <button
                onClick={() => navigate(`/e1/1?edit=${listing.id}`)}
                data-testid="owner-edit-button"
                className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ backgroundColor: NAVY }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M12 2.5l3.5 3.5L6 15.5H2.5V12L12 2.5z"
                    stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                매물 수정하기
              </button>
            )}
          </div>
        ) : canContact ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="4" width="10" height="7" rx="1.5" stroke="#9ca3af" strokeWidth="1.3" />
                <path d="M5 4V3a2 2 0 014 0v1" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <p className="text-[12px] text-gray-400">
                전화번호는 공개되지 않아요 — 양쪽 합의 후에만 교환됩니다
              </p>
            </div>
            <button
              onClick={() => setShowDm(true)}
              className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              style={{ backgroundColor: NAVY }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H6l-3 2V5a1 1 0 011-1z"
                  stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              DM으로 문의하기
            </button>
          </>
        ) : (
          <div className="w-full py-[18px] rounded-2xl text-center bg-gray-100">
            <p className="text-[15px] font-bold text-gray-400">이 매물은 문의할 수 없어요</p>
            <p className="text-[11px] text-gray-400 mt-1">양도자 연결 정보가 없는 옛 매물이에요</p>
          </div>
        )}
      </div>

      {showDm && (
        <DmBottomSheet
          onClose={() => setShowDm(false)}
          onGo={handleStartDm}
          loading={dmLoading}
        />
      )}

      {/* 거래 완료 확인 — A7 더보기 시트와 같은 문구·같은 되돌릴 수 없음 고지 */}
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
                onClick={() => changeStatus('completed', '거래 완료 처리했어요 🤝')}
                data-testid="owner-complete-confirm"
                className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold text-white"
                style={{ backgroundColor: NAVY }}>
                완료 처리
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />

      {/* ── 공유 바텀시트 ── */}
      {showShare && (
        <div className="absolute inset-0 z-50" onClick={() => setShowShare(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-3 pb-8"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[14px] font-bold text-gray-900 mb-5">공유하기</p>
            <div className="flex justify-around mb-6">
              {[
                { icon: '🔗', label: '링크 복사' },
                { icon: '💬', label: '카카오톡' },
                { icon: '📸', label: '인스타그램' },
                { icon: '✉️', label: '문자' },
              ].map(item => (
                <button key={item.label}
                  onClick={() => { setShowShare(false); showToast(`${item.label} 공유 준비 중 🚧`) }}
                  className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] bg-gray-100">
                    {item.icon}
                  </div>
                  <p className="text-[11px] text-gray-500">{item.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
