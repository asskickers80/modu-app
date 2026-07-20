import { useNavigate } from 'react-router-dom'
import { displayShopName, manwon } from '../lib/format'
import { clearE1Draft } from '../screens/e1/E1Context'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const AMBER = '#d68b2a'   // PRODUCT-PRINCIPLES 프랜차이즈 앰버 — 기존 토큰

/** status 5종 매핑 — 없는 상태를 만들지 않는다 */
export function statusLabel(status) {
  return status === 'published' ? '공개 중'
    : status === 'negotiating' ? '협의 중'
    : status === 'hidden' ? '숨김'
    : status === 'completed' ? '거래완료'
    : status === 'example' ? '예시' : status
}

export function statusColor(status) {
  return status === 'completed' ? '#16a34a'
    : status === 'negotiating' ? AMBER   // 진행 중이라는 신호 — 기존 프랜차이즈 토큰 재사용
    : status === 'published' ? NAVY : '#6b7280'
}

/** 대표 사진 — 내부 사진 1번이 우선, 옛 매물은 image_urls 폴백 */
export function coverPhoto(listing) {
  return (listing?.interior_image_urls ?? listing?.image_urls ?? [])[0] ?? null
}

/** 사진 없을 때 — 양도인 네이비 플레이스홀더 */
function PhotoPlaceholder({ size = 56 }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ backgroundColor: NAVY_BG }}>
      <svg width={size * 0.36} height={size * 0.36} viewBox="0 0 20 20" fill="none">
        <rect x="1" y="3" width="18" height="14" rx="2" stroke={NAVY} strokeWidth="1.4" opacity="0.55" />
        <circle cx="7.5" cy="9" r="2" stroke={NAVY} strokeWidth="1.4" opacity="0.55" />
        <path d="M1 14l5-4 4 3 2.5-2 6.5 5.5" stroke={NAVY} strokeWidth="1.4" strokeLinejoin="round" opacity="0.55" />
      </svg>
    </div>
  )
}

/**
 * 홈 CTA 자리의 내 매물 카드.
 * 1건이면 그 매물, 2건 이상이면 "매물 N건" 요약 → 내 매물 리스트로.
 * 매물 0건일 때는 이 컴포넌트를 쓰지 않는다 (등록 CTA 유지).
 */
export default function MyListingCard({ listings }) {
  const navigate = useNavigate()
  const count = listings.length
  const primary = listings[0]
  const many = count > 1
  const cover = coverPhoto(primary)

  const goDetail = () => navigate(many ? '/my/listings' : `/e2/${primary.id}`)
  const goNew = () => { clearE1Draft(); navigate('/e1/1') }

  return (
    <div className="mb-4">
      <button
        onClick={goDetail}
        data-testid="my-listing-card"
        className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left active:scale-[0.99] transition-transform border"
        style={{ backgroundColor: NAVY_BG, borderColor: `${NAVY}25` }}>

        {/* 대표 사진 */}
        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white">
          {cover
            ? <img src={cover} alt="" className="w-full h-full object-cover" />
            : <PhotoPlaceholder />}
        </div>

        <div className="flex-1 min-w-0">
          {many ? (
            <>
              <p className="text-[15px] font-bold text-gray-900" data-testid="my-listing-count">
                매물 {count}건
              </p>
              <p className="text-[12px] text-gray-500 mt-0.5 truncate">
                탭하면 등록한 매물을 모두 볼 수 있어요
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-bold text-gray-900 truncate">
                  {displayShopName(primary)}
                </p>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 bg-white"
                  style={{ color: statusColor(primary.status) }}>
                  {statusLabel(primary.status)}
                </span>
              </div>
              <p className="text-[12px] text-gray-500 mt-0.5 truncate">
                {[
                  primary.transfer_fee ? `권리금 ${manwon(primary.transfer_fee)}` : null,
                  primary.address,
                ].filter(Boolean).join(' · ') || '탭해서 내 매물을 확인해 보세요'}
              </p>
            </>
          )}
        </div>

        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <path d="M6 3l6 6-6 6" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 신규 등록은 보조 버튼으로 격하 — 중복 등록 허용 유지 */}
      <button
        onClick={goNew}
        data-testid="new-listing-button"
        className="mt-2 ml-1 text-[12px] font-semibold active:opacity-60 transition-opacity"
        style={{ color: NAVY }}>
        + 새 매물 등록
      </button>
    </div>
  )
}
