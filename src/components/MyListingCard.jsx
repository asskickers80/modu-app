import { useNavigate } from 'react-router-dom'
import { manwon } from '../lib/format'
import { clearE1Draft } from '../screens/e1/E1Context'
import ListingCardRow, { statusLabel, statusColor, coverPhoto } from './ListingCardRow'

// 공유 프리미티브 재export — 기존 import 경로(MyListingsPage 등) 호환 유지
export { statusLabel, statusColor, coverPhoto }

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

/**
 * 양도인 홈 CTA 자리의 내 매물 카드.
 * 1건이면 그 매물(ListingCardRow 공유), 2건 이상이면 "매물 N건" 요약 → 내 매물 리스트.
 * 매물 0건일 때는 이 컴포넌트를 쓰지 않는다 (등록 CTA 유지).
 */
export default function MyListingCard({ listings }) {
  const navigate = useNavigate()
  const count = listings.length
  const primary = listings[0]
  const many = count > 1

  const goNew = () => { clearE1Draft(); navigate('/e1/1') }
  const sellerMeta = [
    primary.transfer_fee ? `권리금 ${manwon(primary.transfer_fee)}` : null,
    primary.address,
  ].filter(Boolean).join(' · ') || '탭해서 내 매물을 확인해 보세요'

  return (
    <div className="mb-4">
      {many ? (
        <button
          onClick={() => navigate('/my/listings')}
          data-testid="my-listing-card"
          className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left active:scale-[0.99] transition-transform border"
          style={{ backgroundColor: NAVY_BG, borderColor: `${NAVY}25` }}>
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white">
            {coverPhoto(primary)
              ? <img src={coverPhoto(primary)} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{ backgroundColor: NAVY_BG }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-gray-900" data-testid="my-listing-count">매물 {count}건</p>
            <p className="text-[12px] text-gray-500 mt-0.5 truncate">탭하면 등록한 매물을 모두 볼 수 있어요</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
            <path d="M6 3l6 6-6 6" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <ListingCardRow
          listing={primary}
          accent={NAVY}
          accentBg={NAVY_BG}
          meta={sellerMeta}
          onClick={() => navigate(`/e2/${primary.id}`)}
          testId="my-listing-card"
        />
      )}

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
