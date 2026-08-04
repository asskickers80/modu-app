import { useNavigate, useLocation } from 'react-router-dom'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'

/**
 * 안전한 뒤로가기 (back-nav-fix).
 *
 * navigate(-1)은 "브라우저 스택의 직전 항목"으로 가기 때문에, 앱 밖에서 바로 들어왔거나
 * 인증 왕복(카카오/네이버 콜백)이 스택에 남아 있으면 로그인 처리 화면 같은 막다른 곳으로 간다.
 * 이 훅은 앱 안에서 이동해 온 경우에만 뒤로 가고, 아니면 활성 프로필의 홈으로 보낸다.
 *
 * 판정: react-router의 location.key — 앱 안에서 push로 이동한 항목은 고유 key를 갖고,
 * 새 문서(직접 진입·외부 복귀)의 첫 항목은 'default'다.
 */
export function homePath() {
  const cat = getProfile()?.category
  return CATEGORY_CONFIG[cat]?.home ?? '/a7/browsing'
}

export default function useSafeBack(fallback) {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    const dest = fallback ?? homePath()
    if (location.key && location.key !== 'default') { navigate(-1); return }
    navigate(dest, { replace: true })
  }
}
