/**
 * 모두(modu) loading spinner — FINAL.
 *
 * 3D "orbit" rotation of the brand symbol: the plump body (with glossy
 * highlight) stays still while the 8 stalks orbit it as a rigid sphere —
 * passing in front of and behind the body. The rotation is deliberately
 * irregular (surges and eases) so it feels alive, matching the
 * "living cell / ecosystem" concept.
 *
 * Behind-stalks render smaller + dimmer; front-stalks bigger — depth cue.
 *
 * Usage:
 *   <ModuSpinner />                                       // blue-on-white (inline loader)
 *   <ModuSpinner color="#FFFFFF" highlight="#1683B8" />   // white-on-blue (splash screen)
 *   <ModuSpinner size={108} speed={3.8} />
 *
 * Props:
 *   size      px (default 108)
 *   color     mark color   (default '#1683B8')
 *   highlight gloss color = surface behind the mark (default '#FFFFFF')
 *   speed     base angular speed, rad/s (default 3.8)
 *
 * Splash-screen composition (see brand spec): Primary Blue #1683B8 full-bleed,
 * white spinner centered, '모두' wordmark (Cafe24 Ssurround) below.
 */
import { useEffect, useRef, useState } from 'react';

const STALKS = [
  { e: 58,  len: 14, r: 5.0, ph: 0.00 },
  { e: 34,  len: 18, r: 6.2, ph: 0.79 },
  { e: 12,  len: 15, r: 5.2, ph: 1.57 },
  { e: -8,  len: 19, r: 5.8, ph: 2.36 },
  { e: -28, len: 15, r: 5.0, ph: 3.14 },
  { e: -48, len: 13, r: 4.6, ph: 3.93 },
  { e: 22,  len: 13, r: 4.4, ph: 4.71 },
  { e: -18, len: 12, r: 4.2, ph: 5.50 },
];

export function ModuSpinner({ size = 108, color = '#1683B8', highlight = '#FFFFFF', speed = 3.8, ...props }) {
  const [t, setT] = useState(0);
  const raf = useRef();

  useEffect(() => {
    const start = performance.now();
    const loop = (now) => {
      setT((now - start) / 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // irregular global rotation: base spin + layered sine surges
  const A = t * speed + 1.1 * Math.sin(t * 1.1) + 0.55 * Math.sin(t * 2.4 + 1.2);

  const behind = [];
  const front = [];
  STALKS.forEach((s, i) => {
    const a = A + s.ph;
    const er = (s.e * Math.PI) / 180;
    const dx = Math.sin(a) * Math.cos(er);
    const dy = Math.sin(er);
    const dz = Math.cos(a) * Math.cos(er);
    const sx = dx, sy = -dy;
    const p = 0.72 + 0.30 * dz;          // perspective scale
    const tipD = 23 + s.len * p;
    const x1 = 50 + sx * 20, y1 = 50 + sy * 20;
    const x2 = 50 + sx * tipD, y2 = 50 + sy * tipD;
    const isFront = dz >= 0;
    const g = (
      <g key={i} opacity={isFront ? 1 : 0.45}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={3.6 * p} strokeLinecap="round" />
        <circle cx={x2} cy={y2} r={s.r * p} fill={color} />
      </g>
    );
    (isFront ? front : behind).push(g);
  });

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="loading" {...props}>
      <g transform="rotate(-10 50 50)">
        {behind}
        <circle cx="50" cy="50" r="21" fill={color} />
        <ellipse cx="42.2" cy="42.2" rx="6.4" ry="4.4" transform="rotate(-38 42.2 42.2)" fill={highlight} />
        <circle cx="37.1" cy="38.7" r="1.8" fill={highlight} />
        {front}
      </g>
    </svg>
  );
}

export default ModuSpinner;
