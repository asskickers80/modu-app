/**
 * ModuSymbol — 확정 로고와 같은 모양의 벡터 심볼 (2026-09-16).
 * 작은 크기에서도 또렷하고 역할 색을 입힐 수 있다. 기하는 moduSymbolGeometry(원본 PNG 에서 추출).
 *
 *   <ModuSymbol />                          // 브랜드 블루 단색
 *   <ModuSymbol color="#ffffff" />          // 역할색 원 안 흰 심볼
 *   <ModuSymbol variant="color" />          // 원본 색 그대로(밝은 배경 큰 자리)
 *   <ModuSymbol spin />                     // 로딩 — 위성만 궤도 회전
 */
import { SYMBOL_BALLS, STICK_COLOR, stickWidth } from './moduSymbolGeometry'

const [CENTER, ...SATELLITES] = SYMBOL_BALLS

export default function ModuSymbol({ size = 44, color = '#1683B8', variant = 'mono', spin = false, label = 'modu symbol', style, ...props }) {
  const mono = variant !== 'color'
  const stick = mono ? color : STICK_COLOR
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label} style={style} {...props}>
      <g className={spin ? 'modu-symbol-orbit' : undefined} style={spin ? { transformOrigin: '50px 50px' } : undefined}>
        {SATELLITES.map((s, i) => (
          <line key={`l${i}`} x1={CENTER.cx} y1={CENTER.cy} x2={s.cx} y2={s.cy}
            stroke={stick} strokeWidth={stickWidth(s.r)} strokeLinecap="round" />
        ))}
        {SATELLITES.map((s, i) => (
          <circle key={`s${i}`} cx={s.cx} cy={s.cy} r={s.r} fill={mono ? color : s.fill} />
        ))}
      </g>
      <circle cx={CENTER.cx} cy={CENTER.cy} r={CENTER.r} fill={mono ? color : CENTER.fill} />
    </svg>
  )
}
