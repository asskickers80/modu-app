import { createContext, useContext, useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'

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
  autoFilled: false,    // true when building registry auto-filled
  reviewChoices: {},    // { blockId: 'keep' | 'edit' | 'hide' }
  editedTexts: {},      // { blockId: string }
  photosAdded: false,
  salesProof: false,
  facilities: [],
  interiorPhotos: [],   // [{ url, path }] — Supabase Storage 업로드 후 url만 저장 (File 객체 없음)
  exteriorPhotos: [],   // [{ url, path }]
  aiDraft: null,        // generateListingDraft 결과 → Step3에서 사용
  marketData: null,     // fetchMarketData 결과 → Step3에서 사용
  marketInsight: null,  // generateMarketInsight 결과 → Step3에서 사용
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
  const [data, setData] = useState(loadDraft)

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data)) } catch {}
  }, [data])

  const update = patch => setData(prev => ({ ...prev, ...patch }))

  return (
    <E1Ctx.Provider value={{ data, update }}>
      <Outlet />
    </E1Ctx.Provider>
  )
}
