import { useEffect, useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfiles, switchProfile, CATEGORY_CONFIG } from '../lib/userProfile'

/**
 * 대시보드 라우트 ↔ 활성 프로필 불일치를 구조적으로 차단.
 *
 * iOS 가장자리 스와이프(뒤로가기)·bfcache 복원·직접 URL 등 어떤 경로로 이 화면에
 * 도착하든, 화면의 카테고리에 맞춰 활성 프로필을 스스로 동기화한다.
 * - 이 카테고리의 (질문 완료된) 프로필이 있으면 → 그 프로필을 활성으로 맞춤
 * - 없으면 → 실제 활성 프로필의 홈으로 리다이렉트
 * → 칩과 화면 내용이 어긋난 상태가 지속될 수 없다.
 */
export function useProfileRouteSync(category) {
  const navigate = useNavigate()
  const [, force] = useReducer(x => x + 1, 0)

  useEffect(() => {
    const sync = () => {
      const profiles = getProfiles()
      const active = profiles.find(p => p.active)
      if (!active || active.category === category) return
      const match = profiles.find(p => p.category === category && !p.pending)
      if (match) {
        switchProfile(match.id)
        force() // localStorage는 반응형이 아니므로 강제 재렌더로 칩 갱신
      } else if (CATEGORY_CONFIG[active.category]?.home) {
        navigate(CATEGORY_CONFIG[active.category].home, { replace: true })
      }
    }
    sync()
    // bfcache 복원·앱 전환 복귀 시에도 재동기화
    window.addEventListener('pageshow', sync)
    window.addEventListener('focus', sync)
    return () => {
      window.removeEventListener('pageshow', sync)
      window.removeEventListener('focus', sync)
    }
  }, [category, navigate])
}
