import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfiles, activateProfile } from '../lib/userProfile'

/**
 * 화면 전체 좌우 스와이프로 프로필 전환 (대시보드 루트에 부착).
 * - 가로 이동이 확실할 때만 발동: 80px 이상 && 가로가 세로의 2배 — 세로 스크롤과 구분
 * - 가로 스크롤 가능한 요소(칩 줄·카드 캐러셀) 위에서 시작한 제스처는 무시
 * - 왼쪽으로 밀기 = 다음 프로필, 오른쪽 = 이전. 방향에 프로필 없으면 onEnd(프로필 시트)
 */
export function useProfileSwipe(onEnd) {
  const navigate = useNavigate()
  const touch = useRef(null)

  const onTouchStart = (e) => {
    let el = e.target
    while (el && el !== e.currentTarget) {
      if (el.scrollWidth > el.clientWidth + 5) { touch.current = null; return }
      el = el.parentElement
    }
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const onTouchEnd = (e) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return
    const profiles = getProfiles()
    const activeIdx = Math.max(0, profiles.findIndex(p => p.active))
    const nextIdx = dx < 0 ? activeIdx + 1 : activeIdx - 1
    if (nextIdx < 0 || nextIdx >= profiles.length) {
      onEnd?.()
      return
    }
    const target = profiles[nextIdx]
    if (target && !target.active) activateProfile(navigate, target.id)
  }

  return { onTouchStart, onTouchEnd }
}
