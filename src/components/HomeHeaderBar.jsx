import ProfileChips from './ProfileChips'
import UnreadDot from './UnreadDot'
import { ModuMarkHomeButton } from './ModuMark'

/**
 * 홈 헤더 상단 행 공용 (ORDER-header-unify-v1) — 5축 동일 골격:
 * 프로필 칩 · (뱃지) · 모두 심볼 · (축 확장) · 알림 벨 · ⋯
 * 축별 차이는 데이터 수준만: dark(기업회원 보라 다크), mark 색/하이라이트, badge(검증됨),
 * extra(창업자 탐색 필터 등 실동작 요소만 — 껍데기 아이콘 금지), more(⋯ 시트).
 */
export default function HomeHeaderBar({
  onProfileTap, dark = false,
  markColor = '#1683B8', markHighlight,
  badge = null, extra = null, more = null,
  showToast,
  // "모두(플랫폼) 발송" 알림 미확인 여부 (ORDER-notification-bell-v1) — 사용자 간 활동
  // (새 문의·답장·안읽은 메시지)은 여기 연결 금지: 메시지 탭·홈 지표 담당, 중복 표시 금지.
  // 현재 모두 발송 이벤트 0개 → 기본 false. 상시 점 하드코딩 금지.
  hasNotification = false,
}) {
  const stroke = dark ? 'white' : '#6b7280'
  return (
    <div className="flex items-center gap-2 pl-5 pr-4 pt-12 pb-3" data-testid="home-header-bar">
      <ProfileChips dark={dark} onActiveTap={onProfileTap} />
      {badge}
      <ModuMarkHomeButton size={44} color={markColor} highlight={markHighlight} />
      {extra}
      {/* 알림 벨 — 모두 발송 알림 전용. 알림 센터 구현 시 아래 onClick만 라우트 이동으로
          교체하면 5축 동시 반영 (docs/NOTIFICATION-CENTER-PLAN.md) */}
      <button
        data-testid="notify-bell"
        aria-label="알림"
        onClick={() => showToast?.('알림 센터는 준비 중이에요 — 새 문의는 메시지 탭에서 확인할 수 있어요')}
        className={`relative shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${dark ? '' : 'border border-gray-200'}`}
        style={dark ? { backgroundColor: 'rgba(255,255,255,0.1)' } : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2a5 5 0 015 5v2.5l1 1.5H2l1-1.5V7a5 5 0 015-5z"
            stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M6.5 13a1.5 1.5 0 003 0" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {hasNotification && <UnreadDot testId="notify-dot" className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" />}
      </button>
      {more}
    </div>
  )
}
