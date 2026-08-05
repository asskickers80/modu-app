import { useState } from 'react'
import { generateLandlordFacilityBlock } from '../../lib/gemini'
import MultiChips from '../../components/MultiChips'
import IndustryPicker from '../../components/IndustryPicker'
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

// 시설 현황 칩 (e1p-facility 초안 — 대표 조정 대상)
const REMAINING_OPTIONS = ['주방 설비', '냉난방기', '인테리어(마감·조명)', '테이블·의자', '간판', '카운터·POS 자리', '덕트·후드', '화장실 내부']
const BUILDING_OPTIONS = ['엘리베이터', '주차장', '화장실 전용', '화장실 공용', '냉난방 중앙공급', '전기 승압 가능', '가스 인입', '정화조 여유', '급배수']

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
  const [facilityGen, setFacilityGen] = useState(false) // 시설 블록 단건 생성 중 (e1p-facility)

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

        {/* 시설 현황 (e1p-facility) — interior_state: 물리 상태. occupancy(임차 계약)와 별개 */}
        <div className="mb-6" data-testid="facility-state">
          <p className="text-t14 font-bold text-gray-900 mb-1">내부 상태</p>
          <p className="text-t12 text-gray-400 mb-2">지금 상가 내부가 어떤 상태인가요? 소개글에 반영돼요</p>
          <div className="flex gap-2">
            {[['empty', '공실이에요'], ['equipped', '설비·집기가 남아 있어요']].map(([v, label]) => {
              const on = data.interiorState === v
              return (
                <button key={v} type="button"
                  data-testid={`interior-state-${v}`}
                  onClick={() => update({ interiorState: on ? null : v })}
                  className="flex-1 py-3 rounded-2xl text-t13 font-semibold border transition-all active:scale-[0.98]"
                  style={on
                    ? { borderColor: TEAL, backgroundColor: TEAL_BG, color: TEAL, fontWeight: 700 }
                    : { borderColor: '#e5e7eb', backgroundColor: 'white', color: '#4b5563' }}>
                  {label}
                </button>
              )
            })}
          </div>

          {data.interiorState === 'equipped' && (
            <>
              <MultiChips label="남아 있는 설비" hint="있는 것만 골라주세요 — 초기 투자 절감 포인트로 소개돼요"
                options={REMAINING_OPTIONS} values={data.remainingFacilities ?? []}
                onChange={v => update({ remainingFacilities: v })}
                accent={TEAL} accentBg={TEAL_BG} testPrefix="remaining" allowCustom />
              <div className="mt-4">
                <p className="text-t14 font-bold text-gray-900">이전 업종 <span className="text-t12 font-normal text-gray-400">(선택)</span></p>
                <p className="text-t12 text-gray-400 mt-0.5 mb-2">알면 "이전 카페 자리"처럼 소개할 수 있어요</p>
                {data.prevBiz ? (
                  <button type="button" data-testid="prev-biz-selected"
                    onClick={() => update({ prevBiz: '' })}
                    className="px-3 py-2 rounded-full text-t13 font-bold border"
                    style={{ borderColor: TEAL, backgroundColor: TEAL_BG, color: TEAL }}>
                    {data.prevBiz} ×
                  </button>
                ) : (
                  <IndustryPicker
                    value={{ main: null, sub: null, ksic: null }}
                    onChange={next => { if (next.sub || next.main) update({ prevBiz: next.sub ?? next.main }) }}
                  />
                )}
              </div>
            </>
          )}

          <MultiChips label="건물 설비" hint="상가가 속한 건물의 조건이에요"
            options={BUILDING_OPTIONS} values={data.buildingFacilities ?? []}
            onChange={v => update({ buildingFacilities: v })}
            accent={TEAL} accentBg={TEAL_BG} testPrefix="building" />
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
        disabled={facilityGen}
        onClick={async () => {
          // 시설 재료가 있는데 초안에 시설 블록이 없으면 여기서 단건 생성 (초안은 2단계, 시설 입력은 3단계라는
          // 순서 공백 메우기 — 시설 입력한 등록만 Gemini 1회 추가, 그라운딩 없음)
          const hasFacts = data.interiorState || (data.buildingFacilities ?? []).length > 0
          if (hasFacts && !data.aiDraft?.facility) {
            setFacilityGen(true)
            try {
              const text = await generateLandlordFacilityBlock(data)
              if (text) update({ aiDraft: { ...(data.aiDraft ?? {}), facility: text } })
            } catch (_) { /* 실패해도 진행 — 시설 블록 없이 저장 */ }
            setFacilityGen(false)
          }
          navigate(`/e1p/4${editQ}`)
        }}
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
        {facilityGen ? '시설 소개 쓰는 중...' : '다음 — 완성도 확인'}
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
