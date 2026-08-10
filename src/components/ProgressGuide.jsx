import { useNavigate } from 'react-router-dom'

const GREEN = '#22c55e'

// 문의받기·협의시작은 정보 충실 단계가 아니라 거래 상태 표시 — 접기 판정에서 제외 (guide-collapse-v1)
const TRADE_STEP_IDS = ['inquiry', 'negotiate']

/**
 * 홈 진행 가이드 렌더 — 양도인·임대인 공유(복제 금지). 단계 정의(lib/guideSteps)와 색만 다르다.
 * - 완료 단계도 target 있으면 탭해서 되돌아갈 수 있다(관찰 가능 + 되돌아가는 길).
 * - 접힘(guide-collapse-v1): 등록 관련 단계(문의받기·협의시작 제외) 전부 완료 또는
 *   status='negotiating' 이면 거래 상태 한 줄로 축소 — 줄 탭 또는 '전체 보기'로 펼침(기록 열람).
 * data-testid는 seller 테스트와 호환 유지: guide-summary / guide-{id} / guide-waiting-{id} / guide-chevron-{id}
 */
export default function ProgressGuide({
  title, steps, accent, accentBg,
  negotiating = false, guideOpen = false, onToggleGuide,
  summarySub = "'협의 중'으로 바꿨어요",
  inboundCount = 0,
}) {
  const navigate = useNavigate()
  const regDone = steps.length > 0 && steps.filter(s => !TRADE_STEP_IDS.includes(s.id)).every(s => s.done)
  const ownerReplied = !!steps.find(s => s.id === 'negotiate')?.done
  const collapsible = negotiating || regDone
  const collapsed = collapsible && !guideOpen

  // 접힌 줄 = 거래 진행 상태 (완성도 카드와 역할 중복 금지 — 점수·힌트는 여기 안 쓴다)
  const inNegotiation = negotiating || ownerReplied
  const headline = inNegotiation
    ? (inboundCount > 0 ? `문의 ${inboundCount}건 · 협의 진행 중` : '협의 진행 중')
    : inboundCount > 0 ? `문의 ${inboundCount}건 · 답장을 기다리는 중`
    : '등록 완료 · 문의를 기다리는 중'
  const sub = negotiating ? summarySub : '탭하면 전체 단계를 볼 수 있어요'

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-t14 font-bold text-gray-900">{title}</p>
        {collapsible && (
          <button onClick={onToggleGuide} className="text-t12 font-medium" style={{ color: accent }}>
            {guideOpen ? '접기' : '전체 보기'}
          </button>
        )}
      </div>

      {collapsed && (
        <div
          data-testid="guide-summary"
          role="button"
          onClick={onToggleGuide}
          className="rounded-2xl border px-4 py-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform"
          style={inNegotiation
            ? { backgroundColor: '#fef3e2', borderColor: '#f0d9b5' }
            : { backgroundColor: '#f8fafc', borderColor: '#eef2f7' }}>
          {inNegotiation
            ? <span className="text-t16">🤝</span>
            : <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-t11 font-bold text-white"
                style={{ backgroundColor: GREEN }}>✓</span>}
          <div className="flex-1">
            <p className="text-t13 font-bold" style={{ color: inNegotiation ? '#b3741f' : '#4b5563' }}>{headline}</p>
            <p className="text-t11 text-gray-500 mt-0.5">{sub}</p>
          </div>
        </div>
      )}

      <div className={`rounded-2xl border border-gray-100 overflow-hidden ${collapsed ? 'hidden' : ''}`}>
        {steps.map((item, i) => {
          const clickable = !!item.target
          return (
            <div
              key={item.id}
              data-testid={`guide-${item.id}`}
              data-done={item.done}
              role={clickable ? 'button' : undefined}
              onClick={() => { if (clickable) navigate(item.target) }}
              className={`flex items-center gap-3 px-4 py-3.5 ${i < steps.length - 1 ? 'border-b border-gray-50' : ''} ${clickable ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}
              style={item.current ? { backgroundColor: accentBg } : {}}>
              <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-t11 font-bold"
                style={{ backgroundColor: item.done ? GREEN : item.current ? accent : '#e5e7eb', color: 'white' }}>
                {item.done ? '✓' : item.current ? '→' : ''}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-t13 ${item.done ? 'line-through text-gray-300' : item.current ? 'font-bold' : 'text-gray-400'}`}
                  style={item.current ? { color: accent } : {}}>
                  {item.step}
                </span>
                {item.subtext && (item.done || item.current) && (
                  <p className="text-t11 text-gray-400 mt-0.5">{item.subtext}</p>
                )}
              </div>
              {item.current && (
                item.waiting ? (
                  <span
                    data-testid={`guide-waiting-${item.id}`}
                    className="text-t10 px-2 py-0.5 rounded-full font-semibold shrink-0"
                    style={{ backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                    기다리는 중
                  </span>
                ) : (
                  <span className="text-t10 px-2 py-0.5 rounded-full font-semibold shrink-0"
                    style={{ backgroundColor: accent, color: 'white' }}>
                    {item.target ? item.cta : '다음 단계'}
                  </span>
                )
              )}
              {!item.current && clickable && (
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="shrink-0"
                  data-testid={`guide-chevron-${item.id}`}>
                  <path d="M6 3l6 6-6 6" stroke="#d1d5db" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
