/**
 * 기업회원 '지금 찾는 분' 카드 (ORDER 2026-09-11 파트 C4·C5) — 시세 문의 라벨 + 첨부 요약(익명) + [답하기].
 * 이름·연락처 없음. 자기 응답 건만. 상단에 "시세 문의 답변 n건 · 대화로 이어진 k건"(§2-c).
 */
import { useEffect, useState } from 'react'
import { fetchVendorSignals, respondToSignal } from '../lib/priceInquiry'
import { vendorReplyDefault, chipLabel } from '../lib/priceInquiryRules'
import { PRICE_INQUIRY_COPY } from '../../config/priceInquiry'
import { DEMAND } from '../../config/demandSignal'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'

export default function DemandInbox({ vendors = [] }) {
  const [data, setData] = useState({ items: [], answered: 0, opened: 0 })
  const [editing, setEditing] = useState(null)
  const [text, setText] = useState('')
  const [limitHit, setLimitHit] = useState(false)
  const vendorIds = vendors.map(v => v.id)
  const load = () => fetchVendorSignals(vendorIds).then(setData)
  useEffect(() => { if (vendorIds.length) load() }, [vendorIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!vendorIds.length || !data.items.length) return null
  const monthCount = data.items.filter(t => t.responded_at && (Date.now() - new Date(t.responded_at)) < 30 * 864e5).length

  const start = (t) => {
    const v = vendors.find(x => x.id === t.vendor_id)
    const a = t.signal?.attachment ?? {}
    setEditing(t.id); setText(vendorReplyDefault({ vendorName: v?.shop_name ?? '업체', dong: a.dong, industry: a.industry, areaBand: a.area_band }))
  }
  const send = async (t) => {
    const r = await respondToSignal(t, text, { monthCount })
    if (r.limit) { setLimitHit(true); return }
    setEditing(null); load()
  }

  return (
    <section className="mb-5" data-testid="demand-inbox">
      <p className="text-t12 text-gray-500 mb-2" data-testid="demand-inbox-stats">
        {PRICE_INQUIRY_COPY.vendorStats.replace('{n}', String(data.answered)).replace('{k}', String(data.opened))}
      </p>
      {data.items.map(t => {
        const a = t.signal?.attachment ?? {}
        const summary = [a.industry, a.dong, a.area_band, a.floor, a.rent_band, a.sales_band ? `매출 ${a.sales_band}` : null].filter(Boolean).join(' · ')
        return (
          <div key={t.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 mb-3" data-testid="demand-signal-item">
            <div className="flex items-center gap-2">
              <span className="text-t10 font-bold px-1.5 py-0.5 rounded-full" data-testid="demand-signal-label" style={{ backgroundColor: PURPLE_BG, color: PURPLE }}>시세 문의</span>
              <span className="text-t11 text-gray-400">{(a.chips ?? []).map(chipLabel).join(' · ')}</span>
            </div>
            <p className="text-t14 font-bold text-gray-900 mt-1" data-testid="demand-signal-summary">{summary || '첨부 없음'}</p>
            {t.responded_at ? (
              <p className="text-t12 text-gray-500 mt-1">답했어요 · {t.conversation_id ? '대화로 이어짐' : '사용자가 대화를 열면 알려드려요'}</p>
            ) : editing === t.id ? (
              <div className="mt-2">
                <textarea value={text} onChange={e => setText(e.target.value.slice(0, DEMAND.replyMaxChars))} rows={3} data-testid="demand-reply-text" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-t13" />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-t11 text-gray-400">{text.length}/{DEMAND.replyMaxChars}</span>
                  <button type="button" onClick={() => send(t)} data-testid="demand-reply-send" className="px-4 py-2 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: PURPLE }}>보내기</button>
                </div>
                {limitHit && <p className="text-t11 mt-1" style={{ color: '#A65A0C' }} data-testid="demand-reply-limit">이번 달 무료 응답 한도를 다 썼어요 · 입점 업그레이드에서 늘릴 수 있어요</p>}
              </div>
            ) : (
              <button type="button" onClick={() => start(t)} data-testid="demand-reply-open" className="mt-2 w-full py-2.5 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: PURPLE }}>답하기</button>
            )}
          </div>
        )
      })}
    </section>
  )
}
