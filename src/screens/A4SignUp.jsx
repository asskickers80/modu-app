import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { saveProfile, addProfile, CATEGORY_CONFIG, registerPendingRoles } from '../lib/userProfile'
import { supabase } from '../lib/supabase'
import { finishLogin, DEST_MAP } from '../lib/auth'
import { KAKAO_REST_KEY, KAKAO_REDIRECT_URI } from '../lib/kakao'
import { NAVER_CLIENT_ID, NAVER_REDIRECT_URI } from '../lib/naver'
import { PUBLIC_ORIGIN } from '../lib/appOrigin'

// Supabase 인증 에러(영문) → 사용자 안내(한국어)
const AUTH_ERROR_KO = [
  [/invalid format|unable to validate email/i, '이메일 주소 형식을 확인해 주세요'],
  [/rate limit|too many requests/i, '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요'],
  [/at least 6|password should be/i, '비밀번호는 6자 이상이어야 해요'],
  [/network|failed to fetch|load failed/i, '네트워크 연결을 확인해 주세요'],
]
function koAuthError(message) {
  for (const [pattern, ko] of AUTH_ERROR_KO) {
    if (pattern.test(message)) return ko
  }
  return `문제가 생겼어요. 잠시 후 다시 시도해 주세요 (${message})`
}

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

// 부드러운 접힘/펼침 (A3와 동일 기법)
function Collapse({ open, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
      <div style={{ overflow: 'hidden', visibility: open ? 'visible' : 'hidden', transition: 'visibility 0.3s' }}>{children}</div>
    </div>
  )
}

