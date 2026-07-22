import { useNavigate } from 'react-router-dom'

const GREEN = '#22c55e'

/**
 * 홈 진행 가이드 렌더 — 양도인·임대인 공유(복제 금지). 단계 정의(lib/guideSteps)와 색만 다르다.
 * - 완료 단계도 target 있으면 탭해서 되돌아갈 수 있다(관찰 가능 + 되돌아가는 길).
 * - status='negotiating' 이면 접고 한 줄 요약(전체 보기로 펼침).
 * data-testid는 seller 테스트와 호환 유지: guide-summary / guide-{id} / guide-waiting-{id} / guide-chevron-{id}
 */
export default function ProgressGuide({
  title, steps, accent, accentBg,
  negotiating = false, guideOpen = false, onToggleGuide,
  summarySub = "'협의 중'으로 바꿨어요",
}) {
  const navigate = useNavigate()
  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold text-gray-900">{title}</p>
        {negotiating && (
          <button onClick={onToggleGuide} className="text-[12px] font-medium" style={{ color: accent }}>
            {guideOpen ? '접기' : '전체 보기'}
          </button>
        )}
      </div>

      {negotiating && !guideOpen && (
        <div
          data-testid="guide-summary"
          className="rounded-2xl border px-4 py-3.5 flex items-center gap-3"
          style={{ backgroundColor: '#fef3e2', borderColor: '#f0d9b5' }}>
          <span className="text-[16px]">🤝</span>
          <div className="flex-1">
            <p className="text-[13px] font-bold" style={{ color: '#b3741f' }}>협의 진행 중</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{summarySub}</p>
          </div>
        </div>
      )}

      <div className={`rounded-2xl border border-gray-100 overflow-hidden ${negotiating && !guideOpen ? 'hidden' : ''}`}>
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
              <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ backgroundColor: item.done ? GREEN : item.current ? accent : '#e5e7eb', color: 'white' }}>
                {item.done ? '✓' : item.current ? '→' : ''}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-[13px] ${item.done ? 'line-through text-gray-300' : item.current ? 'font-bold' : 'text-gray-400'}`}
                  style={item.current ? { color: accent } : {}}>
                  {item.step}
                </span>
                {item.subtext && (item.done || item.current) && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{item.subtext}</p>
                )}
              </div>
              {item.current && (
                item.waiting ? (
                  <span
                    data-testid={`guide-waiting-${item.id}`}
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                    style={{ backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                    기다리는 중
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
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
