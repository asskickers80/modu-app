import { useRef, useState } from 'react'

// 1번 탭 '천하통일' — 인트라넷을 브라우저처럼 사용 + 창 스트립(멀티 창)
//
// 구현 방식 (iframe 우선 + 새 창 폴백):
// - 인트라넷 URL을 iframe으로 임베드 시도. 임베드 차단/로그인 유지 실패는
//   스크립트로 감지 불가 → '인트라넷 열기 ↗' 새 창 폴백 버튼 상시 제공.
// - 창 스트립: [+]로 창 추가(최대 5개), 칩 탭으로 전환.
//   전환 시 iframe을 언마운트하지 않고 display:none으로 숨겨 각 창의 상태
//   (로그인·스크롤·열어둔 페이지)를 유지한다. 칩을 길게 누르면(0.5초) 이름 변경.
const URL_KEY = 'app.intranetUrl'
const MAX_WINDOWS = 5
const LONG_PRESS_MS = 500

function normalizeUrl(input) {
  const t = String(input || '').trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `http://${t}`
}

export default function IntranetBrowser() {
  const [savedUrl, setSavedUrl] = useState(localStorage.getItem(URL_KEY) || '')
  const [editing, setEditing] = useState(!savedUrl)
  const [draftUrl, setDraftUrl] = useState(savedUrl)
  const [showHint, setShowHint] = useState(true)

  // 창 목록 — src는 창 생성 시점의 주소를 보관 (주소 변경이 다른 창을 초기화하지 않도록)
  const [windows, setWindows] = useState(() =>
    savedUrl ? [{ id: 1, name: '창 1', src: savedUrl, frameKey: 0 }] : [],
  )
  const [activeId, setActiveId] = useState(1)
  const nextIdRef = useRef(2)

  // 길게 누르기(이름 변경) 처리
  const pressTimerRef = useRef(null)
  const longPressedRef = useRef(false)

  function saveUrl() {
    const url = normalizeUrl(draftUrl)
    if (!url) return
    localStorage.setItem(URL_KEY, url)
    setSavedUrl(url)
    setEditing(false)
    setWindows(ws => {
      if (ws.length === 0) return [{ id: 1, name: '창 1', src: url, frameKey: 0 }]
      // 활성 창만 새 주소로 다시 로딩, 나머지 창은 그대로 유지
      return ws.map(w => (w.id === activeId ? { ...w, src: url, frameKey: w.frameKey + 1 } : w))
    })
  }

  function addWindow() {
    if (windows.length >= MAX_WINDOWS || !savedUrl) return
    const id = nextIdRef.current++
    setWindows(ws => [...ws, { id, name: `창 ${id}`, src: savedUrl, frameKey: 0 }])
    setActiveId(id)
  }

  function reloadActive() {
    setWindows(ws => ws.map(w => (w.id === activeId ? { ...w, frameKey: w.frameKey + 1 } : w)))
  }

  function closeWindow(id) {
    setWindows(ws => {
      const idx = ws.findIndex(w => w.id === id)
      const next = ws.filter(w => w.id !== id)
      // 활성 창을 닫으면 왼쪽 이웃(없으면 첫 번째) 창으로 전환
      if (id === activeId && next.length) setActiveId(next[Math.max(0, idx - 1)].id)
      return next
    })
  }

  function renameWindow(id) {
    const target = windows.find(w => w.id === id)
    if (!target) return
    const name = window.prompt('창 이름을 입력하세요', target.name)
    if (name?.trim()) {
      setWindows(ws => ws.map(w => (w.id === id ? { ...w, name: name.trim() } : w)))
    }
  }

  function chipPressStart(id) {
    longPressedRef.current = false
    pressTimerRef.current = setTimeout(() => {
      longPressedRef.current = true
      renameWindow(id)
    }, LONG_PRESS_MS)
  }

  function chipPressEnd(id) {
    clearTimeout(pressTimerRef.current)
    if (!longPressedRef.current) setActiveId(id) // 짧게 탭 = 창 전환
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* 브라우저 툴바 */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 bg-white px-2 py-1.5">
        <button onClick={() => window.history.back()} aria-label="뒤로"
          className="h-10 w-10 shrink-0 rounded-xl text-lg text-gray-600 active:bg-gray-100">
          ←
        </button>
        <button onClick={reloadActive} aria-label="새로고침"
          className="h-10 w-10 shrink-0 rounded-xl text-lg text-gray-600 active:bg-gray-100">
          ⟳
        </button>
        <button onClick={() => { setDraftUrl(savedUrl); setEditing(true) }}
          className="min-w-0 flex-1 truncate rounded-xl bg-gray-100 px-3 py-2 text-left text-xs text-gray-500 active:bg-gray-200"
          title="주소 변경">
          {savedUrl || '주소를 설정해 주세요'}
        </button>
        <button onClick={() => savedUrl && window.open(savedUrl, '_blank')}
          className="h-10 shrink-0 rounded-xl bg-gray-900 px-3 text-xs font-bold text-white active:bg-gray-700">
          인트라넷 열기 ↗
        </button>
      </div>

      {/* 창 스트립: 칩 탭 전환 + [+] 새 창 (최대 5개) + 길게 눌러 이름 변경 */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-slate-50 px-2 py-1">
        {windows.map(w => (
          <span
            key={w.id}
            className={`flex h-9 shrink-0 items-stretch overflow-hidden rounded-lg ${
              w.id === activeId ? 'bg-blue-600' : 'bg-white shadow-sm'
            }`}
          >
            <button
              onPointerDown={() => chipPressStart(w.id)}
              onPointerUp={() => chipPressEnd(w.id)}
              onPointerLeave={() => clearTimeout(pressTimerRef.current)}
              onContextMenu={e => e.preventDefault()}
              className={`select-none pl-3 text-xs font-semibold ${
                w.id === activeId ? 'pr-1 text-white' : 'pr-3 text-gray-600 active:bg-blue-50'
              }`}
              style={{ WebkitTouchCallout: 'none' }}
              title="길게 누르면 이름 변경"
            >
              {w.name}
            </button>
            {w.id === activeId && (
              <button
                onClick={() => closeWindow(w.id)}
                aria-label={`${w.name} 닫기`}
                className="pl-1 pr-2.5 text-sm text-white/70 active:text-white"
              >
                ✕
              </button>
            )}
          </span>
        ))}
        {windows.length < MAX_WINDOWS && savedUrl && (
          <button onClick={addWindow} aria-label="새 창"
            className="h-9 w-9 shrink-0 rounded-lg bg-white text-base font-bold text-gray-500 shadow-sm active:bg-blue-50">
            +
          </button>
        )}
        <span className="ml-auto shrink-0 pr-1 text-[10px] text-gray-300">{windows.length}/{MAX_WINDOWS} · 길게 눌러 이름 변경</span>
      </div>

      {showHint && (
        <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-3 py-2">
          <p className="flex-1 text-xs leading-relaxed text-amber-800">
            아래 화면이 비어 보이거나 로그인이 자꾸 풀리면, 인트라넷이 앱 내 표시(임베드)를 막는 경우예요.
            그때는 오른쪽 위 <b>인트라넷 열기 ↗</b> 버튼으로 새 창에서 사용해 주세요.
          </p>
          <button onClick={() => setShowHint(false)} className="shrink-0 px-1 text-sm text-amber-400">✕</button>
        </div>
      )}

      {/* 임베드 영역 — 모든 창을 항상 마운트해 두고, 비활성 창은 숨김(상태 유지) */}
      <div className="relative min-h-0 flex-1 bg-white">
        {windows.map(w => (
          <iframe
            key={`${w.id}-${w.frameKey}`}
            src={w.src}
            title={`인트라넷 ${w.name}`}
            className={`absolute inset-0 h-full w-full border-0 ${w.id === activeId ? '' : 'hidden'}`}
          />
        ))}
        {windows.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-300">
            {savedUrl ? (
              <>
                <p>열린 창이 없어요</p>
                <button onClick={addWindow} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white active:bg-blue-700">
                  + 새 창 열기
                </button>
              </>
            ) : (
              '주소를 설정하면 창이 열립니다'
            )}
          </div>
        )}
      </div>

      {/* 주소 설정 오버레이 — 아래 iframe들을 언마운트하지 않도록 겹쳐서 표시 */}
      {editing && (
        <div className="absolute inset-0 z-10 flex items-start justify-center bg-slate-100/95 px-4 pt-16">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">인트라넷 주소 설정</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              천하통일 탭에서 열 인트라넷 주소를 입력해 주세요. 저장하면 현재 창에 적용됩니다.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="url"
                value={draftUrl}
                onChange={e => setDraftUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveUrl()}
                placeholder="예: 192.168.0.10:8080 또는 http://intranet.example.com"
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
              />
              <button onClick={saveUrl} disabled={!draftUrl.trim()}
                className="rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:bg-gray-300">
                저장
              </button>
            </div>
            {savedUrl && (
              <button onClick={() => { setDraftUrl(savedUrl); setEditing(false) }}
                className="mt-3 text-sm text-gray-400 underline">
                취소
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
