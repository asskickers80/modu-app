// 네이버 OAuth 공통 상수 — 카카오(lib/kakao.js)와 동일 구조
//
// 클라이언트 ID는 빌드 환경변수로 주입:
// - 로컬: .env에 VITE_NAVER_CLIENT_ID
// - 프로덕션: Vercel 대시보드 Environment Variables에 VITE_NAVER_CLIENT_ID
// 미설정이면 A4 네이버 버튼은 기존 더미 통과(개발·테스트용) 동작을 유지한다.
export const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID ?? null

const CANONICAL_ORIGIN = 'https://modu-app-asskickers80s-projects.vercel.app'

// 네이버 개발자센터에 등록된 Callback URL과 정확히 일치해야 한다
export const NAVER_REDIRECT_URI = import.meta.env.DEV
  ? `${window.location.origin}/auth/naver-callback`
  : `${CANONICAL_ORIGIN}/auth/naver-callback`
