import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'
import { supabase, getDeviceId } from '../../lib/supabase'
import { listingToContext } from '../../lib/completeness'

export const E1Ctx = createContext(null)
export const useE1 = () => useContext(E1Ctx)

// 같은 탭 새로고침에서만 살아남으면 되므로 sessionStorage 사용
// (localStorage는 며칠 뒤 옛 초안이 떠서 오히려 혼란)
const DRAFT_KEY = 'modu_e1_draft'

const INITIAL_DATA = {
  address: '',
  detailAddress: '',
  shopName: '',
  floor: '',
  area: '',
  deposit: '',
  monthlyRent: '',
  maintenance: '',
  transferFee: '',
  transferType: null,   // 'bare' | 'full' | 'undecided'
  monthlySales: '',
  isFranchise: null,    // null=미선택 true=프랜차이즈 false=비프랜차이즈
  franchiseBrandId: null,
  franchiseBrandName: '',
  autoFilled: false,    // true when building registry auto-filled
  reviewChoices: {},    // { blockId: 'keep' | 'edit' | 'hide' }
  editedTexts: {},      // { blockId: string }
  photosAdded: false,
  salesProof: false,
  facilities: [],
  interiorPhotos: [],   // [{ url, path }] — Supabase Storage 업로드 후 url만 저장 (File 객체 없음)
  exteriorPhotos: [],   // [{ url, path }]
  isDemo: false,        // 예시✦ 채움 여부 — true면 status='example'로 저장 (마켓 미노출 연습용)
  aiDraft: null,        // generateListingDraft 결과 → Step3에서 사용
  marketData: null,     // fetchMarketData 결과 → Step3에서 사용
  marketInsight: null,  // generateMarketInsight 결과 → Step3에서 사용
  editingListingId: null, // 수정 모드: 편집 중인 기존 매물 id (null이면 신규 등록)
}

function loadDraft() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')
    if (saved && typeof saved === 'object') return { ...INITIAL_DATA, ...saved }
  } catch {}
  return INITIAL_DATA
}

// 제출 성공 시 호출 — 안 지우면 다음 등록 때 이전 값이 복원돼 혼란
export function clearE1Draft() {
  try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
}

export function E1Provider() {
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  // 수정 세션 여부 — 수정 모드는 DB가 진실이므로 draft 저장/복원을 아예 쓰지 않는다
  // (수정 중 내용이 다음 신규 등록 draft로 새는 오염 방지)
  const editSessionRef = useRef(!!editId)
  const [data, setData] = useState(() => (editId ? INITIAL_DATA : loadDraft()))
  const [editError, setEditError] = useState(false)

  // 수정 모드 진입: 이전 신규등록 draft 폐기 → DB에서 기존 매물 로드
  useEffect(() => {
    if (!editId) return
    editSessionRef.current = true
    clearE1Draft()
    supabase.from('listings').select('*').eq('id', editId).single()
      .then(({ data: row, error }) => {
        if (error || !row || row.device_id !== getDeviceId()) {
          // 조회 실패 또는 남의 매물 — 신규 등록 모드로 전환
          editSessionRef.current = false
          setEditError(true)
          setData(INITIAL_DATA)
          return
        }
        setData({ ...INITIAL_DATA, ...listingToContext(row), editingListingId: row.id })
      })
  }, [editId])

  useEffect(() => {
    if (editSessionRef.current) return // 수정 모드는 draft 미사용
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data)) } catch {}
  }, [data])

  const update = patch => setData(prev => ({ ...prev, ...patch }))

  return (
    <E1Ctx.Provider value={{ data, update, editError }}>
      <Outlet />
    </E1Ctx.Provider>
  )
}
