// 네이버 OAuth 공통 상수 — 카카오(lib/kakao.js)와 동일 구조
//
// 개발·테스트(DEV): 키가 없으면 A4 네이버 버튼은 더미 통과 유지 — Playwright 온보딩 테스트가 이 경로를 쓴다.
// 프로덕션 빌드: 실 클라이언트 ID 기본값 (환경변수 VITE_NAVER_CLIENT_ID 설정 시 그 값 우선)
export const NAVER_CLIENT_ID = import.meta.env.DEV
  ? (import.meta.env.VITE_NAVER_CLIENT_ID ?? null)
  : (import.meta.env.VITE_NAVER_CLIENT_ID ?? 'iqHcoQsLqmEydZJ4te59')

const CANONICAL_ORIGIN = 'https://modu-app-asskickers80s-projects.vercel.app'

// 네이버 개발자센터에 등록된 Callback URL과 정확히 일치해야 한다
export const NAVER_REDIRECT_URI = import.meta.env.DEV
  ? `${window.location.origin}/auth/naver-callback`
  : `${CANONICAL_ORIGIN}/auth/naver-callback`
