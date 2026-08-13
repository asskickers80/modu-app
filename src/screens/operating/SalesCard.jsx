import { useState, useEffect, useMemo } from 'react'
import { getProfile, saveProfile } from '../../lib/userProfile'
import { syncProfileDataToServer } from '../../lib/auth'
import { analyzeSales, backfillDates } from '../../lib/salesAnalytics'
import { fetchSalesEntries, saveSalesEntry, fetchFixedCosts, saveFixedCosts, fixedTotalOf } from '../../lib/salesStore'
import { fetchNearbyDensity } from '../../lib/marketData'

const GREEN = '#2d7a4f'
const GREEN_BG = '#edf7f1'

const won = (v) => (v ?? 0).toLocaleString()
const manwonShort = (v) => `${Math.round((v ?? 0) / 10000).toLocaleString()}만`

// 배달 입력란 노출 업종 — 요식업 계열 (오더 §2: 요식업 계열 + "배달 함" 설정 시에만)
const DELIVERY_CATS = ['요식업', '카페·베이커리']

function Sheet({ onClose, children, testId }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div data-testid={testId} className="relative bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        {children}
      </div>
    </div>
  )
}

function NumField({ label, value, onChange, placeholder = '0', unit = '원', testId }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-t13 text-gray-500 w-20 shrink-0">{label}</span>
      <input
        type="text" inputMode="numeric" data-testid={testId}
        value={value === '' ? '' : Number(value).toLocaleString()}
        onChange={e => {
          const raw = e.target.value.replace(/[^0-9]/g, '')
          onChange(raw === '' ? '' : Number(raw))
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-t15 font-bold text-right outline-none focus:border-gray-400"
      />
      <span className="text-t13 text-gray-400 w-6 shrink-0">{unit}</span>
    </div>
  )
}

// ── 입력 시트 — 30초 원칙: 금액 + 빠른 증분 칩, 나머지는 선택 ──
function EntrySheet({ initialDate, entries, deliveryOn, onSaved, onClose, showToast }) {
  const dates = backfillDates() // 오늘~7일 전 (소급 한도)
  const [date, setDate] = useState(initialDate ?? dates[0].iso)
  const existing = entries.find(e => e.sale_date === date)
  const [revenue, setRevenue] = useState(existing?.revenue ?? '')
  const [deliveryRevenue, setDeliveryRevenue] = useState(existing?.delivery_revenue ?? '')
  const [customers, setCustomers] = useState(existing?.customers ?? '')
  const [memo, setMemo] = useState(existing?.memo ?? '')
  const [saving, setSaving] = useState(false)

  // 날짜를 바꾸면 그 날의 기존 값 로드 (재입력 = 갱신)
  const pickDate = (iso) => {
    setDate(iso)
    const e = entries.find(x => x.sale_date === iso)
    setRevenue(e?.revenue ?? ''); setDeliveryRevenue(e?.delivery_revenue ?? '')
    setCustomers(e?.customers ?? ''); setMemo(e?.memo ?? '')
  }

  const addQuick = (amount) => setRevenue((Number(revenue) || 0) + amount)

  const save = async () => {
    const rev = Number(revenue)
    if (!rev) { showToast('매출 금액을 입력해주세요'); return }
    if (deliveryRevenue !== '' && Number(deliveryRevenue) > rev) {
      showToast('배달 매출이 총매출보다 클 수 없어요'); return
    }
    setSaving(true)
    const r = await saveSalesEntry({
      date, revenue: rev,
      deliveryRevenue: deliveryRevenue === '' ? null : Number(deliveryRevenue),
      customers: customers === '' ? null : Number(customers),
      memo: memo.trim() || null,
    })
    setSaving(false)
    if (!r.ok) { showToast('저장하지 못했어요 — 잠시 후 다시 시도해주세요'); return }
    onSaved({ sale_date: date, revenue: rev,
      delivery_revenue: deliveryRevenue === '' ? null : Number(deliveryRevenue),
      customers: customers === '' ? null : Number(customers), memo: memo.trim() || null })
  }

  return (
    <Sheet onClose={onClose} testId="sales-entry-sheet">
      <p className="text-t16 font-black text-gray-900 mb-3">매출 입력</p>
      {/* 날짜 — 소급 7일 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: 'none' }}>
        {dates.map(d => (
          <button key={d.iso} onClick={() => pickDate(d.iso)} data-testid={`sales-date-${d.label}`}
            className="shrink-0 px-3 py-1.5 rounded-full text-t12 font-semibold border"
            style={date === d.iso
              ? { backgroundColor: GREEN, borderColor: GREEN, color: 'white' }
              : { borderColor: '#e5e7eb', color: '#6b7280' }}>
            {d.label}({d.weekday})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <NumField label="매출" value={revenue} onChange={setRevenue} testId="sales-revenue-input" />
        <div className="flex flex-wrap gap-1.5">
          {[[100000, '+10만'], [500000, '+50만'], [1000000, '+100만']].map(([amt, label]) => (
            <button key={label} onClick={() => addQuick(amt)}
              className="px-3 py-1.5 rounded-full text-t12 font-bold" style={{ backgroundColor: GREEN_BG, color: GREEN }}>
              {label}
            </button>
          ))}
          <button onClick={() => setRevenue('')} className="px-3 py-1.5 rounded-full text-t12 font-semibold text-gray-400 bg-gray-100">
            지우기
          </button>
        </div>
        {deliveryOn && (
          <NumField label="배달 매출" value={deliveryRevenue} onChange={setDeliveryRevenue} testId="sales-delivery-input" />
        )}
        <NumField label="손님 수" value={customers} onChange={setCustomers} unit="명" testId="sales-customers-input" />
        <div className="flex items-center gap-2">
          <span className="text-t13 text-gray-500 w-20 shrink-0">메모</span>
          <input type="text" value={memo} onChange={e => setMemo(e.target.value)} maxLength={40}
            placeholder="비 와서 한산 (선택)"
            className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-t13 outline-none focus:border-gray-400" />
        </div>
      </div>

      <button onClick={save} disabled={saving} data-testid="sales-save"
        className="mt-5 w-full py-3.5 rounded-2xl text-t15 font-bold text-white"
        style={{ backgroundColor: Number(revenue) ? GREEN : '#d1d5db' }}>
        {saving ? '저장 중…' : '저장하기'}
      </button>
    </Sheet>
  )
}

// ── 고정비 시트 — 월 1회 설정, 납부일 포함(후속 '오늘 할 일' 재료) ──
function FixedSheet({ fixed, onSaved, onClose, showToast }) {
  const [rent, setRent] = useState(fixed?.rent ?? '')
  const [rentDay, setRentDay] = useState(fixed?.rent_due_day ?? '')
  const [labor, setLabor] = useState(fixed?.labor ?? '')
  const [laborDay, setLaborDay] = useState(fixed?.labor_due_day ?? '')
  const [maintenance, setMaintenance] = useState(fixed?.maintenance ?? '')
  const [maintDay, setMaintDay] = useState(fixed?.maintenance_due_day ?? '')
  const [others, setOthers] = useState(fixed?.others ?? '')
  const [saving, setSaving] = useState(false)

  const dayField = (val, set, testId) => (
    <input type="text" inputMode="numeric" value={val} data-testid={testId}
      onChange={e => {
        const n = e.target.value.replace(/[^0-9]/g, '')
        set(n === '' ? '' : Math.min(31, Number(n)))
      }}
      placeholder="일" className="w-14 border border-gray-200 rounded-xl px-2 py-2.5 text-t13 text-center outline-none" />
  )

  const save = async () => {
    setSaving(true)
    const num = (v) => (v === '' ? null : Number(v))
    const r = await saveFixedCosts({
      rent: num(rent), rent_due_day: num(rentDay),
      labor: num(labor), labor_due_day: num(laborDay),
      maintenance: num(maintenance), maintenance_due_day: num(maintDay),
      others: num(others),
    })
    setSaving(false)
    if (!r.ok) { showToast('저장하지 못했어요 — 잠시 후 다시 시도해주세요'); return }
    onSaved()
  }

  return (
    <Sheet onClose={onClose} testId="fixed-sheet">
      <p className="text-t16 font-black text-gray-900 mb-1">월 고정비 설정</p>
      <p className="text-t12 text-gray-400 mb-4">한 번 설정하면 매달 자동 반영돼요 — 바뀔 때만 고쳐주세요. 납부일은 할 일 알림 준비 재료예요.</p>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1"><NumField label="임대료" value={rent} onChange={setRent} testId="fixed-rent" /></div>
          {dayField(rentDay, setRentDay, 'fixed-rent-day')}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1"><NumField label="인건비" value={labor} onChange={setLabor} testId="fixed-labor" /></div>
          {dayField(laborDay, setLaborDay, 'fixed-labor-day')}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1"><NumField label="관리비" value={maintenance} onChange={setMaintenance} testId="fixed-maintenance" /></div>
          {dayField(maintDay, setMaintDay, 'fixed-maintenance-day')}
        </div>
        <NumField label="기타" value={others} onChange={setOthers} testId="fixed-others" />
      </div>
      <button onClick={save} disabled={saving} data-testid="fixed-save"
        className="mt-5 w-full py-3.5 rounded-2xl text-t15 font-bold text-white" style={{ backgroundColor: GREEN }}>
        {saving ? '저장 중…' : '저장하기'}
      </button>
    </Sheet>
  )
}

// ── POS 관심 수집 — (예정) 규격: 없는 기능을 있는 것처럼 표시 금지 ──
const POS_OPTIONS = ['캐시노트', '토스플레이스', '배민포스', '포스뱅크', '기타', '안 써요']
function PosSheet({ onClose, showToast }) {
  const pick = async (label) => {
    saveProfile({ category: 'operating', pos_interest: label })
    syncProfileDataToServer() // 제휴 우선순위 판단 자산 — 로그인 시 서버 영속
    showToast('연동이 준비되면 알려드릴게요')
    onClose()
  }
  return (
    <Sheet onClose={onClose} testId="pos-sheet">
      <p className="text-t16 font-black text-gray-900 mb-1">POS·카드매출 연동 (예정)</p>
      <p className="text-t12 text-gray-400 mb-4">아직 준비 중이에요. 어떤 POS를 쓰시는지 알려주시면 준비되는 대로 알려드릴게요.</p>
      <div className="flex flex-wrap gap-2">
        {POS_OPTIONS.map(o => (
          <button key={o} onClick={() => pick(o)}
            className="px-3.5 py-2 rounded-full text-t13 font-semibold border"
            style={{ borderColor: GREEN, color: GREEN, backgroundColor: GREEN_BG }}>
            {o}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

// ── 분석 렌더 — 데이터가 열어준 것만, 부족하면 안내 한 줄 (가짜 수치 금지) ──
function AnalysisRows({ analysis }) {
  const rows = []
  if (analysis.weekly) {
    rows.push(
      <p key="wk" className="text-t13 text-gray-700" data-testid="sales-weekly">
        최근 7일 <b>{manwonShort(analysis.weekly.curTotal)}원</b>
        {Number.isFinite(analysis.weekly.deltaPct) && (
          <span className="font-bold ml-1" style={{ color: analysis.weekly.deltaPct >= 0 ? GREEN : '#dc2626' }}>
            지난주 {analysis.weekly.deltaPct >= 0 ? '↑' : '↓'}{Math.abs(analysis.weekly.deltaPct)}%
          </span>
        )}
      </p>
    )
  }
  if (analysis.weekday) {
    rows.push(
      <p key="wd" className="text-t13 text-gray-700" data-testid="sales-weekday">
        {analysis.weekday.best.weekday}요일이 가장 좋아요 (평균 {manwonShort(analysis.weekday.best.avg)}원) ·
        {' '}{analysis.weekday.worst.weekday}요일이 낮아요
      </p>
    )
  }
  if (analysis.unitPrice) {
    rows.push(
      <p key="up" className="text-t13 text-gray-700" data-testid="sales-unit-price">
        객단가 <b>{won(analysis.unitPrice.current)}원</b>
        {Number.isFinite(analysis.unitPrice.previous) && ` (이전 ${won(analysis.unitPrice.previous)}원)`}
      </p>
    )
  }
  if (analysis.delivery) {
    rows.push(
      <p key="dv" className="text-t13 text-gray-700" data-testid="sales-delivery-share">
        배달 비중 <b>{analysis.delivery.sharePct}%</b>
      </p>
    )
  }
  if (analysis.monthly) {
    rows.push(
      <p key="mo" className="text-t13 text-gray-700" data-testid="sales-monthly">
        최근 30일 <b>{manwonShort(analysis.monthly.total)}원</b> · 하루평균 {manwonShort(analysis.monthly.dailyAvg)}원 ·
        {' '}이대로면 한 달 예상 {manwonShort(analysis.monthly.forecast)}원
      </p>
    )
    if (Number.isFinite(analysis.monthly.margin)) {
      rows.push(
        <p key="mg" className="text-t13 font-bold" data-testid="sales-margin"
          style={{ color: analysis.monthly.margin >= 0 ? GREEN : '#dc2626' }}>
          고정비 {manwonShort(analysis.monthly.fixedTotal)}원 빼면 {manwonShort(analysis.monthly.margin)}원 남아요
        </p>
      )
    }
  }
  return rows.length ? <div className="flex flex-col gap-1.5 mt-3">{rows}</div> : null
}

/**
 * 사장님 홈 최상단 매출 카드 (ORDER-sales-tracking-v1)
 * 입력(30초)·분석(입력량 게이트)·고정비·동네 밀집도·POS(예정)를 한 카드에서.
 * Gemini 미호출 — 계산은 전부 룰(salesAnalytics). 테이블 미생성 시에도 화면은 깨지지 않는다.
 */
export default function SalesCard({ showToast }) {
  const profile = getProfile() // operating 활성 — roleData 평탄화
  const [entries, setEntries] = useState([])
  const [fixed, setFixed] = useState(null)
  const [sheet, setSheet] = useState(null) // null | 'entry' | 'fixed' | 'pos' | 'delivery-ask'
  const [entryDate, setEntryDate] = useState(null)
  const [density, setDensity] = useState(null) // null | 'loading' | {result} | 'error'

  useEffect(() => {
    let cancelled = false
    fetchSalesEntries().then(rows => { if (!cancelled) setEntries(rows) })
    fetchFixedCosts().then(f => { if (!cancelled) setFixed(f) })
    return () => { cancelled = true }
  }, [])

  const todayIso = new Date().toISOString().slice(0, 10)
  const yesterdayIso = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
  const todayEntry = entries.find(e => e.sale_date === todayIso)
  const yesterdayMissing = !entries.some(e => e.sale_date === yesterdayIso) && entries.length > 0

  const analysis = useMemo(
    () => analyzeSales(entries, { fixedTotal: fixedTotalOf(fixed) || null }),
    [entries, fixed])

  // 배달 입력란 — 요식업 계열 + "배달 함" 설정 시에만 (미설정이면 입력 전에 1회 확인)
  const foodBiz = DELIVERY_CATS.includes(profile.category_main)
  const deliveryOn = foodBiz && profile.delivery === 'yes'
  const needDeliveryAsk = foodBiz && !profile.delivery

  const openEntry = (date = null) => {
    setEntryDate(date)
    setSheet(needDeliveryAsk ? 'delivery-ask' : 'entry')
  }
  const setDelivery = (val) => {
    saveProfile({ category: 'operating', delivery: val })
    syncProfileDataToServer()
    setSheet('entry')
  }

  const onSaved = (row) => {
    setEntries(prev => [row, ...prev.filter(e => e.sale_date !== row.sale_date)])
    setSheet(null)
    showToast(`${row.sale_date === todayIso ? '오늘' : row.sale_date} 매출 ${manwonShort(row.revenue)}원 저장했어요 ✓`)
  }

  const loadDensity = async () => {
    if (!('geolocation' in navigator)) { setDensity('error'); return }
    setDensity('loading')
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, maximumAge: 300000 }))
      const d = await fetchNearbyDensity(
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
        { ksicCode: profile.ksic_code, bizLabel: profile.bizLabel })
      setDensity(d?.dataSource === 'api' ? d : 'error')
    } catch (_) { setDensity('error') }
  }

  // 최근 7일 미니 바 (실데이터만 — 없으면 생략)
  const last7 = backfillDates().slice(0, 7).map(d => ({
    ...d, entry: entries.find(e => e.sale_date === d.iso) ?? null,
  })).reverse()
  const maxRev = Math.max(...last7.map(d => d.entry?.revenue ?? 0), 1)
  const hasAnyBar = last7.some(d => d.entry)

  return (
    <div className="bg-white rounded-2xl p-4 mb-3 border border-gray-100" data-testid="sales-card">
      <div className="flex items-center justify-between">
        <p className="text-t12 font-semibold text-gray-400">오늘 매출</p>
        <button onClick={() => openEntry()} data-testid="sales-input-open"
          className="px-3 py-1.5 rounded-full text-t12 font-bold text-white" style={{ backgroundColor: GREEN }}>
          {todayEntry ? '수정' : '입력'}
        </button>
      </div>

      {todayEntry ? (
        <div className="mt-1">
          <p className="text-[26px] font-black text-gray-900" data-testid="sales-today-value">
            {won(todayEntry.revenue)}<span className="text-t14 font-bold text-gray-400 ml-0.5">원</span>
          </p>
          <p className="text-t12 text-gray-400">
            {[
              Number.isFinite(todayEntry.customers) && todayEntry.customers !== null ? `손님 ${todayEntry.customers}명` : null,
              Number.isFinite(todayEntry.delivery_revenue) && todayEntry.delivery_revenue !== null ? `배달 ${manwonShort(todayEntry.delivery_revenue)}원` : null,
              todayEntry.memo,
            ].filter(Boolean).join(' · ') || '기록 완료'}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-t14 text-gray-400">아직 입력 전이에요 — 30초면 돼요</p>
      )}

      {yesterdayMissing && (
        <button onClick={() => openEntry(yesterdayIso)} data-testid="sales-yesterday-nudge"
          className="mt-2 px-3 py-1.5 rounded-full text-t12 font-semibold" style={{ backgroundColor: GREEN_BG, color: GREEN }}>
          어제도 넣을까요? →
        </button>
      )}

      {hasAnyBar && (
        <div className="flex items-end gap-1 mt-3 h-10">
          {last7.map(d => (
            <div key={d.iso} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-t"
                style={{
                  height: d.entry ? `${Math.max(8, Math.round((d.entry.revenue / maxRev) * 100))}%` : '2px',
                  backgroundColor: d.entry ? GREEN : '#e5e7eb', opacity: d.iso === todayIso ? 1 : 0.55,
                }} />
              <span className="text-t9 text-gray-300">{d.weekday}</span>
            </div>
          ))}
        </div>
      )}

      <AnalysisRows analysis={analysis} />
      {analysis.nextUnlock && (
        <p className="mt-2 text-t11 text-gray-400" data-testid="sales-next-unlock">💡 {analysis.nextUnlock}</p>
      )}

      {/* 동네 상권 — 밀집도만 (매출 비교는 표본 승격 전 금지 — salesAnalytics.canCompareRevenue) */}
      {density && density !== 'loading' && density !== 'error' && (
        <p className="mt-2 text-t12 text-gray-600" data-testid="density-result">
          📍 반경 {density.radius}m 상가 {density.totalStores.toLocaleString()}곳
          {Number.isFinite(density.similarBizCount) && ` · 동종 ${density.similarBizCount}곳`}
        </p>
      )}
      {density === 'error' && (
        <p className="mt-2 text-t11 text-gray-400">위치를 확인하지 못했어요 — 다시 시도해주세요</p>
      )}

      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
        <button onClick={() => setSheet('fixed')} data-testid="fixed-sheet-open"
          className="flex-1 py-2 rounded-xl text-t12 font-semibold text-gray-600 bg-gray-50">
          고정비 설정{fixedTotalOf(fixed) > 0 ? ` · ${manwonShort(fixedTotalOf(fixed))}` : ''}
        </button>
        <button onClick={loadDensity} data-testid="density-open"
          className="flex-1 py-2 rounded-xl text-t12 font-semibold text-gray-600 bg-gray-50">
          {density === 'loading' ? '확인 중…' : '동네 상권'}
        </button>
        <button onClick={() => setSheet('pos')} data-testid="pos-open"
          className="flex-1 py-2 rounded-xl text-t12 font-semibold text-gray-400 bg-gray-50">
          POS 연동 (예정)
        </button>
      </div>

      {sheet === 'delivery-ask' && (
        <Sheet onClose={() => setSheet(null)} testId="delivery-ask-sheet">
          <p className="text-t16 font-black text-gray-900 mb-1">배달도 하세요?</p>
          <p className="text-t12 text-gray-400 mb-4">배달을 하시면 매출 입력에 배달 몫을 함께 기록해 홀/배달 비중을 보여드려요. 한 번만 여쭤봐요.</p>
          <div className="flex gap-2">
            <button onClick={() => setDelivery('yes')} data-testid="delivery-yes"
              className="flex-1 py-3 rounded-2xl text-t14 font-bold text-white" style={{ backgroundColor: GREEN }}>
              배달해요
            </button>
            <button onClick={() => setDelivery('no')} data-testid="delivery-no"
              className="flex-1 py-3 rounded-2xl text-t14 font-bold text-gray-600 bg-gray-100">
              안 해요
            </button>
          </div>
        </Sheet>
      )}
      {sheet === 'entry' && (
        <EntrySheet initialDate={entryDate} entries={entries} deliveryOn={deliveryOn}
          onSaved={onSaved} onClose={() => setSheet(null)} showToast={showToast} />
      )}
      {sheet === 'fixed' && (
        <FixedSheet fixed={fixed} showToast={showToast}
          onSaved={() => { setSheet(null); fetchFixedCosts().then(setFixed); showToast('고정비를 저장했어요 ✓') }}
          onClose={() => setSheet(null)} />
      )}
      {sheet === 'pos' && <PosSheet onClose={() => setSheet(null)} showToast={showToast} />}
    </div>
  )
}
