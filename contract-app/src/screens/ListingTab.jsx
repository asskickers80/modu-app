import { useEffect, useState } from 'react'
import CategoryPicker from '../components/CategoryPicker.jsx'
import { formatPhone, formatBizNo, formatComma, parseAmount, digitsOnly } from '../lib/format.js'
import { findCardByPhone, saveCard, listCards, isSupabaseConfigured } from '../lib/customerStore.js'

// 3번 탭 [매물카드] — 고객·매물 관리 (WORK-APP-SPEC-v3 ③)
// 진입: 전화번호 입력 → 기존 고객이면 카드 오픈, 신규면 새 카드 생성
// 목록: 최근 상담순, 전화번호/상호 검색
const CUSTOMER_TYPES = ['양도자', '임차인', '기타']

const emptyCard = phone => ({
  customer: { id: null, phone, name: '', type: '기타' },
  listing: { id: null, storeName: '', businessType: '', bizNo: '', address: '', deposit: 0, monthlyRent: 0, premium: 0, maintenanceFee: 0 },
})

export default function ListingTab() {
  const [view, setView] = useState('entry') // entry | card
  const [card, setCard] = useState(null)
  const [isNew, setIsNew] = useState(false)

  return view === 'card' && card ? (
    <CardEditor
      card={card}
      isNew={isNew}
      onChange={setCard}
      onBack={() => { setView('entry'); setCard(null) }}
    />
  ) : (
    <EntryScreen
      onOpen={(c, fresh) => { setCard(c); setIsNew(fresh); setView('card') }}
    />
  )
}

