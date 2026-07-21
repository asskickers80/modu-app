import { useHasUnread } from '../lib/unread'
import UnreadDot from './UnreadDot'

/**
 * 하단 탭바 메시지 탭용 안읽음 점 배지.
 * 부모가 relative여야 한다. 안읽은 대화가 없으면 아무것도 렌더하지 않음.
 * 점 자체는 UnreadDot 단일 소스 재사용(홈 문의 타일과 동일 컴포넌트).
 */
export default function MessageTabDot() {
  const hasUnread = useHasUnread()
  if (!hasUnread) return null
  return <UnreadDot testId="tab-unread-dot" />
}
