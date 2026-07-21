import { useNavigate } from 'react-router-dom'
import ModuMark from '../components/ModuMark'

const GRAY = '#8a8a8e'
const GRAY_DARK = '#4b4b4f'

// 방문자 온보딩 마지막 단계 — 둘러보기(주 동선, 시각적 기본) / 회원가입(방문자 역할 유지).
// 가입 강요 인상 금지: 둘러보기가 큰 기본 버튼, 회원가입은 연한 보조.
export default function A6BrowsingWelcome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: '#fafafa' }}>
      <ModuMark size={48} color={GRAY} highlight="#f5f5f6" />
      <h1 className="text-[24px] font-bold text-gray-900 mt-6 mb-2">환영해요 😊</h1>
      <p className="text-[15px] text-gray-500 leading-relaxed mb-10">
        모두를 자유롭게 둘러보세요.<br />마음에 들면 그때 가입해도 돼요.
      </p>

      {/* 주 동선 — 가입 없이 바로 입장 (현행 유지) */}
      <button
        data-testid="browse-guest"
        onClick={() => navigate('/a7/browsing')}
        className="w-full max-w-[320px] py-[16px] rounded-2xl text-[16px] font-bold text-white mb-3 active:scale-[0.98] transition-transform"
        style={{ backgroundColor: GRAY_DARK }}>
        가입 없이 둘러보기
      </button>

      {/* 보조 — 방문자 역할 유지한 채 가입 화면 직행 (온보딩 생략) */}
      <button
        data-testid="browse-signup"
        onClick={() => navigate('/a4', { state: { category: 'browsing' } })}
        className="text-[14px] font-medium text-gray-400 underline underline-offset-2">
        회원가입하고 시작하기
      </button>
    </div>
  )
}
