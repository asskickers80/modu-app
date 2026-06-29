import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1 } from './E1Context'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const GREEN = '#22c55e'

function ProgressBar({ step }) {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= step ? NAVY : '#e5e7eb' }} />
      ))}
    </div>
  )
}

const CAFE_FACILITIES = [
  '에스프레소 머신', '그라인더', '냉장 쇼케이스', '냉동고',
  '카운터·POS 기기', '의자·테이블 세트', '조명·인테리어 집기',
  '냉난방기 (에어컨/히터)', '음악·음향 장비', '주방 싱크대',
]

const PROOF_OPTS = [
  { id: 'pos', label: 'POS·카드단말기 연동', icon: '💳', desc: '실시간 매출 데이터 자동 동기화' },
  { id: 'card', label: '카드사 매출 확인서', icon: '📄', desc: '발급 후 업로드 (PDF·이미지)' },
  { id: 'tax', label: '세금계산서·영수증', icon: '🧾', desc: '3개월 치 업로드 추천' },
]

// 가짜 내부 사진 (더미 색 블록)
const DUMMY_INTERIOR = ['#d4e4ff', '#c8d9f5']
const DUMMY_EXTERIOR = ['#e8f0ff']

function PhotoSlot({ filled, color, label, onAdd, onDelete, onTap }) {
  if (filled) {
    return (
      <button
        onClick={onTap}
        className="aspect-square rounded-2xl overflow-hidden relative active:opacity-80 transition-opacity"
        style={{ backgroundColor: color }}>
        <div className="absolute inset-0 flex items-end p-1.5">
          <span className="text-[10px] font-semibold text-white bg-black/30 px-1.5 py-0.5 rounded-full">
            사진
          </span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/40 flex items-center justify-center text-white text-[10px] font-bold active:scale-90 transition-transform">
          ×
        </button>
      </button>
    )
  }
  return (
    <button onClick={onAdd}
      className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-300 hover:border-gray-300 transition-colors active:bg-gray-50">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-[10px]">{label}</span>
    </button>
  )
}

