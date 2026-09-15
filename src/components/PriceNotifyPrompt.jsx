/**
 * 가격 인하 저장 직후 1회 — "찜한 분들께 알릴까요?" (ORDER 2026-09-15 파트 B2)
 * 판매자가 고르는 것이다. 자동 발송은 없다. 기본 포커스는 [괜찮아요].
 * 시트에 이전 가격·인하 폭을 쓰지 않는다. "안 켜면 손해" 류 문구·미발송 표시도 만들지 않는다.
 */
import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from './VendorContactButtons'
import { WATCH, PRICE_PROMPT } from '../../config/watch'
import { logEvent } from '../lib/eventLog'
import { notifyPriceChangeByOwner } from '../lib/watchlist'

export const PROMPT_COPY = PRICE_PROMPT

export default function PriceNotifyPrompt({ listing, watchers = 0, cooldown = false, onClose, showToast, accent = '#1a4d8f' }) {
  const [busy, setBusy] = useState(false)
  const noRef = useRef(null)
  const logged = useRef(false)
  useEffect(() => {
    if (logged.current) return
    logged.current = true
    logEvent('price_notify_prompt_shown', { listing_id: listing?.id, n: watchers })
    noRef.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const answer = async (accepted) => {
    if (busy) return
    logEvent('price_notify_prompt_answer', { accepted })
    if (!accepted) { onClose?.(); return }
    setBusy(true)
    const r = await notifyPriceChangeByOwner(listing)
    setBusy(false)
    showToast?.(r.ok ? PROMPT_COPY.sent : PROMPT_COPY.cooldown)
    onClose?.()
  }

  return (
    <BottomSheet onClose={onClose} testId="price-notify-prompt">
      {cooldown ? (
        <>
          <p className="text-t15 text-gray-800" data-testid="price-notify-cooldown">{PROMPT_COPY.cooldown}</p>
          <button type="button" onClick={onClose} data-testid="price-notify-close"
            className="mt-4 w-full py-3.5 rounded-2xl text-t15 font-bold bg-gray-100 text-gray-700">닫기</button>
        </>
      ) : (
        <>
          <p className="text-t16 font-black text-gray-900" data-testid="price-notify-ask">
            {watchers >= WATCH.SUMMARY_MIN ? PROMPT_COPY.askN.replace('{n}', String(watchers)) : PROMPT_COPY.askPlain}
          </p>
          <div className="flex gap-2 mt-4">
            <button type="button" ref={noRef} onClick={() => answer(false)} data-testid="price-notify-no"
              className="flex-1 py-3.5 rounded-2xl text-t15 font-bold bg-gray-100 text-gray-700">{PROMPT_COPY.no}</button>
            <button type="button" onClick={() => answer(true)} disabled={busy} data-testid="price-notify-yes"
              className="flex-1 py-3.5 rounded-2xl text-t15 font-bold text-white disabled:opacity-40" style={{ backgroundColor: accent }}>{PROMPT_COPY.yes}</button>
          </div>
        </>
      )}
    </BottomSheet>
  )
}
