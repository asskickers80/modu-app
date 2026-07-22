import { useNavigate } from 'react-router-dom'
import UnreadDot from './UnreadDot'
import ComingSoon from './common/ComingSoon'

function Collapse({ open, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
      <div style={{ overflow: 'hidden', visibility: open ? 'visible' : 'hidden', transition: 'visibility 0.3s' }}>{children}</div>
    </div>
  )
}

/**
 * 홈 '가게/상가 지표 · 문의 알림' 타일 — 양도인·임대인 공유(복제 금지).
 * 새 문의(미확인)가 최우선 정보 — 레드 강조 + 펄스 3회 + UnreadDot. 전체(누적)는 서브. 조회·관심·진척도는 준비중.
 * 읽음 판정은 호출부에서 lib/unread.isUnread로 계산한 signals(unconfirmedCount)를 받는다(단일 소스).
 * data-testid: metric-inquiry-tile / metric-inquiry-dot / metric-new-inquiry / metric-inquiry-total
 */
export default function MetricsPanel({
  title = '📊 가게 지표 · 문의 알림',
  accent, accentBg,
  open, onToggle, signals, inboxRoute, listingsCount = 0, showToast, footer = null,
}) {
  const navigate = useNavigate()
  const nu = signals?.unconfirmedCount ?? 0
  const total = signals?.inboundCount ?? 0
  const hot = nu > 0

  return (
    <section className="rounded-2xl border border-gray-100 mb-3 overflow-hidden bg-white/60">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
        <div>
          <p className="text-[13px] font-bold text-gray-700">{title}</p>
          {!open && listingsCount === 0 && (
            <p className="text-[11px] text-gray-400 mt-0.5">등록하면 채워져요 · 탭해서 미리보기</p>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M3 5l4 4 4-4" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Collapse open={open}>
        <div className="px-4 pb-4">
          <style>{`
            @keyframes modu-inq-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.14); } }
            @media (prefers-reduced-motion: reduce) { [data-testid="metric-new-inquiry"] { animation: none !important; } }
          `}</style>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {['views', 'likes', 'inquiry'].map(key => {
              if (key !== 'inquiry') {
                return (
                  <button key={key}
                    onClick={() => showToast?.('준비 중이에요 🚧')}
                    className="rounded-2xl border border-gray-100 p-3 text-center active:scale-[0.98] transition-transform bg-white">
                    <ComingSoon compact />
                    <p className="text-[11px] text-gray-400 mt-1">{key === 'views' ? '조회' : '관심'}</p>
                  </button>
                )
              }
              return (
                <button key={key}
                  data-testid="metric-inquiry-tile"
                  onClick={() => {
                    if (nu === 1 && signals?.unconfirmedThreadId) navigate(`/d4/chat/${signals.unconfirmedThreadId}`)
                    else navigate(inboxRoute)
                  }}
                  className="relative rounded-2xl border p-3 text-center active:scale-[0.98] transition-transform"
                  style={hot ? { backgroundColor: '#fff5f5', borderColor: '#fecaca' } : { backgroundColor: '#fff', borderColor: '#f0f0f0' }}>
                  {hot && <UnreadDot testId="metric-inquiry-dot" className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full" />}
                  <p data-testid="metric-new-inquiry" className="text-[30px] font-black leading-none"
                    style={{ color: hot ? '#ef4444' : '#c4c4c6', animation: hot ? 'modu-inq-pulse 0.7s ease-in-out 3' : 'none' }}>{nu}</p>
                  <p className="text-[11px] mt-1.5 font-semibold" style={{ color: hot ? '#b91c1c' : '#9ca3af' }}>새 문의</p>
                  <p data-testid="metric-inquiry-total" className="text-[10px] mt-0.5" style={{ color: '#c4c4c6' }}>전체 {total}</p>
                </button>
              )
            })}
          </div>

          <div className="w-full rounded-2xl p-4" style={{ backgroundColor: accentBg, border: `1.5px solid ${accent}25` }}>
            <ComingSoon title="진척도" desc="협의 진척을 한눈에 볼 수 있도록 준비 중이에요" />
          </div>

          {footer}
        </div>
      </Collapse>
    </section>
  )
}
