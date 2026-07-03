import { useHasUnread } from '../lib/unread'

/**
 * 하단 탭바 메시지 탭용 안읽음 점 배지.
 * 부모가 relative여야 한다. 안읽은 대화가 없으면 아무것도 렌더하지 않음.
 */
export default function MessageTabDot() {
  const hasUnread = useHasUnread()
  if (!hasUnread) return null
  return (
    <span
      data-testid="tab-unread-dot"
      className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full"
      style={{ backgroundColor: '#ef4444' }}
    />
  )
}
