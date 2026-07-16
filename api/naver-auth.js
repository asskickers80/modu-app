// Vercel 서버리스 함수 — 네이버 토큰 교환 + 프로필 조회
// 네이버 nid/openapi도 카카오와 마찬가지로 브라우저 CORS를 허용하지 않아 서버 경유가 필수.
// 필요 환경변수 (Vercel 대시보드에서 설정): NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST만 허용됩니다.' })
    return
  }

  const { code, state } = req.body ?? {}
  if (!code) {
    res.status(400).json({ ok: false, error: 'code가 필요합니다.' })
    return
  }

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    res.status(500).json({ ok: false, error: '서버에 네이버 키가 설정되지 않았습니다 (Vercel 환경변수 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)' })
    return
  }

  try {
    // 1. 토큰 교환
    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token?' + new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      state: state ?? '',
    }))
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      res.status(400).json({
        ok: false,
        error: tokenData.error_description ?? tokenData.error ?? '토큰 발급 실패',
      })
      return
    }

    // 2. 프로필 조회
    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()
    if (profile.resultcode !== '00' || !profile.response?.id) {
      res.status(400).json({ ok: false, error: '네이버 프로필 조회 실패: ' + (profile.message ?? '') })
      return
    }

    res.status(200).json({
      ok: true,
      naver_id: String(profile.response.id),
      nickname: profile.response.nickname ?? profile.response.name ?? null,
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
