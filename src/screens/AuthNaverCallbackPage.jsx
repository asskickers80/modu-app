import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { finishLogin } from '../lib/auth'
import { NAVER_CLIENT_ID } from '../lib/naver'

const NAVY = '#1a4d8f'

export default function AuthNaverCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error')
    if (oauthError) {
      setError(oauthError === 'access_denied' ? '네이버 로그인을 취소했어요.' : '네이버 오류: ' + (params.get('error_description') ?? oauthError))
      return
    }
    const code = params.get('code')
    const state = params.get('state')
    if (!code) { setError('인증 코드가 없습니다.'); return }
    // CSRF 방지 — 시작할 때 만든 state와 일치해야 함
    const savedState = sessionStorage.getItem('naver_oauth_state')
    if (savedState && state !== savedState) { setError('요청 검증에 실패했어요. 다시 시도해 주세요.'); return }
    // React Strict Mode 이중 실행 방지
    if (sessionStorage.getItem('naver_code_used') === code) return
    sessionStorage.setItem('naver_code_used', code)
    handleNaverCallback(code, state)
  }, [])

  // 네이버 nid/openapi는 브라우저 CORS 미허용 — 프로덕션은 Vercel 함수, 개발은 vite 프록시 경유
  async function fetchNaverIdentity(code, state) {
    if (import.meta.env.DEV) {
      const secret = import.meta.env.VITE_NAVER_CLIENT_SECRET
      if (!NAVER_CLIENT_ID || !secret) {
        return { ok: false, error: '개발 환경 네이버 키 미설정 (.env의 VITE_NAVER_CLIENT_ID / VITE_NAVER_CLIENT_SECRET)' }
      }
      const tokenRes = await fetch('/nid/oauth2.0/token?' + new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: NAVER_CLIENT_ID,
        client_secret: secret,
        code,
        state: state ?? '',
      }))
      const tokenData = await tokenRes.json()
      if (!tokenData.access_token) {
        return { ok: false, error: tokenData.error_description ?? JSON.stringify(tokenData) }
      }
      const profileRes = await fetch('/napi/v1/nid/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const profile = await profileRes.json()
      if (profile.resultcode !== '00' || !profile.response?.id) {
        return { ok: false, error: '네이버 프로필 조회 실패' }
      }
      return {
        ok: true,
        naver_id: String(profile.response.id),
        nickname: profile.response.nickname ?? profile.response.name ?? null,
      }
    }
    const res = await fetch('/api/naver-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    })
    return res.json()
  }

  async function handleNaverCallback(code, state) {
    try {
      // 1+2. 토큰 교환 + 프로필 조회 (서버 경유)
      const identity = await fetchNaverIdentity(code, state)
      if (!identity.ok) {
        setError('네이버 인증 오류: ' + identity.error)
        return
      }
      const naverId  = identity.naver_id
      const nickname = identity.nickname

      // 3. Supabase 인증 (네이버 ID 기반 내부 이메일 — 카카오와 동일 패턴)
      const email    = `naver_${naverId}@naver.modu.internal`
      const password = `modu_${naverId}_naver`

      let userId = null
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInData?.user) {
        userId = signInData.user.id
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { naver_id: naverId, full_name: nickname } },
        })
        if (signUpError) {
          const detail = signUpError.message.toLowerCase().includes('already')
            ? `기존 계정 로그인 거부 (${signInError?.message ?? '원인 미상'})`
            : signUpError.message
          setError('계정 인증 실패: ' + detail)
          return
        }
        userId = signUpData.user.id
      }

      // 4. 공통 후처리 (계정 기기 ID 동기화 + device_id 귀속 + profiles 생성/복원 + 이동)
      await finishLogin({
        user: { id: userId },
        navigate,
        category: null,
        extraProfileFields: {
          nickname,
          provider: 'naver',
          naver_id: naverId,
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
      <p className="text-[15px] font-bold text-gray-900">네이버 로그인 처리 중...</p>
      <p className="text-[12px] text-gray-400">잠시만 기다려 주세요</p>
    </div>
  )
}
