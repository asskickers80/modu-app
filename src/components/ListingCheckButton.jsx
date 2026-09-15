/**
 * [아직 있어요] — 매물이 살아 있다는 판매자 신호 (2026-09-15 후속 조각).
 * 누르면 last_checked_at 을 지금으로 저장하고, 방문자 화면에 "{M}월 {D}일 확인된 매물"로 보인다.
 * 컬럼이 아직 없으면(스키마 미실행) 조용히 실패하고 화면은 그대로다 — 등록일로 대체하지 않는다.
 * 재촉·경고 문구를 만들지 않는다: 오래 안 눌렀다는 표시는 판매자에게 불리한 시간 축 정보다.
 */
import { useState } from 'react'
import { supabase, getDeviceId } from '../lib/supabase'
import { logEvent } from '../lib/eventLog'
import { FRESHNESS, FRESHNESS_COPY } from '../../config/freshness'
import { canCheckAgain, checkedLabel } from '../lib/listingDates'

export default function ListingCheckButton({ listing, accent = '#1a4d8f', onChecked, showToast }) {
  const [saving, setSaving] = useState(false)
  const [local, setLocal] = useState(listing?.last_checked_at ?? null)
  const merged = { ...listing, last_checked_at: local }
  const ready = canCheckAgain(merged, FRESHNESS.COOLDOWN_DAYS)

  const check = async () => {
    if (!ready || saving) return
    setSaving(true)
    const now = new Date().toISOString()
    try {
      const { error } = await supabase.from('listings')
        .update({ last_checked_at: now })
        .eq('id', listing.id).eq('device_id', getDeviceId())
      if (error) { showToast?.(FRESHNESS_COPY.failed); setSaving(false); return }
      setLocal(now)
      logEvent('listing_checked', { listing_id: listing.id })
      showToast?.(FRESHNESS_COPY.saved)
      onChecked?.(now)
    } catch (_) { showToast?.(FRESHNESS_COPY.failed) }
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2 mt-1.5" data-testid="listing-check">
      <button type="button" onClick={check} disabled={!ready || saving} data-testid="listing-check-button"
        className="px-3 py-1.5 rounded-full text-t11 font-bold text-white disabled:opacity-40" style={{ backgroundColor: accent }}>
        {local ? FRESHNESS_COPY.buttonDone : FRESHNESS_COPY.button}
      </button>
      <span className="text-t11 text-gray-500" data-testid="listing-check-hint">
        {local
          ? checkedLabel(merged)
          : FRESHNESS_COPY.hint.replace('{M}', String(new Date().getMonth() + 1)).replace('{D}', String(new Date().getDate()))}
      </span>
    </div>
  )
}
