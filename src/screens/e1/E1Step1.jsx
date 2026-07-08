import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1 } from './E1Context'
import { AddressSearchModal } from '../../components/AddressSearch'
import { supabase } from '../../lib/supabase'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'


const BIZ_TYPE_OPTS = [
  '카페·디저트', '치킨·피자', '한식',
  '분식·떡볶이', '중식·일식·양식', '주점·바',
  '미용·뷰티', '헬스·스포츠', '교육·학원',
  '편의점·마트', '의류·패션', '기타',
]

const TRANSFER_OPTS = [
  { id: 'bare', label: '바닥권리', sub: '자리·시설만', tip: '인테리어·집기 등 시설만 넘기는 방식. 영업권(단골·매출)은 포함 안 돼요.' },
  { id: 'full', label: '영업양도', sub: '권리금', tip: '시설 + 영업권(단골·매출 등)까지 통째로 넘기는 방식. 권리금이 붙어요.' },
  { id: 'undecided', label: '아직 고민 중', sub: '나중에 결정', tip: '지금 안 정해도 돼요. 나중에 수정할 수 있어요.' },
]

const DEMO_DATA = {
  address: '서울 마포구 서교동 332-4',
  shopName: '서교동 고양이 카페',
  floor: 'B1',
  area: '33',
  deposit: '3000',
  monthlyRent: '200',
  maintenance: '10',
  transferFee: '3000',
  transferType: 'full',
  monthlySales: '2800',
  bizType: '카페·디저트',
  isFranchise: false,
}

// ── 공통 서브 컴포넌트 ──────────────────────────────────────
function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ProgressBar({ step }) {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full transition-all"
          style={{ backgroundColor: s <= step ? NAVY : '#e5e7eb' }} />
      ))}
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div className="mt-7 mb-4">
      <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">{label}</p>
    </div>
  )
}

