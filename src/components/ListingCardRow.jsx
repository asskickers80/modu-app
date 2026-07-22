import { displayShopName } from '../lib/format'

const AMBER = '#d68b2a' // 프랜차이즈 앰버 토큰 재사용(협의중 신호)

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
    : status === 'negotiating' ? AMBER
    : status === 'published' ? '#1a4d8f' : '#6b7280'
}

/** 대표 사진 — 내부 사진 1번이 우선, 옛 매물은 image_urls 폴백 */
export function coverPhoto(listing) {
  return (listing?.interior_image_urls ?? listing?.image_urls ?? [])[0] ?? null
}

function PhotoPlaceholder({ accent, accentBg, size = 56 }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: accentBg }}>
      <svg width={size * 0.36} height={size * 0.36} viewBox="0 0 20 20" fill="none">
        <rect x="1" y="3" width="18" height="14" rx="2" stroke={accent} strokeWidth="1.4" opacity="0.55" />
        <circle cx="7.5" cy="9" r="2" stroke={accent} strokeWidth="1.4" opacity="0.55" />
        <path d="M1 14l5-4 4 3 2.5-2 6.5 5.5" stroke={accent} strokeWidth="1.4" strokeLinejoin="round" opacity="0.55" />
      </svg>
    </div>
  )
}

/**
 * 매물/상가 단일 카드 행 — 양도인·임대인 공유(복제 금지). 썸네일·상태 뱃지·핵심 숫자(meta)·셰브런.
 * 색(accent/accentBg)·메타 문구·탭 동작만 파라미터화. 리스트 배치(요약/스택)는 호출부가 담당.
 */
export default function ListingCardRow({ listing, accent, accentBg, meta, onClick, testId }) {
  const cover = coverPhoto(listing)
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left active:scale-[0.99] transition-transform border"
      style={{ backgroundColor: accentBg, borderColor: `${accent}25` }}>
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white">
        {cover
          ? <img src={cover} alt="" className="w-full h-full object-cover" />
          : <PhotoPlaceholder accent={accent} accentBg={accentBg} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[15px] font-bold text-gray-900 truncate">{displayShopName(listing)}</p>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 bg-white"
            style={{ color: statusColor(listing.status) }}>
            {statusLabel(listing.status)}
          </span>
        </div>
        <p className="text-[12px] text-gray-500 mt-0.5 truncate">{meta || '탭해서 확인해 보세요'}</p>
      </div>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
        <path d="M6 3l6 6-6 6" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
