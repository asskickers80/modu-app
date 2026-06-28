import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1 } from './E1Context'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const AMBER = '#d68b2a'
const AMBER_BG = '#fef3e2'

function ProgressBar({ step }) {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= step ? NAVY : '#e5e7eb' }} />
      ))}
    </div>
  )
}

// 톤 뱃지
function ToneBadge({ type }) {
  if (type === 'fact') return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: NAVY_BG, color: NAVY }}>사실</span>
  )
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: AMBER_BG, color: AMBER }}>AI 추정</span>
  )
}

// AI 로딩 단계 텍스트
const LOAD_STEPS = [
  { icon: '📍', text: '위치·상권 데이터 수집 중...' },
  { icon: '🏢', text: '건축물·시설 정보 분석 중...' },
  { icon: '📊', text: '유사 매물 시세 비교 중...' },
  { icon: '✍️', text: 'AI 설명문 초안 작성 중...' },
]

// 더미 AI 초안 블록
const DRAFT_BLOCKS = [
  {
    id: 'description',
    title: 'AI 매물 설명문',
    tone: 'fact',
    icon: '✍️',
    canHide: false,
    body: `번화한 홍대 상권의 중심, 서교동에 위치한 카페입니다. 지하 1층 33㎡ 규모로, 카운터·에스프레소 머신(반자동, 2년)·냉장 쇼케이스를 갖추고 있습니다. 홍대입구역 3번 출구 도보 4분 거리로 접근성이 우수하며, 주말 유동인구가 풍부한 편입니다.`,
    note: null,
  },
  {
    id: 'location',
    title: '위치 · 상권 분석',
    tone: 'fact',
    icon: '📍',
    canHide: false,
    body: `• 행정구역: 서울 마포구 서교동\n• 역세권: 홍대입구역 3번 출구 도보 4분\n• 반경 300m 유사 업종(카페): 28개\n• 이 상권 평균 보증금: 2,500만원 / 월세 180만원\n• 주말 유동인구: 1만 5천명 수준 (서울시 공공데이터)`,
    note: '공공데이터 기반 사실 정보입니다.',
  },
  {
    id: 'facility',
    title: '시설 등급 평가',
    tone: 'estimate',
    icon: '🔧',
    canHide: true,
    body: `• 전반적 시설 상태: B+ 등급 (추정)\n• 에스프레소 머신: 반자동, 제조 2년 미만 → 잔존가치 양호\n• 냉장 쇼케이스: 약 3년, 정상 작동\n• 인테리어: 최근 3년 이내 추정, 상태 양호\n• 추정 시설 잔존가치: 1,200 ~ 1,600만원`,
    note: '입력하신 정보 기반 AI 추정값입니다. 실제와 다를 수 있어요.',
  },
  {
    id: 'sales',
    title: '매출 위치',
    tone: 'estimate',
    icon: '📈',
    canHide: true,
    body: `• 제공 월평균 매출 기준 상위 32% (서울 카페, 유사 규모)\n• 인근 동종 업체 대비: 상위권\n• 보증금 대비 월세 비율(임대료 부담): 업종 평균 수준\n• 예상 순이익률: 15~22% 추정 (매출 대비)`,
    note: '공개 여부를 직접 선택할 수 있어요.',
  },
]

// 로딩 점 애니메이션
function LoadingDot({ delay }) {
  return (
    <div className="w-2.5 h-2.5 rounded-full"
      style={{
        backgroundColor: NAVY,
        animation: `bounce 0.9s ease-in-out ${delay}s infinite`,
      }} />
  )
}

