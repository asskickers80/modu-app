/**
 * 후기 섹션 (ORDER 2026-09-12 파트 A) — 매물(방문 후기) · 기업회원(후기) 공용.
 * 원칙: 매물에 대한 평가는 없다. 별점·점수·좋아요·추천 요소 없음. 집계·평균·요약 문구 없음 — 건수와 목록(최신순)뿐.
 * 로그인 회원만 작성·열람. 비로그인은 숫자도 없이 안내 1줄. 매물이 내려가면(거래 완료·보류) 섹션 비노출.
 * 양도인·소유주: [지우기] 1탭(확인 1회). 기업회원: 삭제권 없음 → [이의신청](임시 블라인드).
 */
import { useEffect, useState } from 'react'
import { fetchReviews, submitReview, deleteReviewByOwner, appealReview } from '../lib/reviews'
import { validateListingChips, validateVendorChips, canEdit, listingReviewable } from '../lib/reviewRules'
import { REVIEWS, LISTING_CHIPS, VENDOR_CHIPS, APPEAL_REASONS, AXIS_LABEL, REVIEW_COPY } from '../../config/reviews'
import { BottomSheet } from './VendorContactButtons'

const dateLabel = iso => { try { return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) } catch (_) { return '' } }

function Chip({ on, onClick, children, testId }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId} aria-pressed={on}
      className="px-3 py-2 rounded-full text-t13 font-semibold border min-h-9"
      style={on ? { backgroundColor: '#111827', color: 'white', borderColor: '#111827' } : { borderColor: '#e5e7eb', color: '#111827' }}>{children}</button>
  )
}

