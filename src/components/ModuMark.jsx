// ModuMark — 모두(modu) 브랜드 심볼 React 컴포넌트 (최종 확정)
// 소스: docs/brand/모두 앱 심볼과 폰트/design_handoff_modu_brand/ModuMark.jsx (그대로 복사 — 지오메트리 수정 금지)
//
// 단색 "살아있는 세포" 마크: 통통한 몸체(r23) + 길이가 제각각인 돌기 8개
// (circle 6 + squircle 2) + 좌상단 광택 하이라이트(네거티브 스페이스) + 스파클.
//
// 사용법:
//   <ModuMark />                                      // 기본 (파란 마크, 흰 하이라이트) — 밝은 배경
//   <ModuMark color="#FFFFFF" highlight="#1683B8" />  // 반전 — Primary Blue 타일 위
//   <ModuMark size={16} highlight="#1683B8" />        // 16px 이하: 하이라이트 생략 (highlight=color)
import { useNavigate } from 'react-router-dom'
import { getProfile } from '../lib/userProfile'
import ModuSymbol from './ModuSymbol'

const HOME_MAP = {
  seller:    '/a7/seller',
  landlord:  '/a7/landlord',
  startup:   '/a7/startup',
  operating: '/a7/operating',
  business:  '/a7/business',
  browsing:  '/a7/browsing',
}

/**
 * 헤더 홈 버튼 — 작은 크기(≤44px)는 기존 SVG 마크를 쓴다.
 * 2026-09-14 새 3D 로고의 단색 실루엣을 넣어 봤으나 이 크기에서 구슬이 붙어 형태가 뭉개졌다(2026-09-16 실기기 확인).
 * 새 로고는 큰 자리(스플래시·A2·A6·앱 아이콘·로딩)에만 쓴다 — docs/BRAND.md 자리 표.
 */
export function ModuMarkHomeButton({ size = 34, color = '#1683B8', highlight = '#FFFFFF', ...props }) {
  const navigate = useNavigate()
  const handleClick = () => {
    const profile = getProfile()
    navigate(HOME_MAP[profile.category] ?? '/a7/seller')
  }
  return (
    <button onClick={handleClick} className="active:opacity-70 transition-opacity">
      <ModuMark size={size} color={color} highlight={highlight} {...props} />
    </button>
  )
}

/**
 * ModuMark — 앱 전체 심볼. 2026-09-16 부터 확정 로고(2026-09-14)와 같은 기하를 그린다.
 * 기존 호출부(26자리)의 props 를 그대로 받는다: size·color·highlight·outline.
 *  - highlight/outline 은 옛 마크의 광택·외곽선용이었다. 새 기하에는 광택이 없어 무시한다(호출부 수정 없이 넘어가기 위해 시그니처만 유지).
 *  - 큰 자리(스플래시·A2·A6·앱 아이콘)는 원본 3D PNG 를 쓴다 — docs/BRAND.md 자리 표.
 */
export function ModuMark({ size = 64, color = '#1683B8', highlight, outline, outlineWidth, outlineOpacity, variant = 'mono', ...props }) {
  void highlight; void outline; void outlineWidth; void outlineOpacity
  return <ModuSymbol size={size} color={color} variant={variant} {...props} />
}

export default ModuMark
