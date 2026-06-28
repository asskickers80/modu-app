import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

export const COMPANIES = [
  { id: 'biz1', emoji: '🔨', name: '빠른인테리어', tag: '인테리어·공사', desc: '양도 후 인테리어 전문 시공', rating: 4.8, reviews: 124, badge: '추천', since: '2018', region: '서울 전역', intro: '매장 양도·양수 시 빠른 인테리어 전환 전문. 견적 무료, 시공 7일 완성.' },
  { id: 'biz2', emoji: '📊', name: '권리금연구소', tag: '감정평가·컨설팅', desc: '권리금 감정평가 무료상담', rating: 4.9, reviews: 89, badge: '', since: '2015', region: '서울·경기', intro: '권리금 산정·협상 전문 컨설턴트. 매물 분석 보고서 무료 발급.' },
  { id: 'biz3', emoji: '🏠', name: '모두공인중개', tag: '부동산 중개', desc: '양도 전문 공인중개사', rating: 4.7, reviews: 201, badge: '파트너', since: '2012', region: '서울 전역', intro: '영업양도 및 바닥권리 전문 중개법인. 매수자 DB 3,000건 보유.' },
  { id: 'biz4', emoji: '⚖️', name: '법무사 김앤파트너스', tag: '법무·계약', desc: '양도계약서 작성·검토', rating: 4.6, reviews: 67, badge: '', since: '2019', region: '서울 마포·강남', intro: '양도계약 특약 작성, 계약서 검토 전문. 첫 상담 무료.' },
  { id: 'biz5', emoji: '🤖', name: '모두 AI 감정', tag: 'AI 매물분석', desc: 'AI 기반 매물 가치 분석', rating: 4.9, reviews: 312, badge: '공식', since: '2024', region: '전국', intro: '매출 데이터·상권 AI 분석으로 권리금 적정성 자동 산출. 무료 제공.' },
  { id: 'biz6', emoji: '🧾', name: '세무법인 맑음', tag: '세무·회계', desc: '양도소득세·부가세 신고', rating: 4.7, reviews: 145, badge: '', since: '2016', region: '서울 전역', intro: '영업 양도 시 발생하는 세무신고 전문. 빠른 신고 완료 보장.' },
]

const TAGS = ['전체', '인테리어', '감정평가', '중개', '법무', 'AI분석', '세무']

export default function CompanyListPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [activeTag, setActiveTag] = useState('전체')

  const filtered = COMPANIES.filter(c =>
    activeTag === '전체' || c.tag.includes(activeTag.replace('AI분석', 'AI'))
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 px-4 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f3f4f6' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-[18px] font-bold text-gray-900">거래처·지원 업체</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TAGS.map(t => (
            <button key={t} onClick={() => setActiveTag(t)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={activeTag === t ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>
        {filtered.map(co => (
          <button key={co.id} onClick={() => navigate(`/seller/company/${co.id}`)}
            className="w-full bg-white rounded-2xl border border-gray-100 p-4 mb-3 text-left active:scale-[0.99] transition-transform">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[24px] shrink-0"
                style={{ backgroundColor: NAVY_BG }}>
                {co.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-bold text-gray-900">{co.name}</p>
                  {co.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: NAVY_BG, color: NAVY }}>{co.badge}</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{co.tag}</p>
                <p className="text-[12px] text-gray-600 mt-1.5 leading-snug">{co.intro}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[12px] font-bold text-amber-500">★ {co.rating}</span>
                  <span className="text-[11px] text-gray-400">리뷰 {co.reviews}건</span>
                  <span className="text-[11px] text-gray-400">{co.region}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
        <div className="h-4" />
      </main>

      <Toast message={toast} />
    </div>
  )
}
