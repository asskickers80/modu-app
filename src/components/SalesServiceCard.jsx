/**
 * 사장님 매출 '이 상황에 맞는 서비스' 카드 (ORDER 2026-09-09 파트 A)
 * 매출 분석 하단 카드 1장 — 우선순위 높은 상황 1개만. 상황 없음·데이터 부족이면 렌더하지 않는다
 * (빈 카드·"데이터가 부족해요" 금지). 같은 상황 30일 1회, [닫기]면 30일 숨김.
 * 문안 3줄 고정(사실 / 할 수 있는 것 / 버튼) — 숫자는 실제 계산값만. 사장님 축이라 "가게" 허용.
 * 카테고리 칩은 config/salesCardCategories.ts 한 곳에서 관리.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { categoriesOf } from '../../config/salesCardCategories'
import { loadSalesCardSignal, recordSalesCardShown, dismissSalesCard } from '../lib/salesSignal'
import { cardCopyOf } from '../lib/salesSignalRules'
import { fetchVendorsFor, recordPendingDemand } from '../lib/vendors'
import { getProfile } from '../lib/userProfile'
import { logEvent } from '../lib/eventLog'
import { kstToday } from '../lib/weekUtil'
import VendorContactButtons, { BottomSheet } from './VendorContactButtons'
import GovLinkCard from './GovLinkCard'
import PriceInquirySheet, { PriceInquiryButton } from './PriceInquirySheet'

const GREEN = '#2d7a4f'
const GREEN_BG = '#edf7f1'

function VendorRow({ v, signal, category, situationLine, entries }) {
  return (
    <div className="py-3 border-b border-gray-50 last:border-0" data-testid="sales-vendor">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gray-50">
          {v.photo && <img src={v.photo} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-t15 font-bold text-gray-900 truncate">{v.name}</p>
          {v.tagline && <p className="text-t12 text-gray-500 truncate">{v.tagline}</p>}
        </div>
      </div>
      <div className="mt-2">
        <VendorContactButtons vendor={v} source="sales_card" signal={signal} category={category}
          situationLine={situationLine} entries={entries} accent={GREEN} compact />
      </div>
    </div>
  )
}

export function ServiceSheet({ sig, copy, entries, onClose }) {
  const navigate = useNavigate()
  const profile = getProfile()
  const cats = categoriesOf(sig.signal)
  const [vendorsByCat, setVendorsByCat] = useState(null) // null = 조회 중
  const [active, setActive] = useState(null)
  const [more, setMore] = useState(false)
  const [govOpen, setGovOpen] = useState(false) // 정부 지원제도 링크 (파트 D3) — 칩 목록 맨 아래 회색 링크
  const [askPrice, setAskPrice] = useState(false) // 양도 상담 칩 → 모두에 시세 물어보기 (2026-09-11 파트 C2-d)

  useEffect(() => {
    let alive = true
    const region = [profile.region, profile.region_sub].filter(Boolean).join(' ')
    const vendorCats = cats.filter(c => c.kind === 'vendor')
    Promise.all(vendorCats.map(c => fetchVendorsFor({ category: c.key, region: profile.region, regionSub: profile.region_sub })))
      .then(lists => {
        if (!alive) return
        const map = {}
        vendorCats.forEach((c, i) => {
          map[c.key] = lists[i]
          if (!lists[i].length) {
            // 0곳 — 칩 미표시 + pending 기록(지역, 카테고리, signal, 날짜)
            recordPendingDemand({ region, category: c.key, signal: sig.signal, date: kstToday() })
            logEvent('vendor_list_empty', { category: c.key, region })
          }
        })
        setVendorsByCat(map)
      })
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = vendorsByCat
    ? cats.filter(c => c.kind === 'internal' || (vendorsByCat[c.key] ?? []).length > 0)
    : []

  const pick = (c) => {
    setActive(c.key); setMore(false)
    logEvent('sales_card_category', { signal: sig.signal, category: c.key })
    if (c.kind === 'vendor') logEvent('vendor_list_shown', { category: c.key, n: (vendorsByCat[c.key] ?? []).length })
  }
  const openPreview = () => {
    logEvent('transfer_preview_open')
    navigate('/e1/1?preview=1')
  }

  const activeCat = visible.find(c => c.key === active) ?? null
  const list = activeCat?.kind === 'vendor' ? (vendorsByCat[activeCat.key] ?? []) : []
  const shown = more ? list : list.slice(0, 3)

  return (
    <BottomSheet onClose={onClose} testId="sales-service-sheet">
      <p className="text-t16 font-black text-gray-900 pr-6" data-testid="sales-service-sheet-title">{copy.line1}</p>
      {vendorsByCat && visible.length === 0 && (
        <p className="text-t13 text-gray-500 mt-2" data-testid="sales-service-empty">지금은 이 지역에 연결할 업체가 없어요</p>
      )}
      {visible.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3" data-testid="sales-service-chips">
          {visible.map(c => (
            <button key={c.key} type="button" onClick={() => pick(c)} data-testid={`sales-chip-${c.key}`}
              className="px-3.5 py-2.5 rounded-full text-t14 font-bold border transition-colors"
              style={active === c.key
                ? { backgroundColor: GREEN, color: 'white', borderColor: GREEN }
                : { backgroundColor: 'white', color: '#111827', borderColor: '#e5e7eb' }}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {activeCat?.kind === 'internal' && (
        <div className="mt-4 rounded-2xl px-4 py-3.5" style={{ backgroundColor: GREEN_BG }} data-testid="transfer-intro">
          <div className="mb-2"><PriceInquiryButton onClick={() => setAskPrice(true)} accent={GREEN} /></div>
          <p className="text-t14 text-gray-800">지금 등록하면 어떤 정보가 필요한지만 보여드릴게요</p>
          <button type="button" onClick={openPreview} data-testid="transfer-preview-open"
            className="mt-2.5 w-full py-3 rounded-xl text-t14 font-bold text-white" style={{ backgroundColor: GREEN }}>
            매물 등록 미리보기
          </button>
        </div>
      )}

      {activeCat?.kind === 'vendor' && (
        <div className="mt-3" data-testid="sales-vendor-list">
          {shown.map(v => (
            <VendorRow key={v.id} v={v} signal={sig.signal} category={activeCat.key} situationLine={copy.line1} entries={entries} />
          ))}
          {!more && list.length > 3 && (
            <button type="button" onClick={() => setMore(true)} data-testid="sales-vendor-more"
              className="w-full py-3 text-t13 font-semibold text-gray-500">
              더 보기 ({list.length - 3})
            </button>
          )}
        </div>
      )}

      {askPrice && (
        <PriceInquirySheet origin="listing_manage" accent={GREEN} onClose={() => setAskPrice(false)}
          place={{ industry: profile.category_main ?? null, gu: profile.region_sub ?? null, entries }} />
      )}
      {/* 정부 지원제도 — 회색 링크 1줄, 누르면 연결 카드 (자체 챗봇 없음, 정부 서비스로 연결) */}
      {vendorsByCat && (
        <div className="mt-5">
          {!govOpen ? (
            <button type="button" onClick={() => setGovOpen(true)} data-testid="gov-link-toggle"
              className="text-t12 text-gray-400 underline underline-offset-2 min-h-11">
              정부 지원제도도 확인해 보세요
            </button>
          ) : (
            <GovLinkCard place="sales_sheet" keys={['sbiz365_ai', 'sbiz24']} title="정부 지원제도" accent={GREEN} />
          )}
        </div>
      )}
    </BottomSheet>
  )
}