function WriteSheet({ targetType, targetId, existing, onClose, onSaved, showToast }) {
  const isListing = targetType === 'listing'
  const [chips, setChips] = useState(existing?.chips ?? (isListing ? { when: null, seen: [], match: null, differs: [] } : { what: null, progress: null }))
  const [body, setBody] = useState(existing?.body ?? '')
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setChips(p => ({ ...p, [k]: v }))
  const toggleSeen = (v) => set('seen', chips.seen.includes(v) ? chips.seen.filter(x => x !== v) : [...chips.seen, v])
  const toggleDiff = (v) => set('differs', chips.differs.includes(v) ? chips.differs.filter(x => x !== v) : [...chips.differs, v])

  const submit = async () => {
    const v = isListing ? validateListingChips(chips) : validateVendorChips(chips)
    if (!v.ok) { setErrors(v.errors); return }
    setBusy(true)
    const r = await submitReview({ targetType, targetId, chips, body, existing })
    setBusy(false)
    if (r.ok) { showToast?.(existing ? '후기를 고쳤어요' : '후기를 남겼어요'); onSaved?.(); onClose() }
    else showToast?.(r.reason === 'duplicate' ? '이미 남긴 후기가 있어요' : r.reason === 'edit_window' ? '작성 후 24시간이 지나 고칠 수 없어요' : '남기지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  const Sec = ({ title, k, children }) => (
    <div className="mt-4" data-testid={`review-sec-${k}`} data-error={errors.includes(k) ? '1' : ''}>
      <p className="text-t13 font-bold text-gray-900 mb-1.5">{title}{errors.includes(k) && <span className="text-t11 font-semibold ml-2" style={{ color: '#A65A0C' }}>골라 주세요</span>}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
  return (
    <BottomSheet onClose={onClose} testId="review-write-sheet">
      <p className="text-t16 font-black text-gray-900">{isListing ? REVIEW_COPY.listingWrite : REVIEW_COPY.vendorWrite}</p>
      <p className="text-t12 text-gray-500 mt-0.5" data-testid="review-write-notice">{isListing ? REVIEW_COPY.writeNotice : REVIEW_COPY.vendorWriteNotice}</p>
      {isListing ? (
        <>
          <Sec title="언제 가셨나요?" k="when">{LISTING_CHIPS.when.map(c => <Chip key={c} on={chips.when === c} onClick={() => set('when', c)} testId={`rv-when-${c}`}>{c}</Chip>)}</Sec>
          <Sec title="무엇을 보셨나요? (복수)" k="seen">{LISTING_CHIPS.seen.map(c => <Chip key={c} on={chips.seen.includes(c)} onClick={() => toggleSeen(c)} testId={`rv-seen-${c}`}>{c}</Chip>)}</Sec>
          <Sec title="등록 정보와 비교하면" k="match">{LISTING_CHIPS.match.map(c => <Chip key={c} on={chips.match === c} onClick={() => set('match', c)} testId={`rv-match-${c}`}>{c}</Chip>)}</Sec>
          {chips.match === '달랐어요' && (
            <Sec title="어느 항목이 달랐나요? (1개 이상)" k="differs">{LISTING_CHIPS.differs.map(c => <Chip key={c} on={chips.differs.includes(c)} onClick={() => toggleDiff(c)} testId={`rv-diff-${c}`}>{c}</Chip>)}</Sec>
          )}
        </>
      ) : (
        <>
          <Sec title="무엇을 맡기셨나요?" k="what">{VENDOR_CHIPS.what.map(c => <Chip key={c} on={chips.what === c} onClick={() => set('what', c)} testId={`rv-what-${c}`}>{c}</Chip>)}</Sec>
          <Sec title="어디까지 진행했나요?" k="progress">{VENDOR_CHIPS.progress.map(c => <Chip key={c} on={chips.progress === c} onClick={() => set('progress', c)} testId={`rv-progress-${c}`}>{c}</Chip>)}</Sec>
        </>
      )}
      <textarea value={body} onChange={e => setBody(e.target.value.slice(0, REVIEWS.BODY_MAX))} rows={3} data-testid="review-body" placeholder="한 줄로 남겨도 돼요 (선택)"
        className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-t14" />
      <p className="text-t11 text-gray-400 text-right">{body.length}/{REVIEWS.BODY_MAX}</p>
      <button type="button" onClick={submit} disabled={busy} data-testid="review-submit"
        className="mt-2 w-full py-3.5 rounded-2xl text-t15 font-bold text-white disabled:opacity-60" style={{ backgroundColor: '#111827' }}>
        {existing ? '고치기' : '남기기'}
      </button>
    </BottomSheet>
  )
}

function AppealSheet({ review, onClose, onDone, showToast }) {
  const [reason, setReason] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!reason || busy) return
    setBusy(true)
    const r = await appealReview(review, reason, note)
    setBusy(false)
    if (r.ok) { showToast?.(`이의신청했어요 · ${REVIEWS.BLIND_DAYS}일간 보이지 않아요`); onDone?.(); onClose() }
    else showToast?.(r.reason === 'duplicate' ? '이미 이의신청한 후기예요' : '보내지 못했어요')
  }
  return (
    <BottomSheet onClose={onClose} testId="review-appeal-sheet">
      <p className="text-t16 font-black text-gray-900">이의신청</p>
      <p className="text-t12 text-gray-500 mt-0.5">제출하면 {REVIEWS.BLIND_DAYS}일간 후기가 보이지 않고, 운영이 확인해요 · 후기당 1회</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {APPEAL_REASONS.map(r => <Chip key={r.key} on={reason === r.key} onClick={() => setReason(r.key)} testId={`appeal-${r.key}`}>{r.label}</Chip>)}
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 200))} rows={3} data-testid="appeal-note" placeholder="설명 (선택, 200자)"
        className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-t14" />
      <button type="button" onClick={submit} disabled={!reason || busy} data-testid="appeal-submit"
        className="mt-3 w-full py-3.5 rounded-2xl text-t15 font-bold text-white disabled:opacity-40" style={{ backgroundColor: '#111827' }}>제출</button>
    </BottomSheet>
  )
}

/**
 * @param role 'visitor' | 'owner'(양도인·소유주) | 'vendor_owner'(기업회원 본인)
 */
