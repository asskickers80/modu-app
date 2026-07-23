import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1p } from './E1pContext'
import { AddressSearchModal } from '../../components/AddressSearch'
import { computeCapRate } from '../../lib/format'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'

const FLOOR_OPTS = ['B2', 'B1', '1층', '2층', '3층', '4층', '5층+']

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

function WonField({ label, value, onChange, hint, testId }) {
  return (
    <div>
      {label && <p className="text-[13px] text-gray-500 mb-1.5">{label}</p>}
      <div className="flex items-center gap-2 border rounded-xl px-4 py-3"
        style={{ borderColor: value ? TEAL : '#e5e7eb' }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          data-testid={testId}
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

  const [addrModalOpen, setAddrModalOpen] = useState(false)

  const fillDemo = (type = data.listingType ?? 'rent') => {
    const d = type === 'sale' ? DEMO_DATA_SALE : DEMO_DATA_RENT
    // 예시 채움은 연습용 — status='example'로 저장돼 마켓에 노출되지 않음 (양도인 E1과 동형)
    update({ ...d, listingType: type, isDemo: true })
  }

  // 실 주소 검색(Daum) 선택 — 양도인 E1과 동일 컴포넌트·정책. 가짜 자동채움 없음(층·면적 직접 입력).
  const handleAddressSelect = ({ address }) => {
    update({ address, isDemo: false })
    setAddrModalOpen(false)
  }

  const isRent = data.listingType === 'rent' || data.listingType === 'both'
  const isSale = data.listingType === 'sale' || data.listingType === 'both'

  // 매각·둘다: 수익률 필수 — 매매가 + (현/예상)보증금·월세 + 임차 현황(occupancy) 없이는 다음 차단
  const canNext = data.listingType && data.address && data.floor && data.area &&
    (isRent ? (data.deposit && data.monthlyRent) : true) &&
    (isSale ? (data.salePrice && data.deposit && data.monthlyRent && data.occupancy) : true)

  const yieldLabel = data.occupancy === 'vacant' ? '예상 수익률' : '수익률'
  const computedCap = computeCapRate(data.monthlyRent, data.salePrice)

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

        {/* 주소 — 실 Daum 검색(공용 AddressSearchModal, 양도인 E1과 동일) */}
        <div className="mb-5">
          <p className="text-[14px] font-bold text-gray-900 mb-3">주소</p>

          {data.address ? (
            <div className="mb-2">
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border"
                style={{ borderColor: TEAL, backgroundColor: TEAL_BG }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" fill={TEAL} />
                  <circle cx="8" cy="6" r="1.5" fill="white" />
                </svg>
                <p className="flex-1 text-[14px] font-semibold text-gray-900 leading-snug">{data.address}</p>
                <button
                  onClick={() => update({ address: '', detailAddress: '', autoFilled: false })}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400"
                  style={{ fontSize: '16px', lineHeight: 1 }}>×</button>
              </div>
              <div className="flex items-center border border-gray-200 rounded-2xl px-4 py-3 mt-2 gap-2 focus-within:border-teal-300 transition-colors">
                <input
                  type="text"
                  value={data.detailAddress}
                  onChange={e => update({ detailAddress: e.target.value })}
                  placeholder="상세주소 입력 (예: 2층 201호, B1 상가)"
                  className="flex-1 text-[15px] outline-none bg-transparent"
                />
                {data.detailAddress && (
                  <button onClick={() => update({ detailAddress: '' })}
                    className="text-gray-300 text-lg leading-none shrink-0">×</button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-gray-400 mb-2">아래 버튼으로 주소를 검색해서 선택해 주세요</p>
          )}

          <button
            type="button"
            onClick={() => setAddrModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.98]"
            style={{ borderColor: TEAL, color: TEAL, backgroundColor: data.address ? TEAL_BG : '#fff' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke={TEAL} strokeWidth="1.6" />
              <path d="M11 11l2.5 2.5" stroke={TEAL} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="text-[14px] font-bold">
              {data.address ? '주소 다시 검색' : '주소 검색 (도로명·지번)'}
            </span>
          </button>

          {/* 건축물대장 자동조회 — 실 API 연동 전이라 준비중 안내만 (가짜 자동채움 금지) */}
          {data.address && (
            <p className="mt-2 text-[12px] text-gray-400">
              🏢 건축물대장 자동조회 준비중 (미구현) — 층·면적은 아래에 직접 입력해주세요
            </p>
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
                return (
                  <button key={f}
                    onClick={() => update({ floor: f })}
                    className="px-4 py-2 rounded-full text-[13px] font-medium border transition-all active:scale-95"
                    style={{
                      borderColor: sel ? TEAL : '#e5e7eb',
                      backgroundColor: sel ? TEAL_BG : '#f9fafb',
                      color: sel ? TEAL : '#374151',
                    }}>
                    {f}
                  </button>
                )
              })}
            </div>
            <p className="text-[12px] text-gray-400 mb-1.5">전용 면적</p>
            <div className="flex items-center gap-2 border rounded-xl px-4 py-3"
              style={{ borderColor: data.area ? TEAL : '#e5e7eb' }}>
              <input type="number" value={data.area}
                onChange={e => update({ area: e.target.value })}
                className="flex-1 text-[15px] font-semibold text-gray-900 outline-none bg-transparent text-right"
                placeholder="0" inputMode="numeric" />
              <span className="text-[13px] text-gray-400 shrink-0">㎡</span>
            </div>
          </div>
        )}

        {/* 임차 현황 — 매각·둘다는 수익률 기준(현/예상) 결정, 임대 단독은 공실 여부(선택) */}
        {data.address && data.listingType && (
          <div className="mb-5">
            <p className="text-[14px] font-bold text-gray-900 mb-1">
              현재 임차인이 있나요?{isSale && <span style={{ color: TEAL }}> *</span>}
            </p>
            <p className="text-[12px] text-gray-400 mb-3">
              {isSale ? '수익률을 실계약/예상 중 무엇으로 보여줄지 정해요' : '공실 여부만 확인해요 (선택)'}
            </p>
            <div className="flex gap-2">
              {[{ id: 'occupied', label: '있어요', sub: '현 계약 기준' }, { id: 'vacant', label: '공실이에요', sub: '예상(시세) 기준' }].map(o => {
                const sel = data.occupancy === o.id
                return (
                  <button key={o.id} data-testid={`occ-${o.id}`}
                    onClick={() => update({ occupancy: o.id })}
                    className="flex-1 py-3 rounded-2xl border-2 flex flex-col items-center gap-0.5 transition-all active:scale-[0.97]"
                    style={{ borderColor: sel ? TEAL : '#e5e7eb', backgroundColor: sel ? TEAL_BG : '#f9fafb' }}>
                    <span className="text-[14px] font-bold" style={{ color: sel ? TEAL : '#111827' }}>{o.label}</span>
                    <span className="text-[10px]" style={{ color: sel ? TEAL : '#9ca3af' }}>{o.sub}</span>
                  </button>
                )
              })}
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
              <WonField label="매매 희망가" value={data.salePrice} testId="sale-price"
                onChange={v => update({ salePrice: v })}
                hint="협의 가능 여부는 메모란에 적어두세요" />
              {/* 매각 단독이면 수익률 기준 보증금·월세를 여기서 (둘다는 위 임대 조건에서 수집) */}
              {!isRent && (
                <>
                  <WonField label={data.occupancy === 'vacant' ? '예상 보증금' : '현 보증금'} testId="sale-deposit"
                    value={data.deposit} onChange={v => update({ deposit: v })} />
                  <WonField label={data.occupancy === 'vacant' ? '예상 월세' : '현 월세'} testId="sale-rent"
                    value={data.monthlyRent} onChange={v => update({ monthlyRent: v })} />
                </>
              )}
              {/* 수익률 자동 계산 — 실계약 '수익률' / 공실 '예상 수익률' (매수자 오인 금지) */}
              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: TEAL_BG, border: `1px solid ${TEAL}25` }}>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold" style={{ color: TEAL }} data-testid="yield-label">{yieldLabel}</p>
                  <p className="text-[16px] font-black" data-testid="yield-value" style={{ color: TEAL }}>
                    {computedCap != null ? `${computedCap}%` : '—'}
                  </p>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  연 월세 ÷ 매매가 × 100 · {data.occupancy === 'vacant' ? '예상(시세) 기준' : '현 계약 기준'}
                </p>
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

      {/* 주소 검색 바텀시트 — 양도인 E1과 동일 공용 컴포넌트 */}
      {addrModalOpen && (
        <AddressSearchModal
          onSelect={handleAddressSelect}
          onClose={() => setAddrModalOpen(false)}
        />
      )}

    </div>
  )
}
