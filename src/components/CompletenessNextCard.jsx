/**
 * 완성도 '다음 1개' 카드 (ORDER 2026-09-10 파트 C2)
 * 양도인 홈 내 매물 카드 위 · 매물 상세 소유자 뷰. 전부 채웠으면 렌더하지 않는다.
 * 프리미엄 언급은 사진 슬롯을 다 쓴 사용자에게만 1줄(PRICING §3-a).
 */
import { useNavigate } from 'react-router-dom'
import { getNextCompletenessItem } from '../lib/completenessNext'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

export default function CompletenessNextCard({ listing }) {
  const navigate = useNavigate()
  const next = getNextCompletenessItem(listing)
  if (!next) return null
  return (
    <button type="button" onClick={() => navigate(`${next.step}?edit=${listing.id}`)}
      data-testid="completeness-next-card" data-item={next.key}
      className="w-full text-left rounded-2xl px-4 py-3.5 mb-3 border active:scale-[0.99] transition-transform"
      style={{ backgroundColor: NAVY_BG, borderColor: `${NAVY}25` }}>
      <p className="text-t12 font-bold" style={{ color: NAVY }}>다음 1개</p>
      <p className="text-t14 font-bold text-gray-900 mt-0.5 leading-snug" data-testid="completeness-next-line">{next.line}</p>
      {next.slotNote && (
        <p className="text-t12 text-gray-500 mt-1" data-testid="photo-slot-note">{next.slotNote}</p>
      )}
    </button>
  )
}
