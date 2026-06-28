import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const NAVY = '#1a4d8f'

// ─────────────────────────────────────────────────────────
// 로고 컴포넌트 — 실제 로고 파일이 생기면 이 컴포넌트만 교체
//
// 교체 방법 (이미지):
//   <img src="/logo.svg" alt="모두" className="w-28 h-auto" />
//
// 교체 방법 (인라인 SVG):
//   원하는 SVG 파일 내용으로 아래 return 블록 교체
// ─────────────────────────────────────────────────────────
function ModuLogo() {
  return (
    <div className="flex flex-col items-center gap-5">

      {/* 구름 아이콘 (임시) */}
      <div style={{ filter: 'drop-shadow(0 6px 18px rgba(26,77,143,0.18))' }}>
        <svg width="96" height="72" viewBox="0 0 96 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 구름 본체 */}
          <path
            d="M78 58H20C10 58 4 50 8 42C5 36 8 28 16 25C15 14 23 6 34 8C38 1 52 1 57 10C68 7 80 17 76 28C86 31 88 48 78 58Z"
            fill="url(#cloudGrad)"
          />
          {/* 구름 하이라이트 */}
          <path
            d="M22 52C14 52 10 46 14 40"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"
          />
          {/* 문서 라인 3개 — 모두 서비스 아이덴티티 */}
          <rect x="34" y="32" width="28" height="3" rx="1.5" fill="white" opacity="0.75" />
          <rect x="34" y="39" width="20" height="3" rx="1.5" fill="white" opacity="0.55" />
          <rect x="34" y="46" width="24" height="3" rx="1.5" fill="white" opacity="0.4" />
          {/* 작은 반짝임 */}
          <circle cx="18" cy="22" r="2" fill={NAVY} opacity="0.18" />
          <circle cx="72" cy="18" r="1.5" fill={NAVY} opacity="0.14" />
          <circle cx="50" cy="8" r="1.5" fill={NAVY} opacity="0.12" />

          <defs>
            <linearGradient id="cloudGrad" x1="4" y1="8" x2="88" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#5b8dd4" />
              <stop offset="100%" stopColor={NAVY} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 워드마크 */}
      <div className="text-center">
        <p
          className="text-[44px] font-black tracking-tighter leading-none"
          style={{ color: NAVY, letterSpacing: '-0.03em' }}
        >
          모두
        </p>
        <p className="text-[13px] font-medium mt-2 tracking-wide" style={{ color: `${NAVY}70` }}>
          자영업자를 위한 AI 리테일 생태계
        </p>
      </div>
    </div>
  )
}

// ── 점 3개 로딩 인디케이터 ─────────────────────────────────
function LoadingDots() {
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: NAVY,
            opacity: 0.25,
            animation: `splashDot 1.4s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────
export default function A1Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/a2'), 2000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div
      className="h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(170deg, #eef4fc 0%, #ffffff 55%, #f0f4fd 100%)',
      }}
    >
      {/* 배경 원형 장식 */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 340, height: 340,
          top: -80, right: -80,
          background: `radial-gradient(circle, ${NAVY}08 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 280, height: 280,
          bottom: -60, left: -60,
          background: `radial-gradient(circle, ${NAVY}06 0%, transparent 70%)`,
        }}
      />

      {/* 애니메이션 스타일 */}
      <style>{`
        @keyframes splashFadeUp {
          0%   { opacity: 0; transform: translateY(20px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes splashDot {
          0%, 80%, 100% { opacity: 0.2; transform: scaleY(0.7); }
          40%            { opacity: 0.7; transform: scaleY(1);   }
        }
        .splash-in {
          animation: splashFadeUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .splash-in-delay {
          opacity: 0;
          animation: splashFadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards;
        }
      `}</style>

      {/* 로고 */}
      <div className="splash-in">
        <ModuLogo />
      </div>

      {/* 로딩 점 */}
      <div className="splash-in-delay absolute bottom-20">
        <LoadingDots />
      </div>
    </div>
  )
}
