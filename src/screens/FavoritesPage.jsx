/**
 * '내 관심' 화면 (ORDER 2026-09-10 파트 A5·A6) — /favorites
 * 상단 요약 1줄(0인 항목 생략) → 공통점 카드(매물 찜 3건+, 1회, [괜찮아요] 30일 숨김) → 비교표(최대 5) → 목록.
 * 거리 열은 기준 위치가 없어 뺀다(추정치 금지). 숫자는 전부 실제 값.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSafeBack from '../hooks/useSafeBack'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'
import { fetchMyWatches, removeWatch, getCommonHiddenOn, hideCommonCard, applyCommonConditions } from '../lib/watchlist'
import { commonConditions, isHiddenUntil, fmtMan } from '../lib/watchRules'
import { fetchNotifications } from '../lib/notifications'
import { calcScore, listingToScoreInput } from '../lib/completeness'
import { displayTitle } from '../lib/listingTitle'
import { logEvent } from '../lib/eventLog'
import { WATCH } from '../../config/watch'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const config = CATEGORY_CONFIG[getProfile().category] ?? CATEGORY_CONFIG.startup
  const safeBack = useSafeBack(config.home)
  const { toast, showToast } = useToast()
  const accent = config.color
  const [watches, setWatches] = useState(null)
  const [listings, setListings] = useState([])
  const [vendors, setVendors] = useState([])
  const [notifs, setNotifs] = useState([])
  const [commonHidden, setCommonHidden] = useState(() => isHiddenUntil(getCommonHiddenOn()))

  const load = async () => {
    const ws = await fetchMyWatches()
    setWatches(ws)
    const lid = ws.filter(w => w.target_type === 'listing').map(w => w.target_id)
    const vid = ws.filter(w => w.target_type === 'vendor').map(w => w.target_id)
    if (lid.length) {
      const { data } = await supabase.from('listings_visible')
        .select('id, shop_name, shop_name_public, address, status, transfer_fee, deposit, monthly_rent, area, category_main, biz_type, image_urls, sales_proof, transfer_type, review_choices, bjd_code, is_franchise, franchise_brand_name')
        .in('id', lid)
      setListings(data ?? [])
    } else setListings([])
    if (vid.length) {
      const { data } = await supabase.from('listings').select('id, shop_name, biz_tagline').in('id', vid)
      setVendors(data ?? [])
    } else setVendors([])
    setNotifs(await fetchNotifications())
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const compare = useMemo(() => listings.slice(0, WATCH.COMPARE_MAX), [listings])
  useEffect(() => { if (compare.length) logEvent('watch_compare_view', { n: compare.length }) }, [compare.length])

  const summary = useMemo(() => {
    if (!watches) return null
    const n = watches.length
    const a = notifs.filter(x => x.type === 'watch_price' && x.payload?.down).length
    const b = listings.filter(l => l.status === 'sold').length
    const c = notifs.filter(x => x.type === 'watch_info' && !x.read_at).length
    return [`찜 ${n}개`, a ? `가격 내린 매물 ${a}개` : null, b ? `거래 완료 ${b}개` : null, c ? `새 정보 ${c}개` : null].filter(Boolean).join(' · ')
  }, [watches, notifs, listings])

  const common = useMemo(() => (commonHidden ? null : commonConditions(listings)), [listings, commonHidden])
  const acceptCommon = async () => {
    await applyCommonConditions(common, listings)
    logEvent('watch_to_profile', { accepted: true })
    hideCommonCard(); setCommonHidden(true)
    showToast('이 조건으로 새 매물을 알려드릴게요')
  }
  const declineCommon = () => { logEvent('watch_to_profile', { accepted: false }); hideCommonCard(); setCommonHidden(true) }

  const unwatch = async (w) => { await removeWatch(w.target_type, w.target_id); load() }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-12 pb-3 border-b border-gray-50">
        <button onClick={safeBack} aria-label="뒤로" className="w-11 h-11 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-t17 font-bold text-gray-900">내 관심</h1>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'none' }}>
        {watches && watches.length === 0 && (
          <p className="pt-16 text-center text-t14 text-gray-400">아직 찜한 것이 없어요</p>
        )}
        {summary && watches.length > 0 && (
          <p className="text-t13 font-semibold text-gray-700 mb-3" data-testid="favorites-summary">{summary}</p>
        )}

        {common && (
          <div className="rounded-2xl px-4 py-3.5 mb-4" style={{ backgroundColor: config.bg }} data-testid="watch-common-card">
            <p className="text-t14 font-bold text-gray-900 leading-snug">{common.line}</p>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={acceptCommon} data-testid="watch-common-yes"
                className="flex-1 py-2.5 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: accent }}>네</button>
              <button type="button" onClick={declineCommon} data-testid="watch-common-no"
                className="flex-1 py-2.5 rounded-xl text-t13 font-bold bg-white text-gray-600 border border-gray-200">괜찮아요</button>
            </div>
          </div>
        )}

        {compare.length > 0 && (
          <div className="mb-5" data-testid="watch-compare">
            <p className="text-t12 font-bold text-gray-400 mb-2">비교 (최대 {WATCH.COMPARE_MAX})</p>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="text-t12 whitespace-nowrap border-collapse">
                <thead><tr className="text-gray-400">
                  <th className="text-left pr-3 pb-1 font-semibold">매물</th><th className="text-right pr-3 pb-1 font-semibold">권리금</th>
                  <th className="text-right pr-3 pb-1 font-semibold">월세</th><th className="text-right pr-3 pb-1 font-semibold">보증금</th><th className="text-right pb-1 font-semibold">완성도</th>
                </tr></thead>
                <tbody>
                  {compare.map(l => (
                    <tr key={l.id} className="border-t border-gray-50" data-testid="watch-compare-row">
                      <td className="py-2 pr-3 font-semibold text-gray-900 max-w-[140px] truncate">{displayTitle(l)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{l.transfer_fee ? `${fmtMan(l.transfer_fee)}만` : '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{l.monthly_rent ? `${fmtMan(l.monthly_rent)}만` : '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{l.deposit ? `${fmtMan(l.deposit)}만` : '—'}</td>
                      <td className="py-2 text-right tabular-nums">{calcScore(listingToScoreInput(l))}점</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {watches && watches.length > 0 && (
          <div className="rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {watches.map(w => {
              const l = w.target_type === 'listing' ? listings.find(x => x.id === w.target_id) : null
              const v = w.target_type === 'vendor' ? vendors.find(x => x.id === w.target_id) : null
              const title = l ? displayTitle(l) : v ? (v.shop_name ?? '업체') : `${w.target_id} 동네`
              const sub = l ? [l.status === 'sold' ? '거래 완료' : null, l.address].filter(Boolean).join(' · ') : v ? (v.biz_tagline ?? '기업회원') : '새 매물 주 1회'
              return (
                <div key={w.id} className="flex items-center gap-3 px-4 py-3" data-testid={`watch-row-${w.target_type}`}>
                  <button type="button" className="flex-1 min-w-0 text-left" onClick={() => { if (l) navigate(`/e2/${l.id}`) }}>
                    <p className="text-t14 font-bold text-gray-900 truncate">{title}</p>
                    <p className="text-t12 text-gray-500 truncate">{sub}</p>
                  </button>
                  <button type="button" onClick={() => unwatch(w)} data-testid="watch-row-remove"
                    className="text-t12 text-gray-400 min-h-9 px-2">해제</button>
                </div>
              )
            })}
          </div>
        )}
      </main>
      {toast && <Toast message={toast} />}
    </div>
  )
}