export default function E1Step2() {
  const navigate = useNavigate()
  const { data } = useE1()
  const [ready, setReady] = useState(false)
  const [loadStep, setLoadStep] = useState(0)

  useEffect(() => {
    // 로딩 단계 순서대로 표시
    const intervals = [0, 700, 1400, 2100].map((delay, i) =>
      setTimeout(() => setLoadStep(i + 1), delay)
    )
    const done = setTimeout(() => setReady(true), 3000)
    return () => { intervals.forEach(clearTimeout); clearTimeout(done) }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/e1/1')} className="flex items-center gap-0.5 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[16px] font-bold text-gray-900">매물 등록</h1>
          <span className="text-[13px] font-bold" style={{ color: NAVY }}>2 / 5</span>
        </div>
        <ProgressBar step={2} />
        {ready && (
          <div className="px-5 pb-5 border-b border-gray-50">
            <h2 className="text-[20px] font-bold text-gray-900">AI 초안이 준비됐어요</h2>
            <p className="text-[13px] text-gray-400 mt-1">다음 단계에서 항목별로 검수·수정할 수 있어요</p>
          </div>
        )}
      </div>

      {/* 본문 */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {!ready ? (
          /* ── 로딩 화면 ── */
          <div className="flex flex-col items-center justify-center h-full px-5 gap-8">
            {/* 점 3개 바운스 */}
            <div className="flex gap-2.5">
              <LoadingDot delay={0} />
              <LoadingDot delay={0.15} />
              <LoadingDot delay={0.3} />
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold text-gray-900">AI가 매물 설명을 작성 중이에요</p>
              <p className="text-[14px] text-gray-400 mt-1.5">상권·시세·시설 정보를 분석하고 있어요</p>
            </div>
            {/* 진행 단계 */}
            <div className="w-full max-w-[280px] flex flex-col gap-2.5">
              {LOAD_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 transition-all duration-300"
                  style={{ opacity: loadStep > i ? 1 : 0.25 }}>
                  <span className="text-[18px] w-7 text-center shrink-0">{s.icon}</span>
                  <p className="text-[13px]" style={{ color: loadStep > i ? '#374151' : '#d1d5db' }}>
                    {s.text}
                  </p>
                  {loadStep > i + 1 && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto shrink-0">
                      <circle cx="7" cy="7" r="6" fill="#22c55e" />
                      <path d="M4 7l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            {/* 무료/프리미엄 안내 */}
            <div className="w-full px-4 py-3 rounded-2xl border border-gray-100 text-center">
              <p className="text-[12px] text-gray-400">
                <span className="font-semibold text-gray-600">무료</span>: 기본 설명·위치·시설<br />
                <span className="font-semibold" style={{ color: AMBER }}>프리미엄</span>: 차별화 설명·경쟁 분석·노출 강화
              </p>
            </div>
          </div>
        ) : (
          /* ── 초안 결과 ── */
          <div className="px-5 pt-5 pb-8">
            {/* 톤 범례 */}
            <div className="flex items-center gap-3 mb-5 px-3 py-2.5 rounded-2xl border border-gray-100">
              <span className="text-[12px] text-gray-500">색으로 구분:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NAVY }} />
                <span className="text-[11px] font-semibold" style={{ color: NAVY }}>사실</span>
              </div>
              <span className="text-gray-200">|</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: AMBER }} />
                <span className="text-[11px] font-semibold" style={{ color: AMBER }}>AI 추정</span>
              </div>
              <span className="text-[11px] text-gray-400 ml-auto">공개 여부는 다음 단계에서</span>
            </div>

            {/* 블록 목록 */}
            <div className="flex flex-col gap-4">
              {DRAFT_BLOCKS.map(block => {
                const isFact = block.tone === 'fact'
                const accentColor = isFact ? NAVY : AMBER
                const accentBg = isFact ? NAVY_BG : AMBER_BG
                return (
                  <div key={block.id}
                    className="rounded-2xl border overflow-hidden"
                    style={{ borderColor: `${accentColor}30` }}>
                    {/* 블록 헤더 */}
                    <div className="flex items-center gap-2 px-4 py-3"
                      style={{ backgroundColor: accentBg }}>
                      <span className="text-[18px]">{block.icon}</span>
                      <p className="text-[13px] font-bold flex-1" style={{ color: accentColor }}>
                        {block.title}
                      </p>
                      <ToneBadge type={block.tone} />
                      {block.canHide && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                          style={{ borderColor: AMBER, color: AMBER }}>공개 선택</span>
                      )}
                    </div>
                    {/* 본문 */}
                    <div className="px-4 py-3 bg-white">
                      <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">
                        {block.body}
                      </p>
                      {block.note && (
                        <p className="mt-2 text-[11px] text-gray-400 border-t border-gray-50 pt-2">
                          ⓘ {block.note}
                        </p>
                      )}
                    </div>
                    {/* 왼쪽 컬러 바 */}
                    <div className="absolute left-0 top-0 w-1 h-full rounded-l-2xl"
                      style={{ backgroundColor: accentColor }} />
                  </div>
                )
              })}
            </div>

            <p className="mt-5 text-center text-[12px] text-gray-400">
              다음 단계에서 항목별로 그대로 두거나, 수정하거나, 공개하지 않을 수 있어요
            </p>
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      {ready && (
        <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
          <button
            onClick={() => navigate('/e1/3')}
            className="w-full py-[18px] rounded-2xl text-[16px] font-bold text-white"
            style={{ backgroundColor: '#111827' }}>
            다음 — 검수·공개 선택
          </button>
        </div>
      )}
    </div>
  )
}
