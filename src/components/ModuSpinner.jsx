/**
 * ModuSpinner — 로딩 표시 (2026-09-16 확정 로고 기하로 교체).
 * 중심 공은 고정, 위성만 궤도를 돈다. 기기에서 '동작 줄이기'를 켜면 멈춘다(modu-d.css).
 * 접근성 이름은 기존과 같은 'loading' — 로딩 회귀 테스트가 이 이름을 고정한다.
 *
 *   <ModuSpinner />                     // 블루 마크 on 흰 배경
 *   <ModuSpinner color="#FFFFFF" />     // 흰 마크 on 컬러 배경
 */
import ModuSymbol from './ModuSymbol'

export function ModuSpinner({ size = 108, color = '#1683B8', highlight, speed, ...props }) {
  void highlight; void speed
  return <ModuSymbol size={size} color={color} spin label="loading" {...props} />
}

export default ModuSpinner
