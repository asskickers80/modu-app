import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1p } from './E1pContext'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'

const FLOOR_OPTS = ['B2', 'B1', '1층', '2층', '3층', '4층', '5층+']

const MOCK_ADDR = [
  '서울 마포구 서교동 332-4',
  '서울 마포구 합정동 91-3',
  '서울 마포구 망원동 48-2 (1층)',
]

const BIZ_OPTS = [
  '카페·디저트', '음식점', '미용·뷰티', '의류·패션',
  '편의점·마트', '헬스·스포츠', '학원', '기타',
]

const DEMO_DATA_RENT = {
  listingType: 'rent',
  address: '서울 마포구 서교동 332-4',
  floor: '1층',
  area: '45',
  deposit: '5000',
  monthlyRent: '180',
  maintenance: '15',
  recommendedBiz: ['카페·디저트', '음식점'],
  salePrice: '',
  capRate: '',
  autoFilled: true,
}

const DEMO_DATA_SALE = {
  listingType: 'sale',
  address: '서울 마포구 합정동 91-3',
  floor: '2층',
  area: '60',
  deposit: '',
  monthlyRent: '',
  maintenance: '',
  recommendedBiz: [],
  salePrice: '8000',
  capRate: '5.2',
  autoFilled: true,
}

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 1 ? TEAL : '#e5e7eb' }} />
      ))}
    </div>
  )
}

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WonField({ label, value, onChange, hint }) {
  return (
    <div>
      {label && <p className="text-[13px] text-gray-500 mb-1.5">{label}</p>}
      <div className="flex items-center gap-2 border rounded-xl px-4 py-3"
        style={{ borderColor: value ? TEAL : '#e5e7eb' }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 text-[15px] font-semibold text-gray-900 outline-none bg-transparent text-right"
          placeholder="0"
          inputMode="numeric"
        />
        <span className="text-[13px] text-gray-400 shrink-0">만원</span>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function E1pStep1() {
  const navigate = useNavigate()
  const { data, update } = useE1p()

  const [query, setQuery] = useState(data.address)
  const [showDrop, setShowDrop] = useState(false)
  const [loadingBldg, setLoadingBldg] = useState(false)
  const [bldgDone, setBldgDone] = useState(!!data.autoFilled)
  const [openTip, setOpenTip] = useState(null)

  const fillDemo = (type = data.listingType ?? 'rent') => {
    const d = type === 'sale' ? DEMO_DATA_SALE : DEMO_DATA_RENT
    // 예시 채움은 연습용 — status='example'로 저장돼 마켓에 노출되지 않음 (양도인 E1과 동형)
    update({ ...d, listingType: type, isDemo: true })
    setQuery(d.address)
    setBldgDone(true)
  }

  const selectAddr = (addr) => {
    setQuery(addr)
    setShowDrop(false)
    // 실주소를 고르면 예시 표시 해제 → 정상 published 등록 (양도인 E1과 동형)
    update({ address: addr, floor: '', area: '', autoFilled: false, isDemo: false })
    setBldgDone(false)
    setLoadingBldg(true)
    setTimeout(() => {
      update({ floor: '1층', area: '45', autoFilled: true })
      setBldgDone(true)
      setLoadingBldg(false)
    }, 1500)
  }

  const isRent = data.listingType === 'rent' || data.listingType === 'both'
  const isSale = data.listingType === 'sale' || data.listingType === 'both'

  const canNext = data.listingType && data.address && data.floor && data.area &&
    (isRent ? (data.deposit && data.monthlyRent) : true) &&
    (isSale ? data.salePrice : true)

  const LISTING_TYPES = [
    { id: 'rent', label: '임대', sub: '새 임차인 모집', emoji: '🔑' },
    { id: 'sale', label: '매각', sub: '상가 자체 매매', emoji: '💰' },
    { id: 'both', label: '둘 다', sub: '임대·매각 모두', emoji: '🤝' },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/a7/landlord')} className="flex items-center gap-0.5 text-gray-400">
            <BackArrow />
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">상가 등록</h1>
          <button
            onClick={() => fillDemo()}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95"
            style={{ borderColor: TEAL, color: TEAL, backgroundColor: TEAL_BG }}
            title="데모: 예시 데이터로 한 번에 채우기">
            예시 ✦
          </button>
          <span className="text-[13px] font-bold shrink-0" style={{ color: TEAL }}>1 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">상가 정보를 입력해요</h2>
          <p className="text-[13px] text-gray-400 mt-1">주소만 넣으면 대부분 자동으로 채워져요</p>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto px-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* 임대/매각 분기 — 최상단에 */}
        <div className="mt-5 mb-6">
          <p className="text-[14px] font-bold text-gray-900 mb-3">어떤 목적으로 내놓을까요?</p>
          <div className="flex gap-2">
            {LISTING_TYPES.map(opt => {
              const sel = data.listingType === opt.id
              return (
                <button key={opt.id}
                  onClick={() => update({ listingType: opt.id })}
                  className="flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all active:scale-[0.97]"
                  style={{
                    borderColor: sel ? TEAL : '#e5e7eb',
                    backgroundColor: sel ? TEAL_BG : '#f9fafb',
                  }}>
                  <span className="text-[20px]">{opt.emoji}</span>
                  <span className="text-[14px] font-bold" style={{ color: sel ? TEAL : '#111827' }}>
                    {opt.label}
                  </span>
                  <span className="text-[10px]" style={{ color: sel ? TEAL : '#9ca3af' }}>
                    {opt.sub}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 주소 */}
        <div className="mb-5">
          <p className="text-[14px] font-bold text-gray-900 mb-3">주소</p>
          <div className="flex gap-2 mb-3">
            <button className="px-4 py-2 rounded-full text-[13px] font-bold text-white"
              style={{ backgroundColor: TEAL }}>검색</button>
            <button className="px-4 py-2 rounded-full text-[13px] font-medium border border-gray-200 text-gray-500">
              지도
            </button>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 border rounded-xl px-4 py-3"
              style={{ borderColor: data.address ? TEAL : '#e5e7eb' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" />
                <path d="M12 12l2 2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setShowDrop(e.target.value.length > 0) }}
                onFocus={() => query.length > 0 && setShowDrop(true)}
                placeholder="도로명 또는 지번 주소"
                className="flex-1 text-[14px] outline-none bg-transparent"
              />
              {query && (
                <button onClick={() => { setQuery(''); update({ address: '', autoFilled: false }); setBldgDone(false) }}
                  className="text-gray-300 text-[16px]">×</button>
              )}
            </div>
            {showDrop && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
                {MOCK_ADDR.filter(a => a.includes(query)).map(addr => (
                  <button key={addr} onClick={() => selectAddr(addr)}
                    className="w-full text-left px-4 py-3 text-[13px] text-gray-700 border-b border-gray-50 last:border-0 hover:bg-gray-50 active:bg-gray-100">
                    📍 {addr}
                  </button>
                ))}
              </div>
            )}
          </div>
          {loadingBldg && (
            <div className="mt-2 flex items-center gap-2 text-[13px]" style={{ color: TEAL }}>
              <div className="w-3.5 h-3.5 border-2 rounded-full border-t-transparent animate-spin"
                style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }} />
              건축물대장 자동 확인 중...
            </div>
          )}
          {bldgDone && !loadingBldg && (
            <div className="mt-2 flex items-center gap-1.5 text-[13px]" style={{ color: TEAL }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" fill={TEAL} />
                <path d="M4 7l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              건축물대장·등기 자동 확인 완료
            </div>
          )}
        </div>

        {/* 층수·면적 */}
        {data.address && (
          <div className="mb-5">
            <p className="text-[14px] font-bold text-gray-900 mb-3">층수 · 면적</p>
            <p className="text-[12px] text-gray-400 mb-2">층수</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {FLOOR_OPTS.map(f => {
                const sel = data.floor === f
                const auto = data.autoFilled && sel
                return (
                  <button key={f}
                    onClick={() => update({ floor: f })}
                    className="px-4 py-2 rounded-full text-[13px] font-medium border transition-all active:scale-95"
                    style={{
                      borderColor: sel ? TEAL : '#e5e7eb',
                      backgroundColor: sel ? TEAL_BG : '#f9fafb',
                      color: sel ? TEAL : '#374151',
                    }}>
                    {f}{auto ? ' 자동' : ''}
                  </button>
                )
              })}
            </div>
            <p className="text-[12px] text-gray-400 mb-1.5">전용 면적</p>
            <div className="flex items-center gap-2 border rounded-xl px-4 py-3"
              style={{ borderColor: data.area ? TEAL : '#e5e7eb' }}>
              {data.autoFilled && data.area && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                  style={{ backgroundColor: TEAL_BG, color: TEAL }}>자동</span>
              )}
              <input type="number" value={data.area}
                onChange={e => update({ area: e.target.value })}
                className="flex-1 text-[15px] font-semibold text-gray-900 outline-none bg-transparent text-right"
                placeholder="0" inputMode="numeric" />
              <span className="text-[13px] text-gray-400 shrink-0">㎡</span>
            </div>
          </div>
        )}

        {/* 임대 조건 */}
        {data.address && isRent && (
          <div className="mb-5">
            <p className="text-[14px] font-bold text-gray-900 mb-3">임대 조건</p>
            <div className="flex flex-col gap-3">
              <WonField label="보증금" value={data.deposit}
                onChange={v => update({ deposit: v })}
                hint="임차인에게 받을 보증금 금액이에요" />
              <WonField label="월세" value={data.monthlyRent}
                onChange={v => update({ monthlyRent: v })} />
              <WonField label="관리비 (선택)" value={data.maintenance}
                onChange={v => update({ maintenance: v })} />
            </div>
          </div>
        )}

        {/* 매각 조건 */}
        {data.address && isSale && (
          <div className="mb-5">
            <p className="text-[14px] font-bold text-gray-900 mb-3">매각 조건</p>
            <div className="flex flex-col gap-3">
              <WonField label="매매 희망가" value={data.salePrice}
                onChange={v => update({ salePrice: v })}
                hint="협의 가능 여부는 메모란에 적어두세요" />
              <div>
                <p className="text-[13px] text-gray-500 mb-1.5">기대 수익률 (선택)</p>
                <div className="flex items-center gap-2 border rounded-xl px-4 py-3"
                  style={{ borderColor: data.capRate ? TEAL : '#e5e7eb' }}>
                  <input type="number" value={data.capRate}
                    onChange={e => update({ capRate: e.target.value })}
                    className="flex-1 text-[15px] font-semibold text-gray-900 outline-none bg-transparent text-right"
                    placeholder="0.0" inputMode="decimal" step="0.1" />
                  <span className="text-[13px] text-gray-400 shrink-0">%</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">캡레이트: 연 임대수익 ÷ 매매가 × 100</p>
              </div>
            </div>
          </div>
        )}

        {/* 권장 업종 (임대일 때만) */}
        {data.address && isRent && (
          <div className="mb-5">
            <p className="text-[14px] font-bold text-gray-900 mb-1">선호 업종 (선택)</p>
            <p className="text-[12px] text-gray-400 mb-3">어떤 업종 임차인을 선호하시나요?</p>
            <div className="flex flex-wrap gap-2">
              {BIZ_OPTS.map(b => {
                const sel = (data.recommendedBiz || []).includes(b)
                return (
                  <button key={b}
                    onClick={() => {
                      const cur = data.recommendedBiz || []
                      update({ recommendedBiz: sel ? cur.filter(x => x !== b) : [...cur, b] })
                    }}
                    className="px-4 py-2 rounded-full text-[13px] font-medium border transition-all active:scale-95"
                    style={{
                      borderColor: sel ? TEAL : '#e5e7eb',
                      backgroundColor: sel ? TEAL_BG : '#f9fafb',
                      color: sel ? TEAL : '#374151',
                    }}>
                    {b}
                  </button>
                )
              })}
            </div>
          </div>
        )}

      </main>

      {/* 하단 버튼 */}
      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button
          disabled={!canNext}
          onClick={() => canNext && navigate('/e1p/2')}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all active:scale-[0.99]"
          style={{
            backgroundColor: canNext ? TEAL : '#e5e7eb',
            color: canNext ? '#ffffff' : '#9ca3af',
          }}>
          다음 — 모두가 초안 작성
        </button>
      </div>

    </div>
  )
}
