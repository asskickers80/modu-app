import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'
import { isOwnerOf } from '../lib/ownership'
import MapPanel from '../components/MapPanel'
import { startOrOpenConversation } from '../lib/dmStart'
import { updateListingStatus, softDeleteListing } from '../lib/listingStatus'
import { useAuth } from '../contexts/AuthContext'
import { getProfile } from '../lib/userProfile'
import { displayShopName } from '../lib/format'

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
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]" style={{ backgroundColor: TEAL_BG }}>💬</div>
          <div>
            <p className="text-[16px] font-bold text-gray-900">소유주에게 DM 문의</p>
            <p className="text-[12px] text-gray-400 mt-0.5">전화번호는 공개되지 않아요</p>
          </div>
        </div>
        <button onClick={onGo} disabled={loading}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white mb-2.5" style={{ backgroundColor: TEAL }}>
          {loading ? '대화방 만드는 중...' : '💬 DM 대화 시작하기'}
        </button>
        <button onClick={onClose} className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">취소</button>
      </div>
    </div>
  )
}

export default function E2LPropertyDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
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
    showToast('상가를 삭제했어요')
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

  if (loading) return <div className="h-screen flex items-center justify-center text-[13px] text-gray-400">불러오는 중...</div>
  if (notFound || !listing) return (
    <div className="h-screen flex flex-col items-center justify-center gap-3">
      <span className="text-[40px]">🏢</span>
      <p className="text-[15px] font-bold text-gray-700">상가를 찾을 수 없어요</p>
      <button onClick={() => navigate('/a7/landlord')} className="mt-2 px-6 py-3 rounded-2xl text-[14px] font-bold text-white" style={{ backgroundColor: TEAL }}>홈으로</button>
    </div>
  )

  const isOwner = isOwnerOf(listing, user?.id)
  const deal = listing.deal_type
  const showLease = deal === 'lease' || deal === 'both' || (!deal && (listing.deposit || listing.monthly_rent))
  const showSale = deal === 'sale' || deal === 'both'
  const photo = listing.image_urls?.[0]
  const draft = listing.ai_draft || {}
  const recommended = Array.isArray(listing.recommended_biz) ? listing.recommended_biz : []
  const canContact = !!listing.device_id

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 히어로 */}
      <div className="shrink-0 relative h-52" style={{ background: photo ? undefined : `linear-gradient(135deg, #b8d4d4, #8ab8b8)` }}>
        {photo && <img src={photo} alt="" className="w-full h-full object-cover" />}
        {!photo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-[56px]">🏢</span>
            <span className="text-white/80 text-[13px] font-medium">{[listing.floor, listing.area && `${listing.area}㎡`].filter(Boolean).join(' · ')}</span>
          </div>
        )}
        <button onClick={() => navigate(-1)} className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 14l-5-5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="absolute top-12 right-4 flex gap-2">
          <div className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: TEAL + 'cc' }}>소유주 매물</div>
          {DEAL_LABEL[deal] && <div className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: AMBER + 'cc' }}>{DEAL_LABEL[deal]}</div>}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-5 pt-5 pb-28">
          {/* 소유자 안내 바 */}
          {isOwner && (
            <div data-testid="owner-notice-bar" className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: TEAL_BG }}>
              <p className="text-[12px] font-bold" style={{ color: TEAL }}>🏢 내 상가예요 · 방문자에게 이렇게 보여요</p>
            </div>
          )}
          {!isOwner && listing.status === 'negotiating' && (
            <div className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: AMBER_BG }}>
              <p className="text-[12px] font-bold" style={{ color: AMBER }}>🤝 협의 중인 상가예요 — 문의는 계속 받고 있어요</p>
            </div>
          )}

          <h1 className="text-[22px] font-black text-gray-900 leading-snug mb-1">{displayShopName(listing, '이름 미정 상가')}</h1>
          {listing.address && <p className="text-[13px] text-gray-400 mb-4">{listing.address}</p>}

          {/* 임대 조건 */}
          {showLease && (listing.deposit || listing.monthly_rent) && (
            <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: TEAL_BG }}>
              <p className="text-[12px] font-bold mb-3" style={{ color: TEAL }}>임대 조건</p>
              <div className="grid grid-cols-3 gap-3">
                {[{ label: '보증금', v: won(listing.deposit) }, { label: '월세', v: won(listing.monthly_rent) }, { label: '관리비', v: won(listing.maintenance) }].map(x => (
                  <div key={x.label} className="text-center">
                    <p className="text-[11px] text-gray-500 mb-1">{x.label}</p>
                    <p className="text-[15px] font-black" style={{ color: TEAL }}>{x.v ?? '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 매각 조건 */}
          {showSale && (listing.sale_price || listing.cap_rate) && (
            <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: AMBER_BG }}>
              <p className="text-[12px] font-bold mb-3" style={{ color: AMBER }}>매각 조건</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center"><p className="text-[11px] text-gray-500 mb-1">희망 매매가</p><p className="text-[15px] font-black" style={{ color: AMBER }}>{won(listing.sale_price) ?? '-'}</p></div>
                {/* 실계약 '수익률' / 공실 '예상 수익률' — 매수자가 실/예상 오인 금지(정직) */}
                <div className="text-center">
                  <p className="text-[11px] text-gray-500 mb-1" data-testid="e2l-yield-label">{listing.occupancy === 'vacant' ? '예상 수익률' : '수익률'}</p>
                  <p className="text-[15px] font-black" style={{ color: AMBER }}>{listing.cap_rate ? `${listing.cap_rate}%` : '-'}</p>
                </div>
              </div>
              {listing.occupancy && (
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                  {listing.occupancy === 'vacant' ? '예상 시세 기준 수익률이에요' : '현 임차인 계약 기준 수익률이에요'}
                </p>
              )}
            </div>
          )}

          {/* 위치 — 지도·거리뷰 (공개 opt-in ON일 때만). 소유자·방문자 동일. */}
          {listing.show_map !== false && (
            <div className="mb-4">
              <p className="text-[13px] font-bold text-gray-900 mb-2">위치</p>
              <MapPanel lat={listing.latitude} lng={listing.longitude} address={listing.address} show />
            </div>
          )}

          {/* 기본 정보 */}
          <div className="rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-[13px] font-bold text-gray-900 mb-3">기본 정보</p>
            <div className="grid grid-cols-2 gap-y-3">
              {[{ label: '면적', v: listing.area && `${listing.area}㎡` }, { label: '층수', v: listing.floor }].map(x => (
                <div key={x.label}><p className="text-[11px] text-gray-400">{x.label}</p><p className="text-[13px] font-semibold text-gray-800">{x.v || '-'}</p></div>
              ))}
            </div>
          </div>

          {/* 권장 업종 */}
          {recommended.length > 0 && (
            <div className="mb-4">
              <p className="text-[13px] font-bold text-gray-900 mb-2">권장 업종</p>
              <div className="flex flex-wrap gap-1.5">
                {recommended.map(t => <span key={t} className="text-[12px] font-medium px-3 py-1 rounded-full" style={{ backgroundColor: TEAL_BG, color: TEAL }}>{t}</span>)}
              </div>
            </div>
          )}

          {/* 소개글 */}
          {(draft.description || draft.fact) && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2"><span className="text-[14px]">✨</span><p className="text-[13px] font-bold text-gray-900">모두가 정리한 상가 설명</p></div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: TEAL_BG }}>
                <p className="text-[13px] text-gray-700 leading-relaxed">{draft.description || draft.fact}</p>
              </div>
            </div>
          )}

          <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#f8fafc' }}>
            <p className="text-[11px] text-gray-400">전화번호는 공개되지 않아요 — 양쪽 합의 후에만 교환됩니다</p>
          </div>
        </div>
      </main>

      {/* 하단 바 — 소유자: 관리 / 방문자: 문의 */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4">
        {isOwner ? (
          <div className="flex flex-col gap-2">
            <button data-testid="owner-edit-button" onClick={() => navigate(`/e1p/1?edit=${listing.id}`)}
              className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white" style={{ backgroundColor: TEAL }}>
              상가 수정하기
            </button>
            <div className="flex gap-2">
              {listing.status === 'hidden' ? (
                <button data-testid="owner-status-publish" onClick={() => changeStatus('published', '상가를 다시 공개했어요')}
                  disabled={statusBusy}
                  className="flex-1 py-3 rounded-2xl text-[13px] font-bold border-2" style={{ borderColor: TEAL, color: TEAL, backgroundColor: TEAL_BG }}>
                  다시 공개하기
                </button>
              ) : (
                <button data-testid="owner-status-hide" onClick={() => changeStatus('hidden', '상가를 내렸어요 — 언제든 다시 공개할 수 있어요')}
                  disabled={statusBusy}
                  className="flex-1 py-3 rounded-2xl text-[13px] font-bold border border-gray-200 text-gray-600 bg-white">
                  상가 내리기
                </button>
              )}
              <button data-testid="owner-delete" onClick={() => setShowDeleteConfirm(true)}
                disabled={statusBusy}
                className="px-5 py-3 rounded-2xl text-[13px] font-medium text-red-400 border border-red-100 bg-white">
                삭제하기
              </button>
            </div>
          </div>
        ) : canContact ? (
          <button onClick={handleContact}
            className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: TEAL }}>
            💬 소유주에게 DM 문의하기
          </button>
        ) : (
          <div className="w-full py-[16px] rounded-2xl text-center bg-gray-100">
            <p className="text-[15px] font-bold text-gray-400">이 상가는 문의할 수 없어요</p>
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 — 되돌릴 수 없음 고지 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" data-testid="delete-confirm">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-[340px] bg-white rounded-3xl p-6 text-center">
            <span className="text-[36px]">🗑️</span>
            <p className="text-[17px] font-bold text-gray-900 mt-2 mb-1">상가를 삭제할까요?</p>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
              삭제하면 목록과 탐색에서 사라지고<br />되돌릴 수 없어요. 문의 대화 기록은 남아요.
            </p>
            <button onClick={handleDelete} data-testid="delete-confirm-yes"
              className="w-full py-[14px] rounded-2xl text-[15px] font-bold text-white mb-2" style={{ backgroundColor: '#dc2626' }}>
              삭제하기
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="w-full py-[12px] rounded-2xl text-[14px] font-medium text-gray-400">
              취소
            </button>
          </div>
        </div>
      )}

      {showDm && <DmBottomSheet onClose={() => setShowDm(false)} onGo={handleStartDm} loading={dmLoading} />}

      {showDmGate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDmGate(false)} />
          <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <p className="text-[19px] font-bold text-gray-900 text-center mb-1.5">문의하려면 가입이 필요해요</p>
            <p className="text-[14px] text-gray-400 text-center leading-relaxed mb-6">상가는 계속 둘러보실 수 있어요.<br />문의를 남기면 소유주와 대화가 시작돼요.</p>
            <button onClick={() => { localStorage.setItem('modu_return_to', `/e2l/${id}?contact=1`); navigate('/a4', { state: { category: getProfile().category || 'browsing' } }) }}
              className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white mb-2.5" style={{ backgroundColor: TEAL }}>
              가입하고 문의하기
            </button>
            <button onClick={() => setShowDmGate(false)} className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">계속 둘러보기</button>
          </div>
        </div>
      )}
      <Toast message={toast} />
    </div>
  )
}
