import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Toast from '../../components/Toast'
import { ARTICLES } from './ArticleListPage'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

const CONTENT = {
  art1: [
    '권리금 협상에서 가장 중요한 것은 **근거 자료**입니다. 감정 가격이 아닌 데이터를 가져가야 합니다.',
    '1️⃣ POS 매출 데이터 인쇄 (최근 6~12개월) — 매수자에게 가장 신뢰감을 주는 자료입니다. 모두 앱 연동 시 자동 출력됩니다.',
    '2️⃣ 인근 권리금 시세 AI 분석 리포트 — 모두 앱 내 AI 분석 탭에서 무료로 출력하세요. "이 가격이 시세 대비 X%"라는 수치는 협상력을 높여줍니다.',
    '3️⃣ 고정 단골 고객 DB 및 SNS 팔로워 수치 — 무형 자산으로서 권리금 산정 근거입니다. 인스타그램 팔로워, 리뷰 수, 단골 재방문율을 수치화하세요.',
    '4️⃣ 먼저 최종 희망가보다 10~15% 높게 제시하세요 — 협상 여지를 확보하는 전통적인 방법입니다.',
    '📌 핵심 요약: 감정이 아닌 데이터로 말하면 협상이 달라집니다.',
  ],
  art2: [
    '계약서 서명 직전, 아래 5가지를 반드시 재확인하세요.',
    '1️⃣ 매수자 신원 확인 — 신분증과 사업자등록증을 계약 당일 현장에서 확인합니다.',
    '2️⃣ 권리금 수령 방법 — 일괄 수령인지, 분할인지, 에스크로인지 특약에 명시합니다.',
    '3️⃣ 영업비밀 이전 범위 — 레시피, 단골 DB, SNS 계정 이전 여부를 특약에 적어야 분쟁이 없습니다.',
    '4️⃣ 임대인 동의 조항 — 임차권 이전에 임대인 서명이 반드시 필요합니다. 미리 받아두세요.',
    '5️⃣ 잔금 지급·명도 일정 — 명도일과 잔금일이 다르면 공백이 생깁니다. 날짜를 정확히 맞추세요.',
    '📌 계약서는 가급적 법무사 동석 하에 작성을 권장합니다.',
  ],
  art3: [
    '매물 사진 퀄리티에 따라 조회수가 최대 3배 차이납니다. 전문 카메라 없이도 충분합니다.',
    '📐 구도 — 실내 공간은 대각선 구도로 찍으면 더 넓어 보입니다. 문 앞에 서서 찍지 마세요.',
    '💡 조명 — 낮 시간대 자연광이 최고입니다. 형광등은 끄고 창문 빛을 최대한 활용하세요.',
    '🔍 포커스 — 시그니처 상품, 인테리어 포인트를 클로즈업으로 1~2장 찍으세요.',
    '🧹 정리 — 촬영 전 테이블·카운터를 깨끗하게 정리하세요. 어수선하면 -30% 조회수.',
    '📱 편집 — 스마트폰 기본 앱의 "자동 보정"만 눌러도 충분합니다. 과한 필터는 금물.',
    '📌 최소 5장 이상 등록 시 AI 추천 점수가 올라갑니다.',
  ],
}

export default function ArticleDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { toast, showToast } = useToast()

  const article = ARTICLES.find(a => a.id === id) || ARTICLES[0]
  const paragraphs = CONTENT[article.id] || CONTENT.art1

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 px-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f3f4f6' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: NAVY_BG, color: NAVY }}>{article.cat}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-5" style={{ scrollbarWidth: 'none' }}>
        {/* 제목 */}
        <h1 className="text-[22px] font-black text-gray-900 leading-tight mb-3">{article.title}</h1>
        <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-5">
          <span>{article.author}</span>
          <span>·</span>
          <span>{article.date}</span>
          <span>·</span>
          <span>조회 {article.views}</span>
          <span>·</span>
          <span>{article.time} 읽기</span>
        </div>

        {/* 요약 박스 */}
        <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: NAVY_BG }}>
          <p className="text-[12px] font-bold mb-1.5" style={{ color: NAVY }}>📌 핵심 요약</p>
          <p className="text-[13px] leading-relaxed" style={{ color: NAVY }}>{article.summary}</p>
        </div>

        {/* 본문 */}
        <div className="flex flex-col gap-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[14px] text-gray-700 leading-relaxed">{p}</p>
          ))}
        </div>

        {/* 관련 아티클 */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-[13px] font-bold text-gray-900 mb-3">관련 아티클</p>
          {ARTICLES.filter(a => a.id !== article.id).slice(0, 3).map(a => (
            <button key={a.id} onClick={() => navigate(`/seller/article/${a.id}`)}
              className="w-full flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 text-left active:bg-gray-50">
              <span className="text-[18px]">{a.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 leading-snug">{a.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{a.time} 읽기</p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          ))}
        </div>

        <div className="h-8" />
      </main>

      <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 pb-5 flex gap-3">
        <button onClick={() => showToast('북마크 완료 ✓')}
          className="flex-1 py-3 rounded-2xl text-[14px] font-bold border"
          style={{ borderColor: NAVY, color: NAVY }}>
          🔖 저장
        </button>
        <button onClick={() => showToast('링크 복사됨 ✓')}
          className="flex-1 py-3 rounded-2xl text-[14px] font-bold text-white"
          style={{ backgroundColor: NAVY }}>
          공유
        </button>
      </div>

      <Toast message={toast} />
    </div>
  )
}
