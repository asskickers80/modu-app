// 앱 정식 주소 — OAuth 콜백·인증 메일 링크 등 "외부에서 돌아오는 주소"의 기준.
// Vercel은 배포마다 고유 주소가 생기므로 window.origin을 그대로 쓰면
// 접속 경로에 따라 미등록 주소가 되어 실패한다 (카카오 KOE006 사례).
export const CANONICAL_ORIGIN = 'https://modu-app-asskickers80s-projects.vercel.app'

export const PUBLIC_ORIGIN = import.meta.env.DEV
  ? window.location.origin
  : CANONICAL_ORIGIN
