import { useNavigate } from 'react-router-dom'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import MessageTabDot from './MessageTabDot'

/**
 * 하단 네비게이션 5탭 공용 — 홈/탐색/커뮤니티/메시지/마이.
 *
 * 이 컴포넌트 이전에는 11개 화면(A7 6종·MyPage·D4 인박스 4종)이 각자 아이콘 5개와
 * 탭 배열을 복제하고 있었다. 탭 구성·아이콘·이동 규칙의 단일 소스.
 *
 * 이동 경로는 CATEGORY_CONFIG(활성 프로필)에서 가져온다 — 축이 늘어도 여기 수정 불필요.
 * 활성 탭을 다시 눌러도 아무 일도 일어나지 않는다(기존 11개 화면 공통 동작).
 *
 * @param active        현재 탭 id — 'home'|'explore'|'community'|'message'|'my'
 * @param accent        활성 탭 색 (축 주색)
 * @param activeBg      홈 아이콘 채움색 (축 연한색). 없으면 채우지 않음
 * @param inactiveColor 비활성 탭 색 — 기본 #9ca3af (방문자 축만 더 옅은 값을 쓴다)
 * @param homePath      홈 탭 목적지 재정의. 없으면 활성 프로필의 홈
 * @param onMessage     메시지 목적지가 없는 축(방문자)에서 대신 호출 — 가입 유도·안내
 */

const ICON = {
  home: (c, bg) => (
    <>
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={bg ?? 'none'} />
      <path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  explore: (c) => (
    <>
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" />
      <path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  community: (c) => (
    <>
      <path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
  message: (c) => (
    <>
      <rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" />
      <path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  my: (c) => (
    <>
      <circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" />
      <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
}

const TABS = [
  { id: 'home', label: '홈' },
  { id: 'explore', label: '탐색' },
  { id: 'community', label: '커뮤니티' },
  { id: 'message', label: '메시지' },
  { id: 'my', label: '마이' },
]

export default function BottomNav({
  active,
  accent,
  activeBg = null,
  inactiveColor = '#9ca3af',
  homePath = null,
  onMessage = null,
}) {
  const navigate = useNavigate()
  const cfg = CATEGORY_CONFIG[getProfile().category] ?? CATEGORY_CONFIG.seller

  const go = (id) => {
    if (id === active) return // 활성 탭 재탭 = 무동작
    if (id === 'home') { navigate(homePath ?? cfg.home); return }
    if (id === 'explore') { navigate('/explore'); return }
    if (id === 'community') { navigate('/community'); return }
    if (id === 'my') { navigate('/my'); return }
    if (id === 'message') {
      // 메시지 화면이 없는 축(방문자)은 이동 대신 호출부가 처리 (가입 유도·안내)
      if (cfg.message) navigate(cfg.message)
      else onMessage?.()
    }
  }

  return (
    <nav className="shrink-0 bg-white border-t border-gray-100" data-testid="bottom-nav">
      <div className="flex items-center">
        {TABS.map(({ id, label }) => {
          const isActive = id === active
          const c = isActive ? accent : inactiveColor
          return (
            <button
              key={id}
              onClick={() => go(id)}
              data-testid={`nav-${id}`}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95"
            >
              <span className="relative">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  {id === 'home' ? ICON.home(c, isActive ? activeBg : null) : ICON[id](c)}
                </svg>
                {/* 안읽음 점은 메시지 화면이 아닐 때만 — 인박스에 들어와 있으면 불필요 */}
                {id === 'message' && active !== 'message' && <MessageTabDot />}
              </span>
              <span className="text-t10 font-semibold" style={{ color: c }}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
