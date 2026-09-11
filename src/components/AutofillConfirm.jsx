/**
 * 자동 채움 확인 화면 "맞아요 / 고칠게요" (ORDER 2026-09-11 파트 B3) — 매물·기업회원 공용.
 * 항목: 칩 목록 한 화면. "확인 필요" 표시(상호 대조 실패 업종·표제부 폴백 면적). 출처 안내 1줄.
 * onDecide(field, 'confirm'|'edit'|'skip', value?)
 */
import { useState } from 'react'

export const SOURCE_NOTE = '공공 정보로 미리 채웠어요 · 다른 게 있으면 고쳐 주세요'

export default function AutofillConfirm({ items, flags = {}, accent = '#1a4d8f', accentBg = '#eef2fb', onDecide, decisions = {} }) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const start = (it) => { setEditing(it.key); setDraft(String(it.value ?? '')) }
  const commit = (it) => { onDecide(it.key, 'edit', draft); setEditing(null) }
  return (
    <div data-testid="autofill-confirm">
      <p className="text-t12 text-gray-400 mb-3">{SOURCE_NOTE}</p>
      <div className="flex flex-col gap-2">
        {items.map(it => {
          const d = decisions[it.key]
          return (
            <div key={it.key} className="rounded-2xl border px-4 py-3" data-testid={`confirm-${it.key}`} data-decision={d ?? ''}
              style={{ borderColor: d === 'confirm' ? accent : '#e5e7eb', backgroundColor: d === 'confirm' ? accentBg : 'white' }}>
              <div className="flex items-center gap-2">
                <p className="text-t12 text-gray-400 w-16 shrink-0">{it.label}</p>
                <p className="text-t14 font-bold text-gray-900 flex-1 min-w-0 truncate">{it.value || '—'}</p>
                {flags[it.key] && (
                  <span className="text-t10 font-bold px-1.5 py-0.5 rounded-full shrink-0" data-testid={`flag-${it.key}`}
                    style={{ backgroundColor: '#FBF0E0', color: '#A65A0C' }}>{flags[it.key]}</span>
                )}
              </div>
              {editing === it.key ? (
                <div className="flex gap-2 mt-2">
                  <input value={draft} onChange={e => setDraft(e.target.value)} data-testid={`edit-${it.key}`}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-t14" />
                  <button type="button" onClick={() => commit(it)} className="px-3 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: accent }}>저장</button>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => onDecide(it.key, 'confirm')} data-testid={`yes-${it.key}`}
                    className="flex-1 py-2 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: d === 'confirm' ? accent : '#374151' }}>맞아요</button>
                  <button type="button" onClick={() => start(it)} data-testid={`no-${it.key}`}
                    className="flex-1 py-2 rounded-xl text-t13 font-bold bg-white border border-gray-200 text-gray-600">고칠게요</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
