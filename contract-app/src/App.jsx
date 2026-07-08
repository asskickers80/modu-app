import { useState } from 'react'
import PinLock from './screens/PinLock.jsx'
import StepTabs from './components/StepTabs.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import ContractForm from './screens/ContractForm.jsx'
import SignScreen from './screens/SignScreen.jsx'
import Complete from './screens/Complete.jsx'
import ContractList from './screens/ContractList.jsx'
import { makeEmptyDraft, validateDraft } from './lib/draft.js'

// 구조: PIN 해제 → 상단 탭(작업 순서: ① 작성 → ② 고객 서명 → ③ 완료·전달 / 목록·설정)
// 각 단계 탭은 진행 조건이 갖춰져야 활성화된다.
export default function App() {
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem('contract.unlocked') === '1')
  const [view, setView] = useState('form') // form | sign | done | list
  const [draft, setDraft] = useState(() => makeEmptyDraft())
  const [result, setResult] = useState(null) // 서명 완료 결과 (PDF 포함)
  const [showSettings, setShowSettings] = useState(false)

  const canSign = !result && validateDraft(draft).length === 0 // 서명 완료 후에는 재서명 불가
  const canDone = Boolean(result)

  function selectTab(tab) {
    if (tab === 'settings') {
      setShowSettings(true)
      return
    }
    if (tab === 'form' && result) {
      // 완료된 계약이 있는 상태에서 작성으로 → 새 계약 시작
      if (!window.confirm('새 계약서 작성을 시작할까요?\n완료된 계약서는 목록에서 다시 열 수 있어요.')) return
      setResult(null)
      setDraft(makeEmptyDraft())
    }
    if (tab === 'sign' && !canSign) return
    if (tab === 'done' && !canDone) return
    setView(tab)
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
    <div className="min-h-dvh bg-slate-100">
      <StepTabs view={view} canSign={canSign} canDone={canDone} onSelect={selectTab} />

      {view === 'form' && (
        <ContractForm
          draft={draft}
          onChange={setDraft}
          onStartSigning={() => setView('sign')}
        />
      )}
      {view === 'sign' && (
        <SignScreen
          draft={draft}
          onDone={r => {
            setResult(r)
            setView('done')
          }}
        />
      )}
      {view === 'done' && result && (
        <Complete
          result={result}
          onNewContract={() => selectTab('form')}
          onList={() => setView('list')}
        />
      )}
      {view === 'list' && <ContractList />}

      {showSettings && (
        <SettingsSheet
          onClose={() => setShowSettings(false)}
          onAgentChange={v => {
            // 작성 중 담당 에이전트가 비어 있으면 즉시 반영
            if (!draft.agentName?.trim()) setDraft(d => ({ ...d, agentName: v }))
          }}
        />
      )}
    </div>
  )
}
