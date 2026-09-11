/**
 * '모두에 시세 물어보기' 바텀시트 (ORDER 2026-09-11 파트 C3) — 입구는 이 시트 하나.
 * 상단: 모두 데이터(시세 범위 카드 + 부동산원 비교선, 없으면 생략 — "데이터 부족" 문구 금지)
 * 첨부 미리보기(업종/동/면적대/층/월세대 + 선택 매출 구간) → 요청 칩 → 시기 칩 → 정직 라벨 → [물어보기]. 로그인 필수.
 * 예측·추정 금액은 어디에도 없다. 시트 안 문안은 "점포"(사장님 축이어도).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from './VendorContactButtons'
import { useAuth } from '../contexts/AuthContext'
import { getProfile } from '../lib/userProfile'
import { logEvent } from '../lib/eventLog'
import { attachmentItems, buildAttachment, labelText } from '../lib/priceInquiryRules'
import { sendPriceInquiry } from '../lib/priceInquiry'
import { priceRange, nextActionCopy } from '../lib/nextActionRules'
import { getRebStat } from '../lib/rebStats'
import { cardLines } from '../lib/rebStatsRules'
import { revenueBandOf } from '../lib/vendorInquiry'
import { PRICE_INQUIRY_COPY, REQUEST_CHIPS, TIMING_CHIPS } from '../../config/priceInquiry'
import { supabase } from '../lib/supabase'

/**
 * @param origin sales_card | seller_onboarding | owner_card | listing_manage
 * @param place { industry, address, area, floor, monthlyRent, bjd_code, coords, entries(매출), defaultChip }
 */
