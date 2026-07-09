import { useEffect, useState } from 'react'
import PinLock from './screens/PinLock.jsx'
import AppTabs, { APP_TABS } from './components/AppTabs.jsx'
import IntranetBrowser from './screens/IntranetBrowser.jsx'
import MemoBoard from './screens/MemoBoard.jsx'
import ListingTab from './screens/ListingTab.jsx'
import ContractTab from './screens/ContractTab.jsx'
import DeliveryTab from './screens/DeliveryTab.jsx'
import { loadBoard, saveBoard } from './lib/boardStore.js'

// 구조: PIN 해제 → 상단 탭 바(6자리) — 대표님 확정 배치
// [1 천하통일] [2 매물카드] [3 상담 메모] [4 계약] [5 전달·결제] [6 준비 중]
export default function App() {
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem('contract.unlocked') === '1')
  const [active, setActive] = useState(0)
  const [board, setBoard] = useState(null) // 상담 메모: { image, notes, capturedAt }
  const [contractResult, setContractResult] = useState(null) // 서명 완료 결과 (PDF 포함)
  const [contractKey, setContractKey] = useState(0) // 증가 → 계약 탭 초기화(새 계약)

  // 저장된 보드(캡처+메모) 복원
  useEffect(() => {
    loadBoard().then(b => b && setBoard(b)).catch(() => {})
  }, [])

  // 1번 탭 [캡처] → 캡처를 보드 배경으로 깔고 상담 메모 탭(3번)으로 전환
  function handleCapture(image) {
    setBoard(b => {
      const next = { image, notes: b?.notes || [], capturedAt: new Date().toISOString() }
      saveBoard(next).catch(() => {})
      return next
    })
    setActive(2)
  }

  // 계약 탭 서명 완료 → 전달·결제 탭(5번)으로. 계약 탭은 다음 계약을 위해 초기화
  function handleContractComplete(result) {
    setContractResult(result)
    setContractKey(k => k + 1)
    setActive(4)
  }

  // 전달·결제 탭 [새 계약서 작성] → 계약 탭으로
  function handleNewContract() {
    setContractResult(null)
    setActive(3)
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
        {/* 천하통일·매물카드·계약 탭은 언마운트하지 않고 숨김 — 창(iframe)·작성 중 데이터 유지 */}
        <div className={active === 0 ? 'h-full' : 'hidden'}>
          <IntranetBrowser onCapture={handleCapture} />
        </div>
        <div className={active === 1 ? 'h-full' : 'hidden'}>
          <ListingTab />
        </div>
        {active === 2 && <MemoBoard board={board} onBoardChange={setBoard} />}
        <div className={active === 3 ? 'h-full' : 'hidden'}>
          <ContractTab key={contractKey} onComplete={handleContractComplete} />
        </div>
        {active === 4 && <DeliveryTab result={contractResult} onNewContract={handleNewContract} />}
        {active === 5 && <Placeholder num={6} />}
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
