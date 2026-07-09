import { useState } from 'react'
import StepTabs from '../components/StepTabs.jsx'
import SettingsSheet from '../components/SettingsSheet.jsx'
import ContractForm from './ContractForm.jsx'
import SignScreen from './SignScreen.jsx'
import { makeEmptyDraft, validateDraft } from '../lib/draft.js'

// 4번 탭 [계약] — 작성 → 고객 서명 (CONTRACT-APP-SPEC 1~2단계)
// 서명 완료 결과는 App으로 올려보내고, 전달·결제(5번 탭)가 이어받는다.
// 작성 데이터는 이 컴포넌트가 소유 — 상단 앱 탭을 오가도 유지(상시 마운트+숨김).
export default function ContractTab({ onComplete }) {
  const [view, setView] = useState('form') // form | sign
  const [draft, setDraft] = useState(() => makeEmptyDraft())
  const [showSettings, setShowSettings] = useState(false)

  const canSign = validateDraft(draft).length === 0

  function selectTab(tab) {
    if (tab === 'settings') {
      setShowSettings(true)
      return
    }
    if (tab === 'sign' && !canSign) return
    setView(tab)
  }

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <StepTabs view={view} canSign={canSign} onSelect={selectTab} />

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
            onDone={onComplete}
          />
        )}
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
