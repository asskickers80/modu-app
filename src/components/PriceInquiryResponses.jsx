/**
 * 시세 문의 응답 카드 (ORDER 2026-09-11 파트 C4·C5) — 사용자 홈에 표시. 최대 3곳 + 더 보기, 응답 시각 오름차순.
 * [대화 열기] 전에는 대화·연락처 전달 없음. 만료 안내 1회. 대화 7일 뒤 또는 만료 시 피드백 칩 1회(무응답 시 재표시 없음).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyPriceInquiries, openPriceInquiryDm, declineResponse, sendFeedback, fetchFeedbackDone, expireIfDue } from '../lib/priceInquiry'
import { sortResponses, visibleResponses, responseCardLine, feedbackDue, isExpired } from '../lib/priceInquiryRules'
import { PRICE_INQUIRY_COPY, FEEDBACK_CHIPS } from '../../config/priceInquiry'
import { logEvent } from '../lib/eventLog'

const monthsSince = iso => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso)) / (30 * 864e5))) : null)

export default function PriceInquiryResponses({ accent = '#1a4d8f', showToast }) {
  const navigate = useNavigate()
  const [sigs, setSigs] = useState([])
  const [more, setMore] = useState({})
  const [fbDone, setFbDone] = useState(new Set())

  const load = async () => {
    const list = await fetchMyPriceInquiries()
    for (const s of list) if (await expireIfDue(s)) { s.status = 'expired'; showToast?.(PRICE_INQUIRY_COPY.expired) }
    setSigs(list)
    setFbDone(await fetchFeedbackDone(list.map(s => s.id)))
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const open = async (t, s, rank) => {
    const r = await openPriceInquiryDm({ ...t, rank }, s, navigate)
    if (!r.ok) showToast?.('대화를 열지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  const decline = async (t) => { await declineResponse(t); load() }
  const feedback = async (s, key) => { await sendFeedback(s, key); setFbDone(prev => new Set([...prev, s.id])) }

  const cards = sigs.filter(s => s.targets.some(t => t.responded_at && !t.declined_at) || (s.status !== 'open' && !fbDone.has(s.id)))
  if (!cards.length) return null
  return (
    <div className="mb-4" data-testid="price-inquiry-responses">
      {cards.map(s => {
        const sorted = sortResponses(s.targets.filter(t => !t.declined_at))
        const { shown, more: extra } = visibleResponses(more[s.id] ? sorted : sorted, more[s.id] ? 999 : undefined)
        const opened = s.targets.find(t => t.conversation_id)
        const askFb = !fbDone.has(s.id) && (isExpired(s) || (opened && feedbackDue(opened.sent_at)) || s.status === 'expired')
        return (
          <div key={s.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 mb-3" data-testid="price-inquiry-card">
            <p className="text-t12 font-bold" style={{ color: accent }}>시세 문의 답변</p>
            {shown.map((t, i) => {
              const line = responseCardLine({ vendorName: t.vendor?.shop_name ?? '업체', avgHours: null, months: monthsSince(t.vendor?.published_at) })
              return (
                <div key={t.id} className="py-2.5 border-b border-gray-50 last:border-0" data-testid="price-response" data-rank={i + 1}>
                  <p className="text-t14 font-bold text-gray-900">{line}</p>
                  {t.response_text && <p className="text-t13 text-gray-600 mt-0.5">{t.response_text}</p>}
                  {!t.conversation_id ? (
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => open(t, s, i + 1)} data-testid="price-response-open" className="flex-1 py-2 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: accent }}>{PRICE_INQUIRY_COPY.openDm}</button>
                      <button type="button" onClick={() => decline(t)} data-testid="price-response-decline" className="px-4 py-2 rounded-xl text-t13 font-semibold bg-gray-100 text-gray-600">{PRICE_INQUIRY_COPY.decline}</button>
                    </div>
                  ) : <p className="text-t11 text-gray-400 mt-1">대화가 열렸어요</p>}
                </div>
              )
            })}
            {extra > 0 && (
              <button type="button" onClick={() => { setMore(m => ({ ...m, [s.id]: true })); logEvent('price_inquiry_response_card', { rank: shown.length + 1 }) }} data-testid="price-response-more"
                className="w-full py-2 text-t13 font-semibold text-gray-500">{PRICE_INQUIRY_COPY.more} ({extra})</button>
            )}
            {s.status === 'expired' && !sorted.length && <p className="text-t13 text-gray-600" data-testid="price-inquiry-expired">{PRICE_INQUIRY_COPY.expired}</p>}
            {askFb && (
              <div className="mt-3" data-testid="price-inquiry-feedback">
                <p className="text-t12 text-gray-500 mb-1.5">{PRICE_INQUIRY_COPY.feedbackAsk}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {FEEDBACK_CHIPS.map(c => (
                    <button key={c.key} type="button" onClick={() => feedback(s, c.key)} data-testid={`pi-feedback-${c.key}`}
                      className="px-3 py-1.5 rounded-full text-t12 font-semibold border border-gray-200 text-gray-700 min-h-9">{c.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
