import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1p } from './E1pContext'
import PhotoGrid, { deleteStoragePhoto } from '../../components/PhotoGrid'
import EditStepTabs, { E1P_EDIT_STEPS } from '../../components/EditStepTabs'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'
const GREEN = '#22c55e'

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 3 ? TEAL : '#e5e7eb' }} />
      ))}
    </div>
  )
}

const EXTRA_DOCS = [
  { id: 'arch', label: '건축물대장', desc: '면적·구조 공식 확인' },
  { id: 'contract', label: '분양계약서', desc: '분양 상가인 경우' },
  { id: 'tax', label: '재산세 납부확인서', desc: '소유 증빙' },
]

export default function E1pStep4() {
  const navigate = useNavigate()
  const { data, update } = useE1p()
  const editQ = data.editingListingId ? `?edit=${data.editingListingId}` : '' // 단계 이동 시 수정 모드 URL 보존(edit-stability)
  const [extras, setExtras] = useState(data.extras || [])
  const [toast, setToast] = useState('')

  // 실업로드 — 도면/외관 (components/PhotoGrid 공용, E1과 공유)
  const addFloorPlan = (results) => update({ floorPlanPhotos: [...(data.floorPlanPhotos || []), ...results], floorPlanAdded: true })
  const delFloorPlan = async (photo) => {
    update({ floorPlanPhotos: (data.floorPlanPhotos || []).filter(p => p.path !== photo.path) })
    await deleteStoragePhoto(photo.path)
  }
  const addExterior = (results) => update({ exteriorPhotos: [...(data.exteriorPhotos || []), ...results] })
  const delExterior = async (photo) => {
    update({ exteriorPhotos: (data.exteriorPhotos || []).filter(p => p.path !== photo.path) })
    await deleteStoragePhoto(photo.path)
  }

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
    <>
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate(`/e1p/2${editQ}`)} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-t16 font-bold text-gray-900">상가 등록</h1>
          <span className="text-t13 font-bold" style={{ color: TEAL }}>3 / 4</span>
        </div>
        <ProgressBar />
        <EditStepTabs editId={data.editingListingId} steps={E1P_EDIT_STEPS} accent={'#1e6b6b'} />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-t20 font-bold text-gray-900">도면·서류를 보완해요</h2>
          <p className="text-t13 text-gray-400 mt-1">도면이 있으면 임차인이 조건을 더 쉽게 판단해요</p>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pb-44" style={{ scrollbarWidth: 'none' }}>

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
            <p className="text-t14 font-bold" style={{ color: TEAL }}>등기부등본 자동열람 완료 (예정)</p>
            <p className="text-t12 text-gray-500 mt-0.5">소유자·근저당·압류 정보 확인됨 · 매번 떼실 필요 없어요</p>
          </div>
        </div>

        {/* 도면 사진 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-t14 font-bold text-gray-900">도면 사진</p>
            <span className="text-t12 font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
              권장
            </span>
          </div>
          <p className="text-t12 text-gray-400 mb-3">
            평면도·배치도를 찍어서 올려주세요 (최대 5장)
          </p>
          <PhotoGrid photos={data.floorPlanPhotos || []} onAdd={addFloorPlan} onDelete={delFloorPlan}
            maxCount={5} firstLabel="대표 도면" accent="#1e6b6b" accentBg="#eef6f6" testId="floorplan-grid" />
          <p className="text-t11 text-gray-400 mt-2">
            📐 도면이 있으면 임차인이 면적·구조를 바로 확인할 수 있어요
          </p>
        </div>

        {/* 외관 사진 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-t14 font-bold text-gray-900">외관·간판 사진</p>
            <span className="text-t12 text-gray-400">최대 5장</span>
          </div>
          <p className="text-t12 text-gray-400 mb-3">건물 외관과 상가 입구를 찍어주세요</p>
          <PhotoGrid photos={data.exteriorPhotos || []} onAdd={addExterior} onDelete={delExterior}
            maxCount={5} firstLabel="대표 외관" accent="#1e6b6b" accentBg="#eef6f6" testId="exterior-grid" />
        </div>

        {/* 추가 서류 */}
        <div className="mb-6">
          <p className="text-t14 font-bold text-gray-900 mb-1">추가 서류 (예정)</p>
          <p className="text-t12 text-gray-400 mb-3">서류 첨부 기능을 준비 중이에요 — 첨부하면 신뢰도와 문의 전환율이 올라가요</p>
          <div className="flex flex-col gap-2">
            {EXTRA_DOCS.map(doc => {
              const checked = extras.includes(doc.id)
              return (
                <button key={doc.id}
                  onClick={() => { toggleExtra(doc.id); showToast('서류 첨부는 준비 중이에요 (예정)') }}
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
                    <p className="text-t13 font-bold" style={{ color: checked ? TEAL : '#374151' }}>{doc.label}</p>
                    <p className="text-t11 text-gray-400 mt-0.5">{doc.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: TEAL_BG }}>
          <p className="text-t12 text-gray-600 leading-relaxed">
            💡 등기부등본은 자동열람으로 이미 완료됐어요 (예정). 도면·사진만 추가하면 충분해요.
          </p>
        </div>

      </main>

      {toast && (
        <div style={{
          position: 'fixed', bottom: '120px',
          left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', borderRadius: '999px',
          backgroundColor: '#111827', color: '#fff',
          fontSize: '13px', fontWeight: 500,
          zIndex: 8000, pointerEvents: 'none',
          maxWidth: '320px', textAlign: 'center',
        }}>
          {toast}
        </div>
      )}

    </div>

    {/* ══ 하단 버튼 — position fixed ══ */}
    <div style={{
      position: 'fixed', bottom: 0, left: '50%',
      transform: 'translateX(-50%)',
      width: '100%', maxWidth: '390px',
      padding: '12px 20px 20px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #f0f0f0',
      zIndex: 9999,
    }}>
      <button
        type="button"
        onClick={() => navigate(`/e1p/4${editQ}`)}
        style={{
          display: 'block', width: '100%',
          padding: '18px 0',
          borderRadius: '16px',
          backgroundColor: '#111827',
          color: '#ffffff',
          fontSize: '16px', fontWeight: 700,
          border: 'none', cursor: 'pointer',
          WebkitAppearance: 'none',
        }}>
        다음 — 완성도 확인
      </button>
      <button
        type="button"
        onClick={() => navigate(`/e1p/4${editQ}`)}
        style={{
          display: 'block', width: '100%',
          padding: '8px 0', marginTop: '4px',
          fontSize: '13px', color: '#9ca3af',
          border: 'none', background: 'none', cursor: 'pointer',
        }}>
        나중에 추가하기
      </button>
    </div>
    </>
  )
}