export default function E1Step4() {
  const navigate = useNavigate()
  const { data, update } = useE1()

  const [facilities, setFacilities] = useState(data.facilities || [])
  const [salesProof, setSalesProof] = useState(data.salesProof || false)
  const [selectedProof, setSelectedProof] = useState(null)
  const [toast, setToast] = useState('')

  // 더미 사진 슬롯 상태
  const [interiorFilled, setInteriorFilled] = useState([true, true, false, false, false, false])
  const [exteriorFilled, setExteriorFilled] = useState([true, false, false])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const toggleFacility = (f) => {
    const next = facilities.includes(f) ? facilities.filter(x => x !== f) : [...facilities, f]
    setFacilities(next)
    update({ facilities: next })
  }

  const handleProofToggle = (v) => {
    setSalesProof(v)
    update({ salesProof: v })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1/3')} className="flex items-center gap-0.5 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">매물 등록</h1>
          <span className="text-[13px] font-bold" style={{ color: NAVY }}>4 / 5</span>
        </div>
        <ProgressBar step={4} />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">사진·증빙을 보완해요</h2>
          <p className="text-[13px] text-gray-400 mt-1">사진이 많을수록 노출 순위와 문의 수가 올라가요</p>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto px-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* ─── 내부 사진 ─── */}
        <div className="mt-6 mb-1 flex items-center justify-between">
          <p className="text-[14px] font-bold text-gray-900">내부 사진</p>
          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
            추천 3장 이상 ↑↑
          </span>
        </div>
        <p className="text-[12px] text-gray-400 mb-3">카운터·홀·주방을 골고루 찍어주세요 (최대 10장)</p>
        <div className="grid grid-cols-3 gap-2">
          {interiorFilled.map((filled, i) => (
            <PhotoSlot
              key={i}
              filled={filled}
              color={DUMMY_INTERIOR[i] || '#e5e7eb'}
              label={i === 0 ? '대표 사진' : '추가'}
              onAdd={() => showToast('실제 앱에서 업로드할 수 있어요')}
              onTap={() => showToast('실제 앱에서 사진을 변경할 수 있어요')}
              onDelete={() => {
                const next = [...interiorFilled]
                next[i] = false
                setInteriorFilled(next)
              }}
            />
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          ⭐ 내부 사진 3장 이상 → 검색 노출 순위 ↑↑
        </p>

        {/* ─── 외부 사진 ─── */}
        <div className="mt-6 mb-1 flex items-center justify-between">
          <p className="text-[14px] font-bold text-gray-900">외부·간판 사진</p>
          <span className="text-[12px] text-gray-400">최대 5장</span>
        </div>
        <p className="text-[12px] text-gray-400 mb-3">건물 외관·간판·입구가 잘 보이게 찍어주세요</p>
        <div className="grid grid-cols-3 gap-2">
          {exteriorFilled.map((filled, i) => (
            <PhotoSlot
              key={i}
              filled={filled}
              color={DUMMY_EXTERIOR[i] || '#e5e7eb'}
              label="추가"
              onAdd={() => showToast('실제 앱에서 업로드할 수 있어요')}
              onTap={() => showToast('실제 앱에서 사진을 변경할 수 있어요')}
              onDelete={() => {
                const next = [...exteriorFilled]
                next[i] = false
                setExteriorFilled(next)
              }}
            />
          ))}
        </div>

        {/* ─── 매출 증빙 ─── */}
        <div className="mt-7">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-[14px] font-bold text-gray-900">매출 증빙 연동</p>
              <p className="text-[12px] text-gray-400 mt-0.5">선택 · 연동하면 신뢰도가 크게 올라가요</p>
            </div>
            {/* 토글 */}
            <button
              onClick={() => handleProofToggle(!salesProof)}
              className="w-12 h-6 rounded-full transition-all duration-300 relative shrink-0"
              style={{ backgroundColor: salesProof ? NAVY : '#d1d5db' }}>
              <div className="absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-300 shadow"
                style={{ left: salesProof ? '26px' : '2px' }} />
            </button>
          </div>

          {salesProof && (
            <div className="mt-3 flex flex-col gap-2">
              {PROOF_OPTS.map(opt => {
                const sel = selectedProof === opt.id
                return (
                  <button key={opt.id}
                    onClick={() => { setSelectedProof(sel ? null : opt.id); showToast('실제 앱에서 연동할 수 있어요') }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.99]"
                    style={{
                      borderColor: sel ? NAVY : '#e5e7eb',
                      backgroundColor: sel ? NAVY_BG : '#fff',
                    }}>
                    <span className="text-[22px] shrink-0">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold" style={{ color: sel ? NAVY : '#374151' }}>{opt.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                    {sel && (
                      <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: NAVY }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
              <div className="px-3 py-2.5 rounded-2xl mt-1" style={{ backgroundColor: NAVY_BG }}>
                <p className="text-[12px] text-gray-600 leading-relaxed">
                  💡 매출 증빙 연동 → 신뢰도 뱃지 + 진지한 양수자 우선 노출
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── 시설·집기 목록 ─── */}
        <div className="mt-7">
          <p className="text-[14px] font-bold text-gray-900 mb-1">시설·집기 목록</p>
          <p className="text-[12px] text-gray-400 mb-3">포함된 항목을 체크해 주세요</p>
          <div className="flex flex-wrap gap-2">
            {CAFE_FACILITIES.map(f => {
              const checked = facilities.includes(f)
              return (
                <button key={f}
                  onClick={() => toggleFacility(f)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all active:scale-[0.97]"
                  style={{
                    borderColor: checked ? GREEN : '#e5e7eb',
                    backgroundColor: checked ? '#dcfce7' : '#fff',
                    color: checked ? '#16a34a' : '#374151',
                  }}>
                  {checked && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {f}
                </button>
              )
            })}
          </div>
          {facilities.length > 0 && (
            <p className="mt-2 text-[12px]" style={{ color: GREEN }}>
              {facilities.length}개 선택됨
            </p>
          )}
        </div>

      </main>

      {/* 토스트 — 하단 버튼 영역(약 120px) 위에 표시되도록 bottom-36(144px) 사용 */}
      {toast && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[13px] font-medium text-white shadow-lg z-50 max-w-[320px] text-center pointer-events-none"
          style={{ backgroundColor: '#111827' }}>
          {toast}
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button
          onClick={() => navigate('/e1/5')}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white"
          style={{ backgroundColor: '#111827' }}>
          다음 — 완성도 확인
        </button>
        <button
          onClick={() => navigate('/e1/5')}
          className="w-full py-2 mt-1 text-[13px] text-gray-400">
          나중에 추가하기
        </button>
      </div>

    </div>
  )
}
