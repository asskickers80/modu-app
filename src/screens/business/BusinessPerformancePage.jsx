import { useNavigate } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'
import ComingSoon from '../../components/common/ComingSoon'

const PURPLE = '#7d4ba3'
const PURPLE_DEEP = '#5c3380'

// 노출·전환 실집계 연동 전 — 더미 수치(주간 차트·퍼널·키워드)와 가짜 수치 입력
// Gemini 성과해석 호출을 제거하고 준비중 상태만 표시. CTA(/e1b/1)는 실기능이라 유지.
export default function BusinessPerformancePage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0" style={{ backgroundColor: PURPLE_DEEP }}>
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 16l-6-6 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-[13px] text-purple-300">내 노출 성과</p>
            <p className="text-[18px] font-black text-white">주간 분석</p>
          </div>
          <button onClick={() => showToast('준비 중이에요 🚧')}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}>
            기간 선택
          </button>
        </div>

        {/* 요약 — 집계 연동 전이라 수치 자리만 유지 (다크 헤더라 직접 표기) */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {['총 조회', '총 문의'].map(label => (
            <div key={label} className="rounded-xl py-2.5 px-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-[10px] text-purple-300">{label}</p>
              <p className="text-[14px] font-bold text-purple-300 leading-[24px]">준비중</p>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{ scrollbarWidth: 'none' }}>

        {/* 일별 조회 */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <p className="text-[13px] font-bold text-gray-800">일별 조회 수</p>
          <ComingSoon desc="노출 집계가 연동되면 주간 차트가 표시돼요" />
        </div>

        {/* 전환 퍼널 */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <p className="text-[13px] font-bold text-gray-800">전환 퍼널</p>
          <ComingSoon desc="노출 → 클릭 → 문의 → 전환 흐름이 표시돼요" />
        </div>

        {/* AI 성과 해석 — 실집계 연동 전 */}
        <div className="rounded-2xl px-4 py-3 mb-4 border border-gray-100"
          style={{ backgroundColor: `${PURPLE}0a` }}>
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5"
              style={{ backgroundColor: PURPLE }}>AI</div>
            <div className="flex-1">
              <p className="text-[11px] font-bold" style={{ color: PURPLE }}>AI 성과 해석</p>
              <ComingSoon desc="노출 데이터가 쌓이면 AI가 성과를 해석해드려요" />
            </div>
          </div>
        </div>

        {/* 검색 키워드 순위 */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <p className="text-[13px] font-bold text-gray-800">검색 키워드 순위</p>
          <ComingSoon desc="모두 검색 데이터가 쌓이면 순위가 표시돼요" />
        </div>

        {/* CTA — 실기능 유지 */}
        <button onClick={() => navigate('/e1b/1')}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-white"
          style={{ backgroundColor: PURPLE }}>
          페이지 다듬어 전환율 올리기 →
        </button>
      </main>

      <Toast message={toast} />
    </div>
  )
}
