import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { finishLogin } from '../lib/auth'
import { KAKAO_REST_KEY, KAKAO_REDIRECT_URI } from '../lib/kakao'

// 개발용 vite 프록시 경로 토큰 교환에만 사용 (프로덕션은 서버 함수가 시크릿 보관)
const KAKAO_CLIENT_SECRET = 'aEOqh5Wv1dyIvdbBFy6EacFSFPCNpFd2'
const NAVY = '#1a4d8f'

export default function AuthKakaoCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  // 회원가입 의도였는데 이미 가입된 계정 — 조용히 로그인하지 않고 확인 받는다
  const [existingAccount, setExistingAccount] = useState(null) // { userId, nickname, kakaoId }

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

  // authorize 때 state에 실어 보낸 병합 정보를 복원 — 실기기 왕복에서 localStorage가
  // 콜백 컨텍스트로 승계되지 않아도(인앱 브라우저/다른 오리진) 선택 역할이 유실되지 않게 한다.
  function rehydrateFromState(raw) {
    if (!raw) return
    try {
      const s = JSON.parse(decodeURIComponent(atob(raw)))
      if (Array.isArray(s.r) && s.r.length) {
        let existing = []
        try { existing = JSON.parse(localStorage.getItem('modu_pending_roles') || '[]') } catch (_) {}
        localStorage.setItem('modu_pending_roles', JSON.stringify([...new Set([...existing, ...s.r])]))
      }
      if (s.c) localStorage.setItem('modu_pending_category', s.c)
      if (s.o && !localStorage.getItem('modu_onboarding_answers')) localStorage.setItem('modu_onboarding_answers', JSON.stringify(s.o))
      if (s.i && !localStorage.getItem('modu_auth_intent')) localStorage.setItem('modu_auth_intent', s.i)
    } catch (_) {}
  }

  async function handleKakaoCallback(code) {
    try {
      // 병합 정보 복원 (state → localStorage) — intent/pending 읽기 전에 먼저
      rehydrateFromState(new URLSearchParams(window.location.search).get('state'))
      // authorize 때 쓴 값과 정확히 일치해야 함 — 정식 주소 고정 (lib/kakao.js)
      const redirectUri = KAKAO_REDIRECT_URI

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
      const intent = localStorage.getItem('modu_auth_intent')
      localStorage.removeItem('modu_auth_intent')
      if (signInData?.user) {
        userId = signInData.user.id
        // 회원가입 탭에서 왔는데 이미 가입된 카카오 계정 → 조용히 로그인하지 않고 확인 화면
        if (intent === 'signup') {
          setExistingAccount({ userId, nickname, kakaoId })
          return
        }
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

      await proceed(userId, nickname, kakaoId)
    } catch (e) {
      setError('오류: ' + e.message)
    }
  }

  // 4. 공통 후처리 (device_id 귀속 + profiles 생성/복원 + 이동)
  async function proceed(userId, nickname, kakaoId) {
    await finishLogin({
      user: { id: userId },
      navigate,
      category: null,
      extraProfileFields: {
        nickname,
        provider:  'kakao',
        kakao_id:  kakaoId,
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
          이 카카오 계정은 이미 가입되어 있어요.<br />
          기존 계정으로 로그인할까요?
        </p>
        <button
          onClick={() => proceed(existingAccount.userId, existingAccount.nickname, existingAccount.kakaoId)}
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
      <p className="text-[15px] font-bold text-gray-900">카카오 로그인 처리 중...</p>
      <p className="text-[12px] text-gray-400">잠시만 기다려 주세요</p>
    </div>
  )
}
