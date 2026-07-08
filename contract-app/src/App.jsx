import { useState } from 'react'
import PinLock from './screens/PinLock.jsx'
import AppTabs, { APP_TABS } from './components/AppTabs.jsx'
import IntranetBrowser from './screens/IntranetBrowser.jsx'

// 구조: PIN 해제 → 상단 탭 바(6자리)
// 1번 '천하통일'(인트라넷 브라우저)만 구현, 2~6번은 준비 중.
// ※ 계약서 작성·서명·PDF 화면들(screens/, components/)은 코드에 그대로 보존되어 있으며
//    자리가 정해지면 해당 탭에 연결한다.
export default function App() {
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem('contract.unlocked') === '1')
  const [active, setActive] = useState(0)

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
        {active === 0 ? <IntranetBrowser /> : <Placeholder num={active + 1} />}
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
