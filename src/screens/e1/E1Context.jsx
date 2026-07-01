import { createContext, useContext, useState } from 'react'
import { Outlet } from 'react-router-dom'

export const E1Ctx = createContext(null)
export const useE1 = () => useContext(E1Ctx)

export function E1Provider() {
  const [data, setData] = useState({
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
    aiDraft: null,        // generateListingDraft 결과 → Step3에서 사용
    marketData: null,     // fetchMarketData 결과 → Step3에서 사용
    marketInsight: null,  // generateMarketInsight 결과 → Step3에서 사용
  })

  const update = patch => setData(prev => ({ ...prev, ...patch }))

  return (
    <E1Ctx.Provider value={{ data, update }}>
      <Outlet />
    </E1Ctx.Provider>
  )
}
