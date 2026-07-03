// ModuSpinner — 모두(modu) 로딩 스피너 (최종 확정)
// 소스: docs/brand/모두 앱 심볼과 폰트/design_handoff_modu_brand/ModuSpinner.jsx (그대로 복사)
//
// 심볼의 3D 궤도 회전: 몸체·광택 하이라이트는 고정, 돌기 8개가 한 몸처럼
// 구(球) 궤도를 돌며 몸체 앞뒤로 지나감. 뒤쪽은 작고 흐리게(깊이감),
// 회전은 불규칙(기본 속도 + 사인파 서지) — '살아있는 세포' 느낌.
//
// 사용법:
//   <ModuSpinner />                                       // 블루 마크 on 흰 배경 (인라인 로더)
//   <ModuSpinner color="#FFFFFF" highlight="#1683B8" />   // 흰 마크 on Primary Blue (다크/컬러 배경)
//   <ModuSpinner size={48} speed={3.8} />
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
