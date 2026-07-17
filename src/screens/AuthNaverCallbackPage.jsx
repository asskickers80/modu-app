import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { finishLogin } from '../lib/auth'
import { NAVER_CLIENT_ID } from '../lib/naver'

const NAVY = '#1a4d8f'

export default function AuthNaverCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  // 회원가입 의도였는데 이미 가입된 계정 — 조용히 로그인하지 않고 확인 받는다
  const [existingAccount, setExistingAccount] = useState(null) // { userId, nickname, naverId }

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
      const intent = localStorage.getItem('modu_auth_intent')
      localStorage.removeItem('modu_auth_intent')
      if (signInData?.user) {
        userId = signInData.user.id
        // 회원가입 탭에서 왔는데 이미 가입된 네이버 계정 → 조용히 로그인하지 않고 확인 화면
        if (intent === 'signup') {
          setExistingAccount({ userId, nickname, naverId })
          return
        }
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

      await proceed(userId, nickname, naverId)
    } catch (e) {
      setError('오류: ' + e.message)
    }
  }

  // 4. 공통 후처리 (계정 기기 ID 동기화 + device_id 귀속 + profiles 생성/복원 + 이동)
  async function proceed(userId, nickname, naverId) {
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
  }

  // 확인 화면에서 "돌아가기" — 방금 세션·온보딩 답변을 정리하고 가입 화면으로
  async function declineExisting() {
    try { await supabase.auth.signOut() } catch (_) {}
    localStorage.removeItem('modu_onboarding_answers')
    navigate('/a4', { replace: true })
  }

  if (existingAccount) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-white px-8">
        <span className="text-[40px]">👋</span>
        <p className="text-[18px] font-bold text-gray-900">이미 모두 회원이에요</p>
        <p className="text-[14px] text-gray-500 text-center leading-relaxed">
          이 네이버 계정은 이미 가입되어 있어요.<br />
          기존 계정으로 로그인할까요?
        </p>
        <button
          onClick={() => proceed(existingAccount.userId, existingAccount.nickname, existingAccount.naverId)}
          className="mt-3 w-full max-w-[280px] h-[48px] rounded-2xl text-[15px] font-bold text-white"
          style={{ backgroundColor: NAVY }}>
          기존 계정으로 로그인
        </button>
        <button
          onClick={declineExisting}
          className="w-full max-w-[280px] h-[44px] rounded-2xl text-[14px] font-bold text-gray-500 bg-gray-100">
          돌아가기
        </button>
      </div>
    )
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
