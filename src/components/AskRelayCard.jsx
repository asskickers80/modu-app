/**
 * 3박자 — 질문자 화면 전달 카드 (ORDER 2026-09-13 C4). 답변은 양도인 원문 그대로다(요약·편집 없음).
 * [대화 열기]를 눌러야 DM 이 생긴다 — 이 안내 행동이 2박자에서 말한 "안내"다.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchRelays, openDmFromRelay, saveFromRelay } from '../lib/askRelay'
import { supabase } from '../lib/supabase'
import { ASK_COPY } from '../../config/listingAsk'

export default function AskRelayCard({ accent = '#2b8ac9', showToast }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [listings, setListings] = useState({})
  useEffect(() => {
    fetchRelays().then(async rs => {
      setRows(rs)
      const ids = [...new Set(rs.map(r => r.listing_id).filter(Boolean))]
      if (!ids.length) return
      try {
        const { data } = await supabase.from('listings').select('id, device_id, shop_name, shop_name_public, title, owner_nickname, category_main, is_franchise, franchise_brand_name').in('id', ids)
        setListings(Object.fromEntries((data ?? []).map(l => [l.id, l])))
      } catch (_) {}
    })
  }, [])
  if (!rows.length) return null
  return (
    <>
      {rows.map(row => (
        <section key={row.id} className="rounded-2xl border border-gray-100 p-4 mb-4" data-testid="ask-relay-card">
          <p className="text-t15 font-bold text-gray-900">{ASK_COPY.relayTitle}</p>
          <p className="text-t14 text-gray-900 mt-2 leading-snug" data-testid="ask-relay-answer">{row.ask_owner_reply_text}</p>
          <p className="text-t11 text-gray-400 mt-1">{ASK_COPY.relaySource}</p>
          <div className="flex gap-2 mt-3">
            <button type="button" data-testid="ask-relay-open" onClick={() => openDmFromRelay(row, listings[row.listing_id], navigate)}
              className="flex-1 py-2.5 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: accent }}>{ASK_COPY.relayOpen}</button>
            <button type="button" data-testid="ask-relay-save" onClick={() => saveFromRelay(row, listings[row.listing_id]).then(() => showToast?.('찜했어요'))}
              className="flex-1 py-2.5 rounded-xl text-t13 font-semibold bg-gray-100 text-gray-700">{ASK_COPY.relaySave}</button>
          </div>
        </section>
      ))}
    </>
  )
}