function WonField({ label, value, onChange, placeholder = '0', hint }) {
  return (
    <div>
      {label && <p className="text-[13px] text-gray-500 mb-1.5">{label}</p>}
      <div className="flex items-center border border-gray-200 rounded-2xl px-4 py-3 gap-2 focus-within:border-blue-300 transition-colors">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-[15px] text-right outline-none bg-transparent min-w-0"
        />
        <span className="text-[13px] text-gray-400 shrink-0">만원</span>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// ── 프랜차이즈 브랜드 자동완성 ────────────────────────────
function FranchiseBrandSearch({ value, selectedId, onSelect, onClear }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [noResult, setNoResult] = useState(false)
  // null=확인중 / false=데이터 미준비 / true=사용 가능
  const [dataReady, setDataReady] = useState(null)

  useEffect(() => {
    supabase
      .from('franchise_brands')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setDataReady((count ?? 0) > 0))
  }, [])

  useEffect(() => {
    if (!dataReady || selectedId) return
    if (!query) { setResults([]); setNoResult(false); return }
    setNoResult(false)
    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('franchise_brands')
        .select('id, brand_name, biz_type')
        .ilike('brand_name', `%${query}%`)
        .limit(10)
      setResults(data || [])
      setNoResult((data || []).length === 0)
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, selectedId, dataReady])

  if (selectedId) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border"
        style={{ borderColor: NAVY, backgroundColor: NAVY_BG }}>
        <span className="flex-1 text-[14px] font-semibold" style={{ color: NAVY }}>{value}</span>
        <button onClick={onClear} className="text-gray-400 text-lg leading-none shrink-0">×</button>
      </div>
    )
  }

  // 테이블에 데이터가 없는 동안 — 빈 검색창으로 혼란 주지 않기
  if (dataReady === false) {
    return (
      <div className="px-4 py-3.5 rounded-2xl" style={{ backgroundColor: '#f3f4f6' }}>
        <p className="text-[13px] font-medium text-gray-500">브랜드 데이터 준비중</p>
        <p className="text-[12px] text-gray-400 mt-0.5">
          공정위 가맹사업 브랜드 목록을 불러오는 중이에요. 잠시 후 다시 시도해 주세요.
        </p>
      </div>
    )
  }

  // dataReady === null: count 확인중 — 아무것도 표시하지 않음
  if (dataReady === null) return null

  return (
    <div>
      <div className="flex items-center border border-gray-200 rounded-2xl px-4 py-3 gap-2 focus-within:border-blue-300 transition-colors">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.6" />
          <path d="M11 11l2.5 2.5" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setNoResult(false) }}
          placeholder="브랜드명 검색 (예: 메가커피, 빽다방)"
          className="flex-1 text-[15px] outline-none bg-transparent"
        />
        {searching && <span className="text-[12px] text-gray-400 shrink-0">검색중...</span>}
      </div>
      {results.length > 0 && (
        <div className="mt-1 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {results.map(b => (
            <button
              key={b.id}
              onClick={() => { onSelect(b.id, b.brand_name, b.biz_type); setQuery(b.brand_name); setResults([]) }}
              className="w-full px-4 py-3 text-left border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors"
            >
              <span className="text-[14px] font-medium text-gray-900">{b.brand_name}</span>
              {b.biz_type && <span className="ml-2 text-[12px] text-gray-400">{b.biz_type}</span>}
            </button>
          ))}
        </div>
      )}
      {noResult && query.length > 0 && (
        <div className="mt-2 px-4 py-3 rounded-2xl" style={{ backgroundColor: '#fef9ec' }}>
          <p className="text-[12px] text-amber-700 leading-relaxed">
            정보공개서 등록 브랜드가 아닙니다. 공정거래위원회에 정보공개서를 등록한
            브랜드만 선택할 수 있어요.
          </p>
        </div>
      )}
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────
export default function E1Step1() {
  const navigate = useNavigate()
  const { data, update, editError } = useE1()

  const [tipOpen, setTipOpen] = useState(null)
  const [addrModalOpen, setAddrModalOpen] = useState(false)

  const FLOOR_PRESETS = ['B3', 'B2', 'B1', ...Array.from({ length: 20 }, (_, i) => `${i + 1}층`)]
  const [customFloor, setCustomFloor] = useState(() => {
    const f = data.floor ?? ''
    return f !== '' && f !== '__custom__' && !['B3', 'B2', 'B1', ...Array.from({ length: 20 }, (_, i) => `${i + 1}층`)].includes(f)
  })

  // 예시 채움은 연습용 — status='example'로 저장돼 마켓에 노출되지 않음
  const fillDemo = () => update({ ...DEMO_DATA, isDemo: true })

  // 건축물대장 자동조회는 준비중 — 주소만 반영, 층·면적은 직접 입력
  // (주소·상호를 실값으로 바꾸면 예시 표시 해제 → 정상 published 등록)
  const handleAddressSelect = ({ address }) => {
    update({ address, autoFilled: false, isDemo: false })
  }

  // 상호 자동 생성: 동 + 업종 + 면적 조합
  const autoGenShopName = () => {
    const dong = data.address?.match(/(\S+동)/)?.[1] || ''
    const biz = data.bizType || ''
    const area = data.area ? `${data.area}㎡` : ''
    const parts = [dong, biz, area].filter(Boolean)
    if (!parts.length) return
    update({ shopName: parts.join(' '), isDemo: false })
  }

  // 업종: 직접 칩 선택 또는 프랜차이즈 브랜드 선택으로 자동 채움
  // 수정 모드(기존 매물)는 biz_type 컬럼이 없을 수 있으므로 필수에서 제외
  const bizTypeOk = !!data.bizType || !!data.editingListingId || (data.isFranchise === true && !!data.franchiseBrandId)
  const canNext = data.address && data.shopName && bizTypeOk &&
    data.deposit && data.monthlyRent && data.transferFee && data.transferType &&
    data.isFranchise !== null &&
    (data.isFranchise === false || (data.isFranchise === true && data.franchiseBrandId))

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/a7/seller')} className="flex items-center gap-0.5 text-gray-400">
            <BackArrow />
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">
            {data.editingListingId ? '매물 수정' : '매물 등록'}
          </h1>
          {/* 데모용 자동 채우기 */}
          <button
            onClick={fillDemo}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95"
            style={{ borderColor: NAVY, color: NAVY, backgroundColor: NAVY_BG }}
            title="데모: 예시 데이터로 한 번에 채우기"
          >
            예시 ✦
          </button>
          <span className="text-[13px] font-bold shrink-0" style={{ color: NAVY }}>1 / 4</span>
        </div>
        <ProgressBar step={1} />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">기본 팩트를 입력해요</h2>
          <p className="text-[13px] text-gray-400 mt-1">확인된 사실만 적으면 AI가 소개글을 만들어드려요</p>
        </div>
        {editError && (
          <div className="mx-5 mt-3 px-4 py-3 rounded-xl" style={{ backgroundColor: '#fef2f2' }}>
            <p className="text-[12px] font-medium" style={{ color: '#dc2626' }}>
              매물을 불러올 수 없어요 — 새 매물 등록으로 시작해요
            </p>
          </div>
        )}
      </div>

      {/* 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto px-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* ─── 주소 ─── */}
        <SectionDivider label="주소" />

        {/* 선택된 주소 표시 */}
        {data.address ? (
          <div className="mb-2">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border"
              style={{ borderColor: NAVY, backgroundColor: NAVY_BG }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"
                  fill={NAVY} />
                <circle cx="8" cy="6" r="1.5" fill="white" />
              </svg>
              <p className="flex-1 text-[14px] font-semibold text-gray-900 leading-snug">{data.address}</p>
              <button
                onClick={() => update({ address: '', detailAddress: '', autoFilled: false })}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400"
                style={{ fontSize: '16px', lineHeight: 1 }}>×</button>
            </div>
            {/* 상세주소 입력 */}
            <div className="flex items-center border border-gray-200 rounded-2xl px-4 py-3 mt-2 gap-2 focus-within:border-blue-300 transition-colors">
              <input
                type="text"
                value={data.detailAddress}
                onChange={e => update({ detailAddress: e.target.value })}
                placeholder="상세주소 입력 (예: 2층 201호, B1 카페)"
                className="flex-1 text-[15px] outline-none bg-transparent"
                autoFocus
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

        {/* 주소 검색 버튼 — 바텀시트 임베드 */}
        <button
          type="button"
          onClick={() => setAddrModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.98]"
          style={{ borderColor: NAVY, color: NAVY, backgroundColor: data.address ? NAVY_BG : '#fff' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke={NAVY} strokeWidth="1.6" />
            <path d="M11 11l2.5 2.5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="text-[14px] font-bold">
            {data.address ? '주소 다시 검색' : '주소 검색 (도로명·지번)'}
          </span>
        </button>

        {/* 건축물대장 자동조회 — 실 API 연동 전이라 준비중 안내만 (가짜 자동채움 금지) */}
        {data.address && (
          <p className="mt-2 text-[12px] text-gray-400">
            🏢 건축물대장 자동조회 준비중 — 층·면적은 아래에 직접 입력해주세요
          </p>
        )}

        {/* ─── 가게 이름 ─── */}
        <SectionDivider label="가게 이름 (상호)" />
        <div className="border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-blue-300 transition-colors">
          <input
            type="text"
            value={data.shopName}
            onChange={e => update({ shopName: e.target.value, isDemo: false })}
            placeholder="예) 고양이 카페 서교점"
            className="w-full text-[15px] outline-none bg-transparent"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-500">공개 여부</span>
            {[{ v: true, label: '공개' }, { v: false, label: '비공개' }].map(({ v, label }) => {
              const sel = (data.shopNamePublic ?? true) === v
              return (
                <button key={label} onClick={() => update({ shopNamePublic: v })}
                  className="px-3 py-1 rounded-full text-[12px] font-medium border transition-all"
                  style={sel
                    ? { borderColor: NAVY, backgroundColor: NAVY_BG, color: NAVY }
                    : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                  {label}
                </button>
              )
            })}
          </div>
          <button onClick={autoGenShopName}
            className="text-[12px] text-blue-500 underline active:opacity-70">
            자동 생성
          </button>
        </div>
        {!(data.shopNamePublic ?? true) && (
          <p className="text-[12px] text-gray-400 mt-1">
            탐색 카드에 {data.isFranchise ? '브랜드명' : '업종'} + 지역으로 표시됩니다
          </p>
        )}

        {/* ─── 업종 ─── */}
        <SectionDivider label="업종" />
        <div className="flex flex-wrap gap-2">
          {BIZ_TYPE_OPTS.map(opt => {
            const sel = data.bizType === opt
            return (
              <button key={opt} onClick={() => update({ bizType: opt })}
                className="px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all"
                style={sel
                  ? { borderColor: NAVY, backgroundColor: NAVY_BG, color: NAVY }
                  : { borderColor: '#e5e7eb', color: '#374151' }}>
                {opt}
              </button>
            )
          })}
        </div>
        {data.isFranchise === true && data.franchiseBrandId && data.bizType && (
          <p className="mt-2 text-[12px] text-gray-400">
            브랜드 업종으로 자동 선택됐어요
          </p>
        )}

        {/* ─── 프랜차이즈 여부 ─── */}
        <SectionDivider label="프랜차이즈" />
        <p className="text-[13px] text-gray-600 mb-3">이 가게가 프랜차이즈 브랜드인가요?</p>
        <div className="flex gap-2 mb-4">
          {[{ id: true, label: '예' }, { id: false, label: '아니오' }].map(opt => {
            const sel = data.isFranchise === opt.id
            return (
              <button
                key={String(opt.id)}
                onClick={() => update({ isFranchise: opt.id, franchiseBrandId: null, franchiseBrandName: '', bizType: '' })}
                className="flex-1 py-3.5 rounded-2xl border-2 text-[14px] font-bold transition-all active:scale-[0.98]"
                style={{
                  borderColor: sel ? NAVY : '#e5e7eb',
                  backgroundColor: sel ? NAVY_BG : '#fff',
                  color: sel ? NAVY : '#374151',
                }}>
                {opt.label}
              </button>
            )
          })}
        </div>
        {data.isFranchise === true && (
          <FranchiseBrandSearch
            value={data.franchiseBrandName}
            selectedId={data.franchiseBrandId}
            onSelect={(id, name, bizType) => update({
              franchiseBrandId: id,
              franchiseBrandName: name,
              bizType: bizType || data.bizType,
            })}
            onClear={() => update({ franchiseBrandId: null, franchiseBrandName: '', bizType: '' })}
          />
        )}

        {/* ─── 층수 · 면적 ─── */}
        <SectionDivider label="층수 · 면적" />
        <p className="text-[12px] text-gray-400 mb-2">층수</p>
        <div className="relative mb-2">
          <select
            value={customFloor ? '__custom__' : (data.floor || '__placeholder__')}
            onChange={e => {
              const val = e.target.value
              if (val === '__custom__') {
                setCustomFloor(true)
                update({ floor: '' })
              } else if (val !== '__placeholder__') {
                setCustomFloor(false)
                update({ floor: val })
              }
            }}
            className="w-full appearance-none border border-gray-200 rounded-2xl px-4 py-3 text-[15px] bg-white outline-none transition-colors"
            style={(data.floor && !customFloor) ? { color: NAVY, fontWeight: 600, borderColor: `${NAVY}60` } : { color: '#9ca3af' }}>
            <option value="__placeholder__" disabled hidden>층수 선택</option>
            <option value="B3">B3층 (지하 3)</option>
            <option value="B2">B2층 (지하 2)</option>
            <option value="B1">B1층 (지하 1)</option>
            {FLOOR_PRESETS.filter(f => !['B3','B2','B1'].includes(f)).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
            <option value="__custom__">직접입력</option>
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]">▼</span>
        </div>
        {customFloor && (
          <div className="flex items-center gap-2 border rounded-2xl px-4 py-3 mb-2 transition-all"
            style={{ borderColor: `${NAVY}60` }}>
            <input
              type="text"
              value={data.floor}
              onChange={e => update({ floor: e.target.value })}
              placeholder="예: 옥탑, 21층, B4층"
              autoFocus
              className="flex-1 text-[15px] outline-none bg-transparent"
              style={{ color: NAVY }}
            />
          </div>
        )}
        <div className="mb-2" />
        <p className="text-[12px] text-gray-400 mb-2">전용 면적</p>
        <div className="relative flex items-center border border-gray-200 rounded-2xl px-4 py-3 gap-2 focus-within:border-blue-300 transition-colors">
          <input
            type="number"
            inputMode="numeric"
            value={data.area}
            onChange={e => update({ area: e.target.value })}
            placeholder="면적 입력"
            className="flex-1 text-[15px] text-right outline-none bg-transparent"
          />
          <span className="text-[13px] text-gray-400 shrink-0">㎡</span>
        </div>

        {/* ─── 임대 조건 ─── */}
        <SectionDivider label="임대 조건" />
        <div className="flex flex-col gap-3">
          <WonField label="보증금" value={data.deposit} onChange={v => update({ deposit: v })} placeholder="3,000" />
          <WonField label="월세" value={data.monthlyRent} onChange={v => update({ monthlyRent: v })} placeholder="200" />
          <WonField label="관리비 (없으면 0)" value={data.maintenance} onChange={v => update({ maintenance: v })} placeholder="10" />
        </div>

        {/* ─── 양도 조건 ─── */}
        <SectionDivider label="양도 조건" />
        <WonField label="희망 권리금" value={data.transferFee} onChange={v => update({ transferFee: v })} placeholder="3,000"
          hint="시설 잔존가치 + 영업권을 합산한 희망 금액이에요" />

        <p className="text-[13px] text-gray-500 mt-5 mb-2.5 font-medium">양도 방식</p>
        <div className="flex flex-col gap-2">
          {TRANSFER_OPTS.map(opt => {
            const sel = data.transferType === opt.id
            return (
              <div key={opt.id}>
                <div
                  role="button"
                  onClick={() => update({ transferType: opt.id })}
                  className="w-full rounded-2xl border-2 px-4 py-3.5 flex items-center justify-between cursor-pointer select-none transition-all active:scale-[0.99]"
                  style={{
                    borderColor: sel ? NAVY : '#e5e7eb',
                    backgroundColor: sel ? NAVY_BG : '#fff',
                  }}>
                  <div>
                    <span className="text-[14px] font-bold" style={{ color: sel ? NAVY : '#111827' }}>
                      {opt.label}
                    </span>
                    <span className="ml-2 text-[12px]" style={{ color: sel ? NAVY : '#9ca3af' }}>
                      {opt.sub}
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setTipOpen(tipOpen === opt.id ? null : opt.id) }}
                    className="w-7 h-7 rounded-full border flex items-center justify-center text-[13px] transition-all shrink-0 ml-2"
                    style={{
                      borderColor: tipOpen === opt.id ? NAVY : '#d1d5db',
                      color: tipOpen === opt.id ? NAVY : '#9ca3af',
                      backgroundColor: tipOpen === opt.id ? NAVY_BG : 'transparent',
                    }}>
                    ⓘ
                  </button>
                </div>
                {tipOpen === opt.id && (
                  <div className="mt-1.5 px-3 py-2.5 rounded-xl text-[12px] text-gray-600 leading-relaxed"
                    style={{ backgroundColor: '#f0f4fb' }}>
                    {opt.tip}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 영업양도 선택 시 월매출 입력 */}
        {data.transferType === 'full' && (
          <div className="mt-4">
            <WonField
              label="월 평균 매출"
              value={data.monthlySales}
              onChange={v => update({ monthlySales: v })}
              placeholder="2,800"
            />
            <div className="mt-2.5 px-3.5 py-3 rounded-2xl flex items-start gap-2"
              style={{ backgroundColor: NAVY_BG }}>
              <span className="text-[16px] shrink-0">💡</span>
              <p className="text-[12px] text-gray-600 leading-relaxed">
                매출 정보를 연동하면 진지한 양수자가 먼저 연락해와요.<br />
                다음 단계에서 <strong>공개 여부</strong>를 직접 선택할 수 있어요.
              </p>
            </div>
          </div>
        )}


      </main>

      {/* 하단 버튼 */}
      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button
          disabled={!canNext}
          onClick={() => canNext && navigate('/e1/2')}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all"
          style={{
            backgroundColor: canNext ? '#111827' : '#e5e7eb',
            color: canNext ? '#fff' : '#9ca3af',
          }}>
          다음 — AI 초안 생성
        </button>
      </div>

      {/* 주소 검색 바텀시트 */}
      {addrModalOpen && (
        <AddressSearchModal
          onSelect={(result) => { handleAddressSelect(result); setAddrModalOpen(false) }}
          onClose={() => setAddrModalOpen(false)}
        />
      )}

    </div>
  )
}
