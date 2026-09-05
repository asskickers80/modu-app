/**
 * "이번 주 한 줄" 카드 (ORDER-weekly-one-liner-v1)
 * 문장 1줄 + 근거 1줄 + 버튼 1개. 크론이 저장한 값만 표시(계산·AI 없음).
 * 신호가 없으면 렌더하지 않는다 → 홈은 기존 "오늘의 한 마디"를 대신 보여준다
 * (같은 자리에 둘이 동시에 그려지지 않음 — useWeeklyOneLiner의 hasCard로 분기).
 * 어휘: 양도인 = 매물·동향("가게" 금지) / 사장님 = 매출.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ModuWord from './ModuWord'
import { fetchWeeklyOneLiner, dismissOneLiner } from '../lib/oneLiner'
import { logEvent } from '../lib/eventLog'
import { getProfiles } from '../lib/userProfile'

const AXIS = {
  operating: { color: '#2d7a4f', bg: '#edf7f1' },
  seller: { color: '#1a4d8f', bg: '#eef2fb' },
}

const CTA_LABEL = {
  sales_input: '이번 주 매출 입력',
  sales_memo: '메모 남기기',
  sales_trend: '최근 흐름 보기',
  transfer_intro: '양도 준비 알아보기',
  edit_listing: null, // 주제명이 들어가는 동적 라벨 — ctaLabelOf에서 조합
}

const ctaLabelOf = (card) =>
  card.cta_key === 'edit_listing'
    ? `매물에 ${card.cta_payload?.label ?? '정보'} 추가`
    : CTA_LABEL[card.cta_key] ?? '확인'

/** 홈에서 카드 유무를 알아야 "오늘의 한 마디"를 숨길 수 있다 — 상태를 훅으로 노출 */
export function useWeeklyOneLiner(role) {
  const [card, setCard] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetchWeeklyOneLiner(role).then(c => {
      if (!alive) return
      setCard(c)
      setLoaded(true)
      logEvent(c ? 'one_liner_shown' : 'one_liner_none',
        c ? { signal_key: c.signal_key, role } : { role })
    })
    return () => { alive = false }
  }, [role])

  const dismiss = () => {
    if (!card) return
    logEvent('one_liner_dismissed', { signal_key: card.signal_key, role })
    dismissOneLiner(card.id)
    setCard(null)
  }
  // loaded 전에는 한 마디를 먼저 그리지 않는다(깜빡임 방지 — 카드 자리만 비워둠)
  return { card, loaded, hasCard: !!card, dismiss }
}

export default function WeeklyOneLinerCard({ card, role = 'operating', listingId = null, onDismiss }) {
  const navigate = useNavigate()
  const cfg = AXIS[role] ?? AXIS.operating
  if (!card) return null

  const act = () => {
    logEvent('one_liner_cta', { signal_key: card.signal_key, role })
    switch (card.cta_key) {
      case 'sales_input':
      case 'sales_memo':
        // 매출 카드의 입력 시트를 연다 (sales_memo는 메모 칸으로 포커스)
        window.dispatchEvent(new CustomEvent('modu:sales-open', { detail: { focus: card.cta_key === 'sales_memo' ? 'memo' : 'revenue' } }))
        break
      case 'sales_trend':
        // 그래프 화면은 없다 — 매출 카드의 최근 7일 흐름으로 이동(실동작만)
        window.dispatchEvent(new CustomEvent('modu:sales-trend'))
        break
      case 'transfer_intro': {
        const hasSeller = getProfiles().some(p => p.category === 'seller' && !p.pending)
        navigate(hasSeller ? '/a7/seller' : '/a3/seller')
        break
      }
      case 'edit_listing':
        if (listingId) navigate(`${card.cta_payload?.step ?? '/e1/1'}?edit=${listingId}`)
        break
      default:
        break
    }
  }

  return (
    <div className="rounded-2xl px-4 py-3.5 mb-5 relative" data-testid="one-liner-card"
      style={{ background: `linear-gradient(135deg, ${cfg.color}18 0%, ${cfg.color}08 100%)`, border: `1px solid ${cfg.color}25` }}>
      <button onClick={onDismiss} data-testid="one-liner-dismiss" aria-label="이번 주 한 줄 닫기"
        className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center text-gray-300 text-t14">
        ✕
      </button>
      <div className="flex items-center gap-1.5 mb-1.5">
        <ModuWord />
        <p className="text-t12 font-bold" style={{ color: cfg.color }}>이번 주 한 줄</p>
      </div>
      <p className="text-t15 font-bold text-gray-900 leading-snug pr-8" data-testid="one-liner-headline">
        {card.headline}
      </p>
      {card.evidence && (
        <p className="text-t12 text-gray-500 mt-1 leading-relaxed" data-testid="one-liner-evidence">
          {card.evidence}
        </p>
      )}
      <button onClick={act} data-testid="one-liner-cta"
        className="mt-3 w-full py-2.5 rounded-xl text-t13 font-bold text-white active:scale-[0.99] transition-transform"
        style={{ backgroundColor: cfg.color }}>
        {ctaLabelOf(card)}
      </button>
    </div>
  )
}
