/**
 * 안읽음/새 활동 빨간 점 배지 — 단일 소스.
 * 메시지 탭(MessageTabDot)과 홈 문의 타일이 같은 점을 재사용한다(복제 금지).
 * 부모가 relative여야 우상단에 얹힌다.
 */
export default function UnreadDot({
  testId = 'unread-dot',
  className = 'absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full',
}) {
  return (
    <span data-testid={testId} className={className} style={{ backgroundColor: '#ef4444' }} />
  )
}
