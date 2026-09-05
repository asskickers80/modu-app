import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileChips from './ProfileChips'
import UnreadDot from './UnreadDot'
import { ModuMarkHomeButton } from './ModuMark'
import { hasUnreadNotifications } from '../lib/notifications'

/**
 * 홈 헤더 상단 행 공용 (ORDER-header-unify-v1) — 5축 동일 골격:
 * 프로필 칩 · (뱃지) · 모두 심볼 · (축 확장) · 알림 벨 · ⋯
 * 축별 차이는 데이터 수준만: dark(기업회원 보라 다크), mark 색/하이라이트, badge(검증됨),
 * extra(창업자 탐색 필터 등 실동작 요소만 — 껍데기 아이콘 금지), more(⋯ 시트).
 *
 * 벨 = "모두(플랫폼) 발송" 알림 전용 (close-flow-peer-stats에서 알림 센터 실구현).
 * 미읽음 판정·탭 동작을 여기서 일괄 처리 — 5축 홈이 각자 배선할 필요 없음.
 * 사용자 간 활동(새 문의·답장)은 여기 연결 금지: 메시지 탭·홈 지표 담당, 중복 표시 금지.
 */
export default function HomeHeaderBar({
  onProfileTap, dark = false,
  markColor = '#1683B8', markHighlight,
  badge = null, extra = null, more = null,
  showToast, // eslint-disable-line no-unused-vars — 축 홈들이 넘기던 기존 시그니처 유지(벨이 토스트를 쓰던 시절 호환)
}) {
  const navigate = useNavigate()
  const stroke = dark ? 'white' : '#6b7280'
  // 미읽음 = notifications 테이블의 read_at null 존재. 조회 실패는 false — 가짜 점 금지.
  const [hasNotification, setHasNotification] = useState(false)
  useEffect(() => { hasUnreadNotifications().then(setHasNotification) }, [])

  return (
    <div className="flex items-center gap-2 pl-5 pr-4 pt-12 pb-3" data-testid="home-header-bar">
      <ProfileChips dark={dark} onActiveTap={onProfileTap} />
      {badge}
      <ModuMarkHomeButton size={44} color={markColor} highlight={markHighlight} />
      {extra}
      <button
        data-testid="notify-bell"
        aria-label="알림"
        onClick={() => navigate('/notifications')}
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
