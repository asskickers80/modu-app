import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1p } from './E1pContext'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'
const GREEN = '#22c55e'

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 4 ? TEAL : '#e5e7eb' }} />
      ))}
    </div>
  )
}

const EXTRA_DOCS = [
  { id: 'arch', label: '건축물대장', desc: '면적·구조 공식 확인' },
  { id: 'contract', label: '분양계약서', desc: '분양 상가인 경우' },
  { id: 'tax', label: '재산세 납부확인서', desc: '소유 증빙' },
]

function PhotoSlot({ filled, color, label, onAdd }) {
  if (filled) {
    return (
      <div className="aspect-square rounded-2xl overflow-hidden relative"
        style={{ backgroundColor: color }}>
        <div className="absolute inset-0 flex items-end p-1.5">
          <span className="text-[10px] font-semibold text-white bg-black/30 px-1.5 py-0.5 rounded-full">
            도면
          </span>
        </div>
        <button className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/40 flex items-center justify-center text-white text-[10px] font-bold">
          ×
        </button>
      </div>
    )
  }
  return (
    <button onClick={onAdd}
      className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-300 active:bg-gray-50 transition-colors">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-[10px]">{label}</span>
    </button>
  )
}

export default function E1pStep4() {
  const navigate = useNavigate()
  const { data, update } = useE1p()
  const [extras, setExtras] = useState(data.extras || [])
  const [toast, setToast] = useState('')
  const [floorFilled] = useState([true, false, false])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const toggleExtra = (id) => {
    const next = extras.includes(id) ? extras.filter(x => x !== id) : [...extras, id]
    setExtras(next)
    update({ extras: next })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1p/3')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">상가 등록</h1>
          <span className="text-[13px] font-bold" style={{ color: TEAL }}>4 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">도면·서류를 보완해요</h2>
          <p className="text-[13px] text-gray-400 mt-1">도면이 있으면 임차 문의가 크게 올라가요</p>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* 등기부등본 자동열람 완료 */}
        <div className="mt-5 mb-6 flex items-center gap-3 px-4 py-3.5 rounded-2xl"
          style={{ backgroundColor: TEAL_BG, border: `1px solid ${TEAL}30` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: TEAL }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold" style={{ color: TEAL }}>등기부등본 자동열람 완료</p>
            <p className="text-[12px] text-gray-500 mt-0.5">소유자·근저당·압류 정보 확인됨 · 매번 떼실 필요 없어요</p>
          </div>
        </div>

        {/* 도면 사진 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[14px] font-bold text-gray-900">도면 사진</p>
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
              있으면 문의 ↑↑
            </span>
          </div>
          <p className="text-[12px] text-gray-400 mb-3">
            평면도·배치도를 찍어서 올려주세요 (최대 5장)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {floorFilled.map((filled, i) => (
              <PhotoSlot key={i} filled={filled}
                color={['#d0e8e8', '#c4e0e0', '#b8d8d8'][i]}
                label={i === 0 ? '대표 도면' : '추가'}
                onAdd={() => showToast('실제 앱에서 업로드할 수 있어요')} />
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            📐 도면 있음 → 임차 문의 3배 ↑ (내부 데이터)
          </p>
        </div>

        {/* 외관 사진 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[14px] font-bold text-gray-900">외관·간판 사진</p>
            <span className="text-[12px] text-gray-400">최대 5장</span>
          </div>
          <p className="text-[12px] text-gray-400 mb-3">건물 외관과 상가 입구를 찍어주세요</p>
          <div className="grid grid-cols-3 gap-2">
            {[false, false, false].map((filled, i) => (
              <PhotoSlot key={i} filled={filled} color="#d0e8e8" label="추가"
                onAdd={() => showToast('실제 앱에서 업로드할 수 있어요')} />
            ))}
          </div>
        </div>

        {/* 추가 서류 */}
        <div className="mb-6">
          <p className="text-[14px] font-bold text-gray-900 mb-1">추가 서류 (선택)</p>
          <p className="text-[12px] text-gray-400 mb-3">첨부하면 신뢰도와 문의 전환율이 올라가요</p>
          <div className="flex flex-col gap-2">
            {EXTRA_DOCS.map(doc => {
              const checked = extras.includes(doc.id)
              return (
                <button key={doc.id}
                  onClick={() => { toggleExtra(doc.id); showToast('실제 앱에서 첨부할 수 있어요') }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.99]"
                  style={{
                    borderColor: checked ? TEAL : '#e5e7eb',
                    backgroundColor: checked ? TEAL_BG : '#fff',
                  }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2"
                    style={{ borderColor: checked ? TEAL : '#d1d5db', backgroundColor: checked ? TEAL : 'transparent' }}>
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold" style={{ color: checked ? TEAL : '#374151' }}>{doc.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{doc.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: TEAL_BG }}>
          <p className="text-[12px] text-gray-600 leading-relaxed">
            💡 등기부등본은 자동열람으로 이미 완료됐어요. 도면·사진만 추가하면 충분해요.
          </p>
        </div>

      </main>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[13px] font-medium text-white shadow-lg z-50"
          style={{ backgroundColor: '#111827' }}>
          {toast}
        </div>
      )}

      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button
          onClick={() => navigate('/e1p/5')}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white transition-all active:scale-[0.99]"
          style={{ backgroundColor: '#111827' }}>
          다음 — 완성도 확인
        </button>
        <button onClick={() => navigate('/e1p/5')}
          className="w-full py-2 mt-1 text-[13px] text-gray-400">
          나중에 추가하기
        </button>
      </div>
    </div>
  )
}
