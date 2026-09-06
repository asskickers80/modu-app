/**
 * 등록하던 매물 — 이어하기 (ORDER-key-proxy-account-deletion D-6)
 *
 * 초안(status='draft')이 있으면 홈에 사실만 적어 보여준다.
 * 완성도 퍼센트는 넣지 않는다 — 완성도는 게시된 매물의 개념이다(오더 명시).
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyDraft } from '../lib/listingDraft'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

/** "8월 13일" — 언제 하던 것인지만 */
const dayLabel = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  } catch (_) { return null }
}

export default function DraftResumeCard({ listingType = 'seller' }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    let alive = true
    fetchMyDraft(listingType).then(d => { if (alive) setDraft(d) })
    return () => { alive = false }
  }, [listingType])

  if (!draft) return null // 초안이 없으면 아무것도 그리지 않는다

  const when = dayLabel(draft.updated_at)
  return (
    <button
      onClick={() => navigate(`/e1/1?edit=${draft.id}`)}
      data-testid="draft-resume-card"
      className="w-full text-left rounded-2xl px-4 py-3.5 mb-4 border active:scale-[0.99] transition-transform"
      style={{ backgroundColor: NAVY_BG, borderColor: `${NAVY}25` }}>
      <p className="text-t12 font-bold" style={{ color: NAVY }}>등록하던 매물</p>
      <p className="text-t15 font-bold text-gray-900 mt-1 truncate">
        {draft.shop_name || draft.address || '주소만 입력된 매물'}
      </p>
      <p className="text-t12 text-gray-500 mt-0.5">
        {[when ? `${when}에 하던 등록이에요` : null, '이어서 마저 하실 수 있어요']
          .filter(Boolean).join(' · ')}
      </p>
    </button>
  )
}
