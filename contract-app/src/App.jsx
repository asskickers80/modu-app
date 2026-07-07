import { useState } from 'react'
import PinLock from './screens/PinLock.jsx'
import Home from './screens/Home.jsx'
import ContractForm, { makeEmptyDraft } from './screens/ContractForm.jsx'
import SignScreen from './screens/SignScreen.jsx'
import Complete from './screens/Complete.jsx'
import ContractList from './screens/ContractList.jsx'

// 화면 흐름: PIN → 홈 → 작성(+미리보기) → 고객 서명 → 완료 → 홈/목록
export default function App() {
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem('contract.unlocked') === '1')
  const [view, setView] = useState('home')
  const [draft, setDraft] = useState(null)   // 작성 중 계약 데이터
  const [result, setResult] = useState(null) // 서명 완료 결과 (PDF 포함)

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

  switch (view) {
    case 'form':
      return (
        <ContractForm
          initialDraft={draft}
          onHome={() => { setDraft(null); setView('home') }}
          onStartSigning={d => { setDraft(d); setView('sign') }}
        />
      )
    case 'sign':
      return (
        <SignScreen
          draft={draft}
          onBack={() => setView('form')}
          onDone={r => { setResult(r); setDraft(null); setView('done') }}
        />
      )
    case 'done':
      return (
        <Complete
          result={result}
          onNewContract={() => { setResult(null); setDraft(makeEmptyDraft()); setView('form') }}
          onHome={() => { setResult(null); setView('home') }}
        />
      )
    case 'list':
      return <ContractList onHome={() => setView('home')} />
    default:
      return <Home onNew={() => { setDraft(makeEmptyDraft()); setView('form') }} onList={() => setView('list')} />
  }
}