// ── 진입 화면: 전화번호 + 목록/검색 ──────────────────────────
function EntryScreen({ onOpen }) {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [rows, setRows] = useState([])
  const [listState, setListState] = useState('loading') // loading | ok | error

  async function refresh(kw) {
    if (!isSupabaseConfigured) {
      setListState('error')
      return
    }
    setListState('loading')
    try {
      setRows(await listCards(kw))
      setListState('ok')
    } catch {
      setListState('error')
    }
  }

  useEffect(() => {
    refresh('')
  }, [])

  async function handleStart() {
    const digits = digitsOnly(phone)
    if (digits.length < 10) {
      setError('전화번호를 끝까지 입력해 주세요')
      return
    }
    setError('')
    if (!isSupabaseConfigured) {
      // 저장소 미설정이어도 카드 화면은 열 수 있게 (저장 시 안내)
      onOpen(emptyCard(formatPhone(phone)), true)
      return
    }
    setBusy(true)
    try {
      const found = await findCardByPhone(digits)
      if (found) {
        onOpen({
          customer: { id: found.customer.id, phone: formatPhone(found.customer.phone), name: found.customer.name || '', type: found.customer.type || '기타' },
          listing: found.listing
            ? {
                id: found.listing.id,
                storeName: found.listing.store_name || '',
                businessType: found.listing.business_type || '',
                bizNo: found.listing.biz_reg_no || '',
                address: found.listing.address || '',
                deposit: found.listing.deposit || 0,
                monthlyRent: found.listing.monthly_rent || 0,
                premium: found.listing.premium || 0,
                maintenanceFee: found.listing.maintenance_fee || 0,
              }
            : emptyCard('').listing,
        }, false)
      } else {
        onOpen(emptyCard(formatPhone(phone)), true)
      }
    } catch (err) {
      setError(`조회 실패: ${err.message || err}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto pb-10">
      <div className="mx-auto mt-4 max-w-2xl space-y-4 px-4">
        {!isSupabaseConfigured && (
          <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-800">
            Supabase 미설정 — 카드 작성은 가능하지만 저장·목록은 동작하지 않아요. (.env 설정 + 스키마 SQL 실행 필요)
          </p>
        )}

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500">전화번호로 시작</h2>
          <div className="mt-3 flex gap-2">
            <input
              type="tel" inputMode="numeric" value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              placeholder="010-0000-0000"
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-lg tracking-wide focus:border-blue-500 focus:outline-none"
            />
            <button onClick={handleStart} disabled={busy}
              className="rounded-xl bg-blue-600 px-5 text-sm font-bold text-white active:bg-blue-700 disabled:bg-gray-300">
              {busy ? '조회 중…' : '카드 열기'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">기존 고객이면 카드가 바로 열리고, 처음이면 새 카드를 만듭니다.</p>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-gray-500">매물카드 목록 (최근 상담순)</h2>
          </div>
          <form onSubmit={e => { e.preventDefault(); refresh(keyword) }} className="mt-3 flex gap-2">
            <input
              type="search" value={keyword} onChange={e => setKeyword(e.target.value)}
              placeholder="전화번호 또는 상호로 검색"
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button type="submit" className="rounded-xl bg-gray-900 px-4 text-sm font-bold text-white">검색</button>
          </form>

          <div className="mt-3 space-y-2">
            {listState === 'loading' && <p className="py-6 text-center text-sm text-gray-300">불러오는 중…</p>}
            {listState === 'error' && <p className="py-6 text-center text-xs text-gray-300">목록을 사용하려면 Supabase 연결이 필요해요</p>}
            {listState === 'ok' && rows.length === 0 && <p className="py-6 text-center text-sm text-gray-300">저장된 카드가 없어요</p>}
            {listState === 'ok' && rows.map(row => (
              <button
                key={row.id}
                onClick={() => onOpen({
                  customer: { id: row.customers?.id, phone: formatPhone(row.customers?.phone || ''), name: row.customers?.name || '', type: row.customers?.type || '기타' },
                  listing: {
                    id: row.id, storeName: row.store_name || '', businessType: row.business_type || '',
                    bizNo: row.biz_reg_no || '', address: row.address || '',
                    deposit: row.deposit || 0, monthlyRent: row.monthly_rent || 0,
                    premium: row.premium || 0, maintenanceFee: row.maintenance_fee || 0,
                  },
                }, false)}
                className="block w-full rounded-xl border border-gray-100 px-3 py-3 text-left active:bg-blue-50"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-gray-900">{row.store_name || '(상호 미입력)'}</span>
                  <span className="shrink-0 text-xs text-gray-400">{formatPhone(row.customers?.phone || '')}</span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-gray-400">
                  <span>{row.customers?.name || '이름 미입력'} · {row.customers?.type || '기타'} · {row.business_type || '업종 미정'}</span>
                  <span className="shrink-0">{row.updated_at ? new Date(row.updated_at).toLocaleDateString('ko-KR') : ''}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// ── 카드 편집 화면 ───────────────────────────────────────────
function CardEditor({ card, isNew, onChange, onBack }) {
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null) // { ok, text }

  const setCustomer = patch => onChange({ ...card, customer: { ...card.customer, ...patch } })
  const setListing = patch => onChange({ ...card, listing: { ...card.listing, ...patch } })

  async function handleSave() {
    setSaving(true)
    setNotice(null)
    try {
      const { customerId, listingId } = await saveCard(card)
      onChange({
        customer: { ...card.customer, id: customerId },
        listing: { ...card.listing, id: listingId },
      })
      setNotice({ ok: true, text: '저장되었습니다' })
    } catch (err) {
      setNotice({ ok: false, text: `저장 실패: ${err.message || err}` })
    } finally {
      setSaving(false)
    }
  }

  const moneyField = (label, key) => (
    <label className="block">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <input
          type="text" inputMode="numeric" value={formatComma(card.listing[key])}
          onChange={e => setListing({ [key]: parseAmount(e.target.value) })}
          className="w-full min-w-0 rounded-xl border border-gray-300 px-2 py-2.5 text-right text-sm focus:border-blue-500 focus:outline-none"
        />
        <span className="shrink-0 text-xs text-gray-400">원</span>
      </div>
    </label>
  )

  return (
    <div className="h-full overflow-y-auto pb-28">
      <div className="mx-auto mt-4 max-w-2xl space-y-4 px-4">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="rounded-xl px-3 py-2 text-sm font-bold text-gray-500 active:bg-gray-100">← 목록으로</button>
          <span className="text-sm font-bold text-gray-900">{isNew ? '새 매물카드' : '매물카드'}</span>
          <span className="w-16" />
        </div>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500">고객</h2>
          <div className="mt-3 space-y-4">
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">전화번호 (기준값)</span>
              <input
                type="tel" inputMode="numeric" value={card.customer.phone}
                onChange={e => setCustomer({ phone: formatPhone(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base tracking-wide focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">고객명</span>
              <input
                type="text" value={card.customer.name}
                onChange={e => setCustomer({ name: e.target.value })}
                placeholder="이름 또는 별칭"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
              />
            </label>
            <div>
              <span className="text-[13px] font-semibold text-gray-700">구분</span>
              <div className="mt-1 flex gap-1.5">
                {CUSTOMER_TYPES.map(t => (
                  <button key={t} onClick={() => setCustomer({ type: t })}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-bold ${card.customer.type === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500">매물</h2>
          <div className="mt-3 space-y-4">
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">상호</span>
              <input
                type="text" value={card.listing.storeName}
                onChange={e => setListing({ storeName: e.target.value })}
                placeholder="예: 행복분식"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
              />
            </label>
            <div>
              <span className="text-[13px] font-semibold text-gray-700">업종</span>
              <div className="mt-1">
                <CategoryPicker value={card.listing.businessType} onSelect={v => setListing({ businessType: v })} />
              </div>
            </div>
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">사업자등록번호</span>
              <input
                type="text" inputMode="numeric" value={card.listing.bizNo}
                onChange={e => setListing({ bizNo: formatBizNo(e.target.value) })}
                placeholder="숫자 10자리만 입력 (자동 하이픈)"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">소재지</span>
              <input
                type="text" value={card.listing.address}
                onChange={e => setListing({ address: e.target.value })}
                placeholder="예: 서울시 강남구 ○○동 123-4"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500">거래 조건</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {moneyField('보증금', 'deposit')}
            {moneyField('월세', 'monthlyRent')}
            {moneyField('권리금', 'premium')}
            {moneyField('관리비', 'maintenanceFee')}
          </div>
        </section>

        {notice && (
          <p className={`rounded-xl px-4 py-3 text-sm ${notice.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {notice.text}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button onClick={handleSave} disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white active:bg-blue-700 disabled:bg-gray-300">
            {saving ? '저장 중…' : '카드 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
