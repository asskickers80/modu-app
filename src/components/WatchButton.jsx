/**
 * 찜(관심) 버튼·훅 (ORDER 2026-09-10 파트 A2) — 매물·동네·기업회원 공용. 누른 즉시 토스트 1줄.
 * 로그인 게이트는 호출부가 gate 로 넘긴다(매물 상세는 기존 가입 게이트 유지). 찜 자체에 보상 없음(A8).
 */
import { useEffect, useState } from 'react'
import { isWatched, addWatch, removeWatch } from '../lib/watchlist'
import { watchToast } from '../lib/watchRules'
import { TOAST } from '../../config/watch'

export function useWatch({ type, id, listing = null, showToast }) {
  const [watched, setWatched] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    if (!id) return
    isWatched(type, id).then(w => { if (alive) setWatched(w) })
    return () => { alive = false }
  }, [type, id])
  const toggle = async () => {
    if (!id || busy) return
    setBusy(true)
    if (watched) {
      setWatched(false)
      await removeWatch(type, id)
      showToast?.(TOAST.removed)
    } else {
      setWatched(true)
      const r = await addWatch({ type, id, listing })
      if (r.ok) showToast?.(watchToast(type, r.ordinal))
      else setWatched(false)
    }
    setBusy(false)
  }
  return { watched, toggle }
}

/** 작은 하트 칩 — 기업회원·동네용. label 이 있으면 텍스트 칩 */
export default function WatchButton({ type, id, listing = null, showToast, label = null, accent = '#ef4444', gate = null, testId }) {
  const { watched, toggle } = useWatch({ type, id, listing, showToast })
  const onClick = (e) => { e.stopPropagation(); if (gate && gate()) return; toggle() }
  return (
    <button type="button" onClick={onClick} aria-pressed={watched} aria-label={label ?? '찜'}
      data-testid={testId ?? `watch-${type}`}
      className={`inline-flex items-center gap-1 rounded-full border min-h-9 ${label ? 'px-3 py-1.5 text-t12 font-semibold' : 'w-9 h-9 justify-center'}`}
      style={{ borderColor: watched ? accent : '#e5e7eb', color: watched ? accent : '#6b7280', backgroundColor: watched ? `${accent}12` : 'white' }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill={watched ? accent : 'none'}>
        <path d="M8 14s-5.5-3.4-5.5-7.2A3 3 0 018 5a3 3 0 015.5 1.8C13.5 10.6 8 14 8 14z" stroke={watched ? accent : '#9ca3af'} strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      {label && <span>{label}</span>}
    </button>
  )
}
