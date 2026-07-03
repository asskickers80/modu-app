import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1 } from './E1Context'
import { supabase } from '../../lib/supabase'
import ModuSpinner from '../../components/ModuSpinner'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const GREEN = '#22c55e'
const BUCKET = 'Modu Apps'

const CAFE_FACILITIES = [
  '에스프레소 머신', '그라인더', '냉장 쇼케이스', '냉동고',
  '카운터·POS 기기', '의자·테이블 세트', '조명·인테리어 집기',
  '냉난방기 (에어컨/히터)', '음악·음향 장비', '주방 싱크대',
]

const PROOF_OPTS = [
  { id: 'pos',  label: 'POS·카드단말기 연동', icon: '💳', desc: '실시간 매출 데이터 자동 동기화' },
  { id: 'card', label: '카드사 매출 확인서',   icon: '📄', desc: '발급 후 업로드 (PDF·이미지)' },
  { id: 'tax',  label: '세금계산서·영수증',    icon: '🧾', desc: '3개월 치 업로드 추천' },
]

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1,2,3,4,5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 4 ? NAVY : '#e5e7eb' }} />
      ))}
    </div>
  )
}

// ── 사진 업로드 → Supabase Storage ──────────────────────────
async function uploadPhoto(file) {
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const path = `listings/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600' })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

async function deleteStoragePhoto(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.error('[Storage 삭제]', error.message)
}

// ── 사진 그리드 컴포넌트 ────────────────────────────────────
function PhotoGrid({ photos, onAdd, onDelete, maxCount, firstLabel = '대표 사진' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const remaining = maxCount - photos.length
    const toUpload = files.slice(0, remaining)
    setErrMsg('')
    setUploading(true)
    try {
      const results = await Promise.all(toUpload.map(uploadPhoto))
      onAdd(results)
    } catch (err) {
      setErrMsg(`업로드 실패: ${err.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const canAdd = photos.length < maxCount

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />

      <div className="grid grid-cols-3 gap-2">
        {/* 업로드된 사진 */}
        {photos.map((photo, i) => (
          <div key={photo.path}
            className="aspect-square rounded-2xl overflow-hidden relative bg-gray-100">
            <img src={photo.url} alt="" className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full">
                {firstLabel}
              </span>
            )}
            <button
              type="button"
              onClick={() => onDelete(photo)}
              style={{
                position: 'absolute', top: '6px', right: '6px',
                width: '22px', height: '22px', borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.55)',
                border: 'none', cursor: 'pointer',
                color: '#fff', fontSize: '15px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}>
              ×
            </button>
          </div>
        ))}

        {/* 업로드 중 표시 */}
        {uploading && (
          <div className="aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: NAVY + '60', backgroundColor: NAVY_BG }}>
            <ModuSpinner size={36} highlight={NAVY_BG} />
          </div>
        )}

        {/* 추가 슬롯 */}
        {canAdd && !uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 transition-colors active:bg-gray-50">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[10px] text-gray-300">
              {photos.length === 0 ? '사진 추가' : '추가'}
            </span>
          </button>
        )}
      </div>

      {errMsg && <p className="mt-2 text-[12px] text-red-500">{errMsg}</p>}
    </div>
  )
}

