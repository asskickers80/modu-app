import { createContext, useContext, useState } from 'react'
import { Outlet } from 'react-router-dom'

const E1bCtx = createContext(null)

// 입점 시작 화면(/e1b/start)이 남긴 값 — 상호·사업자번호·확인 결과·주소·전화 (2026-09-11 파트 B6)
function startValues() {
  try { return JSON.parse(sessionStorage.getItem('modu_e1b_start') || 'null') ?? {} } catch (_) { return {} }
}

/**
 * 기업회원 입점 입력값. 기본값은 전부 빈 값이다 —
 * 예전에는 '서교동 인테리어'·'123-45-67890'·개업 2019년·인테리어 해결 3쌍이 박혀 있었는데,
 * 그 값을 고칠 입력이 화면에 없어서 저장을 붙이면 모든 업체가 같은 가짜 값으로 들어갔다.
 * 사실만 저장한다(헌법: 실데이터 없는 항목에 가짜 값 금지).
 */
export function E1bProvider() {
  const [data, setData] = useState(() => ({
    // 국세청·지역검색에서 온 사실 — /e1b/start 가 채운다
    bizName: '',
    bizNumber: '',
    region: '',
    phone: '',
    verified: false,

    // 사용자가 직접 고르는 값 — ① 한 줄 정체성 화면
    category: '',      // config/salesCardCategories.ts 의 vendor 키 (marketing|consulting|realestate|tax)
    founded: '',       // 개업연도 4자리

    // ② 이럴 때 부릅니다
    triggers: [],

    // ③ 해결 3쌍 — 빈 칸에서 시작(예시 문구는 placeholder 로만 보여준다)
    solutions: [
      { id: 's1', problem: '', solve: '', edited: false },
      { id: 's2', problem: '', solve: '', edited: false },
      { id: 's3', problem: '', solve: '', edited: false },
    ],

    // ④ 믿을 근거
    completedCount: '',
    portfolioAdded: false,

    // ⑤ 견적·문의
    dmSpeed: 'normal',
    dmDeposit: false,
    dmActive: true,
    ...startValues(),
  }))

  const update = patch =>
    setData(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))

  return (
    <E1bCtx.Provider value={{ data, update }}>
      <Outlet />
    </E1bCtx.Provider>
  )
}

export const useE1b = () => useContext(E1bCtx)
