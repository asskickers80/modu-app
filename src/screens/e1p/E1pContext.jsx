import { createContext, useContext, useState } from 'react'
import { Outlet } from 'react-router-dom'

const E1pCtx = createContext(null)

export function E1pProvider() {
  const [data, setData] = useState({
    // 분기
    listingType: null,      // 'rent' | 'sale' | 'both'
    // 주소·기본
    address: '',
    floor: '',
    area: '',
    autoFilled: false,
    // 임대 필드
    deposit: '',
    monthlyRent: '',
    maintenance: '',
    recommendedBiz: [],
    // 매각 필드
    salePrice: '',
    capRate: '',
    // AI 초안
    aiDraft: null,
    // 검수
    reviewChoices: {},
    editedTexts: {},
    // 도면·서류
    floorPlanAdded: false,
    registryDone: true,     // 등기 자동열람: 더미로 완료
    extras: [],
  })

  const update = patch =>
    setData(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))

  return (
    <E1pCtx.Provider value={{ data, update }}>
      <Outlet />
    </E1pCtx.Provider>
  )
}

export const useE1p = () => useContext(E1pCtx)
