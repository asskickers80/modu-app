import { trustBadges } from '../lib/completeness'

// 신호별 톤 — 완성도 칭찬은 그린, 검수는 중립 그레이 (과한 색 금지)
const STYLE = {
  complete: { backgroundColor: '#f0fdf4', color: '#16a34a' },
  reviewed: { backgroundColor: '#f3f4f6', color: '#6b7280' },
}

/** 매물 카드용 신뢰 신호 뱃지 — 신호 없으면 아무것도 렌더하지 않음 (최대 2개) */
export default function TrustBadges({ listing }) {
  const badges = trustBadges(listing)
  if (badges.length === 0) return null
  return (
    <div className="flex items-center gap-1.5 mt-1.5" data-testid="trust-badges">
      {badges.map(b => (
        <span key={b.id}
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
          style={STYLE[b.id]}>
          {b.label}
        </span>
      ))}
    </div>
  )
}