// ── 메인 ────────────────────────────────────────────────────
export default function E1Step4() {
  const navigate = useNavigate()
  const { data, update } = useE1()

  const [facilities, setFacilities] = useState(data.facilities || [])
  const [salesProof, setSalesProof] = useState(data.salesProof || false)
  const [selectedProof, setSelectedProof] = useState(null)
  const [toast, setToast] = useState('')

  const interiorPhotos = data.interiorPhotos || []
  const exteriorPhotos = data.exteriorPhotos || []

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const toggleFacility = (f) => {
    const next = facilities.includes(f) ? facilities.filter(x => x !== f) : [...facilities, f]
    setFacilities(next)
    update({ facilities: next })
  }

  // 내부 사진
  const addInterior = (newPhotos) => {
    const next = [...interiorPhotos, ...newPhotos].slice(0, 10)
    update({ interiorPhotos: next, photosAdded: next.length > 0 })
    showToast(`사진 ${newPhotos.length}장 업로드됐어요`)
  }
  const deleteInterior = async (photo) => {
    await deleteStoragePhoto(photo.path)
    const next = interiorPhotos.filter(p => p.path !== photo.path)
    update({ interiorPhotos: next, photosAdded: next.length + exteriorPhotos.length > 0 })
  }

  // 외부 사진
  const addExterior = (newPhotos) => {
    const next = [...exteriorPhotos, ...newPhotos].slice(0, 5)
    update({ exteriorPhotos: next, photosAdded: interiorPhotos.length + next.length > 0 })
    showToast(`사진 ${newPhotos.length}장 업로드됐어요`)
  }
  const deleteExterior = async (photo) => {
    await deleteStoragePhoto(photo.path)
    const next = exteriorPhotos.filter(p => p.path !== photo.path)
    update({ exteriorPhotos: next, photosAdded: interiorPhotos.length + next.length > 0 })
  }

  return (
    <>
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 헤더 */}
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1/3')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">매물 등록</h1>
          <span className="text-[13px] font-bold" style={{ color: NAVY }}>4 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-[20px] font-bold text-gray-900">사진·증빙을 보완해요</h2>
          <p className="text-[13px] text-gray-400 mt-1">사진이 많을수록 노출 순위와 문의 수가 올라가요</p>
        </div>
      </div>

      {/* 스크롤 */}
      <main className="flex-1 overflow-y-auto px-5 pb-44" style={{ scrollbarWidth: 'none' }}>

        {/* ─── 내부 사진 ─── */}
        <div className="mt-6 mb-1 flex items-center justify-between">
          <p className="text-[14px] font-bold text-gray-900">
            내부 사진 <span className="text-[13px] font-normal text-gray-400">({interiorPhotos.length}/10)</span>
          </p>
          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
            추천 3장 이상 ↑↑
          </span>
        </div>
        <p className="text-[12px] text-gray-400 mb-3">카운터·홀·주방을 골고루 찍어주세요 (최대 10장)</p>
        <PhotoGrid
          photos={interiorPhotos}
          onAdd={addInterior}
          onDelete={deleteInterior}
          maxCount={10}
          firstLabel="대표 사진"
        />
        <p className="text-[11px] text-gray-400 mt-2">⭐ 내부 사진 3장 이상 → 검색 노출 순위 ↑↑</p>

        {/* ─── 외부 사진 ─── */}
        <div className="mt-6 mb-1 flex items-center justify-between">
          <p className="text-[14px] font-bold text-gray-900">
            외부·간판 사진 <span className="text-[13px] font-normal text-gray-400">({exteriorPhotos.length}/5)</span>
          </p>
          <span className="text-[12px] text-gray-400">최대 5장</span>
        </div>
        <p className="text-[12px] text-gray-400 mb-3">건물 외관·간판·입구가 잘 보이게 찍어주세요</p>
        <PhotoGrid
          photos={exteriorPhotos}
          onAdd={addExterior}
          onDelete={deleteExterior}
          maxCount={5}
          firstLabel="외관"
        />

        {/* ─── 매출 증빙 ─── */}
        <div className="mt-7">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-[14px] font-bold text-gray-900">매출 증빙 연동</p>
              <p className="text-[12px] text-gray-400 mt-0.5">선택 · 연동하면 신뢰도가 크게 올라가요</p>
            </div>
            <button
              onClick={() => { setSalesProof(v => !v); update({ salesProof: !salesProof }) }}
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
                    style={{ borderColor: sel ? NAVY : '#e5e7eb', backgroundColor: sel ? NAVY_BG : '#fff' }}>
                    <span className="text-[22px] shrink-0">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold" style={{ color: sel ? NAVY : '#374151' }}>{opt.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                    {sel && (
                      <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: NAVY }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

        {/* ─── 시설·집기 ─── */}
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
                      <path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {f}
                </button>
              )
            })}
          </div>
          {facilities.length > 0 && (
            <p className="mt-2 text-[12px]" style={{ color: GREEN }}>{facilities.length}개 선택됨</p>
          )}
        </div>

      </main>

      {/* 토스트 */}
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

    {/* 하단 버튼 */}
    <div style={{
      position: 'fixed', bottom: 0, left: '50%',
      transform: 'translateX(-50%)',
      width: '100%', maxWidth: '390px',
      padding: '12px 20px 20px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #f0f0f0',
      zIndex: 9999,
    }}>
      <button type="button" onClick={() => navigate('/e1/5')}
        style={{
          display: 'block', width: '100%', padding: '18px 0',
          borderRadius: '16px', backgroundColor: '#111827', color: '#ffffff',
          fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer',
          WebkitAppearance: 'none',
        }}>
        다음 — 완성도 확인
      </button>
      <button type="button" onClick={() => navigate('/e1/5')}
        style={{
          display: 'block', width: '100%', padding: '8px 0', marginTop: '4px',
          fontSize: '13px', color: '#9ca3af', border: 'none', background: 'none', cursor: 'pointer',
        }}>
        나중에 추가하기
      </button>
    </div>
    </>
  )
}
