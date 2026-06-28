import { useNavigate, useLocation } from 'react-router-dom'

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
  const category = location.state?.category ?? 'seller'
  const startupMode = location.state?.startupMode ?? 'both'
  const dest = category === 'landlord' ? '/a7/landlord'
    : category === 'startup' ? '/a7/startup'
    : category === 'operating' ? '/a7/operating'
    : category === 'business' ? '/a7/business'
    : category === 'browsing' ? '/a2'
    : '/a7/seller'
  const goNext = () => navigate(dest, category === 'startup' ? { state: { startupMode } } : {})

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
        {/* 카카오 */}
        <button
          onClick={goNext}
          className="w-full py-[17px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2.5 transition-all duration-150 active:scale-[0.98]"
          style={{ backgroundColor: '#FEE500', color: '#1a1a1a' }}
        >
          <KakaoIcon />
          카카오로 시작하기
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

      {/* 이메일 */}
      <div className="mt-8 text-center">
        <button
          onClick={goNext}
          className="text-[13px] text-gray-400"
        >
          다른 방법으로 <span className="underline underline-offset-2">이메일</span>
        </button>
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
