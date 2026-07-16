import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { finishLogin } from '../lib/auth'

const KAKAO_REST_KEY     = '5e06205586b30fa239b852a5f41c754c'
const KAKAO_CLIENT_SECRET = 'aEOqh5Wv1dyIvdbBFy6EacFSFPCNpFd2'
const NAVY = '#1a4d8f'

export default function AuthKakaoCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) { setError('인증 코드가 없습니다.'); return }
    // React Strict Mode 이중 실행 방지
    if (sessionStorage.getItem('kakao_code_used') === code) return
    sessionStorage.setItem('kakao_code_used', code)
    handleKakaoCallback(code)
  }, [])

  // 카카오 kauth/kapi는 브라우저 CORS 미허용 — 토큰 교환·프로필 조회는 브라우저에서 직접 못 한다.
  // 프로덕션: Vercel 함수 /api/kakao-auth 경유. 개발: vite 프록시(/kauth, /kapi) 경유.
  async function fetchKakaoIdentity(code, redirectUri) {
    if (import.meta.env.DEV) {
      const tokenRes = await fetch('/kauth/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams({
          grant_type:    'authorization_code',
          client_id:     KAKAO_REST_KEY,
          client_secret: KAKAO_CLIENT_SECRET,
          redirect_uri:  redirectUri,
          code,
        }),
      })
      const tokenData = await tokenRes.json()
      if (!tokenData.access_token) {
        return { ok: false, error: tokenData.error_description ?? JSON.stringify(tokenData) }
      }
      const profileRes = await fetch('/kapi/v2/user/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const kakaoUser = await profileRes.json()
      if (!kakaoUser.id) return { ok: false, error: '카카오 프로필 조회 실패' }
      return {
        ok: true,
        kakao_id: String(kakaoUser.id),
        nickname: kakaoUser.kakao_account?.profile?.nickname ?? kakaoUser.properties?.nickname ?? null,
      }
    }
    const res = await fetch('/api/kakao-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })
    return res.json()
  }

  async function handleKakaoCallback(code) {
    try {
      const redirectUri = `${window.location.origin}/auth/kakao-callback`

      // 1+2. 카카오 토큰 교환 + 프로필 조회 (서버 경유)
      const identity = await fetchKakaoIdentity(code, redirectUri)
      if (!identity.ok) {
        setError('카카오 인증 오류: ' + identity.error)
        return
      }
      const kakaoId  = identity.kakao_id
      const nickname = identity.nickname

      // 3. Supabase 인증 (카카오 ID 기반 내부 이메일)
      const email    = `kakao_${kakaoId}@kakao.modu.internal`
      const password = `modu_${kakaoId}_kakao`

      let userId = null
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInData?.user) {
        userId = signInData.user.id
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { kakao_id: kakaoId, full_name: nickname } },
        })
        if (signUpError) {
          // 기존 계정인데 로그인이 거부된 경우 — 원인을 함께 표시
          const detail = signUpError.message.toLowerCase().includes('already')
            ? `기존 계정 로그인 거부 (${signInError?.message ?? '원인 미상'})`
            : signUpError.message
          setError('계정 인증 실패: ' + detail)
          return
        }
        userId = signUpData.user.id
      }

      // 4. 공통 후처리 (device_id 귀속 + profiles 생성/복원 + 이동)
      const fakeUser = { id: userId }
      await finishLogin({
        user: fakeUser,
        navigate,
        category: null,
        extraProfileFields: {
          nickname,
          provider:  'kakao',
          kakao_id:  kakaoId,
        },
      })
    } catch (e) {
      setError('오류: ' + e.message)
    }
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white px-8">
        <span className="text-[40px]">😅</span>
        <p className="text-[15px] font-bold text-gray-700 text-center">{error}</p>
        <button
          onClick={() => navigate('/a4', { replace: true })}
          className="mt-2 px-6 py-3 rounded-2xl text-[14px] font-bold text-white"
          style={{ backgroundColor: NAVY }}>
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <div className="w-10 h-10 border-[3px] border-gray-100 rounded-full animate-spin"
        style={{ borderTopColor: NAVY }} />
      <p className="text-[15px] font-bold text-gray-900">카카오 로그인 처리 중...</p>
      <p className="text-[12px] text-gray-400">잠시만 기다려 주세요</p>
    </div>
  )
}
