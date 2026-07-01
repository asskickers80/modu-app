import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1 } from './E1Context'
import { AddressSearchModal } from '../../components/AddressSearch'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

const FLOOR_OPTS = ['B2', 'B1', '1층', '2층', '3층', '4층', '5층+']

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
  autoFilled: true,
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
      {[1, 2, 3, 4, 5].map(s => (
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

// ── 메인 ──────────────────────────────────────────────────
export default function E1Step1() {
  const navigate = useNavigate()
  const { data, update } = useE1()

  const [loadingBldg, setLoadingBldg] = useState(false)
  const [bldgDone, setBldgDone] = useState(!!data.autoFilled)
  const [tipOpen, setTipOpen] = useState(null)
  const [addrModalOpen, setAddrModalOpen] = useState(false)

  const fillDemo = () => {
    update(DEMO_DATA)
    setBldgDone(true)
    setLoadingBldg(false)
  }

  const handleAddressSelect = ({ address }) => {
    update({ address, autoFilled: false, floor: '', area: '' })
    setBldgDone(false)
    setLoadingBldg(true)
    setTimeout(() => {
      setLoadingBldg(false)
      setBldgDone(true)
      update({ floor: 'B1', area: '33', autoFilled: true })
    }, 1200)
  }

  const canNext = data.address && data.shopName && data.deposit &&
    data.monthlyRent && data.transferFee && data.transferType

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/a7/seller')} className="flex items-center gap-0.5 text-gray-400">
            <BackArrow />
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">매물 등록</h1>
          {/* 데모용 자동 채우기 */}
          <button
            onClick={fillDemo}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95"
            style={{ borderColor: NAVY, color: NAVY, backgroundColor: NAVY_BG }}
            title="데모: 예시 데이터로 한 번에 채우기"
          >
            예시 ✦
          </button>
          <span className="text-[13px] font-bold shrink-0" style={{ color: NAVY }}>1 / 5</span>
        </div>
        <ProgressBar step={1} />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">기본 팩트를 입력해요</h2>
          <p className="text-[13px] text-gray-400 mt-1">주소만 넣으면 대부분 자동으로 채워져요</p>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto px-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* ─── 주소 ─── */}
        <SectionDivider label="주소" />

        {/* 선택된 주소 표시 */}
        {data.address ? (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border mb-2"
            style={{ borderColor: NAVY, backgroundColor: NAVY_BG }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"
                fill={NAVY} />
              <circle cx="8" cy="6" r="1.5" fill="white" />
            </svg>
            <p className="flex-1 text-[14px] font-semibold text-gray-900 leading-snug">{data.address}</p>
            <button
              onClick={() => { update({ address: '', autoFilled: false, floor: '', area: '' }); setBldgDone(false) }}
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
              style={{ fontSize: '16px', lineHeight: 1 }}>×</button>
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

        {/* 건축물대장 자동 확인 피드백 */}
        {loadingBldg && (
          <div className="mt-2 flex items-center gap-2 text-[13px] text-gray-400">
            <div className="w-4 h-4 border-2 rounded-full border-t-transparent animate-spin"
              style={{ borderColor: `${NAVY} transparent ${NAVY} ${NAVY}` }} />
            건축물대장 확인 중...
          </div>
        )}
        {bldgDone && data.address && (
          <div className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: NAVY }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill={NAVY} />
              <path d="M4 7l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            건축물대장 자동 확인 완료
          </div>
        )}

        {/* ─── 가게 이름 ─── */}
        <SectionDivider label="가게 이름 (상호)" />
        <div className="border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-blue-300 transition-colors">
          <input
            type="text"
            value={data.shopName}
            onChange={e => update({ shopName: e.target.value })}
            placeholder="예) 고양이 카페 서교점"
            className="w-full text-[15px] outline-none bg-transparent"
          />
        </div>

        {/* ─── 층수 · 면적 ─── */}
        <SectionDivider label="층수 · 면적" />
        <p className="text-[12px] text-gray-400 mb-2">층수</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {FLOOR_OPTS.map(f => {
            const isSel = data.floor === f
            const isAuto = data.autoFilled && data.floor === f
            return (
              <button key={f} onClick={() => update({ floor: f })}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all"
                style={isSel
                  ? { borderColor: NAVY, backgroundColor: NAVY_BG, color: NAVY }
                  : { borderColor: '#e5e7eb', color: '#374151' }}>
                {f}
                {isAuto && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: NAVY, color: 'white' }}>자동</span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-[12px] text-gray-400 mb-2">전용 면적</p>
        <div className="relative flex items-center border border-gray-200 rounded-2xl px-4 py-3 gap-2 focus-within:border-blue-300 transition-colors">
          {data.autoFilled && data.area && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: NAVY, color: 'white' }}>자동</span>
          )}
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
