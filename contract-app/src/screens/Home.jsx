import { useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase.js'
import { savePin } from './PinLock.jsx'

const AGENT_KEY = 'contract.agentName'

// 홈: 새 계약서 / 계약 목록 / 설정(담당 에이전트 이름, PIN 변경)
export default function Home({ onNew, onList }) {
  const [showSettings, setShowSettings] = useState(false)
  const [agentName, setAgentName] = useState(localStorage.getItem(AGENT_KEY) || '')
  const [pinDraft, setPinDraft] = useState('')
  const [notice, setNotice] = useState('')

  function saveAgent(v) {
    setAgentName(v)
    localStorage.setItem(AGENT_KEY, v)
  }

  async function changePin() {
    if (!/^\d{4}$/.test(pinDraft)) {
      setNotice('PIN은 숫자 4자리로 입력해 주세요.')
      return
    }
    await savePin(pinDraft)
    setPinDraft('')
    setNotice('PIN이 변경되었어요.')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pt-14">
        <h1 className="text-2xl font-bold text-gray-900">점포라인 계약서</h1>
        <p className="mt-1 text-sm text-gray-500">매물광고 이용계약 전자서명</p>

        {!isSupabaseConfigured && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            Supabase가 아직 설정되지 않았어요. PDF 생성과 공유는 되지만 저장·목록은 동작하지 않아요.
            (.env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 입력)
          </p>
        )}

        <button onClick={onNew}
          className="mt-8 rounded-3xl bg-blue-600 py-6 text-lg font-bold text-white shadow-lg shadow-blue-600/20 active:bg-blue-700">
          + 새 계약서 작성
        </button>
        <button onClick={onList}
          className="mt-3 rounded-3xl bg-white py-5 text-base font-bold text-gray-800 shadow-sm active:bg-gray-50">
          계약 목록 · 재공유
        </button>

        <button onClick={() => setShowSettings(s => !s)} className="mt-6 self-center rounded-lg px-4 py-2 text-sm text-gray-400 underline">
          설정 {showSettings ? '닫기' : ''}
        </button>

        {showSettings && (
          <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">담당 에이전트 이름 (계약서 기본값)</span>
              <input
                type="text" value={agentName} onChange={e => saveAgent(e.target.value)}
                placeholder="예: 홍길동"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
              />
            </label>
            <div className="mt-4">
              <span className="text-[13px] font-semibold text-gray-700">PIN 변경 (숫자 4자리)</span>
              <div className="mt-1 flex gap-2">
                <input
                  type="password" inputMode="numeric" maxLength={4} value={pinDraft}
                  onChange={e => setPinDraft(e.target.value.replace(/\D/g, ''))}
                  placeholder="새 PIN"
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
                />
                <button onClick={changePin} className="rounded-xl bg-gray-900 px-5 text-sm font-bold text-white">변경</button>
              </div>
            </div>
            {notice && <p className="mt-2 text-sm text-blue-600">{notice}</p>}
          </div>
        )}
      </div>
      <p className="pb-6 text-center text-xs text-gray-300">내부 전용 · ㈜점포라인</p>
    </div>
  )
}
