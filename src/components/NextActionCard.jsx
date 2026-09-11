/**
 * 사장님 매출 분석 마지막 요소 — '다음 행동' 카드 1장 (ORDER 2026-09-10 파트 B)
 * ① 상황 서비스 카드(기존 SalesServiceCard) ② 시세 카드 ③ 다음 달 준비 카드. 해당 없음이면 카드 없음.
 * 같은 카드 30일 1회·[닫기] 30일 숨김(sales_card_impressions, signal 값 확장). 매출 금액은 카드에 쓰지 않는다.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SalesServiceCard, { ServiceSheet } from './SalesServiceCard'
import { BottomSheet } from './VendorContactButtons'
import { loadNextActionCard } from '../lib/nextAction'
import { nextActionCopy } from '../lib/nextActionRules'
import { recordSalesCardShown, dismissSalesCard } from '../lib/salesSignal'
import { recordInquiry } from '../lib/inquiryLedger'
import { getProfile } from '../lib/userProfile'
import { logEvent } from '../lib/eventLog'
import { CHECKLISTS } from '../../config/nextMonthChecklists'
import PriceInquirySheet, { PriceInquiryButton } from './PriceInquirySheet'

const GREEN = '#2d7a4f'
const GREEN_BG = '#edf7f1'

export default function NextActionCard() {
  const navigate = useNavigate()
  const [card, setCard] = useState(null)
  const [impressionId, setImpressionId] = useState(null)
  const [sheet, setSheet] = useState(null) // null | 'checklist' | 'vendors'
  const [askPrice, setAskPrice] = useState(false) // '모두에 시세 물어보기' (2026-09-11 파트 C2-a)

  useEffect(() => {
    let alive = true
    loadNextActionCard().then(async c => {
      if (!alive || !c) return
      setCard(c)
      if (c.kind === 'service') return // 노출 기록·이벤트는 SalesServiceCard 가 담당
      let id = c.impressionId
      if (!id) { id = await recordSalesCardShown(c.signal); logEvent('next_card_shown', { signal: c.signal, basis: c.basis ?? null }) }
      if (alive) setImpressionId(id)
    })
    return () => { alive = false }
  }, [])

  if (!card) return null
  if (card.kind === 'service') return <SalesServiceCard preloaded={card} />
  const copy = nextActionCopy(card)
  if (!copy) return null

  const dismiss = () => {
    logEvent('next_card_dismissed', { signal: card.signal })
    dismissSalesCard(card.signal, impressionId)
    setCard(null)
  }
  const act = async () => {
    if (card.kind === 'price_range') {
      logEvent('price_card_click', {})
      await recordInquiry({ source: 'price_card', signal: 'price_range', channel: 'app', status: 'sent', region: card.gu })
      logEvent('price_card_preview_start', {})
      navigate('/e1/1?preview=1')
      return
    }
    if (card.rule === 'lease_prep') { logEvent('checklist_open', { kind: 'lease_prep' }); setSheet('checklist'); return }
    if (card.rule === 'vat_due') { setSheet('vendors'); return }
    if (card.rule === 'growth') {
      const gu = getProfile().region_sub ?? ''
      logEvent('axis_switch', { from: 'owner', to: 'prep', reason: 'growth' })
      navigate(`/explore?type=landlord&gu=${encodeURIComponent(gu)}`)
    }
  }

  return (
    <div className="rounded-2xl px-4 py-3.5 mb-3 relative bg-white border border-gray-100"
      data-testid="next-action-card" data-signal={card.signal}>
      <button onClick={dismiss} data-testid="next-action-dismiss" aria-label="닫기"
        className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center text-gray-300 text-t14">✕</button>
      <p className="text-t15 font-bold text-gray-900 leading-snug pr-8" data-testid="next-action-line1">{copy.line1}</p>
      <p className="text-t12 text-gray-500 mt-1 leading-relaxed" data-testid="next-action-line2">{copy.line2}</p>
      <button onClick={act} data-testid="next-action-cta"
        className="mt-3 w-full py-2.5 rounded-xl text-t13 font-bold text-white active:scale-[0.99] transition-transform"
        style={{ backgroundColor: GREEN }}>
        {copy.cta}
      </button>
      {card.kind === 'price_range' && <div className="mt-2"><PriceInquiryButton onClick={() => setAskPrice(true)} accent={GREEN} /></div>}
      {copy.foot && <p className="text-t11 text-gray-400 mt-2" data-testid="next-action-foot">{copy.foot}</p>}
      {askPrice && (
        <PriceInquirySheet origin="sales_card" accent={GREEN} onClose={() => setAskPrice(false)}
          place={{ industry: card.industry, gu: card.gu, entries: card.entries ?? [] }} />
      )}

      {sheet === 'checklist' && (
        <BottomSheet onClose={() => setSheet(null)} testId="checklist-sheet">
          <p className="text-t16 font-black text-gray-900">{CHECKLISTS.lease_prep.title}</p>
          <ul className="mt-3 space-y-2" data-testid="checklist-items">
            {CHECKLISTS.lease_prep.items.map(t => (
              <li key={t} className="flex gap-2 text-t14 text-gray-800 leading-snug rounded-xl px-3 py-2.5" style={{ backgroundColor: GREEN_BG }}>
                <span style={{ color: GREEN }}>✓</span><span>{t}</span>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}
      {sheet === 'vendors' && (
        <ServiceSheet sig={{ signal: 'vat_due', basis: null }} copy={{ line1: copy.line1 }} entries={card.entries ?? []} onClose={() => setSheet(null)} />
      )}
    </div>
  )
}
