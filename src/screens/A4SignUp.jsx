import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { saveProfile, addProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import { supabase } from '../lib/supabase'

const NAVY = '#1a4d8f'

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8"
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

function AppleIcon() {
  return (
    <svg width="17" height="20" viewBox="0 0 17 20" fill="white">
      <path d="M14.18 10.63c-.02-2.24 1.84-3.32 1.92-3.37-1.04-1.52-2.66-1.73-3.24-1.75-1.38-.14-2.7.82-3.4.82-.7 0-1.78-.8-2.93-.77-1.5.02-2.9.88-3.67 2.24-1.56 2.7-.4 6.7 1.12 8.9.74 1.07 1.62 2.27 2.78 2.23 1.12-.04 1.55-.72 2.9-.72 1.35 0 1.73.72 2.9.7 1.2-.02 1.96-1.09 2.69-2.17.85-1.24 1.2-2.44 1.22-2.5-.03-.01-2.29-.88-2.29-3.61z" />
      <path d="M11.53 3.48c.62-.75 1.03-1.79.92-2.83-.88.04-1.95.59-2.58 1.34-.57.65-1.07 1.71-.93 2.72.98.08 1.98-.5 2.59-1.23z" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="17" height="20" viewBox="0 0 17 20" fill="none">
      <rect x="1.5" y="1" width="14" height="18" rx="3" stroke="#374151" strokeWidth="1.6" />
      <circle cx="8.5" cy="16.5" r="1" fill="#374151" />
    </svg>
  )
}

export default function A4SignUp() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = location.state || {}
  const category = profile.category ?? 'seller'
  const dest = category === 'landlord' ? '/a7/landlord'
    : category === 'startup' ? '/a7/startup'
    : category === 'operating' ? '/a7/operating'
    : category === 'business' ? '/a7/business'
    : category === 'browsing' ? '/a7/browsing'
    : '/a7/seller'

  const [kakaoLoading, setKakaoLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // 이메일 Magic Link
  const handleEmailLogin = async () => {
    const trimmed = email.trim()
    if (!trimmed) return
    setEmailSending(true)
    localStorage.setItem('modu_pending_category', category)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setEmailSending(false)
    if (error) {
      localStorage.removeItem('modu_pending_category')
      alert('전송 실패: ' + error.message)
    } else {
      setEmailSent(true)
    }
  }

  // 카카오 OAuth — 직접 구현 (Supabase 프로바이더 우회)
  const handleKakaoLogin = () => {
    setKakaoLoading(true)
    localStorage.setItem('modu_pending_category', category)
    saveProfile({ ...profile, category })
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/kakao-callback`)
    window.location.href =
      `https://kauth.kakao.com/oauth/authorize` +
      `?client_id=5e06205586b30fa239b852a5f41c754c` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=profile_nickname+profile_image`
  }

  // 나머지 버튼 (아직 미구현 — 기존 더미 이동)
  const goNext = () => {
    const isMultiprofile = sessionStorage.getItem('modu_multiprofile_pending') === '1'
    if (isMultiprofile) {
      sessionStorage.removeItem('modu_multiprofile_pending')
      addProfile(category, profile.name || '새 프로필')
      const cfg = CATEGORY_CONFIG[category]
      navigate(cfg ? cfg.home : dest, { replace: true })
    } else {
      saveProfile(profile)
      navigate(dest, { state: profile })
    }
  }

  // 이메일 전송 완료 화면
  if (emailSent) {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-14 pb-8 items-center justify-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[32px] mb-6"
          style={{ backgroundColor: '#eef2fb' }}>
          📬
        </div>
        <h1 className="text-[22px] font-bold text-gray-900 text-center mb-2">
          이메일을 확인하세요
        </h1>
        <p className="text-[14px] text-gray-500 text-center leading-relaxed mb-1">
          <span className="font-bold text-gray-800">{email}</span>으로
        </p>
        <p className="text-[14px] text-gray-500 text-center leading-relaxed mb-8">
          로그인 링크를 보냈어요. 링크를 클릭하면 바로 들어와요.
        </p>
        <div className="w-full rounded-2xl px-4 py-3.5 mb-6 text-[12px] text-gray-500 leading-relaxed"
          style={{ backgroundColor: '#f9fafb' }}>
          📌 링크는 1회만 사용 가능하고 1시간 뒤 만료돼요.<br />
          스팸 폴더도 확인해 보세요.
        </div>
        <button
          onClick={() => setEmailSent(false)}
          className="text-[13px] text-gray-400 underline underline-offset-2">
          다른 이메일로 다시 보내기
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-14 pb-8">
      {/* 뒤로가기 */}
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-1 text-gray-400 text-sm"
      >
        <BackArrow />
        이전
      </button>

      {/* 헤더 */}
      <div className="mb-10">
        <p className="text-sm font-medium text-gray-400 mb-1">거의 다 왔어요</p>
        <h1 className="text-[26px] font-bold text-gray-900 leading-snug">
          어떻게 시작하실래요?
        </h1>
        <p className="mt-2 text-[14px] text-gray-400">
          딱 한 번만 연결하면 다음부터는 바로 들어와요
        </p>
      </div>

      {/* 소셜 로그인 버튼 */}
      <div className="flex flex-col gap-3">
        {/* 카카오 — 실제 OAuth 연결 */}
        <button
          onClick={handleKakaoLogin}
          disabled={kakaoLoading}
          className="w-full py-[17px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2.5 transition-all duration-150 active:scale-[0.98] disabled:opacity-70"
          style={{ backgroundColor: '#FEE500', color: '#1a1a1a' }}
        >
          {kakaoLoading ? (
            <div className="w-5 h-5 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
          ) : (
            <KakaoIcon />
          )}
          {kakaoLoading ? '카카오 연결 중...' : '카카오로 시작하기'}
        </button>

        {/* 네이버 */}
        <button
          onClick={goNext}
          className="w-full py-[17px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2.5 transition-all duration-150 active:scale-[0.98]"
          style={{ backgroundColor: '#03C75A', color: '#ffffff' }}
        >
          <NaverN />
          네이버로 시작하기
        </button>

        {/* Apple */}
        <button
          onClick={goNext}
          className="w-full py-[17px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2.5 bg-black text-white transition-all duration-150 active:scale-[0.98]"
        >
          <AppleIcon />
          Apple로 시작하기
        </button>

        {/* 휴대폰 */}
        <button
          onClick={goNext}
          className="w-full py-[17px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2.5 border-2 border-gray-200 bg-white text-gray-800 transition-all duration-150 active:scale-[0.98]"
        >
          <PhoneIcon />
          휴대폰 번호로 시작하기
        </button>
      </div>

      {/* 이메일 Magic Link */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[12px] text-gray-400 shrink-0">또는 이메일로</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
            placeholder="이메일 주소 입력"
            className="flex-1 px-4 py-[14px] rounded-2xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors"
          />
          <button
            onClick={handleEmailLogin}
            disabled={!email.trim() || emailSending}
            className="px-4 py-[14px] rounded-2xl text-[14px] font-bold text-white shrink-0 disabled:opacity-50 transition-all"
            style={{ backgroundColor: NAVY }}>
            {emailSending ? '전송 중' : '전송'}
          </button>
        </div>
      </div>

      {/* 약관 안내 */}
      <p className="mt-5 text-center text-[11px] text-gray-300 leading-relaxed">
        시작하면{' '}
        <span className="underline underline-offset-1">이용약관</span>
        {' '}및{' '}
        <span className="underline underline-offset-1">개인정보처리방침</span>에<br />
        동의하는 것으로 간주해요
      </p>
    </div>
  )
}
