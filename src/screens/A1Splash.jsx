import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ModuMark from '../components/ModuMark'

const PRIMARY_BLUE = '#1683B8'
const MINT = '#A9DDF2'

export default function A1Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/a2'), 2000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div
      className="h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: PRIMARY_BLUE }}
    >
      {/* 배경 — 미묘한 광채 원형 */}
      <div className="absolute pointer-events-none" style={{
        width: 360, height: 360,
        top: -100, right: -100,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
      }} />
      <div className="absolute pointer-events-none" style={{
        width: 300, height: 300,
        bottom: -80, left: -80,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
      }} />

      {/* 애니메이션 */}
      <style>{`
        @keyframes splashFadeUp {
          0%   { opacity: 0; transform: translateY(24px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes splashDot {
          0%, 80%, 100% { opacity: 0.3; transform: scaleY(0.7); }
          40%            { opacity: 0.8; transform: scaleY(1);   }
        }
        .splash-in {
          animation: splashFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .splash-in-delay {
          opacity: 0;
          animation: splashFadeUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.45s forwards;
        }
        .splash-dots-delay {
          opacity: 0;
          animation: splashFadeUp 0.5s ease 0.7s forwards;
        }
      `}</style>

      {/* ── 중앙 로고 블록 ── */}
      <div className="splash-in flex flex-col items-center gap-6">

        {/* ModuMark 심볼 — 흰 마크, 배경색 하이라이트 */}
        <ModuMark size={96} color="#ffffff" highlight={PRIMARY_BLUE} />

        {/* 워드마크 + 태그라인 */}
        <div className="flex flex-col items-center" style={{ width: 'max-content' }}>
          {/* 모두 */}
          <p
            className="text-white leading-none"
            style={{
              fontFamily: 'Pretendard, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: '52px',
              letterSpacing: '-0.045em',
            }}
          >
            모두
          </p>

          {/* Everyone, Everything! — 모두 글자 폭에 맞춰 */}
          <p
            className="text-center leading-snug"
            style={{
              fontFamily: 'Pretendard, -apple-system, sans-serif',
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '-0.012em',
              lineHeight: '1.22',
              color: MINT,
              marginTop: '8px',
              width: '7.2ch',
            }}
          >
            Everyone,{'\n'}Everything!
          </p>
        </div>
      </div>

      {/* 하단 보조 카피 */}
      <div className="splash-in-delay absolute bottom-24 text-center px-8">
        <p style={{
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          fontWeight: 400,
          fontSize: '13px',
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.01em',
        }}>
          자영업자를 위한 AI 리테일 생태계
        </p>
      </div>

      {/* 로딩 점 */}
      <div className="splash-dots-delay absolute bottom-12 flex gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: MINT,
              opacity: 0.5,
              animation: `splashDot 1.4s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