export default function ReviewSection({ targetType, targetId, listing = null, user, role = 'visitor', showToast, accent = '#1a4d8f', deletedBy = 'seller', foot = null }) {
  const [data, setData] = useState(undefined) // undefined=로딩, null=비로그인
  const [write, setWrite] = useState(false)
  const [appeal, setAppeal] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const load = () => fetchReviews(targetType, targetId).then(setData)
  useEffect(() => { if (targetId) load() }, [targetId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (targetType === 'listing' && !listingReviewable(listing)) return null // 내려간 매물 — 섹션 비노출(데이터 유지)
  const isListing = targetType === 'listing'
  const title = isListing ? '방문 후기' : '후기'

  if (!user || data === null) {
    return (
      <section className="mt-6 mb-4" data-testid="review-section" data-state="login">
        <p className="text-t15 font-bold text-gray-900">{title}</p>
        <p className="text-t13 text-gray-400 mt-1" data-testid="review-login-notice">{REVIEW_COPY.loginToSee}</p>
      </section>
    )
  }
  if (data === undefined) return null
  const rows = data.rows
  const deletedCount = data.all.filter(r => r.deleted_at && (r.deleted_by === 'seller' || r.deleted_by === 'owner')).length
  const canWrite = role === 'visitor' && (!data.mine || canEdit(data.mine.created_at))
  const del = async (r) => { setConfirmDel(null); const ok = await deleteReviewByOwner(r, deletedBy); if (ok) { showToast?.('후기를 지웠어요'); load() } }

  return (
    <section className="mt-6 mb-4" data-testid="review-section" data-state="ready">
      <div className="flex items-center justify-between">
        <p className="text-t15 font-bold text-gray-900" data-testid="review-count">
          {rows.length >= REVIEWS.MIN_COUNT_TO_SHOW ? (isListing ? REVIEW_COPY.listingSection : REVIEW_COPY.vendorSection).replace('{n}', String(rows.length)) : title}
        </p>
        {canWrite && (
          <button type="button" onClick={() => setWrite(true)} data-testid="review-write-open"
            className="text-t12 font-bold px-3 py-1.5 rounded-full text-white min-h-9" style={{ backgroundColor: accent }}>
            {data.mine ? '내 후기 고치기' : (isListing ? REVIEW_COPY.listingWrite : REVIEW_COPY.vendorWrite)}
          </button>
        )}
      </div>
      {rows.length > 0 && (
        <div className="mt-2 rounded-2xl border border-gray-100 divide-y divide-gray-50" data-testid="review-list">
          {rows.map(r => (
            <div key={r.id} className="px-4 py-3" data-testid="review-item">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-t13 font-bold text-gray-900">{r.author_name ?? '회원'}</span>
                <span className="text-t10 font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{AXIS_LABEL[r.author_axis] ?? r.author_axis}</span>
                {r.chips?.after_visit && <span className="text-t10 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${accent}15`, color: accent }}>{REVIEW_COPY.afterVisitLabel}</span>}
                <span className="text-t11 text-gray-400 ml-auto">{dateLabel(r.created_at)}</span>
              </div>
              <p className="text-t12 text-gray-600 mt-1">
                {isListing
                  ? [r.chips?.when, (r.chips?.seen ?? []).join('·'), r.chips?.match === '달랐어요' ? `달랐어요(${(r.chips?.differs ?? []).join('·')})` : r.chips?.match].filter(Boolean).join(' · ')
                  : [r.chips?.what, r.chips?.progress].filter(Boolean).join(' · ')}
              </p>
              {r.body && <p className="text-t14 text-gray-800 mt-1 leading-snug">{r.body}</p>}
              {role === 'owner' && (
                confirmDel === r.id ? (
                  <div className="flex gap-2 mt-2 items-center">
                    <span className="text-t12 text-gray-500 flex-1">{REVIEW_COPY.deleteConfirm}</span>
                    <button type="button" onClick={() => del(r)} data-testid="review-delete-confirm" className="px-3 py-1.5 rounded-lg text-t12 font-bold text-white" style={{ backgroundColor: '#ef4444' }}>지우기</button>
                    <button type="button" onClick={() => setConfirmDel(null)} className="px-3 py-1.5 rounded-lg text-t12 font-semibold bg-gray-100">취소</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDel(r.id)} data-testid="review-delete" className="mt-2 text-t12 font-semibold text-gray-400 underline underline-offset-2 min-h-9">지우기</button>
                )
              )}
              {role === 'vendor_owner' && (
                <button type="button" onClick={() => setAppeal(r)} data-testid="review-appeal" className="mt-2 text-t12 font-semibold text-gray-400 underline underline-offset-2 min-h-9">이의신청</button>
              )}
            </div>
          ))}
        </div>
      )}
      {rows.length === 0 && <p className="text-t13 text-gray-400 mt-1">아직 남긴 후기가 없어요</p>}
      {REVIEWS.SHOW_DELETED_TRACE && deletedCount > 0 && (
        <p className="text-t11 text-gray-400 mt-1" data-testid="review-deleted-trace">{REVIEW_COPY.deletedTrace.replace('{n}', String(deletedCount))}</p>
      )}
      {foot && <p className="text-t11 text-gray-400 mt-2" data-testid="review-foot">{foot}</p>}
      {write && <WriteSheet targetType={targetType} targetId={targetId} existing={data.mine} onClose={() => setWrite(false)} onSaved={load} showToast={showToast} />}
      {appeal && <AppealSheet review={appeal} onClose={() => setAppeal(null)} onDone={load} showToast={showToast} />}
    </section>
  )
}