export default function PriceInquirySheet({ origin, place = {}, accent = '#1a4d8f', onClose, showToast, onLater = null }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const profile = getProfile()
  const industry = place.industry ?? profile.category_main ?? profile.bizLabel ?? null
  const address = place.address ?? (profile.region ? [profile.region, profile.region_sub].filter(Boolean).join(' ') : null)
  const items = useMemo(() => attachmentItems({ industry, address, area: place.area, floor: place.floor, monthlyRent: place.monthlyRent }), [industry, address, place.area, place.floor, place.monthlyRent])
  const salesBand = useMemo(() => revenueBandOf(place.entries ?? []), [place.entries])
  const [enabled, setEnabled] = useState({})
  const [bandOn, setBandOn] = useState(false)
  const [chips, setChips] = useState(place.defaultChip ? [place.defaultChip] : [])
  const [timing, setTiming] = useState(null)
  const [range, setRange] = useState(null)
  const [reb, setReb] = useState(null)
  const [sending, setSending] = useState(false)

  const openedRef = useRef(false) // 이벤트 1회 (StrictMode 이중 마운트 방지)
  useEffect(() => {
    if (!openedRef.current) { openedRef.current = true; logEvent('price_inquiry_open', { origin }) }
    let alive = true
    const gu = place.gu ?? profile.region_sub ?? null
    ;(async () => {
      let r = null
      if (industry && gu) {
        try {
          const { data } = await supabase.from('listings').select('id, status, address, category_main, transfer_fee, monthly_rent, updated_at')
            .eq('listing_type', 'seller').eq('category_main', industry).in('status', ['published', 'negotiating', 'sold']).limit(200)
          r = priceRange(data ?? [], { industry, gu })
        } catch (_) { r = null }
      }
      const s = place.bjd_code ? await getRebStat({ bjd_code: place.bjd_code }) : null
      if (!alive) return
      setRange(r); setReb(s)
      logEvent('price_inquiry_data_card', { has_range: !!r, has_reb: !!s })
    })()
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleChip = k => setChips(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])
  const canSend = !!user && chips.length > 0 && !sending

  const send = async () => {
    if (!user) { showToast?.('로그인하면 물어볼 수 있어요'); return }
    setSending(true)
    const attachment = buildAttachment(items, enabled, { chips, timing, salesBand: bandOn ? salesBand : null })
    const r = await sendPriceInquiry({ origin, attachment, address: place.address ?? address, coords: place.coords ?? null })
    setSending(false)
    if (r.duplicate) { showToast?.(PRICE_INQUIRY_COPY.dedupe); onClose?.(); return }
    if (!r.ok) { showToast?.('보내지 못했어요. 잠시 후 다시 시도해 주세요.'); return }
    showToast?.(r.pending ? PRICE_INQUIRY_COPY.pending : '물어봤어요 · 답이 오면 알려드릴게요')
    onClose?.()
  }

  const rangeCopy = range ? nextActionCopy({ kind: 'price_range', range, industry }) : null
  const rebLines = reb ? cardLines(reb, { monthlyRent: place.monthlyRent, area: place.area, label: 'listing' }) : null

  return (
    <BottomSheet onClose={onClose} testId="price-inquiry-sheet">
      <p className="text-t16 font-black text-gray-900" data-testid="price-inquiry-title">{PRICE_INQUIRY_COPY.title}</p>

      {(rangeCopy || rebLines) && (
        <div className="mt-3 rounded-2xl border border-gray-100 px-4 py-3" data-testid="price-inquiry-data">
          {rangeCopy && <p className="text-t13 font-semibold text-gray-900" data-testid="price-inquiry-range">{rangeCopy.line1}</p>}
          {rangeCopy && <p className="text-t11 text-gray-400">{rangeCopy.line2}</p>}
          {rebLines && <p className="text-t13 font-semibold text-gray-900 mt-1.5" data-testid="price-inquiry-reb">{rebLines.line1}</p>}
        </div>
      )}

      <p className="text-t12 text-gray-400 mt-4 mb-1">함께 보내는 정보 · 빼고 싶은 건 끄세요</p>
      <div className="divide-y divide-gray-50" data-testid="price-inquiry-attach">
        {items.map(it => (
          <button key={it.key} type="button" onClick={() => setEnabled(p => ({ ...p, [it.key]: p[it.key] === false }))} data-testid={`pi-attach-${it.key}`}
            aria-pressed={enabled[it.key] !== false} className="w-full flex items-center justify-between py-2.5 min-h-11">
            <span className="text-t14 text-gray-800">{it.label} · {it.value}</span>
            <span className="w-11 h-6 rounded-full relative" style={{ backgroundColor: enabled[it.key] !== false ? '#111827' : '#e5e7eb' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white" style={{ left: enabled[it.key] !== false ? 22 : 2 }} />
            </span>
          </button>
        ))}
        {salesBand && (
          <button type="button" onClick={() => setBandOn(v => !v)} data-testid="pi-attach-sales-band" aria-pressed={bandOn} className="w-full flex items-center justify-between py-2.5 min-h-11">
            <span className="text-t14 text-gray-800">최근 3개월 매출 구간 · {salesBand}</span>
            <span className="w-11 h-6 rounded-full relative" style={{ backgroundColor: bandOn ? '#111827' : '#e5e7eb' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white" style={{ left: bandOn ? 22 : 2 }} />
            </span>
          </button>
        )}
      </div>

      <p className="text-t12 text-gray-400 mt-4 mb-1.5">무엇을 물어볼까요?</p>
      <div className="flex flex-wrap gap-2" data-testid="price-inquiry-chips">
        {REQUEST_CHIPS.map(c => (
          <button key={c.key} type="button" onClick={() => toggleChip(c.key)} data-testid={`pi-chip-${c.key}`} aria-pressed={chips.includes(c.key)}
            className="px-3.5 py-2.5 rounded-full text-t13 font-bold border"
            style={chips.includes(c.key) ? { backgroundColor: accent, color: 'white', borderColor: accent } : { borderColor: '#e5e7eb', color: '#111827' }}>{c.label}</button>
        ))}
      </div>
      <p className="text-t12 text-gray-400 mt-4 mb-1.5">언제쯤이에요?</p>
      <div className="flex flex-wrap gap-2" data-testid="price-inquiry-timing">
        {TIMING_CHIPS.map(c => (
          <button key={c.key} type="button" onClick={() => setTiming(c.key)} data-testid={`pi-timing-${c.key}`} aria-pressed={timing === c.key}
            className="px-3.5 py-2.5 rounded-full text-t13 font-bold border"
            style={timing === c.key ? { backgroundColor: accent, color: 'white', borderColor: accent } : { borderColor: '#e5e7eb', color: '#111827' }}>{c.label}</button>
        ))}
      </div>

      <p className="text-t11 text-gray-400 mt-4" data-testid="price-inquiry-label">{labelText()}</p>
      <button type="button" onClick={send} disabled={!canSend} data-testid="price-inquiry-send"
        className="mt-3 w-full py-3.5 rounded-2xl text-t15 font-bold text-white disabled:opacity-40" style={{ backgroundColor: accent }}>
        {PRICE_INQUIRY_COPY.send}
      </button>
      {!user && <p className="text-t11 text-gray-400 mt-1.5 text-center">로그인하면 물어볼 수 있어요</p>}
      {onLater && (
        <button type="button" onClick={onLater} data-testid="price-inquiry-later" className="mt-3 w-full text-t12 text-gray-400 underline underline-offset-2">{PRICE_INQUIRY_COPY.laterRegister}</button>
      )}
    </BottomSheet>
  )
}

/** 입구 버튼 — 문안은 항상 하나 */
export function PriceInquiryButton({ onClick, accent = '#1a4d8f', variant = 'secondary', testId = 'price-inquiry-open' }) {
  const cls = variant === 'link'
    ? 'text-t12 font-semibold underline underline-offset-2 min-h-9'
    : 'w-full py-2.5 rounded-xl text-t13 font-bold border'
  return (
    <button type="button" onClick={onClick} data-testid={testId} className={cls}
      style={variant === 'link' ? { color: accent } : { color: accent, borderColor: `${accent}55`, backgroundColor: 'white' }}>
      {PRICE_INQUIRY_COPY.button}
    </button>
  )
}
