import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import ModuMark from '../components/ModuMark'
import { supabase, getDeviceId } from '../lib/supabase'
import { calcScore, listingToScoreInput } from '../lib/completeness'
import { manwon } from '../lib/format'
import TrustBadges from '../components/TrustBadges'
import MessageTabDot from '../components/MessageTabDot'

const TRANSFER_LABEL = { full: '영업양도', bare: '바닥권리', undecided: '방식 미정' }

const TYPES = ['전체', '영업양도', '바닥권리']
const AREAS_FILTER = ['전체 지역', '마포', '강남', '송파', '중구', '서대문', '영등포']
const SORT_OPTIONS = ['완성도순', '최신순', '관심 많은 순', '권리금 낮은순', '권리금 높은순']

// 양도자 시장조사 필터 칩
const SELLER_FILTERS = ['우리 동네', '같은 업종', '같은 브랜드']

const toNum = v => {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

const icons = {
  home: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none" /><path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  explore: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" /><path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>,
  community: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  message: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" /><path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  my: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" /><path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>,
}

function CardThumb({ listing }) {
  const url = listing.image_urls?.[0]
  if (url) {
    return (
      <img src={url} alt={listing.shop_name}
        className="w-14 h-14 rounded-2xl object-cover shrink-0" />
    )
  }
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: '#e5e7eb' }}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <rect x="1" y="3" width="18" height="14" rx="2" stroke="#9ca3af" strokeWidth="1.4" />
        <circle cx="7.5" cy="9" r="2" stroke="#9ca3af" strokeWidth="1.4" />
        <path d="M1 14l5-4 4 3 2.5-2 6.5 5.5" stroke="#9ca3af" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function PropertyCard({ item, onClick, color, bg }) {
  const typeLabel = TRANSFER_LABEL[item.transfer_type]
  const fee = manwon(item.transfer_fee)
  const deposit = manwon(item.deposit)
  const monthly = manwon(item.monthly_rent)
  return (
    <button onClick={onClick}
      className="w-full flex gap-3 py-4 text-left border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors">
      <CardThumb listing={item} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-gray-900 leading-tight truncate">
              {item.shop_name || '(상호 없음)'}
            </p>
            {item.address && (
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.address}</p>
            )}
          </div>
          {typeLabel && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 mt-0.5"
              style={{ backgroundColor: bg, color }}>{typeLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          {fee && <span className="text-[12px] font-bold" style={{ color }}>권리금 {fee}</span>}
          {deposit && <span className="text-[11px] text-gray-400">보증 {deposit}</span>}
          {monthly && <span className="text-[11px] text-gray-400">월세 {monthly}</span>}
        </div>
        <TrustBadges listing={item} />
      </div>
    </button>
  )
}

export default function ExplorePage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  // profile은 동기 읽기 — hooks 이전에 정의해야 isSeller를 초기값으로 쓸 수 있음
  const profile = getProfile()
  const config = CATEGORY_CONFIG[profile.category] ?? CATEGORY_CONFIG.seller
  const { color, bg, home, message } = config
  const isSeller = profile.category === 'seller'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('전체')
  const [areaFilter, setAreaFilter] = useState('전체 지역')
  const [sort, setSort] = useState(isSeller ? '관심 많은 순' : '완성도순')
  const [showFilter, setShowFilter] = useState(false)

  // 양도자 시장조사 — 내 매물 정보
  const [myListing, setMyListing] = useState(null)
  const [sellerFilter, setSellerFilter] = useState(null) // null | '우리 동네' | '같은 업종' | '같은 브랜드'

  useEffect(() => {
    if (!isSeller) return
    supabase.from('listings')
      .select('id, biz_type, address, franchise_brand_name, is_franchise')
      .eq('device_id', getDeviceId())
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data?.length) setMyListing(data[0]) })
  }, [isSeller])

  useEffect(() => {
    supabase
      .from('listings')
      .select('*')
      .eq('status', 'published')
      .then(({ data, error }) => {
        if (error) {
          console.error('[Explore] 매물 조회 오류:', error.message)
          showToast('매물을 불러오지 못했어요. 새로고침해 주세요.')
        } else {
          setRows(data ?? [])
        }
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    let list = rows
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(l =>
        (l.shop_name ?? '').toLowerCase().includes(q) ||
        (l.address ?? '').toLowerCase().includes(q)
      )
    }
    if (type !== '전체') {
      list = list.filter(l => TRANSFER_LABEL[l.transfer_type] === type)
    }
    if (areaFilter !== '전체 지역') {
      list = list.filter(l => (l.address ?? '').includes(areaFilter))
    }

    // 양도자 시장조사 필터 (내 매물 기반)
    if (sellerFilter && myListing) {
      if (sellerFilter === '우리 동네' && myListing.address) {
        const gu = myListing.address.split(' ').find(p => p.endsWith('구') || p.endsWith('시'))
        if (gu) list = list.filter(l => (l.address ?? '').includes(gu))
      } else if (sellerFilter === '같은 업종' && myListing.biz_type) {
        list = list.filter(l => l.biz_type === myListing.biz_type)
      } else if (sellerFilter === '같은 브랜드' && myListing.franchise_brand_name) {
        list = list.filter(l => l.franchise_brand_name === myListing.franchise_brand_name)
      }
    }

    // 완성도는 정렬 기준으로만 사용 (표시하지 않음)
    const scored = list.map(l => ({ ...l, _score: calcScore(listingToScoreInput(l)) }))
    const byCreated = (a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)

    if (sort === '완성도순') scored.sort((a, b) => (b._score - a._score) || byCreated(a, b))
    else if (sort === '최신순') scored.sort(byCreated)
    else if (sort === '관심 많은 순') scored.sort((a, b) => (b.views ?? 0) - (a.views ?? 0) || byCreated(a, b))
    else if (sort === '권리금 낮은순') scored.sort((a, b) => toNum(a.transfer_fee) - toNum(b.transfer_fee))
    else if (sort === '권리금 높은순') scored.sort((a, b) => toNum(b.transfer_fee) - toNum(a.transfer_fee))
    return scored
  }, [rows, query, type, areaFilter, sort, sellerFilter, myListing])

  const tabs = [
    { id: 'home',      label: '홈',     onClick: () => navigate(home) },
    { id: 'explore',   label: '탐색',   onClick: () => {}, active: true },
    { id: 'community', label: '커뮤니티', onClick: () => navigate('/community') },
    { id: 'message',   label: '메시지', onClick: message ? () => navigate(message) : () => showToast('가입 후 이용 가능해요') },
    { id: 'my',        label: '마이',   onClick: () => navigate('/my') },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 pb-2 px-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[20px] font-black text-gray-900">탐색</h1>
          {isSeller && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: bg, color }}>시장조사 모드</span>
          )}
        </div>

        {/* 양도자 시장조사 필터 칩 */}
        {isSeller && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-1" style={{ scrollbarWidth: 'none' }}>
            {SELLER_FILTERS.map(f => {
              const sel = sellerFilter === f
              const disabled = !myListing || (
                f === '같은 업종' ? !myListing.biz_type :
                f === '우리 동네' ? !myListing.address :
                f === '같은 브랜드' ? !myListing.franchise_brand_name : false
              )
              return (
                <button key={f}
                  onClick={() => setSellerFilter(sel ? null : f)}
                  disabled={disabled}
                  className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed"
                  style={sel
                    ? { backgroundColor: color, color: 'white', borderColor: color }
                    : { backgroundColor: '#f9fafb', color: '#374151', borderColor: '#e5e7eb' }}>
                  {f}
                </button>
              )
            })}
          </div>
        )}

        {/* 검색바 */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-100 mb-2.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" />
            <path d="M13 13l-2-2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="지역·상호명 검색"
            className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 text-[16px] leading-none">×</button>
          )}
        </div>

        {/* 양도 유형 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-1" style={{ scrollbarWidth: 'none' }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={type === t
                ? { backgroundColor: color, color: 'white' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              {t}
            </button>
          ))}
          <button onClick={() => setShowFilter(v => !v)}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
            style={showFilter
              ? { backgroundColor: color, color: 'white', borderColor: color }
              : { backgroundColor: '#f9fafb', color: '#9ca3af', borderColor: '#e5e7eb' }}>
            필터 ▾
          </button>
        </div>

        {/* 확장 필터 */}
        {showFilter && (
          <div className="pb-2">
            <p className="text-[10px] font-bold text-gray-400 mb-1.5">지역</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2" style={{ scrollbarWidth: 'none' }}>
              {AREAS_FILTER.map(a => (
                <button key={a} onClick={() => setAreaFilter(a)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={areaFilter === a
                    ? { backgroundColor: color, color: 'white' }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  {a}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-bold text-gray-400 mb-1.5">정렬</p>
            <div className="flex gap-1.5 flex-wrap">
              {SORT_OPTIONS.map(s => (
                <button key={s} onClick={() => setSort(s)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={sort === s
                    ? { backgroundColor: color, color: 'white' }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4">

          {/* 로딩 스켈레톤 */}
          {loading ? (
            <div className="py-4 space-y-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-gray-50 rounded animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-3">
                <p className="text-[12px] text-gray-400">
                  {query ? `"${query}" 검색 결과 ${filtered.length}건` : `매물 ${filtered.length}건`}
                </p>
                <span className="text-[11px] text-gray-400">{sort}</span>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <ModuMark size={52} color="#1683B8" style={{ opacity: 0.22 }} />
                  <p className="text-[14px] font-semibold text-gray-500">조건에 맞는 매물이 없어요</p>
                  <p className="text-[12px] text-gray-400">다른 키워드나 필터를 시도해보세요</p>
                  <button onClick={() => { setQuery(''); setType('전체'); setAreaFilter('전체 지역') }}
                    className="mt-2 px-4 py-2 rounded-full text-[12px] font-bold text-white"
                    style={{ backgroundColor: color }}>
                    필터 초기화
                  </button>
                </div>
              ) : (
                filtered.map(item => (
                  <PropertyCard key={item.id} item={item} color={color} bg={bg}
                    onClick={() => navigate(`/e2/${item.id}`)} />
                ))
              )}
            </>
          )}
          <div className="h-6" />
        </div>
      </main>

      <nav className="shrink-0 bg-white border-t border-gray-100 flex">
        {tabs.map(t => {
          const c = t.active ? color : '#9ca3af'
          return (
            <button key={t.id} onClick={t.onClick}
              className="flex-1 flex flex-col items-center py-3 gap-0.5">
              <span className="relative">
                {icons[t.id](c)}
                {t.id === 'message' && <MessageTabDot />}
              </span>
              <span className="text-[10px] font-medium" style={{ color: c }}>{t.label}</span>
            </button>
          )
        })}
      </nav>

      <Toast message={toast} />
    </div>
  )
}
