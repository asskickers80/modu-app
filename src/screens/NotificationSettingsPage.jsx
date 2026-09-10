/**
 * 찜 알림 설정 (ORDER 2026-09-10 파트 A3) — /my/notification-settings. 종류별 끄기 토글.
 * 값은 프로필(watchAlertOff)에 저장하고 로그인 계정이면 서버 profile_data 에도 반영(알림을 만드는 쪽이 읽는다).
 */
import { useState } from 'react'
import useSafeBack from '../hooks/useSafeBack'
import { WATCH_KINDS, KIND_LABEL } from '../../config/watch'
import { getWatchAlertOff, setWatchAlertOff } from '../lib/watchlist'

export default function NotificationSettingsPage() {
  const safeBack = useSafeBack('/my')
  const [off, setOff] = useState(() => getWatchAlertOff())
  const toggle = (kind) => {
    const next = !off[kind]
    setOff(prev => ({ ...prev, [kind]: next }))
    setWatchAlertOff(kind, next)
  }
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-12 pb-3 border-b border-gray-50">
        <button onClick={safeBack} aria-label="뒤로" className="w-11 h-11 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-t17 font-bold text-gray-900">찜 알림 설정</h1>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-t13 text-gray-500 mb-3">끈 종류는 알림이 만들어지지 않아요. 같은 매물은 하루 1건, 전체 하루 3건까지만 와요.</p>
        <div className="rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {WATCH_KINDS.map(k => (
            <button key={k} type="button" onClick={() => toggle(k)} data-testid={`alert-toggle-${k}`} aria-pressed={!off[k]}
              className="w-full flex items-center justify-between px-4 py-3.5 min-h-12">
              <span className="text-t14 text-gray-900">{KIND_LABEL[k]}</span>
              <span className="w-11 h-6 rounded-full relative" style={{ backgroundColor: off[k] ? '#e5e7eb' : '#111827' }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: off[k] ? 2 : 22 }} />
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
