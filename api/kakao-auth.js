// Vercel 서버리스 함수 — 카카오 토큰 교환 + 프로필 조회
// 카카오 kauth/kapi는 브라우저 CORS를 허용하지 않아 클라이언트 fetch가 불가능하다.
// (2026-07-16 실측: 두 엔드포인트 모두 Access-Control-Allow-Origin 헤더 없음)
// 클라이언트는 인가 코드만 넘기고, 토큰·프로필은 여기서 처리해 결과만 돌려준다.

const KAKAO_REST_KEY = '5e06205586b30fa239b852a5f41c754c'
// 출시 전 환경변수 이전 과제 유지 — Vercel 대시보드에 KAKAO_CLIENT_SECRET 설정 시 그 값 우선
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET ?? 'aEOqh5Wv1dyIvdbBFy6EacFSFPCNpFd2'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST만 허용됩니다.' })
    return
  }

  const { code, redirect_uri } = req.body ?? {}
  if (!code || !redirect_uri) {
    res.status(400).json({ ok: false, error: 'code와 redirect_uri가 필요합니다.' })
    return
  }

  try {
    // 1. 토큰 교환
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_KEY,
        client_secret: KAKAO_CLIENT_SECRET,
        redirect_uri,
        code,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      res.status(400).json({
        ok: false,
        error: tokenData.error_description ?? tokenData.error ?? '토큰 발급 실패',
        error_code: tokenData.error_code ?? null,
      })
      return
    }

    // 2. 프로필 조회
    const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const kakaoUser = await profileRes.json()
    if (!kakaoUser.id) {
      res.status(400).json({ ok: false, error: '카카오 프로필 조회 실패' })
      return
    }

    res.status(200).json({
      ok: true,
      kakao_id: String(kakaoUser.id),
      nickname: kakaoUser.kakao_account?.profile?.nickname
        ?? kakaoUser.properties?.nickname
        ?? null,
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
