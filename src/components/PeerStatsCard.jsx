/**
 * 문의 동향 카드 + 차이 시트 (ORDER-close-flow-peer-stats-v1 항목 4)
 * 원칙: 카드 = 숫자 하나 + 근거 한 줄. 탭 → 시트에서 "할 일"만.
 * 표본 부족(null) = 아무것도 렌더하지 않는다 — "문의를 받으려면" 대체 카드 금지
 * (비교군 없는 힌트는 가이드+완성도 카드 담당, 중복 금지). 표본이 생기면 자동 등장.
 * 승격: 등록 21일+문의 0 → 부모가 객체 카드 바로 아래 배치, 시트 내용 인라인 펼침.
 * 어휘: 양도인 "매물·권리금·동향" / 소유주 "상가·시세".
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPeerStats, dismissPeerCard, isPeerCardDismissed } from '../lib/peerStats'
import { logEvent } from '../lib/eventLog'

const AXIS = {
  seller: { noun: '매물', color: '#1a4d8f', bg: '#eef2fb', edit: (id) => `/e1/1?edit=${id}` },
  landlord: { noun: '상가', color: '#1e6b6b', bg: '#eef6f6', edit: (id) => `/e1p/1?edit=${id}` },
}

function GapList({ data, listing, cfg, navigate, onDismiss }) {
  const [exampleOpen, setExampleOpen] = useState(false)
  const { stats, gaps, example } = data
  useEffect(() => {
    for (const g of gaps) logEvent('gap_item_shown', { listingId: listing.id, item: g.id })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {gaps.length === 0 ? (
        <p className="text-t13 text-gray-500 leading-relaxed" data-testid="gap-empty">
          비슷한 {cfg.noun}과 다른 점이 없어요.<br />문의는 보통 {stats.avgDays}일 안에 와요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {gaps.map(g => (
            <button key={g.id} data-testid={`gap-item-${g.id}`}
              onClick={() => {
                logEvent('gap_action', { listingId: listing.id, item: g.id })
                navigate(cfg.edit(listing.id))
              }}
              className="w-full text-left rounded-xl px-3.5 py-3 bg-white border border-gray-100 active:bg-gray-50">
              <span className="block text-t13 font-bold text-gray-800">{g.label}</span>
              <span className="block text-t12 text-gray-500 mt-0.5 leading-relaxed">{g.detail}</span>
            </button>
          ))}
        </div>
      )}

      {example && (
        <div className="mt-3">
          <button data-testid="gap-example-toggle"
            onClick={() => {
              if (!exampleOpen) logEvent('example_expanded', { listingId: listing.id })
              setExampleOpen(o => !o)
            }}
            className="text-t12 font-medium text-gray-400 underline underline-offset-2 py-1">
            이 {cfg.noun}은 이렇게 했어요 {exampleOpen ? '▲' : '▼'}
          </button>
          {exampleOpen && (
            <p className="text-t12 text-gray-500 mt-1 leading-relaxed" data-testid="gap-example">
              {example}
            </p>
          )}
        </div>
      )}

      <button data-testid="gap-dismiss"
        onClick={onDismiss}
        className="w-full mt-3 py-2.5 rounded-xl text-t13 font-medium text-gray-400 bg-white border border-gray-100">
        그대로 둘게요
      </button>
    </div>
  )
}

export default function PeerStatsCard({ listing, axis = 'seller' }) {
  const navigate = useNavigate()
  const cfg = AXIS[axis] ?? AXIS.seller
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!listing?.id || isPeerCardDismissed(listing.id)) return
    fetchPeerStats(listing, axis).then(setData)
  }, [listing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || hidden) return null // 표본 부족·숨김 — 침묵 (대체 카드 금지)
  const { stats, promoted } = data
  const expanded = open || promoted

  const dismiss = () => {
    logEvent('gap_dismissed', { listingId: listing.id })
    dismissPeerCard(listing.id)
    setHidden(true)
  }

  return (
    <div className="rounded-2xl border overflow-hidden" data-testid="peer-stats-card"
      style={{ borderColor: `${cfg.color}22`, backgroundColor: cfg.bg }}>
      <button
        data-testid="peer-stats-head"
        onClick={() => {
          if (!expanded) logEvent('gap_sheet_open', { listingId: listing.id })
          setOpen(o => !o)
        }}
        className="w-full text-left px-4 py-3.5">
        <p className="text-t15 font-bold text-gray-900">
          비슷한 {cfg.noun}은 첫 문의까지 <span style={{ color: cfg.color }}>평균 {stats.avgDays}일</span>
        </p>
        <p className="text-t12 text-gray-500 mt-0.5">
          {stats.stageLabel} {stats.M}건 기준 · 내 {cfg.noun}은 등록 {stats.myDays}일째
        </p>
      </button>
      {expanded && (
        <div className="px-4 pb-4" data-testid="peer-gap-sheet">
          <p className="text-t13 font-bold text-gray-700 mb-2">
            문의 받은 {stats.M}건과 내 {cfg.noun}의 차이
          </p>
          <GapList data={data} listing={listing} cfg={cfg} navigate={navigate} onDismiss={dismiss} />
        </div>
      )}
    </div>
  )
}
