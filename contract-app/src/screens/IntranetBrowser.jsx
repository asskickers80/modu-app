import { useState } from 'react'

// 1번 탭 '천하통일' — 인트라넷을 브라우저처럼 사용
//
// 구현 방식 (iframe 우선 + 새 창 폴백):
// - 인트라넷 URL을 iframe으로 임베드 시도. 뒤로가기는 브라우저 세션 히스토리
//   (iframe 안에서의 이동도 부모 히스토리에 쌓임)를, 새로고침은 iframe 재장착을 사용.
// - 임베드가 차단(X-Frame-Options/CSP)되거나 Safari의 서드파티 쿠키 정책으로
//   로그인이 유지되지 않는 경우를 위해 '새 창으로 열기' 폴백 버튼을 항상 제공.
//   (차단 여부는 브라우저가 스크립트에 알려주지 않아 자동 감지가 불가능 — 안내 배너로 대응)
const URL_KEY = 'app.intranetUrl'

function normalizeUrl(input) {
  const t = String(input || '').trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `http://${t}`
}

export default function IntranetBrowser() {
  const [savedUrl, setSavedUrl] = useState(localStorage.getItem(URL_KEY) || '')
  const [editing, setEditing] = useState(!savedUrl)
  const [draftUrl, setDraftUrl] = useState(savedUrl)
  const [frameKey, setFrameKey] = useState(0) // 증가 → iframe 재장착(새로고침)
  const [showHint, setShowHint] = useState(true)

  function saveUrl() {
    const url = normalizeUrl(draftUrl)
    if (!url) return
    localStorage.setItem(URL_KEY, url)
    setSavedUrl(url)
    setEditing(false)
    setFrameKey(k => k + 1)
  }

  if (editing) {
    return (
      <div className="flex h-full items-start justify-center px-4 pt-16">
        <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">인트라넷 주소 설정</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            천하통일 탭에서 열 인트라넷 주소를 입력해 주세요. 한 번 저장하면 계속 유지됩니다.
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
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 브라우저 툴바 */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 bg-white px-2 py-1.5">
        <button onClick={() => window.history.back()} aria-label="뒤로"
          className="h-10 w-10 shrink-0 rounded-xl text-lg text-gray-600 active:bg-gray-100">
          ←
        </button>
        <button onClick={() => setFrameKey(k => k + 1)} aria-label="새로고침"
          className="h-10 w-10 shrink-0 rounded-xl text-lg text-gray-600 active:bg-gray-100">
          ⟳
        </button>
        <button onClick={() => { setDraftUrl(savedUrl); setEditing(true) }}
          className="min-w-0 flex-1 truncate rounded-xl bg-gray-100 px-3 py-2 text-left text-xs text-gray-500 active:bg-gray-200"
          title="주소 변경">
          {savedUrl}
        </button>
        <button onClick={() => window.open(savedUrl, '_blank')}
          className="h-10 shrink-0 rounded-xl bg-gray-900 px-3 text-xs font-bold text-white active:bg-gray-700">
          인트라넷 열기 ↗
        </button>
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

      {/* 임베드 영역 */}
      <div className="min-h-0 flex-1 bg-white">
        <iframe
          key={frameKey}
          src={savedUrl}
          title="인트라넷"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  )
}
