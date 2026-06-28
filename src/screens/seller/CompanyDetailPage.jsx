import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'
import { COMPANIES } from './CompanyListPage'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

const SERVICES = {
  biz1: ['인테리어 전체 시공', '간판·사인물 제작', '주방설비 철거·설치', '바닥·천장 리뉴얼', '시공 전 현장 무료 방문'],
  biz2: ['권리금 감정평가 보고서', 'AI 매물 가치 분석', '매수자 협상 전략 컨설팅', '매물 서류 검토', '첫 상담 무료 30분'],
  biz3: ['영업양도 전문 중개', '매수자 매칭 서비스', '계약 동행 지원', '권리금 협상 지원', '계약 후 사후관리'],
  biz4: ['양도계약서 작성', '특약 조항 검토', '권리 의무 이전 서류', '법인 양도 지원', '첫 상담 무료'],
  biz5: ['AI 매물 가치 분석', '상권 분석 리포트', '매출 데이터 검증', '권리금 적정가 산출', '무료 즉시 제공'],
  biz6: ['양도소득세 신고', '부가세 환급 대행', '사업자등록 변경', '세무 컨설팅', '온라인 신고 완료'],
}

const REVIEWS = [
  { name: '양도자 김*님', rating: 5, text: '정말 빠르고 꼼꼼하게 처리해 주셨어요. 덕분에 무사히 양도 완료했습니다!', ago: '3일 전' },
  { name: '창업자 박*님', rating: 5, text: '처음 양도라서 걱정이 많았는데 상세하게 설명해주셔서 믿음이 갔어요.', ago: '2주 전' },
  { name: '자영업자 이*님', rating: 4, text: '빠른 응대와 전문성이 좋았습니다. 다음에도 이용할게요.', ago: '1개월 전' },
]

export default function CompanyDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { toast, showToast } = useToast()

  const co = COMPANIES.find(c => c.id === id) || COMPANIES[0]
  const services = SERVICES[co.id] || SERVICES.biz1

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 px-4 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f3f4f6' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-[18px] font-bold text-gray-900">{co.name}</h1>
          {co.badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: NAVY_BG, color: NAVY }}>{co.badge}</span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* 업체 소개 카드 */}
        <div className="bg-white px-4 py-5 mb-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[32px]"
              style={{ backgroundColor: NAVY_BG }}>
              {co.emoji}
            </div>
            <div>
              <p className="text-[11px] text-gray-400">{co.tag}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[14px] font-bold text-amber-500">★ {co.rating}</span>
                <span className="text-[12px] text-gray-400">({co.reviews}건)</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-gray-400">📍 {co.region}</span>
                <span className="text-[11px] text-gray-400">· {co.since}년 창업</span>
              </div>
            </div>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed">{co.intro}</p>
        </div>

        {/* 서비스 */}
        <div className="bg-white px-4 py-4 mb-2">
          <p className="text-[13px] font-bold text-gray-900 mb-3">제공 서비스</p>
          {services.map((s, i) => (
            <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: NAVY }} />
              <p className="text-[13px] text-gray-700">{s}</p>
            </div>
          ))}
        </div>

        {/* 리뷰 */}
        <div className="bg-white px-4 py-4 mb-4">
          <p className="text-[13px] font-bold text-gray-900 mb-3">리뷰</p>
          {REVIEWS.map((r, i) => (
            <div key={i} className="pb-4 mb-4 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-gray-700">{r.name}</span>
                  <span className="text-[11px] text-amber-500">{'★'.repeat(r.rating)}</span>
                </div>
                <span className="text-[10px] text-gray-400">{r.ago}</span>
              </div>
              <p className="text-[12px] text-gray-600 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      </main>

      {/* 하단 CTA */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 pb-5">
        <button onClick={() => navigate('/d4/inbox')}
          className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white active:scale-[0.99] transition-transform"
          style={{ backgroundColor: NAVY }}>
          📩 DM으로 문의하기
        </button>
      </div>

      <Toast message={toast} />
    </div>
  )
}