export default function SalesServiceCard({ preloaded = null }) {
  const [sig, setSig] = useState(null)
  const [impressionId, setImpressionId] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    // 다음 행동 카드(NextActionCard)가 이미 판정을 끝냈으면 그 결과를 쓴다 — 조회 2회 방지
    ;(preloaded ? Promise.resolve(preloaded) : loadSalesCardSignal()).then(async r => {
      if (!alive || !r) return
      setSig(r)
      let id = r.impressionId
      if (!id) {
        id = await recordSalesCardShown(r.signal)
        logEvent('sales_card_shown', { signal: r.signal, basis: r.basis })
      }
      if (alive) setImpressionId(id)
    })
    return () => { alive = false }
  }, [])

  if (!sig) return null
  const copy = cardCopyOf(sig)
  if (!copy) return null

  const dismiss = () => {
    logEvent('sales_card_dismissed', { signal: sig.signal })
    dismissSalesCard(sig.signal, impressionId)
    setSig(null)
  }
  const openSheet = () => { logEvent('sales_card_open', { signal: sig.signal }); setOpen(true) }

  return (
    <div className="rounded-2xl px-4 py-3.5 mb-3 relative bg-white border border-gray-100"
      data-testid="sales-service-card" data-signal={sig.signal}>
      <button onClick={dismiss} data-testid="sales-service-dismiss" aria-label="닫기"
        className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center text-gray-300 text-t14">
        ✕
      </button>
      <p className="text-t15 font-bold text-gray-900 leading-snug pr-8" data-testid="sales-service-line1">{copy.line1}</p>
      <p className="text-t12 text-gray-500 mt-1 leading-relaxed" data-testid="sales-service-line2">{copy.line2}</p>
      <button onClick={openSheet} data-testid="sales-service-cta"
        className="mt-3 w-full py-2.5 rounded-xl text-t13 font-bold text-white active:scale-[0.99] transition-transform"
        style={{ backgroundColor: GREEN }}>
        {copy.cta}
      </button>
      {open && <ServiceSheet sig={sig} copy={copy} entries={sig.entries ?? []} onClose={() => setOpen(false)} />}
    </div>
  )
}
