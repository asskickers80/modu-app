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
export function ModuMark({ size = 64, color = '#1683B8', highlight = '#FFFFFF', ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="modu symbol" {...props}>
      <g transform="translate(9,9) scale(0.82)">
        <path
          d="M 63.90 37.04 L 79.26 22.72 M 68.97 50.99 L 90.94 52.14 M 50.66 31.01 L 51.12 18.02 M 36.33 36.80 L 22.67 23.60 M 62.71 64.12 L 70.74 73.04 M 48.01 68.90 L 46.24 85.80 M 31.00 49.67 L 21.00 49.49 M 35.66 62.47 L 22.08 74.28"
          fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round"
        />
        {/* stalk ends: circles + 2 squircles, varied sizes */}
        <circle cx="79.26" cy="22.72" r="5" fill={color} />
        <circle cx="90.94" cy="52.14" r="6.2" fill={color} />
        <circle cx="51.12" cy="18.02" r="6.2" fill={color} />
        <circle cx="22.67" cy="23.60" r="5.2" fill={color} />
        <rect x="66.44" y="68.74" width="8.6" height="8.6" rx="2.6" fill={color} />
        <circle cx="46.24" cy="85.80" r="5.4" fill={color} />
        <rect x="16.50" y="44.99" width="9" height="9" rx="2.7" fill={color} />
        <circle cx="22.08" cy="74.28" r="4.8" fill={color} />
        {/* body */}
        <circle cx="50" cy="50" r="23" fill={color} />
        {/* glossy highlight (negative space) + sparkle */}
        {highlight !== 'none' && (
          <>
            <ellipse cx="41.5" cy="41.5" rx="7" ry="4.8" transform="rotate(-38 41.5 41.5)" fill={highlight} />
            <circle cx="35.8" cy="37.6" r="2" fill={highlight} />
          </>
        )}
      </g>
    </svg>
  )
}

export default ModuMark
