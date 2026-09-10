/**
 * 찜 받은 사람(양도인·소유주) 카드 (ORDER 2026-09-10 파트 A4) — 매물 상세 소유자 뷰.
 * "관심 n명" + 익명 요약(n≥3) / [관심 주신 분께 한마디](템플릿 3개, 7일 1회) / [찜한 분들께 알리기](예약 알림 즉시, 30일 1회)
 * / 찜 10건+ 문의 0건 14일 → 완성도 '다음 1개'와 같은 함수로 보완 1줄. 개인 식별 정보는 어디에도 없다.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchWatcherStats, fetchOwnerMessageState, sendOwnerMessage, pushQueuedNow } from '../lib/watchlist'
import { watcherSummary, noInquiryDespiteWatch, guOf } from '../lib/watchRules'
import { getNextCompletenessItem } from '../lib/completenessNext'
import { OWNER_TEMPLATES } from '../../config/watch'
import { BottomSheet } from './VendorContactButtons'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

export default function WatchOwnerCard({ listing, showToast, accent = NAVY }) {
  const [stats, setStats] = useState(null)
  const [state, setState] = useState(null)
  const [inquiries, setInquiries] = useState(null)
  const [sheet, setSheet] = useState(false)
  const [tpl, setTpl] = useState(null)
  const [slot, setSlot] = useState(null)
  const [busy, setBusy] = useState(false)

  const reload = () => {
    fetchWatcherStats(listing.id).then(setStats)
    fetchOwnerMessageState(listing.id).then(setState)
  }
  useEffect(() => {
    if (!listing?.id) return
    reload()
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('listing_id', listing.id)
      .then(({ count }) => setInquiries(count ?? 0)).catch(() => setInquiries(0))
  }, [listing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!stats || stats.n <= 0) return null
  const summary = watcherSummary(stats.n, stats.profiles, guOf(listing.address))
  const gap = inquiries !== null && noInquiryDespiteWatch({ watchers: stats.n, inquiries, publishedAt: listing.published_at ?? listing.created_at })
    ? getNextCompletenessItem(listing) : null

  const send = async () => {
    if (!tpl || busy) return
    const t = OWNER_TEMPLATES.find(x => x.key === tpl)
    if (t?.slots && !slot) return
    setBusy(true)
    const r = await sendOwnerMessage(listing, tpl, slot)
    setBusy(false)
    if (r.ok) { showToast?.(`찜한 ${r.n}명에게 전했어요`); setSheet(false); setTpl(null); setSlot(null); reload() }
    else showToast?.('보내지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  const push = async () => {
    if (busy) return
    setBusy(true)
    const r = await pushQueuedNow(listing)
    setBusy(false)
    if (r.ok) { showToast?.(`찜한 분들께 지금 알렸어요 (${r.n}건)`); reload() }
  }

  return (
    <div className="rounded-2xl border px-4 py-3.5 mb-3 bg-white" style={{ borderColor: `${accent}25` }} data-testid="watch-owner-card">
      <p className="text-t12 font-bold" style={{ color: accent }}>관심</p>
      <p className="text-t16 font-black text-gray-900 mt-0.5" data-testid="watch-owner-count">관심 {stats.n}명</p>
      {summary && <p className="text-t13 text-gray-600 mt-0.5" data-testid="watch-owner-summary">{summary}</p>}
      {gap && (
        <p className="text-t12 text-gray-600 mt-2 rounded-xl px-3 py-2" style={{ backgroundColor: NAVY_BG }} data-testid="watch-no-inquiry">
          관심은 많은데 문의가 없어요 · {gap.line.split(' 완성도')[0]} 보완해 보세요
        </p>
      )}
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={() => setSheet(true)} disabled={!state?.canMessage} data-testid="owner-msg-open"
          className="flex-1 py-2.5 rounded-xl text-t13 font-bold text-white disabled:opacity-40" style={{ backgroundColor: accent }}>
          관심 주신 분께 한마디
        </button>
        <button type="button" onClick={push} disabled={!state?.canPush || busy} data-testid="owner-push"
          className="flex-1 py-2.5 rounded-xl text-t13 font-bold bg-gray-100 text-gray-700 disabled:opacity-40">
          찜한 분들께 알리기
        </button>
      </div>
      {state && !state.canMessage && <p className="text-t11 text-gray-400 mt-1.5">한마디는 7일에 한 번 보낼 수 있어요</p>}

      {sheet && (
        <BottomSheet onClose={() => setSheet(false)} testId="owner-msg-sheet">
          <p className="text-t16 font-black text-gray-900">관심 주신 분께 한마디</p>
          <p className="text-t12 text-gray-400 mt-0.5 mb-3">아래 중 하나를 골라 보내요 · 찜한 분 전원에게 알림으로 가요</p>
          <div className="flex flex-col gap-2" data-testid="owner-msg-templates">
            {OWNER_TEMPLATES.map(t => (
              <button key={t.key} type="button" onClick={() => { setTpl(t.key); setSlot(null) }} data-testid={`owner-tpl-${t.key}`}
                className="w-full text-left px-4 py-3 rounded-2xl border text-t14 font-semibold"
                style={tpl === t.key ? { borderColor: accent, backgroundColor: NAVY_BG, color: accent } : { borderColor: '#e5e7eb', color: '#111827' }}>
                {t.text.replace('{slot}', slot ?? '…')}
              </button>
            ))}
          </div>
          {OWNER_TEMPLATES.find(t => t.key === tpl)?.slots && (
            <div className="flex gap-2 mt-3" data-testid="owner-msg-slots">
              {OWNER_TEMPLATES.find(t => t.key === tpl).slots.map(s => (
                <button key={s} type="button" onClick={() => setSlot(s)} data-testid={`owner-slot-${s}`}
                  className="px-3 py-2 rounded-full text-t13 font-semibold border"
                  style={slot === s ? { backgroundColor: accent, color: 'white', borderColor: accent } : { borderColor: '#e5e7eb' }}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={send} disabled={!tpl || busy} data-testid="owner-msg-send"
            className="mt-4 w-full py-3.5 rounded-2xl text-t15 font-bold text-white disabled:opacity-40" style={{ backgroundColor: accent }}>
            보내기
          </button>
        </BottomSheet>
      )}
    </div>
  )
}
