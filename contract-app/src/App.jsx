import { useEffect, useState } from 'react'
import PinLock from './screens/PinLock.jsx'
import AppTabs, { APP_TABS } from './components/AppTabs.jsx'
import IntranetBrowser from './screens/IntranetBrowser.jsx'
import MemoBoard from './screens/MemoBoard.jsx'
import ContractTab from './screens/ContractTab.jsx'
import { loadBoard, saveBoard } from './lib/boardStore.js'

// 구조: PIN 해제 → 상단 탭 바(6자리)
// 1번 천하통일(인트라넷 브라우저 + 반영), 2번 상담 메모(캡처 + 포스트잇),
// 4번 계약서(전자서명 3단계), 3·5·6번 준비 중.
export default function App() {
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem('contract.unlocked') === '1')
  const [active, setActive] = useState(0)
  const [board, setBoard] = useState(null) // { image, notes, capturedAt }

  // 저장된 보드(캡처+메모) 복원
  useEffect(() => {
    loadBoard().then(b => b && setBoard(b)).catch(() => {})
  }, [])

  // 1번 탭 '반영' → 캡처를 보드 배경으로 깔고 상담 메모 탭으로 전환
  function handleCapture(image) {
    setBoard(b => {
      const next = { image, notes: b?.notes || [], capturedAt: new Date().toISOString() }
      saveBoard(next).catch(() => {})
      return next
    })
    setActive(1)
  }

  if (!unlocked) {
    return (
      <PinLock
        onUnlock={() => {
          sessionStorage.setItem('contract.unlocked', '1')
          setUnlocked(true)
        }}
      />
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <AppTabs active={active} onSelect={setActive} />
      <div className="min-h-0 flex-1">
        {/* 천하통일·계약서 탭은 언마운트하지 않고 숨김 — 창(iframe)·작성 중 데이터 유지 */}
        <div className={active === 0 ? 'h-full' : 'hidden'}>
          <IntranetBrowser onCapture={handleCapture} />
        </div>
        {active === 1 && <MemoBoard board={board} onBoardChange={setBoard} />}
        <div className={active === 3 ? 'h-full' : 'hidden'}>
          <ContractTab />
        </div>
        {(active === 2 || active > 3) && <Placeholder num={active + 1} />}
      </div>
    </div>
  )
}

function Placeholder({ num }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-gray-300">
      <span className="text-4xl font-bold">{num}</span>
      <p className="mt-2 text-sm font-semibold">준비 중</p>
      <p className="mt-1 text-xs">{APP_TABS[num - 1].label !== '준비 중' ? APP_TABS[num - 1].label : '이 자리에 들어갈 기능을 기다리고 있어요'}</p>
    </div>
  )
}
