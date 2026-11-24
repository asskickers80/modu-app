import { useId } from 'react'

// The supplied artwork stays byte-for-byte intact. Viewports select the symbol
// or complete lockup; they never stretch either part or include the GIF's “D”.
// Lockups align the visible symbol with the Korean word, keeping the English
// line below it. The source pixels are reused in two independently sized slots.
const ARTWORK = {
  symbol: { source: '/brand/modu-logo.png', width: 1070, height: 550, box: '54 39 477 477', ratio: 1 },
  lockup: {
    source: '/brand/modu-logo.png', width: 1070, height: 550, box: '0 0 802 344', ratio: 802 / 344,
    // Source symbol: 461px high; Korean word: 262px high. Scale uniformly.
    parts: [
      { name: 'symbol', x: 8 - 4 * 262 / 461, y: 8 - 4 * 262 / 461, width: 262, height: 469 * 262 / 461, box: '60 44 461 469' },
      { name: 'wordmark', x: 304, y: 4, width: 494, height: 336, box: '549 145 494 336' },
    ],
  },
  'loading-symbol': { source: '/brand/modu-loading.gif', width: 480, height: 290, box: '62 56 178 178', ratio: 1 },
  'loading-lockup': {
    source: '/brand/modu-loading.gif', width: 480, height: 290, box: '0 0 292 128', ratio: 802 / 344,
    // Same footprint as the static alternative; GIF timing stays untouched.
    parts: [
      { name: 'symbol', x: 4 - 4 * 88 / 168, y: 4 - 4 * 88 / 168, width: 174 * 88 / 168, height: 176 * 88 / 168, box: '64 58 174 176' },
      { name: 'wordmark', x: 101, y: 0, width: 186, height: 128, box: '242 95 186 128' },
    ],
  },
}

export default function ModuArtwork({ variant = 'symbol', height = 64, label = 'modu symbol', className = '', style, ...props }) {
  const id = `modu-matte-${useId().replace(/:/g, '')}`
  const artwork = ARTWORK[variant]
  // Old callers may still provide SVG recoloring options. The approved raster
  // colors are fixed; these options must not become HTML attributes or filters.
  const forwarded = { ...props }
  for (const key of ['color', 'highlight', 'outline', 'outlineWidth', 'outlineOpacity', 'speed']) delete forwarded[key]
  return (
    <svg
      width={height * artwork.ratio} height={height} viewBox={artwork.box}
      role="img" aria-label={label} className={className}
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', overflow: 'hidden', ...style }}
      data-brand-artwork={variant} {...forwarded}
    >
      <defs>
        {/* Estimate a matte from this artwork's blue/navy foreground and
            neutral background, then subtract the white contribution at edges.
            Original bytes stay intact; edge recovery from opaque artwork is
            approximate. sRGB keeps the threshold in the supplied color space. */}
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" result="matte"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -8 0 8 0 -0.06" />
          <feComposite in="SourceGraphic" in2="matte" operator="arithmetic" k1="0" k2="1" k3="1" k4="-1" />
        </filter>
      </defs>
      {artwork.parts ? artwork.parts.map(part => (
        <svg key={part.name} x={part.x} y={part.y} width={part.width} height={part.height}
          viewBox={part.box} overflow="hidden" data-brand-part={part.name}>
          <image href={artwork.source} width={artwork.width} height={artwork.height} filter={`url(#${id})`} />
        </svg>
      )) : <image href={artwork.source} width={artwork.width} height={artwork.height} filter={`url(#${id})`} />}
    </svg>
  )
}
