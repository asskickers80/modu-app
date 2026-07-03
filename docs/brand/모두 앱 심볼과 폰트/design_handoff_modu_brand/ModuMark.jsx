/**
 * 모두(modu) brand symbol — FINAL.
 *
 * Single-color "living cell / ecosystem" mark: a plump round body with 8
 * irregular-length stalks ending in circles + squircles, balanced all around
 * with a very slight upper-right lean, plus a glossy negative-space highlight
 * (upper-left) and a small sparkle for cuteness.
 *
 * The highlight is rendered as a separate fill so it can show the background
 * through (negative space) — pass `highlight` = the surface color behind it.
 *
 * Usage:
 *   <ModuMark />                                      // blue mark, white gloss — light backgrounds
 *   <ModuMark color="#1683B8" highlight="#FFFFFF" />  // explicit (same as default)
 *   <ModuMark color="#FFFFFF" highlight="#1683B8" />  // inverted — on a Primary-Blue tile
 *   <ModuMark color="#5FD0CA" highlight="#0E3E46" />  // on a deep/dark surface
 *   <ModuMark size={128} className="logo" />
 *
 * At <= 16px the highlight can be omitted (pass highlight={color}).
 */
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
        <ellipse cx="41.5" cy="41.5" rx="7" ry="4.8" transform="rotate(-38 41.5 41.5)" fill={highlight} />
        <circle cx="35.8" cy="37.6" r="2" fill={highlight} />
      </g>
    </svg>
  );
}

export default ModuMark;
