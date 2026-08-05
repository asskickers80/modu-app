/**
 * 다중 선택 칩 그룹 — 임대인 시설 현황 등 플랫 목록용 (e1p-facility, 복제 금지).
 * 양도인 E1 시설 UI(업종별 카테고리 3단 드릴다운)와 구조가 달라 재사용하지 않고
 * 소형 공용으로 신설 — 근거는 오더 보고. 스타일은 SpotChips와 동일 문법.
 */
import { useState } from 'react'

export default function MultiChips({ label, hint, options, values = [], onChange, accent, accentBg, testPrefix, allowCustom = false }) {
  const [custom, setCustom] = useState('')
  const toggle = o => onChange(values.includes(o) ? values.filter(x => x !== o) : [...values, o])
  const addCustom = () => {
    const v = custom.trim()
    if (!v || values.includes(v)) return
    onChange([...values, v])
    setCustom('')
  }
  return (
    <div className="mt-4" data-testid={`${testPrefix}-group`}>
      <p className="text-t14 font-bold text-gray-900">{label}</p>
      {hint && <p className="text-t12 text-gray-400 mt-0.5">{hint}</p>}
      <div className="flex flex-wrap gap-2 mt-2">
        {options.map(o => {
          const on = values.includes(o)
          return (
            <button key={o} type="button"
              data-testid={`${testPrefix}-${o}`}
              onClick={() => toggle(o)}
              className="px-3 py-2 rounded-full text-t13 font-medium border transition-all active:scale-[0.97]"
              style={on
                ? { borderColor: accent, backgroundColor: accentBg, color: accent, fontWeight: 700 }
                : { borderColor: '#e5e7eb', backgroundColor: 'white', color: '#4b5563' }}>
              {o}
            </button>
          )
        })}
        {/* 직접 입력으로 추가된 항목 — 탭하면 제거 */}
        {values.filter(v => !options.includes(v)).map(v => (
          <button key={v} type="button" onClick={() => toggle(v)}
            className="px-3 py-2 rounded-full text-t13 font-bold border active:scale-[0.97]"
            style={{ borderColor: accent, backgroundColor: accentBg, color: accent }}>
            {v} ×
          </button>
        ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2 mt-2">
          <input value={custom} onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustom() }}
            data-testid={`${testPrefix}-custom`}
            placeholder="기타 — 직접 입력 후 추가"
            className="flex-1 text-t13 rounded-xl border px-3 py-2 outline-none" style={{ borderColor: '#e5e7eb' }} />
          <button type="button" onClick={addCustom} data-testid={`${testPrefix}-custom-add`}
            className="shrink-0 px-3 py-2 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: accent }}>
            추가
          </button>
        </div>
      )}
    </div>
  )
}
