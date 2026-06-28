import { createContext, useContext, useState } from 'react'
import { Outlet } from 'react-router-dom'

const E1bCtx = createContext(null)

export function E1bProvider() {
  const [data, setData] = useState({
    // 사업자등록증 자동 추출 (더미)
    bizName: '서교동 인테리어',
    category: '시설',
    subCategory: '인테리어·간판',
    region: '서울 마포구',
    founded: '2019',
    bizNumber: '123-45-67890',
    verified: true,

    // ② 이럴 때 부릅니다
    triggers: [],

    // ③ 해결 3쌍
    solutions: [
      { id: 's1', problem: '인테리어 견적이 어디서부터 시작할지 막막할 때', solve: '당일 현장 방문 무료 견적', edited: false },
      { id: 's2', problem: '공사 중 영업을 못 쉬는데 어떡하지 할 때', solve: '야간·주말 시공으로 영업 손실 최소화', edited: false },
      { id: 's3', problem: '시공 후 하자가 생겼는데 AS가 안 될까봐', solve: '시공 후 1년 무상 AS 보장', edited: false },
    ],

    // ④ 믿을 근거
    completedCount: '',
    portfolioAdded: false,

    // ⑤ 견적·문의
    dmSpeed: 'normal',
    dmDeposit: false,
    dmActive: true,
  })

  const update = patch =>
    setData(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))

  return (
    <E1bCtx.Provider value={{ data, update }}>
      <Outlet />
    </E1bCtx.Provider>
  )
}

export const useE1b = () => useContext(E1bCtx)
