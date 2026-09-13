/**
 * 매물 상세 '모두에 질문하기' (ORDER 2026-09-13 파트 A6) — 상권 섹션 아래 1장.
 * 입력창 하나. 예시는 placeholder 로만 순환(탭으로 문장을 채우지 않는다). 답이 없으면 곧장 ②(주인에게 대신 물어보기).
 * 기존 [문의하기] 버튼은 그대로 둔다 — 여기는 공개 정보 창구다.
 */
import { useEffect, useRef, useState } from 'react'
import { fetchAskExamples, askQuestion, sendAskToOwner } from '../lib/listingAsk'
import { ASK_COPY } from '../../config/listingAsk'
import { logEvent } from '../lib/eventLog'

export default function ListingAskSection({ listing, extra = {}, accent = '#1a4d8f', onPriceInquiry, showToast }) {
  const [examples, setExamples] = useState([])
  const [idx, setIdx] = useState(0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)   // { branch, answer, followups, axis, question, message }
  const [asked, setAsked] = useState(false)
  const shown = useRef(false)
  const seed = useRef(Math.floor(Math.random() * 1e6))
  const focused = useRef(false)

  useEffect(() => {
    if (!listing?.id) return
    let alive = true
    fetchAskExamples(listing, extra, seed.current).then(({ examples: ex }) => {
      if (!alive) return
      setExamples(ex)
      if (!shown.current) { shown.current = true; logEvent('ask_section_shown', { target_id: listing.id }) }
    })
    return () => { alive = false }
  }, [listing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // placeholder 순환 — 입력 중·포커스 중에는 멈춘다
  useEffect(() => {
    if (!examples.length || text || focused.current) return
    const t = setInterval(() => setIdx(i => (i + 1) % examples.length), 4000)
    return () => clearInterval(t)
  }, [examples.length, text])

  useEffect(() => {
    const ex = examples[idx]
    if (ex) logEvent('ask_example_shown', { example_key: ex.key, axis: ex.axis, branch: ex.branch })
  }, [idx, examples])

  const submit = async (q = text, source = 'free') => {
    const question = String(q ?? '').trim()
    if (!question || busy) return
    setBusy(true); setAsked(false)
    logEvent('ask_submit', { len: question.length, source })
    const r = await askQuestion(listing, question, extra)
    setBusy(false)
    if (r.branch === 'price') { setResult(null); setText(''); onPriceInquiry?.(); return }
    setResult({ ...r, question: r.question ?? question })
    setText('')
  }

  const askOwner = async () => {
    if (!result?.question || busy) return
    setBusy(true)
    const r = await sendAskToOwner(listing, result.question, result.axis ?? 'other')
    setBusy(false)
    if (r.ok) { setAsked(true); showToast?.(ASK_COPY.ownerSent) }
  }

  const placeholder = examples[idx]?.text ?? ASK_COPY.placeholderFallback

  return (
    <section className="rounded-2xl border border-gray-100 p-4 mb-4" data-testid="ask-section">
      <p className="text-t15 font-bold text-gray-900">{ASK_COPY.sectionTitle}</p>
      <p className="text-t11 text-gray-400 mt-0.5" data-testid="ask-notice">{ASK_COPY.sectionNotice}</p>

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value.slice(0, 200))}
          onFocus={() => { focused.current = true }}
          onBlur={() => { focused.current = false }}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder={placeholder}
          data-testid="ask-input"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-t14"
        />
        <button type="button" onClick={() => submit()} disabled={!text.trim() || busy} data-testid="ask-submit"
          className="px-4 rounded-xl text-t13 font-bold text-white disabled:opacity-40" style={{ backgroundColor: accent }}>묻기</button>
      </div>

      {result?.branch === 'quota' && <p className="text-t12 mt-3" style={{ color: '#A65A0C' }} data-testid="ask-quota">{result.message}</p>}

      {result?.branch === 'data' && result.answer && (
        <div className="mt-3 rounded-xl bg-gray-50 px-3.5 py-3" data-testid="ask-answer">
          <p className="text-t14 text-gray-900 leading-snug" data-testid="ask-answer-text">{result.answer.text}</p>
          <p className="text-t11 text-gray-400 mt-1" data-testid="ask-answer-basis">{result.answer.basis}</p>
          {result.followups?.length > 0 && (
            <>
              <p className="text-t11 text-gray-500 mt-3">{ASK_COPY.followupTitle}</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {result.followups.map((f, i) => (
                  <button key={f.key} type="button" data-testid="ask-followup"
                    onClick={() => { logEvent('ask_followup_tap', { rank: i + 1 }); submit(f.text, 'example') }}
                    className="px-3 py-2 rounded-full text-t12 font-semibold border border-gray-200 bg-white">{f.text}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {result?.branch === 'owner' && (
        <div className="mt-3 rounded-xl bg-gray-50 px-3.5 py-3" data-testid="ask-owner">
          <p className="text-t13 text-gray-700">{ASK_COPY.ownerLine}</p>
          {asked
            ? <p className="text-t13 font-bold mt-2" style={{ color: accent }} data-testid="ask-owner-sent">{ASK_COPY.ownerSent}</p>
            : <button type="button" onClick={askOwner} disabled={busy} data-testid="ask-owner-send"
                className="mt-2 w-full py-2.5 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: accent }}>{ASK_COPY.ownerButton}</button>}
        </div>
      )}
    </section>
  )
}
