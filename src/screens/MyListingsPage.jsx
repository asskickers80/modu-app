import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getDeviceId } from '../lib/supabase'
import { displayShopName, manwon } from '../lib/format'
import { clearE1Draft } from './e1/E1Context'
import { statusLabel, statusColor, coverPhoto } from '../components/MyListingCard'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

/** 내 매물 리스트 — 매물 2건 이상일 때 홈 카드에서 진입 (v1: 단순 세로 리스트) */
export default function MyListingsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('listings')
      .select('*')
      .eq('device_id', getDeviceId())
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[내 매물] 조회 오류:', error.message)
        setRows((data ?? []).filter(l => l.status !== 'example'))
        setLoading(false)
      })
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-2 px-4 pt-12 pb-3 border-b border-gray-50">
        <button
          onClick={() => navigate(-1)}
          aria-label="뒤로"
          className="w-11 h-11 -ml-2 flex items-center justify-center active:opacity-60">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4l-6 6 6 6" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[17px] font-bold text-gray-900">내 매물</h1>
        {!loading && rows.length > 0 && (
          <span className="text-[13px] font-semibold text-gray-400">{rows.length}</span>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'none' }}>
        {loading && (
          <div className="space-y-3">
            {[0, 1].map(i => (
              <div key={i} className="h-[76px] rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="pt-16 text-center">
            <p className="text-[14px] text-gray-400">아직 등록한 매물이 없어요</p>
          </div>
        )}

        {!loading && rows.map(listing => {
          const cover = coverPhoto(listing)
          return (
            <button
              key={listing.id}
              onClick={() => navigate(`/e2/${listing.id}`)}
              data-testid={`my-listing-row-${listing.id}`}
              className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 mb-3 text-left border active:scale-[0.99] transition-transform"
              style={{ borderColor: `${NAVY}25` }}>
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: NAVY_BG }}>
                {cover && <img src={cover} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[15px] font-bold text-gray-900 truncate">
                    {displayShopName(listing)}
                  </p>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                    style={{ backgroundColor: NAVY_BG, color: statusColor(listing.status) }}>
                    {statusLabel(listing.status)}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 mt-0.5 truncate">
                  {[
                    listing.transfer_fee ? `권리금 ${manwon(listing.transfer_fee)}` : null,
                    listing.address,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
            </button>
          )
        })}

        {!loading && (
          <button
            onClick={() => { clearE1Draft(); navigate('/e1/1') }}
            className="w-full rounded-2xl border border-dashed py-4 text-[13px] font-semibold active:bg-gray-50 transition-colors"
            style={{ borderColor: `${NAVY}40`, color: NAVY }}>
            + 새 매물 등록
          </button>
        )}
      </main>
    </div>
  )
}
