import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { saveProfile, addProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import { supabase } from '../lib/supabase'
import { finishLogin, DEST_MAP } from '../lib/auth'
import { KAKAO_REST_KEY, KAKAO_REDIRECT_URI } from '../lib/kakao'

const NAVY = '#1a4d8f'

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 14l-5-5 5-5" stroke="rgba(18,58,99,0.6)" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2.5C5.86 2.5 2.5 5.19 2.5 8.5c0 2.14 1.35 4.02 3.4 5.1L5 17l3.6-2.1c.46.06.93.1 1.4.1 4.14 0 7.5-2.69 7.5-6 0-3.31-3.36-6-7.5-6z"
        fill="#1a1a1a" />
    </svg>
  )
}

function NaverN() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 3h4.5l3.6 5.8V3H15v12h-4.5L6.9 9.2V15H3V3z" fill="white" />
    </svg>
  )
}

// Google / Apple — 구조 준비, 미노출
// function GoogleIcon() { ... }
// function AppleIcon() { ... }

// emailMode: null | 'signup' | 'login' | 'forgot'

export default function A4SignUp() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = location.state || {}
  const category = profile.category ?? 'seller'

  const [kakaoLoading, setKakaoLoading] = useState(false)
  const [emailMode, setEmailMode] = useState(null)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [sentTo, setSentTo]     = useState(null) // 메일 발송 완료 시 주소

  // ── 카카오 OAuth (직접 구현, Supabase 프로바이더 우회) ─────────────
  const handleKakaoLogin = () => {
    setKakaoLoading(true)
    localStorage.setItem('modu_pending_category', category)
    saveProfile({ ...profile, category })
    // 등록된 정식 주소로 고정 — 배포별 고유 주소에서 시작해도 KOE006이 나지 않게
    const redirectUri = encodeURIComponent(KAKAO_REDIRECT_URI)
    window.location.href =
      `https://kauth.kakao.com/oauth/authorize` +
      `?client_id=${KAKAO_REST_KEY}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=profile_nickname+profile_image`
  }

  // ── 네이버 — 승인 후 구현 예정 ────────────────────────────────────
  // 실 구현 시 교체: A4 → nid.naver.com 리다이렉트 → /auth/naver-callback → AuthNaverCallbackPage
  const handleNaverLogin = () => {
    const isMultiprofile = sessionStorage.getItem('modu_multiprofile_pending') === '1'
    if (isMultiprofile) {
      sessionStorage.removeItem('modu_multiprofile_pending')
      addProfile(category, profile.name || '새 프로필')
      const cfg = CATEGORY_CONFIG[category]
      navigate(cfg ? cfg.home : DEST_MAP[category] ?? '/a7/seller', { replace: true })
    } else {
      saveProfile({ ...profile, category })
      navigate(DEST_MAP[category] ?? '/a7/seller', { state: profile })
    }
  }

  // ── 이메일 공통: 로그인 성공 후 프로필 처리 ───────────────────────
  async function afterEmailLogin(user) {
    await finishLogin({ user, navigate, category, extraProfileFields: { provider: 'email' } })
  }

  // ── 이메일 가입 ─────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 해요'); return }
    if (password !== confirmPw) { setError('비밀번호가 일치하지 않아요'); return }
    setLoading(true); setError(null)
    localStorage.setItem('modu_pending_category', category)
    const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password })
    setLoading(false)
    if (e) {
      const msg = e.message.toLowerCase()
      if (msg.includes('already') || msg.includes('exists')) {
        // 이미 가입된 계정 — 비밀번호가 없을 수도 있으므로 로그인 + 재설정 양쪽 안내
        setEmailMode('login')
        setError('ALREADY')
      } else {
        setError(e.message)
      }
      return
    }
    if (data.session) {
      // 이메일 확인 없이 즉시 로그인
      await afterEmailLogin(data.session.user)
    } else {
      // 이메일 확인 대기
      setSentTo(email.trim())
    }
  }

  // ── 이메일 로그인 ─────────────────────────────────────────────
  const handleLogin = async () => {
    setLoading(true); setError(null)
    const { data, error: e } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    })
    setLoading(false)
    if (e) {
      // 이전에 Magic Link로 가입한 계정은 비밀번호가 없어 항상 실패
      // → 비밀번호 재설정 경로를 명확히 안내
      setError('NEED_RESET')
      return
    }
    await afterEmailLogin(data.user)
  }

  // ── 비밀번호 재설정 ───────────────────────────────────────────
  const handleForgot = async () => {
    setLoading(true); setError(null)
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (e) { setError(e.message); return }
    setSentTo(email.trim())
  }

  // ── 메일 발송 완료 화면 ─────────────────────────────────────
  if (sentTo) {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-14 pb-8 items-center justify-center" style={{ background: 'linear-gradient(180deg, #9FD4FA 0%, #DFF1FE 30%, #F2F9FF 100%)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[32px] mb-6"
          style={{ backgroundColor: '#eef2fb' }}>
          📬
        </div>
        <h1 className="text-[22px] font-bold text-center mb-2" style={{ color: '#123A63' }}>이메일을 확인하세요</h1>
        <p className="text-[14px] text-gray-500 text-center leading-relaxed mb-1">
          <span className="font-bold text-gray-800">{sentTo}</span>으로
        </p>
        <p className="text-[14px] text-gray-500 text-center leading-relaxed mb-8">
          링크를 보냈어요. 클릭하면 바로 들어와요.
        </p>
        <div className="w-full rounded-2xl px-4 py-3.5 text-[12px] text-gray-500 leading-relaxed mb-6"
          style={{ backgroundColor: '#f9fafb' }}>
          📌 링크는 1회 사용, 1시간 후 만료돼요.<br />
          스팸 폴더도 확인해 보세요.
        </div>
        <button onClick={() => setSentTo(null)} className="text-[13px] text-gray-400 underline">
          다시 시도하기
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-14 pb-8" style={{ background: 'linear-gradient(180deg, #9FD4FA 0%, #DFF1FE 30%, #F2F9FF 100%)' }}>
      {/* 뒤로가기 */}
      <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-1 text-sm" style={{ color: 'rgba(18,58,99,0.6)' }}>
        <BackArrow /> 이전
      </button>

      {/* 헤더 */}
      <div className="mb-10">
        <p className="text-sm font-medium mb-1" style={{ color: 'rgba(18,58,99,0.6)' }}>마지막 단계예요</p>
        <h1 className="text-[26px] font-bold leading-snug" style={{ color: '#123A63' }}>
          어떻게 시작할까요?
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: 'rgba(18,58,99,0.55)' }}>한 번만 연결해두면 다음부터는 바로 들어와요</p>
      </div>

      {/* 소셜 로그인 */}
      <div className="flex flex-col gap-3">
        {/* 카카오 */}
        <button
          onClick={handleKakaoLogin}
          disabled={kakaoLoading}
          className="w-full py-[17px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-70"
          style={{ backgroundColor: '#FEE500', color: '#1a1a1a' }}
        >
          {kakaoLoading
            ? <div className="w-5 h-5 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
            : <KakaoIcon />}
          {kakaoLoading ? '카카오 연결 중...' : '카카오로 시작하기'}
        </button>

        {/* 네이버 — 실 OAuth 구현 전 임시 더미 (handleNaverLogin 교체 예정) */}
        <div className="relative">
          <button
            onClick={handleNaverLogin}
            className="w-full py-[17px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#03C75A', color: '#ffffff' }}
          >
            <NaverN />
            네이버로 시작하기
          </button>
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200 pointer-events-none">
            곧 지원
          </span>
        </div>

        {/* Google / Apple — 구조 준비, 추후 노출
        <GoogleButton onClick={handleGoogleLogin} />
        <AppleButton onClick={handleAppleLogin} />
        */}
      </div>

      {/* 이메일 섹션 */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[12px] text-gray-400 shrink-0">또는 이메일로</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* 이메일 진입 버튼 */}
        {emailMode === null && (
          <button
            onClick={() => setEmailMode('login')}
            className="w-full py-[15px] rounded-2xl border-2 border-gray-200 text-[15px] font-bold text-gray-700 bg-white transition-all active:scale-[0.98]"
          >
            이메일로 계속하기
          </button>
        )}

        {/* 로그인 폼 (기본) */}
        {emailMode === 'login' && (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일 주소"
              autoComplete="email"
              className="w-full px-4 py-[14px] rounded-2xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              className="w-full px-4 py-[14px] rounded-2xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            {/* 로그인 실패 안내 — 비밀번호 없는 기존 계정(Magic Link 가입) 포함 */}
            {error === 'NEED_RESET' && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex flex-col gap-2">
                <p className="text-[13px] text-amber-800 leading-relaxed">
                  비밀번호가 맞지 않아요.<br />
                  이전에 카카오나 링크로 가입했다면 비밀번호가 설정되지 않았을 수 있어요.
                </p>
                <button
                  onClick={() => { setEmailMode('forgot'); setError(null); setPassword('') }}
                  className="text-[13px] font-bold text-amber-700 underline underline-offset-2 text-left"
                >
                  비밀번호 재설정하기 →
                </button>
              </div>
            )}
            {error === 'ALREADY' && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex flex-col gap-2">
                <p className="text-[13px] text-amber-800 leading-relaxed">
                  이미 가입된 이메일이에요.<br />
                  비밀번호로 로그인하거나, 비밀번호를 잊으셨으면 재설정해 보세요.
                </p>
                <button
                  onClick={() => { setEmailMode('forgot'); setError(null); setPassword('') }}
                  className="text-[13px] font-bold text-amber-700 underline underline-offset-2 text-left"
                >
                  비밀번호 재설정하기 →
                </button>
              </div>
            )}
            {error && error !== 'NEED_RESET' && error !== 'ALREADY' && (
              <p className="text-[13px] text-red-500 px-1">{error}</p>
            )}
            <button
              onClick={handleLogin}
              disabled={!email.trim() || !password || loading}
              className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: NAVY }}
            >
              {loading ? '처리 중...' : '로그인하기'}
            </button>
            <div className="flex justify-between items-center pt-1">
              <button
                onClick={() => { setEmailMode('forgot'); setError(null); setPassword('') }}
                className="text-[12px] text-gray-400 underline underline-offset-2"
              >
                비밀번호를 잊으셨나요?
              </button>
              <button
                onClick={() => { setEmailMode('signup'); setError(null); setPassword(''); setConfirmPw('') }}
                className="text-[12px] text-gray-400 underline underline-offset-2"
              >
                회원가입
              </button>
            </div>
          </div>
        )}

        {/* 가입 폼 (신규) */}
        {emailMode === 'signup' && (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일 주소"
              autoComplete="email"
              className="w-full px-4 py-[14px] rounded-2xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              autoComplete="new-password"
              className="w-full px-4 py-[14px] rounded-2xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="비밀번호 확인"
              autoComplete="new-password"
              className="w-full px-4 py-[14px] rounded-2xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            {error && error !== 'ALREADY' && <p className="text-[13px] text-red-500 px-1">{error}</p>}
            <button
              onClick={handleSignUp}
              disabled={!email.trim() || !password || !confirmPw || loading}
              className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: NAVY }}
            >
              {loading ? '처리 중...' : '가입하기'}
            </button>
            <button
              onClick={() => { setEmailMode('login'); setError(null); setPassword(''); setConfirmPw('') }}
              className="text-[12px] text-gray-400 text-center underline underline-offset-2"
            >
              로그인
            </button>
          </div>
        )}

        {/* 비밀번호 재설정 */}
        {emailMode === 'forgot' && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-gray-500 leading-relaxed">
              가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일 주소"
              autoComplete="email"
              className="w-full px-4 py-[14px] rounded-2xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            {error && <p className="text-[13px] text-red-500 px-1">{error}</p>}
            <button
              onClick={handleForgot}
              disabled={!email.trim() || loading}
              className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: NAVY }}
            >
              {loading ? '전송 중...' : '재설정 메일 보내기'}
            </button>
            <button
              onClick={() => { setEmailMode('login'); setError(null) }}
              className="text-[13px] text-gray-400 text-center underline underline-offset-2"
            >
              로그인으로 돌아가기
            </button>
          </div>
        )}
      </div>

      {/* 약관 */}
      <p className="mt-6 text-center text-[11px] text-gray-300 leading-relaxed">
        시작하면{' '}
        <span className="underline underline-offset-1">이용약관</span>
        {' '}및{' '}
        <span className="underline underline-offset-1">개인정보처리방침</span>에<br />
        동의하는 것으로 간주해요
      </p>
    </div>
  )
}
