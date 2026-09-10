/**
 * 알림 센터 목록 (ORDER-close-flow-peer-stats-v1 항목 3) — "모두 발송" 알림 전용.
 * 벨(HomeHeaderBar) 탭 → 이 화면. 항목 탭 = 읽음 처리 + 관련 화면 딥링크(payload.link).
 * 사용자 간 활동(문의·답장)은 여기 안 나온다 — 메시지 탭 담당(벨 원칙, 중복 금지).
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useSafeBack from '../hooks/useSafeBack'
import { fetchNotifications, markNotificationRead } from '../lib/notifications'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import UnreadDot from '../components/UnreadDot'
import { markWatchNotifClicked } from '../lib/watchlist'

const TYPE_ICON = {
  repost_remind: '🔔', lease_end: '📅', peer_trend: '📊', my_value: '📈', notice: '📣',
  watch_price: '💰', watch_info: '🆕', watch_status: '🏷️', watch_similar: '📍', watch_density: '🔥', watch_owner_msg: '💬', watch_deal_result: '🤝',
}

// 상대 시간 — 세밀한 분 단위보다 "언제쯤"이면 충분한 화면
const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 864e5)
  if (days <= 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const config = CATEGORY_CONFIG[getProfile().category] ?? CATEGORY_CONFIG.seller
  const safeBack = useSafeBack(config.home)
  const [rows, setRows] = useState(null) // null=로딩, []=빈 상태

  useEffect(() => { fetchNotifications().then(setRows) }, [])

  const open = (n) => {
    markNotificationRead(n.id)
    if (n.payload?.kind) markWatchNotifClicked(n.id, n.payload.kind)
    setRows(rs => (rs ?? []).map(r => r.id === n.id ? { ...r, read_at: r.read_at ?? new Date().toISOString() } : r))
    if (n.payload?.link) navigate(n.payload.link)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 flex items-center gap-2 px-3 pt-12 pb-3 border-b border-gray-50">
        <button onClick={safeBack} aria-label="뒤로" className="w-11 h-11 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 4l-6 6 6 6" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-t17 font-bold text-gray-900">알림</h1>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {rows === null ? (
          <div className="px-5 py-6 space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center -mt-10">
            <span className="text-[40px]">🔕</span>
            <p className="text-t15 font-bold text-gray-900">아직 알림이 없어요</p>
            <p className="text-t13 text-gray-400 leading-relaxed">
              다시 올릴 때·임대차 만료 같은<br />중요한 소식이 생기면 여기로 알려드려요
            </p>
          </div>
        ) : (
          rows.map((n, i) => (
            <div key={n.id}>
              <button onClick={() => open(n)} data-testid="notification-item"
                className="w-full flex items-start gap-3 px-5 py-4 text-left active:bg-gray-50/80 transition-colors">
                <span className="relative shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-t18"
                  style={{ backgroundColor: config.bg }}>
                  {TYPE_ICON[n.type] ?? '📣'}
                  {!n.read_at && <UnreadDot testId="notification-unread" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-t14 ${n.read_at ? 'font-medium text-gray-500' : 'font-bold text-gray-900'}`}>
                    {n.title}
                  </span>
                  {n.body && <span className="block text-t12 text-gray-400 mt-0.5 leading-relaxed">{n.body}</span>}
                  <span className="block text-t11 text-gray-300 mt-1">{timeAgo(n.sent_at ?? n.created_at)}</span>
                </span>
              </button>
              {i < rows.length - 1 && <div className="h-px bg-gray-50 mx-5" />}
            </div>
          ))
        )}
      </main>
    </div>
  )
}
