import { useNavigate } from 'react-router-dom'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'

const ARTICLES = [
  { id: 'tr1', emoji: '📈', tag: '데이터', title: '2024 상반기 인테리어 시장 분석 리포트', body: '소상공인 창업 증가에 따라 인테리어 수요가 전년 대비 12% 상승했습니다. 특히 20평 미만 소형 점포 인테리어 시장이 급격히 확대되고 있어요.', ago: '1일 전', views: 1243 },
  { id: 'tr2', emoji: '📰', tag: '뉴스', title: '소상공인 창업 증가 → 인테리어 수요 12% ↑', body: '중소기업중앙회에 따르면 올해 상반기 신규 창업 점포 수가 작년 대비 8.3% 증가했으며, 이에 따라 인테리어 및 간판 업체 문의도 크게 늘었습니다.', ago: '2일 전', views: 892 },
  { id: 'tr3', emoji: '💡', tag: '팁', title: '단가 경쟁에서 벗어나는 법 — 패키지 제안의 힘', body: '단순 시공 견적 대신 "창업 패키지"로 제안하면 수익성이 크게 높아집니다. 인테리어+간판+POS 시스템 연계 제안으로 계약 단가를 올린 사례를 소개합니다.', ago: '3일 전', views: 567 },
  { id: 'tr4', emoji: '⚖️', tag: '법령', title: '2024년 소방법 개정사항 — 업체 필수 확인', body: '2024년 7월부터 강화되는 소방 설비 기준에 따라 시공 시 반드시 확인해야 할 항목이 추가됐습니다. 자동 화재 탐지기 설치 의무화 범위가 확대됩니다.', ago: '5일 전', views: 423 },
]

export default function BusinessTrendPage() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 pb-3 px-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <p className="text-[15px] font-black text-gray-900">업계 동향</p>
          <p className="text-[11px] text-gray-400">인테리어·시공 업종 최신 정보</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'none' }}>
        {ARTICLES.map(art => (
          <div key={art.id}
            className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: PURPLE_BG, color: PURPLE }}>{art.tag}</span>
              <span className="text-[11px] text-gray-300 ml-auto">{art.ago}</span>
            </div>
            <p className="text-[15px] font-bold text-gray-900 mb-2">{art.emoji} {art.title}</p>
            <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-3">{art.body}</p>
            <p className="text-[10px] text-gray-300 mt-2">👁 {art.views.toLocaleString()}</p>
          </div>
        ))}
        <div className="h-4" />
      </main>
    </div>
  )
}
