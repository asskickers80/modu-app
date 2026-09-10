/**
 * 정부 지원 연결 카드 (ORDER 2026-09-10 파트 D)
 * 제목 + 활성 링크 버튼(최대 3) + 고정 안내 1줄. 비활성 링크는 그리지 않고, 전부 비활성이면 카드 자체가 없다.
 * 링크는 config/govLinks.ts 그대로 — 사용자 정보를 URL에 붙이지 않는다.
 */
import { useEffect, useRef } from 'react'
import { activeGovLinks, GOV_LINK_NOTICE } from '../../config/govLinks'
import { logEvent } from '../lib/eventLog'

export default function GovLinkCard({ place, keys, title, accent = '#2d7a4f' }) {
  const links = activeGovLinks(keys)
  const shownRef = useRef(false) // 노출 이벤트 1회 (StrictMode 이중 마운트 방지)
  useEffect(() => {
    if (links.length && !shownRef.current) { shownRef.current = true; logEvent('gov_link_shown', { place, keys: links.map(l => l.key) }) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!links.length) return null
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 mb-3" data-testid="gov-link-card" data-place={place}>
      <p className="text-t14 font-bold text-gray-900">{title}</p>
      <div className="flex flex-wrap gap-2 mt-2.5">
        {links.map(l => (
          <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer"
            data-testid={`gov-link-${l.key}`}
            onClick={() => logEvent('gov_link_click', { place, key: l.key })}
            className="px-3.5 py-2.5 rounded-full text-t13 font-bold border"
            style={{ color: accent, borderColor: `${accent}55`, backgroundColor: 'white' }}>
            {l.label} ↗
          </a>
        ))}
      </div>
      <p className="text-t11 text-gray-400 mt-2">{GOV_LINK_NOTICE}</p>
    </div>
  )
}

/** 텍스트 링크 1줄 — 창업준비 매물 상세 상권 섹션 끝 등 */
export function GovTextLink({ place, linkKey, text, accent = '#2b8ac9' }) {
  const links = activeGovLinks([linkKey])
  const shownRef = useRef(false)
  useEffect(() => {
    if (links.length && !shownRef.current) { shownRef.current = true; logEvent('gov_link_shown', { place, keys: [linkKey] }) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!links.length) return null
  const l = links[0]
  return (
    <p className="text-t12 mb-4 px-0.5" data-testid="gov-text-link" data-place={place}>
      <a href={l.url} target="_blank" rel="noopener noreferrer" data-testid={`gov-link-${l.key}`}
        onClick={() => logEvent('gov_link_click', { place, key: l.key })}
        className="underline underline-offset-2 font-semibold" style={{ color: accent }}>
        {text} ↗
      </a>
    </p>
  )
}
