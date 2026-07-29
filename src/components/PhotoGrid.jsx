import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import ModuSpinner from './ModuSpinner'

const BUCKET = 'Modu Apps'

/** Supabase Storage 실업로드 — E1(양도인)·E1p(임대인) 공유(복제 금지) */
export async function uploadPhoto(file) {
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const path = `listings/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600' })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function deleteStoragePhoto(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.error('[Storage 삭제]', error.message)
}

/**
 * 사진 그리드 — 실업로드(파일 선택→Storage→URL). E1Step4에서 추출해 공용화.
 * accent/accentBg로 축 색상 파라미터화 (E1=네이비, E1p=틸).
 */
export default function PhotoGrid({ photos, onAdd, onDelete, maxCount, firstLabel = '대표 사진', accent = '#1a4d8f', accentBg = '#eef2fb', testId }) {
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
    <div data-testid={testId}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />

      <div className="grid grid-cols-3 gap-2">
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

        {uploading && (
          <div className="aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: accent + '60', backgroundColor: accentBg }}>
            <ModuSpinner size={36} highlight={accentBg} />
          </div>
        )}

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
