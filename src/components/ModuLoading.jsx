/**
 * ModuLoading — 가로형 로고 로딩 (디자이너 확정 D. 2026-09-14)
 * 원본 PNG는 손대지 않고 그 위를 지나가는 빛줄기(overlay)만 움직인다 — modu-d.css 이식.
 * 쓰는 자리: 전체 화면 로딩·스플래시처럼 '글자까지 같이' 들어가는 자리.
 * 작은 인라인 로딩(28~72px)은 글자가 뭉개지므로 기존 ModuSpinner 를 그대로 쓴다.
 * 원본 PNG 가 아직 없거나 로드 실패하면 조용히 ModuSpinner 로 내려간다(빈 화면 금지).
 */
import { useState } from 'react'
import { ModuSpinner } from './ModuSpinner'

export const LOGO_SRC = '/brand/logo.png'
export const LOADING_LABEL = '불러오는 중'

export default function ModuLoading({ width = 260, animated = true, label = LOADING_LABEL, variant = 'default', className = '' }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <ModuSpinner size={Math.min(96, Math.round(width * 0.28))} color={variant === 'white' ? '#ffffff' : undefined} />
  const white = variant === 'white'
  return (
    <div
      className={`modu-d ${className}`}
      role="img"
      aria-label={label}
      data-testid="modu-loading"
      data-animated={animated ? 'true' : 'false'}
      style={{ '--modu-d-width': `${width}px`, ...(white ? { background: 'transparent' } : null) }}
    >
      <img className="modu-d-image" src={white ? '/brand/logo-white.png' : LOGO_SRC} width={1070} height={550} alt="" onError={() => setFailed(true)} />
      <div className="modu-d-overlay" aria-hidden="true">
        <div className="modu-d-highlight" data-testid="modu-loading-shimmer" />
      </div>
    </div>
  )
}

/** 정지 로고 — 움직임 없이 로고만 필요한 자리(A2 상단·A6 환영 등) */
export function ModuLockup({ width = 200, transparent = false, white = false, alt = '모두', fallback = null, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (failed) return fallback
  return (
    <img
      src={white ? '/brand/logo-white.png' : transparent ? '/brand/logo-transparent.png' : LOGO_SRC}
      alt={alt}
      width={1070}
      height={550}
      data-testid="modu-lockup"
      className={className}
      style={{ width, height: 'auto', display: 'block' }}
      onError={() => setFailed(true)}
    />
  )
}

/** 심볼 이미지 — 로고만 들어가는 자리. role 을 주면 그 색 실루엣을 쓴다(작은 크기·역할색 원 안) */
export function ModuSymbolImage({ size = 44, role = null, alt = '', fallback = null, style = null, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (failed) return fallback
  return (
    <img
      src={role ? `/brand/symbol-${role}.png` : '/brand/symbol.png'}
      alt={alt}
      data-testid="modu-symbol-image"
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', ...style }}
      onError={() => setFailed(true)}
    />
  )
}
