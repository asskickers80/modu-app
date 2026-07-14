import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ModuMark from '../components/ModuMark'

// 앱 아이콘과 동일한 진한 하늘 톤
const SKY_GRADIENT = 'linear-gradient(180deg, #3F9EE6 0%, #85C7F8 100%)'
const SKY_MID = '#62B3EF' // 심볼 하이라이트용 — 화면 중앙 배경색 근사치
const INK = '#123A63'

export default function A1Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/a2'), 2000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div
      // fixed inset-0 — 390px 앱 프레임을 벗어나 아이폰/아이패드에서도 화면 전체를 채움
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: SKY_GRADIENT }}
    >
      {/* 배경 — 앰비언트 블롭 (A2와 동일 톤) */}
      <div className="absolute pointer-events-none" style={{
        width: 320, height: 320,
        left: -130, top: -50,
        borderRadius: '50%', filter: 'blur(58px)',
        background: 'radial-gradient(circle at 45% 45%, rgba(255,255,255,0.7), transparent 68%)',
      }} />
      <div className="absolute pointer-events-none" style={{
        width: 340, height: 340,
        right: -140, bottom: -120,
        borderRadius: '50%', filter: 'blur(58px)',
        background: 'radial-gradient(circle at 45% 45%, rgba(150,205,250,0.5), transparent 68%)',
      }} />
      <div className="absolute pointer-events-none" style={{
        width: 300, height: 300,
        right: -80, top: -80,
        borderRadius: '50%', filter: 'blur(58px)',
        background: 'radial-gradient(circle at 45% 45%, rgba(255,240,200,0.5), transparent 68%)',
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

        {/* ModuMark 심볼 — 흰 마크 + 얇은 파란 외곽선(선명도) */}
        <ModuMark size={96} color="#ffffff" highlight={SKY_MID} outline="#1B6DB3" outlineOpacity={0.5} />

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
              textShadow: '0 2px 10px rgba(40,110,180,0.35)',
              WebkitTextStroke: '1px rgba(27,109,179,0.45)',
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
              color: '#FFFFFF',
              textShadow: '0 1px 6px rgba(40,110,180,0.4)',
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
          color: 'rgba(18,58,99,0.55)',
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
              backgroundColor: INK,
              opacity: 0.4,
              animation: `splashDot 1.4s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
