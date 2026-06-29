// ModuMark — 모두(modu) 브랜드 심볼 React 컴포넌트
// 소스: docs/brand/.../ModuMark.jsx (그대로 복사, props 동일)
//
// 사용법:
//   <ModuMark size={64} />                                  // 기본 (파란 마크, 흰 하이라이트)
//   <ModuMark size={64} color="#fff" highlight="#1683B8" /> // 반전 (흰 마크, 파란 타일 위)
//   <ModuMark size={16} highlight="none" />                 // 파비콘 등 소형: 하이라이트 생략
//
// Props:
//   size       number|string  — px (기본값 64)
//   color      string         — 마크 색 (기본값 Brand Primary Blue)
//   highlight  string         — 광택 하이라이트 색; 배경색 전달 또는 "none"으로 생략
export function ModuMark({ size = 64, color = '#1683B8', highlight = '#ffffff', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="modu"
      style={{ color }}
      {...props}
    >
      <g transform="translate(9,9) scale(0.82)">
        {/* 돌기(stalk) — stroke=currentColor */}
        <path
          d="M 67.97 51.06 L 89.93 52.35 M 65.11 59.78 L 74.35 65.75 M 58.47 65.88 L 66.47 80.88 M 46.39 67.63 L 44.58 76.45 M 38.19 63.58 L 23.10 80.94 M 33.07 56.12 L 20.84 60.53 M 33.06 43.90 L 15.19 37.47 M 38.22 36.39 L 32.98 30.34 M 46.37 32.37 L 43.13 16.70 M 58.45 34.11 L 64.09 23.52 M 65.14 40.26 L 81.95 29.44"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.4}
          strokeLinecap="round"
        />
        {/* 돌기 끝: circle / squircle, 크기 다양 */}
        <circle cx="89.93" cy="52.35" r="6.30" fill="currentColor" />
        <rect x="69.85" y="61.25" width="9.00" height="9.00" rx="2.25" fill="currentColor" />
        <circle cx="66.47" cy="80.88" r="2.93" fill="currentColor" />
        <circle cx="44.58" cy="76.45" r="5.13" fill="currentColor" />
        <rect x="16.97" y="74.81" width="12.26" height="12.26" rx="3.06" fill="currentColor" />
        <circle cx="20.84" cy="60.53" r="3.68" fill="currentColor" />
        <rect x="11.89" y="34.17" width="6.60" height="6.60" rx="1.65" fill="currentColor" />
        <circle cx="32.98" cy="30.34" r="5.86" fill="currentColor" />
        <circle cx="43.13" cy="16.70" r="5.57" fill="currentColor" />
        <rect x="61.00" y="20.43" width="6.18" height="6.18" rx="1.54" fill="currentColor" />
        <circle cx="81.95" cy="29.44" r="4.02" fill="currentColor" />
        {/* 몸체 */}
        <circle cx="50" cy="50" r="22" fill="currentColor" />
        {/* 광택 하이라이트 (네거티브 스페이스) */}
        {highlight !== 'none' && (
          <>
            <ellipse cx="42.5" cy="42.5" rx="6.6" ry="4.7" transform="rotate(-38 42.5 42.5)" fill={highlight} />
            <circle cx="37.5" cy="38.8" r="1.9" fill={highlight} />
          </>
        )}
      </g>
    </svg>
  )
}

export default ModuMark
