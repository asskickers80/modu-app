// ModuMark — 모두(modu) 브랜드 로고 (2026-11-13: PC판과 같은 로고로 통일)
// PC(modu-web)의 ModuMark/ModuLogo 와 같은 방식이다 — 확정 로고 한 장(public/brand/modu-logo.png)에서
// 심볼만(ModuMark) 또는 심볼+글자(ModuLogo)를 잘라 쓴다. 색은 확정 그림 그대로라 color·highlight 같은 옛 옵션은 무시된다
// (호출부 수정 없이 넘어가기 위해 시그니처만 유지). 그림 처리는 ModuArtwork.jsx — PC 파일과 같게 유지(바꿀 때 PC와 같이).
import { useNavigate } from 'react-router-dom'
import { getProfile } from '../lib/userProfile'
import ModuArtwork from './ModuArtwork'

const HOME_MAP = {
  seller:    '/a7/seller',
  landlord:  '/a7/landlord',
  startup:   '/a7/startup',
  operating: '/a7/operating',
  business:  '/a7/business',
  browsing:  '/a7/browsing',
}

function useProfileHome() {
  const navigate = useNavigate()
  return () => {
    const profile = getProfile()
    navigate(HOME_MAP[profile.category] ?? '/a7/seller')
  }
}

export function ModuMarkHomeButton({ size = 34, ...props }) {
  const handleClick = useProfileHome()
  return (
    <button onClick={handleClick} className="active:opacity-70 transition-opacity">
      <ModuMark size={size} {...props} />
    </button>
  )
}

export function ModuLogoHomeButton({ height = 36, ...props }) {
  const handleClick = useProfileHome()
  return (
    <button onClick={handleClick} className="active:opacity-70 transition-opacity" aria-label="모두 홈">
      <ModuLogo height={height} {...props} />
    </button>
  )
}

export function ModuMark({ size = 64, className = '', ...props }) {
  return <ModuArtwork variant="symbol" height={size} className={`modu-mark ${className}`} {...props} />
}

export function ModuLogo({ height = 54, className = '', ...props }) {
  return <ModuArtwork variant="lockup" height={height} label="모두 modu" className={`modu-logo ${className}`} {...props} />
}

export default ModuMark
