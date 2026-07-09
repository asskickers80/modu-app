import { useState } from 'react'
import PinLock from './screens/PinLock.jsx'
import AppTabs, { APP_TABS } from './components/AppTabs.jsx'
import IntranetBrowser from './screens/IntranetBrowser.jsx'
import ListingTab from './screens/ListingTab.jsx'
import ContractTab from './screens/ContractTab.jsx'
import DeliveryTab from './screens/DeliveryTab.jsx'
import CaptureAssignModal from './components/CaptureAssignModal.jsx'
import { loadCardBoard, saveCardBoard } from './lib/boardStore.js'
import { digitsOnly } from './lib/format.js'

// 구조: PIN 해제 → 상단 탭 바(5자리) — 대표님 확정 배치 (2026-07-09 2차)
// [1 천하통일] [2 매물카드] [3 노트(준비)] [4 계약] [5 전달·결제]
// 캡처는 모달에서 카드를 골라 매물카드에 귀속시킨다 (상담 메모 탭 폐지).
export default function App() {
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem('contract.unlocked') === '1')
  const [active, setActive] = useState(0)
  const [pendingCapture, setPendingCapture] = useState(null) // 캡처 이미지 (카드 선택 대기)
  const [listingOpenReq, setListingOpenReq] = useState(null) // { phone, ts } — 매물카드 자동 열기
  const [contractResult, setContractResult] = useState(null) // 서명 완료 결과 (PDF 포함)
  const [contractKey, setContractKey] = useState(0)

  // 1번 탭 [캡처] → 카드 선택 모달
  function handleCapture(image) {
    setPendingCapture(image)
  }

  // 모달에서 카드 선택/생성 → 캡처를 해당 카드 보드에 첨부 → 매물카드 탭 자동 전환
  async function assignCapture(phone) {
    const key = digitsOnly(phone)
    const image = pendingCapture
    setPendingCapture(null)
    try {
      const prev = await loadCardBoard(key)
      await saveCardBoard(key, {
        image,
        notes: prev?.notes || [], // 기존 포스트잇 유지, 배경만 새 캡처로
        capturedAt: new Date().toISOString(),
      })
    } catch { /* 저장 실패해도 카드는 연다 */ }
    setListingOpenReq({ phone, ts: Date.now() })
    setActive(1)
  }

  // 계약 탭 서명 완료 → 전달·결제 탭으로. 계약 탭은 다음 계약을 위해 초기화
  function handleContractComplete(result) {
    setContractResult(result)
    setContractKey(k => k + 1)
    setActive(4)
  }

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
          <ListingTab openRequest={listingOpenReq} />
        </div>
        {active === 2 && <Placeholder num={3} />}
        <div className={active === 3 ? 'h-full' : 'hidden'}>
          <ContractTab key={contractKey} onComplete={handleContractComplete} />
        </div>
        {active === 4 && <DeliveryTab result={contractResult} onNewContract={handleNewContract} />}
      </div>

      {pendingCapture && (
        <CaptureAssignModal
          image={pendingCapture}
          onAssign={assignCapture}
          onClose={() => setPendingCapture(null)}
        />
      )}
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
