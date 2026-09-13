/**
 * 1·2·4박자 — 양도인 화면 질문 카드 (ORDER 2026-09-13 C4). 질문자 이름·연락처는 없다.
 * 답장을 보내면 "이렇게 전달하고, 실제 문의로 이어지도록 안내할게요" 1줄만 뜨고(확인·선택 없음), 모두가 실제로 전달한다.
 */
import { useEffect, useState } from 'react'
import { fetchOwnerQuestions, ownerBasis, replyToAsk } from '../lib/askRelay'
import { ASK_COPY, AXIS_LABEL } from '../../config/listingAsk'
import { logEvent } from '../lib/eventLog'

export default function AskOwnerQuestionCard({ listing, accent = '#1a4d8f', onChanged }) {
  const [rows, setRows] = useState([])
  const [basis, setBasis] = useState('')
  const [openId, setOpenId] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [justReplied, setJustReplied] = useState(null)

  const load = () => { if (listing?.id) fetchOwnerQuestions([listing.id]).then(setRows) }
  useEffect(() => { load() }, [listing?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (listing?.id) ownerBasis(listing).then(setBasis) }, [listing?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const pending = rows.filter(r => r.status === 'sent')
    if (pending.length) logEvent('ask_owner_card_shown', { axis: pending[0].ask_axis, has_basis: !!basis })
  }, [rows, basis])

  const pending = rows.filter(r => r.status === 'sent')
  const done = rows.filter(r => r.status === 'replied' || r.status === 'opened')
  if (!pending.length && !done.length) return null

  const send = async (row) => {
    if (!text.trim() || busy) return
    setBusy(true)
    const r = await replyToAsk(row, text, listing)
    setBusy(false)
    if (r.ok) { setJustReplied(row.id); setOpenId(null); setText(''); load(); onChanged?.() }
  }

  return (
    <section className="rounded-2xl border border-gray-100 p-4 mb-4" data-testid="ask-owner-card">
      <p className="text-t15 font-bold text-gray-900">{ASK_COPY.ownerCardTitle}</p>
      {basis && <p className="text-t11 text-gray-400 mt-0.5" data-testid="ask-owner-basis">{basis}</p>}

      {pending.map(row => (
        <div key={row.id} className="mt-3 rounded-xl bg-gray-50 px-3.5 py-3" data-testid="ask-owner-question">
          <p className="text-t10 font-semibold text-gray-500">{AXIS_LABEL[row.ask_axis] ?? '질문'}</p>
          <p className="text-t14 text-gray-900 mt-0.5" data-testid="ask-owner-question-text">{row.ask_question_text}</p>
          {openId === row.id ? (
            <>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} data-testid="ask-owner-reply-input"
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-t14" placeholder="아는 대로 적어 주세요" />
              <button type="button" onClick={() => send(row)} disabled={!text.trim() || busy} data-testid="ask-owner-reply-send"
                className="mt-2 w-full py-2.5 rounded-xl text-t13 font-bold text-white disabled:opacity-40" style={{ backgroundColor: accent }}>보내기</button>
            </>
          ) : (
            <button type="button" onClick={() => setOpenId(row.id)} data-testid="ask-owner-reply-open"
              className="mt-2 w-full py-2.5 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: accent }}>{ASK_COPY.ownerReplyButton}</button>
          )}
        </div>
      ))}

      {justReplied && <p className="text-t13 text-gray-700 mt-3" data-testid="ask-owner-after-reply">{ASK_COPY.ownerAfterReply}</p>}

      {done.map(row => (
        <p key={row.id} className="text-t12 text-gray-500 mt-2" data-testid="ask-owner-result">
          {row.status === 'opened' ? ASK_COPY.ownerOpened : ASK_COPY.ownerRelayed}
        </p>
      ))}
    </section>
  )
}
