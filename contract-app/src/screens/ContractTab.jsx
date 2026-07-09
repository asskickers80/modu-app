import { useState } from 'react'
import StepTabs from '../components/StepTabs.jsx'
import SettingsSheet from '../components/SettingsSheet.jsx'
import ContractForm from './ContractForm.jsx'
import SignScreen from './SignScreen.jsx'
import Complete from './Complete.jsx'
import ContractList from './ContractList.jsx'
import { makeEmptyDraft, validateDraft } from '../lib/draft.js'

// 4번 탭 [계약서] — 계약서 전자서명 3단계 플로우 (CONTRACT-APP-SPEC)
// 내부 단계 탭: ① 작성 → ② 고객 서명 → ③ 완료·전달 (+ 목록/설정)
// 작성 데이터는 이 컴포넌트가 소유 — 상단 앱 탭을 오가도 유지된다(상시 마운트+숨김).
export default function ContractTab() {
  const [view, setView] = useState('form') // form | sign | done | list
  const [draft, setDraft] = useState(() => makeEmptyDraft())
  const [result, setResult] = useState(null) // 서명 완료 결과 (PDF 포함)
  const [showSettings, setShowSettings] = useState(false)

  const canSign = !result && validateDraft(draft).length === 0 // 서명 완료 후 재서명 방지
  const canDone = Boolean(result)

  function selectTab(tab) {
    if (tab === 'settings') {
      setShowSettings(true)
      return
    }
    if (tab === 'form' && result) {
      if (!window.confirm('새 계약서 작성을 시작할까요?\n완료된 계약서는 목록에서 다시 열 수 있어요.')) return
      setResult(null)
      setDraft(makeEmptyDraft())
    }
    if (tab === 'sign' && !canSign) return
    if (tab === 'done' && !canDone) return
    setView(tab)
  }

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <StepTabs view={view} canSign={canSign} canDone={canDone} onSelect={selectTab} />

      <div className="min-h-0 flex-1 overflow-y-auto">
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
      </div>

      {showSettings && (
        <SettingsSheet
          onClose={() => setShowSettings(false)}
          onAgentChange={v => {
            if (!draft.agentName?.trim()) setDraft(d => ({ ...d, agentName: v }))
          }}
        />
      )}
    </div>
  )
}