export default function A4SignUp() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const profile = location.state || {}
  const category = profile.category ?? 'seller'

  // 온보딩을 거쳐 왔으면(답변 보유) 로그인 후 병합할 수 있게 보관.
  // 기존 회원이 재온보딩한 경우에도 새 답변이 버려지지 않는다 (lib/auth.js finishLogin에서 소비).
  // localStorage 사용 — 카카오/네이버 앱 전환 왕복에서 sessionStorage는 초기화될 수 있음
  const stashOnboardingAnswers = () => {
    // 가입/로그인 의도 보관 — 회원가입 탭에서 기존 계정이 감지되면 콜백에서 확인 화면을 띄운다
    localStorage.setItem('modu_auth_intent', isLoginMode ? 'login' : 'signup')
    if (profile.category) localStorage.setItem('modu_onboarding_answers', JSON.stringify(profile))
    else localStorage.removeItem('modu_onboarding_answers')
  }

  // 로그인 / 회원가입 탭 — 온보딩 경유(신규 전제)는 회원가입, A2 로그인 지름길(mode=login)은 로그인
  const [authTab, setAuthTab] = useState(searchParams.get('mode') === 'login' ? 'login' : 'signup')
  const isLoginMode = authTab === 'login'
  const switchTab = (tab) => {
    setAuthTab(tab)
    setEmailMode(null); setError(null); setPassword(''); setConfirmPw('')
  }

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
    stashOnboardingAnswers()
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
  const handleNaverLogin = () => {
    // 실 OAuth — 네이버 키가 설정된 환경(프로덕션)에서만. 미설정(로컬·테스트)이면 아래 더미 통과 유지
    if (NAVER_CLIENT_ID) {
      stashOnboardingAnswers()
      localStorage.setItem('modu_pending_category', category)
      saveProfile({ ...profile, category })
      const state = (crypto.randomUUID?.() ?? String(Date.now() + Math.random()))
      sessionStorage.setItem('naver_oauth_state', state)
      window.location.href =
        `https://nid.naver.com/oauth2.0/authorize` +
        `?response_type=code` +
        `&client_id=${NAVER_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(NAVER_REDIRECT_URI)}` +
        `&state=${state}`
      return
    }
    const isMultiprofile = sessionStorage.getItem('modu_multiprofile_pending') === '1'
    if (isMultiprofile) {
      sessionStorage.removeItem('modu_multiprofile_pending')
      addProfile(category, profile.name || '새 프로필')
      const cfg = CATEGORY_CONFIG[category]
      navigate(cfg ? cfg.home : DEST_MAP[category] ?? '/a7/seller', { replace: true })
    } else {
      saveProfile({ ...profile, category })
      registerPendingRoles(profile.name) // 온보딩에서 추가 선택한 역할 → 멀티프로필 등록
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
    stashOnboardingAnswers()
    localStorage.setItem('modu_pending_category', category)
    const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password })
    setLoading(false)
    if (e) {
      const msg = e.message.toLowerCase()
      if (msg.includes('already') || msg.includes('exists')) {
        // 이미 가입된 계정 — 로그인 탭으로 전환해 로그인 + 재설정 양쪽 안내
        setAuthTab('login')
        setEmailMode('login')
        setError('ALREADY')
      } else {
        setError(koAuthError(e.message))
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
    stashOnboardingAnswers()
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
      // 정식 주소 고정 — 배포별 고유 주소로 메일 링크가 가는 것 방지 (Supabase Redirect URL 허용 목록과 일치)
      redirectTo: `${PUBLIC_ORIGIN}/auth/reset-password`,
    })
    setLoading(false)
    if (e) { setError(koAuthError(e.message)); return }
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
          링크를 보냈어요. 메일 속 링크를 누르면 이어서 진행돼요.
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
      <div className="mb-6">
        <p className="text-sm font-medium mb-1" style={{ color: 'rgba(18,58,99,0.6)' }}>
          {isLoginMode ? '다시 만나서 반가워요' : '거의 다 왔어요'}
        </p>
        <h1 className="text-[26px] font-bold leading-snug" style={{ color: '#123A63' }}>
          {isLoginMode ? '로그인해 주세요' : '회원가입하고 시작해요'}
        </h1>
      </div>

      {/* 로그인 / 회원가입 탭 — 박스 없이 글자 + 밑줄 */}
      <div className="flex gap-6 mb-7">
        {[['login', '로그인'], ['signup', '회원가입']].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className="pb-1.5 text-[16px] font-bold transition-all"
            style={authTab === tab
              ? { color: '#123A63', borderBottom: '2.5px solid #1a4d8f' }
              : { color: 'rgba(18,58,99,0.4)', borderBottom: '2.5px solid transparent' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 소셜 로그인 — 아이콘 좌측 고정 + 문구 중앙, 낮은 높이로 깔끔하게 */}
      <div className="flex flex-col gap-2.5">
        {/* 카카오 */}
        <button
          onClick={handleKakaoLogin}
          disabled={kakaoLoading}
          className="relative w-full h-[48px] rounded-[14px] text-[14px] font-semibold flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-70"
          style={{ backgroundColor: '#FEE500', color: '#1a1a1a' }}
        >
          <span className="absolute left-4 flex items-center">
            {kakaoLoading
              ? <div className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
              : <KakaoIcon />}
          </span>
          {kakaoLoading ? '카카오 연결 중...' : (isLoginMode ? '카카오로 로그인' : '카카오로 시작하기')}
        </button>

        {/* 네이버 — 키 설정 시 실 OAuth, 미설정(로컬·테스트) 시 더미 통과 */}
        <div className="relative">
          <button
            onClick={handleNaverLogin}
            className="relative w-full h-[48px] rounded-[14px] text-[14px] font-semibold flex items-center justify-center transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#03C75A', color: '#ffffff' }}
          >
            <span className="absolute left-4 flex items-center"><NaverN /></span>
            {isLoginMode ? '네이버로 로그인' : '네이버로 시작하기'}
          </button>
          {!NAVER_CLIENT_ID && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200 pointer-events-none">
              곧 지원
            </span>
          )}
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
          <span className="text-[11px] text-gray-400 shrink-0">또는 이메일로</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* 이메일 진입 버튼 — 현재 탭에 맞는 폼을 펼침 */}
        {emailMode === null && (
          <button
            onClick={() => setEmailMode(isLoginMode ? 'login' : 'signup')}
            className="w-full h-[46px] rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-600 bg-white transition-all active:scale-[0.98]"
          >
            {isLoginMode ? '이메일로 로그인' : '이메일로 가입하기'}
          </button>
        )}

        {/* 로그인 폼 */}
        <Collapse open={emailMode === 'login'}>
          <div className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일 주소"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-[14px] border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-[14px] border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
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
              className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: NAVY }}
            >
              {loading ? '처리 중...' : '로그인하기'}
            </button>
            <div className="flex justify-center items-center pt-1">
              <button
                onClick={() => { setEmailMode('forgot'); setError(null); setPassword('') }}
                className="text-[12px] text-gray-400 underline underline-offset-2"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
          </div>
        </Collapse>

        {/* 가입 폼 (신규) */}
        <Collapse open={emailMode === 'signup'}>
          <div className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일 주소"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-[14px] border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-[14px] border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="비밀번호 확인"
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-[14px] border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            {error && error !== 'ALREADY' && <p className="text-[13px] text-red-500 px-1">{error}</p>}
            <button
              onClick={handleSignUp}
              disabled={!email.trim() || !password || !confirmPw || loading}
              className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: NAVY }}
            >
              {loading ? '처리 중...' : '가입하기'}
            </button>
          </div>
        </Collapse>

        {/* 비밀번호 재설정 */}
        <Collapse open={emailMode === 'forgot'}>
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
              className="w-full px-4 py-3 rounded-[14px] border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
            {error && <p className="text-[13px] text-red-500 px-1">{error}</p>}
            <button
              onClick={handleForgot}
              disabled={!email.trim() || loading}
              className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-50"
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
        </Collapse>
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
