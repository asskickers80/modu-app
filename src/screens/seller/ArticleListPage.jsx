import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

export const ARTICLES = [
  { id: 'art1', emoji: '💰', cat: '권리금', title: '권리금 협상, 이렇게 하면 유리해요', views: '1,234', time: '5분', author: '모두 편집팀', date: '2026.06.20', summary: '권리금 협상에서 양도자가 유리한 위치를 점하기 위한 실전 전략을 소개합니다.' },
  { id: 'art2', emoji: '📋', cat: '계약', title: '양도계약서 전 꼭 확인할 5가지', views: '892', time: '3분', author: '법무사 김앤파트너스', date: '2026.06.18', summary: '계약 당일 빠뜨리기 쉬운 5가지 체크포인트를 법무 전문가가 직접 정리했습니다.' },
  { id: 'art3', emoji: '📸', cat: '노출', title: '조회수 올리는 매물 사진 찍는 법', views: '654', time: '4분', author: '모두 편집팀', date: '2026.06.15', summary: '매물 사진 퀄리티에 따라 조회수가 3배 차이 납니다. 스마트폰으로도 충분합니다.' },
  { id: 'art4', emoji: '⚖️', cat: '세무', title: '양도소득세, 실제로 얼마나 내나요?', views: '2,108', time: '6분', author: '세무법인 맑음', date: '2026.06.10', summary: '영업양도 시 발생하는 양도소득세 계산 방법과 절세 팁을 세무사가 알려드립니다.' },
  { id: 'art5', emoji: '🔑', cat: '계약', title: '인수자와 분쟁 피하는 특약 작성법', views: '987', time: '4분', author: '법무사 김앤파트너스', date: '2026.06.05', summary: '계약 후 자주 발생하는 분쟁 유형별 예방 특약 조항을 공개합니다.' },
  { id: 'art6', emoji: '📊', cat: '권리금', title: 'AI가 산정한 우리 매물의 적정 권리금', views: '3,421', time: '7분', author: '모두 AI팀', date: '2026.05.28', summary: 'POS 데이터·상권·인테리어 상태를 종합해 AI가 권리금을 자동 산정하는 원리를 설명합니다.' },
]

const CATS = ['전체', '권리금', '계약', '노출', '세무']

export default function ArticleListPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [cat, setCat] = useState('전체')

  const filtered = ARTICLES.filter(a => cat === '전체' || a.cat === cat)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 px-4 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f3f4f6' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-[18px] font-bold text-gray-900">양도자 필독</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={cat === c ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              {c}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4">
          {filtered.map((a, i) => (
            <button key={a.id} onClick={() => navigate(`/seller/article/${a.id}`)}
              className={`w-full flex items-start gap-3 py-4 text-left active:bg-gray-50 transition-colors ${i < filtered.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] shrink-0"
                style={{ backgroundColor: NAVY_BG }}>
                {a.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-bold text-gray-900 leading-snug flex-1">{a.title}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: NAVY_BG, color: NAVY }}>{a.cat}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug line-clamp-1">{a.summary}</p>
                <p className="text-[10px] text-gray-300 mt-1.5">
                  {a.author} · 조회 {a.views} · {a.time} 읽기
                </p>
              </div>
            </button>
          ))}
          <div className="h-6" />
        </div>
      </main>

      <Toast message={toast} />
    </div>
  )
}
