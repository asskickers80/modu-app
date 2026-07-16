// 카카오 OAuth 공통 상수
// redirect_uri는 카카오 콘솔에 등록된 주소와 정확히 일치해야 한다 (불일치 시 KOE006).
// Vercel은 배포마다 고유 주소(modu-app-xxxx...vercel.app)가 생기므로 window.origin을 쓰면
// 접속 경로에 따라 미등록 주소가 되어 실패한다 → 프로덕션은 정식 주소로 고정.
import { PUBLIC_ORIGIN } from './appOrigin'

export const KAKAO_REST_KEY = '5e06205586b30fa239b852a5f41c754c'

export const KAKAO_REDIRECT_URI = `${PUBLIC_ORIGIN}/auth/kakao-callback`
