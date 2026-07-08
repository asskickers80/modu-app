// 상단 탭 — 작업 순서(작성 → 고객 서명 → 완료·전달) + 목록/설정
// 아직 진행할 수 없는 단계는 비활성으로 표시된다.
export default function StepTabs({ view, canSign, canDone, onSelect }) {
  const steps = [
    { key: 'form', num: 1, label: '작성', enabled: true },
    { key: 'sign', num: 2, label: '고객 서명', enabled: canSign },
    { key: 'done', num: 3, label: '완료·전달', enabled: canDone },
  ]
  return (
    <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-1 px-3 py-2">
        {steps.map((s, i) => (
          <span key={s.key} className="flex items-center gap-1">
            {i > 0 && <span className="px-0.5 text-gray-300">›</span>}
            <button
              onClick={() => onSelect(s.key)}
              disabled={!s.enabled}
              className={`flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors ${
                view === s.key
                  ? 'bg-blue-600 text-white'
                  : s.enabled
                    ? 'text-gray-700 active:bg-blue-50'
                    : 'text-gray-300'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                view === s.key ? 'bg-white/25' : s.enabled ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-300'
              }`}>
                {s.num}
              </span>
              {s.label}
            </button>
          </span>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => onSelect('list')}
            className={`h-11 rounded-xl px-3 text-sm font-bold ${view === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 active:bg-gray-100'}`}
          >
            목록
          </button>
          <button
            onClick={() => onSelect('settings')}
            aria-label="설정"
            className="h-11 rounded-xl px-2.5 text-lg text-gray-400 active:bg-gray-100"
          >
            ⚙
          </button>
        </div>
      </div>
    </div>
  )
}
