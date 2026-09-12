/**
 * 양도인 '반응' 카드 (ORDER 2026-09-12 파트 B6) — 매물 관리 화면 상단, quiet 매물만.
 * "조용히 본 지 d일 · 조회 v · 찜 w · 문의 q" + 익명 요약(n<3 숫자만) + 비교 1줄(표본 3+, 라벨 '모두가 본 것') + [공개로 바꾸기]/[이대로 두기]
 */
import { useEffect, useState } from 'react'
import { fetchQuietReaction, switchToPublic } from '../lib/quiet'
import { daysLeft } from '../lib/quietRules'
import { QUIET_COPY } from '../../config/quiet'
import { BottomSheet } from './VendorContactButtons'

export default function QuietReactionCard({ listing, accent = '#1a4d8f', accentBg = '#eef2fb', showToast, onChanged }) {
  const [r, setR] = useState(null)
  const [sheet, setSheet] = useState(false)
  const [shopName, setShopName] = useState(listing?.shop_name ?? '')
  const [keep, setKeep] = useState(false)
  useEffect(() => { if (listing?.visibility === 'quiet') fetchQuietReaction(listing).then(setR) }, [listing?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (listing?.visibility !== 'quiet' || !r || keep) return null
  const left = daysLeft(listing.quiet_deadline_at)

  const toPublic = async () => {
    const ok = await switchToPublic(listing, { shopName: shopName.trim() || null })
    if (ok) { showToast?.('공개로 바꿨어요'); setSheet(false); onChanged?.() } else showToast?.('바꾸지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  return (
    <div className="rounded-2xl border px-4 py-3.5 mb-3 bg-white" style={{ borderColor: `${accent}25` }} data-testid="quiet-reaction-card">
      <p className="text-t12 font-bold" style={{ color: accent }}>조용히 반응 보기{left != null && ` · ${left}일 남음`}</p>
      <p className="text-t15 font-bold text-gray-900 mt-0.5" data-testid="quiet-reaction-line">{r.line}</p>
      {r.summary && <p className="text-t13 text-gray-600 mt-0.5" data-testid="quiet-reaction-summary">{r.summary}</p>}
      {r.compare && (
        <p className="text-t12 text-gray-600 mt-1.5" data-testid="quiet-reaction-compare">{r.compare} <span className="text-t10 text-gray-400">· {QUIET_COPY.compareSource}</span></p>
      )}
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={() => setSheet(true)} data-testid="quiet-to-public" className="flex-1 py-2.5 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: accent }}>{QUIET_COPY.toPublic}</button>
        <button type="button" onClick={() => setKeep(true)} data-testid="quiet-keep" className="flex-1 py-2.5 rounded-xl text-t13 font-bold bg-gray-100 text-gray-700">{QUIET_COPY.keepQuiet}</button>
      </div>
      {sheet && (
        <BottomSheet onClose={() => setSheet(false)} testId="quiet-to-public-sheet">
          <p className="text-t16 font-black text-gray-900">공개로 바꾸기</p>
          <p className="text-t12 text-gray-500 mt-0.5">비어 있는 항목만 채우면 돼요 · 사진은 매물 수정에서 올릴 수 있어요</p>
          {!listing.shop_name && (
            <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="상호" data-testid="quiet-shop-name"
              className="mt-3 w-full border-2 rounded-2xl px-4 py-3 text-t15 outline-none" style={{ borderColor: shopName ? accent : '#e5e7eb' }} />
          )}
          <button type="button" onClick={toPublic} data-testid="quiet-to-public-confirm" className="mt-4 w-full py-3.5 rounded-2xl text-t15 font-bold text-white" style={{ backgroundColor: accent }}>공개하기</button>
        </BottomSheet>
      )}
    </div>
  )
}
