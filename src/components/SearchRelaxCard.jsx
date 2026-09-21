/**
 * 탐색 결과 0건·소수건 — '조건 풀기' 카드 (ORDER 2026-09-21 파트 B2).
 * 세 줄 고정: 사실(건수) / 완화 칩 최대 3개(각 칩에 실제 건수) / 이 조건 새 매물 알림.
 * 모델 호출 없음. 건수 0 후보는 칩을 만들지 않는다. 대화창·질문창은 여기 두지 않는다.
 */
import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from './VendorContactButtons'
import { relaxSearch } from '../lib/searchRelax'
import { describeFilters, saveSearch } from '../lib/savedSearch'
import { RELAX, RELAX_COPY } from '../../config/searchRelax'
import { logEvent } from '../lib/eventLog'

export default function SearchRelaxCard({ filters, rows = [], count = 0, onApply, accent = '#2b8ac9', showToast, onLoginNeeded }) {
  const [options, setOptions] = useState([])
  const [sheet, setSheet] = useState(false)
  const [busy, setBusy] = useState(false)
  const shown = useRef('')

  useEffect(() => {
    const opts = relaxSearch(filters, { rows })
    setOptions(opts)
    const key = JSON.stringify([filters, opts.length])
    if (shown.current !== key) {
      shown.current = key
      logEvent('relax_card_shown', { n: count, option_count: opts.length, has_pair: opts.some(o => o.steps === 2) })
    }
  }, [filters, rows, count])

  const apply = (opt) => {
    logEvent('relax_chip_tap', { key: opt.key, steps: opt.steps, count: opt.count })
    onApply?.(opt)
  }

  const save = async () => {
    if (busy) return
    setBusy(true)
    const r = await saveSearch(filters)
    setBusy(false)
    if (r.ok) { showToast?.(RELAX_COPY.saved); setSheet(false); return }
    if (r.reason === 'login') { setSheet(false); onLoginNeeded?.(); return }
    showToast?.(r.reason === 'max' ? RELAX_COPY.savedMax.replace('{n}', String(RELAX.MAX_SAVED_SEARCHES)) : RELAX_COPY.saved)
    setSheet(false)
  }

  return (
    <section className="rounded-2xl border border-gray-100 p-4 my-4" data-testid="relax-card">
      <p className="text-t15 font-bold text-gray-900" data-testid="relax-count">
        {RELAX_COPY.countLine.replace('{n}', String(count))}
      </p>

      {options.length > 0 && (
        <div className="flex flex-col gap-2 mt-3" data-testid="relax-options">
          {options.map(o => (
            <button key={o.key} type="button" onClick={() => apply(o)} data-testid="relax-chip"
              className="w-full text-left px-4 py-3 rounded-2xl border text-t14 font-semibold"
              style={{ borderColor: `${accent}40`, color: '#111827' }}>
              {RELAX_COPY.chip.replace('{label}', o.label).replace('{count}', String(o.count))}
            </button>
          ))}
        </div>
      )}

      <button type="button" onClick={() => { setSheet(true); logEvent('saved_search_open', { n: count }) }} data-testid="relax-save-open"
        className="mt-3 w-full py-3 rounded-2xl text-t14 font-bold text-white" style={{ backgroundColor: accent }}>
        {RELAX_COPY.notifyButton}
      </button>

      {sheet && (
        <BottomSheet onClose={() => setSheet(false)} testId="saved-search-sheet">
          <p className="text-t16 font-black text-gray-900">{RELAX_COPY.saveTitle}</p>
          <p className="text-t13 text-gray-600 mt-2" data-testid="saved-search-summary">{describeFilters(filters)}</p>
          <button type="button" onClick={save} disabled={busy} data-testid="saved-search-confirm"
            className="mt-4 w-full py-3.5 rounded-2xl text-t15 font-bold text-white disabled:opacity-40" style={{ backgroundColor: accent }}>
            {RELAX_COPY.saveButton}
          </button>
        </BottomSheet>
      )}
    </section>
  )
}

/** 완화를 적용한 뒤 결과 위에 남는 1줄 — 9/7 구조의 "왜 이 화면인지" 자리와 같은 컴포넌트 */
export function AppliedRelaxLine({ applied, onUndo }) {
  if (!applied) return null
  const text = applied.steps === 2
    ? RELAX_COPY.appliedPair.replace('{first}', applied.before.split(' · ')[0]).replace('{second}', applied.after.split(' · ').slice(-1)[0])
    : RELAX_COPY.appliedLine.replace('{before}', applied.before).replace('{after}', applied.after)
  return (
    <div className="flex items-center gap-2 px-1 py-2" data-testid="relax-applied">
      <p className="text-t12 text-gray-600 flex-1">{text}</p>
      <button type="button" onClick={() => { logEvent('relax_undo', {}); onUndo?.() }} data-testid="relax-undo"
        className="text-t12 font-bold text-gray-500 underline underline-offset-2">{RELAX_COPY.undo}</button>
    </div>
  )
}
