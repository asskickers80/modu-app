import ProfileChips from './ProfileChips'
import { ModuMarkHomeButton } from './ModuMark'

/**
 * 홈 헤더 상단 행 공용 (ORDER-header-unify-v1) — 5축 동일 골격: 프로필 칩 · (뱃지) · 모두 심볼 · (축 확장) · ⋯
 * 축별 차이는 데이터 수준만: dark(기업회원 보라 다크), mark 색/하이라이트, badge(검증됨),
 * extra(창업자 탐색 필터 등 실동작 요소만 — 껍데기 아이콘 금지), more(⋯ 시트).
 * 알림 벨은 전 축 부재 — 알림 센터 미구현 상태의 껍데기 벨·가짜 빨간 점 금지(품질 원칙).
 * 실구현 시 이 컴포넌트에 UnreadDot 규격으로 일괄 추가한다.
 */
export default function HomeHeaderBar({
  onProfileTap, dark = false,
  markColor = '#1683B8', markHighlight,
  badge = null, extra = null, more = null,
}) {
  return (
    <div className="flex items-center gap-2 pl-5 pr-4 pt-12 pb-3" data-testid="home-header-bar">
      <ProfileChips dark={dark} onActiveTap={onProfileTap} />
      {badge}
      <ModuMarkHomeButton size={44} color={markColor} highlight={markHighlight} />
      {extra}
      {more}
    </div>
  )
}
