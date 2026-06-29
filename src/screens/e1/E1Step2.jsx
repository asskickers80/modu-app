import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1 } from './E1Context'
import { generateListingDraft } from '../../lib/gemini'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'
const AMBER = '#d68b2a'
const AMBER_BG = '#fef3e2'

const TRANSFER_LABEL = {
  bare: '바닥권리',
  full: '영업양도',
  undecided: '미정',
}

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

const LOAD_STEPS = [
  { icon: '📍', text: '위치·상권 데이터 수집 중...' },
  { icon: '🏢', text: '건축물·시설 정보 분석 중...' },
  { icon: '📊', text: '임대·권리금 조건 정리 중...' },
  { icon: '✍️', text: 'AI 설명문 초안 작성 중...' },
]

function LoadingDot({ delay }) {
  return (
    <div className="w-2.5 h-2.5 rounded-full"
      style={{
        backgroundColor: NAVY,
        animation: `bounce 0.9s ease-in-out ${delay}s infinite`,
      }} />
  )
}

function buildBlocks(aiResult, data) {
  const locationLines = [
    `• 주소: ${data.address || '(미입력)'}`,
    (data.floor || data.area) ? `• 층수: ${data.floor || '-'} / 전용면적: ${data.area ? data.area + '㎡' : '-'}` : null,
    `• 보증금 ${data.deposit || '-'}만원 / 월세 ${data.monthlyRent || '-'}만원${data.maintenance ? ` / 관리비 ${data.maintenance}만원` : ''}`,
    `• 양도방식: ${TRANSFER_LABEL[data.transferType] ?? '-'}`,
    `• 희망 권리금: ${data.transferFee ? data.transferFee + '만원' : '-'}`,
  ].filter(Boolean).join('\n')

  const blocks = [
    {
      id: 'description',
      title: 'AI 매물 설명문',
      tone: 'fact',
      icon: '✍️',
      canHide: false,
      body: aiResult.description,
      note: null,
    },
    {
      id: 'location',
      title: '위치 · 임대 조건',
      tone: 'fact',
      icon: '📍',
      canHide: false,
      body: locationLines,
      note: '입력하신 사실 정보입니다.',
    },
    {
      id: 'facility',
      title: '시설 컨디션 평가',
      tone: 'estimate',
      icon: '🔧',
      canHide: true,
      body: aiResult.facility,
      note: '입력 정보 기반 AI 추정값이에요. 실제와 다를 수 있어요.',
    },
  ]

  if (aiResult.salesAnalysis && data.monthlySales) {
    blocks.push({
      id: 'sales',
      title: '매출 분석',
      tone: 'estimate',
      icon: '📈',
      canHide: true,
      body: aiResult.salesAnalysis,
      note: '공개 여부를 다음 단계에서 선택할 수 있어요.',
    })
  }

  return blocks
}

export default function E1Step2() {
  const navigate = useNavigate()
  const { data, update } = useE1()
  const [ready, setReady] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [blocks, setBlocks] = useState([])
  const [error, setError] = useState(null)

  const run = useCallback(() => {
    setReady(false)
    setError(null)
    setLoadStep(0)

    const t1 = setTimeout(() => setLoadStep(1), 600)
    const t2 = setTimeout(() => setLoadStep(2), 1300)
    const t3 = setTimeout(() => setLoadStep(3), 2000)

    generateListingDraft(data)
      .then(result => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
        setLoadStep(4)
        update({ aiDraft: result })
        setBlocks(buildBlocks(result, data))
        setTimeout(() => setReady(true), 500)
      })
      .catch(err => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
        console.error('[E1Step2] Gemini 호출 실패:', err)
        setError(err.message)
      })
  }, [data, update])

  useEffect(() => { run() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        {error && (
          <div className="px-5 pb-5 border-b border-gray-50">
            <h2 className="text-[20px] font-bold text-gray-900">잠깐, 문제가 생겼어요</h2>
          </div>
        )}
      </div>

      {/* 본문 */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

        {/* 에러 화면 */}
        {error && !ready && (
          <div className="flex flex-col items-center justify-center h-full px-6 gap-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-[32px]"
              style={{ backgroundColor: '#fef2f2' }}>⚠️</div>
            <div>
              <p className="text-[17px] font-bold text-gray-900 mb-2">AI 생성 중 오류가 발생했어요</p>
              <p className="text-[14px] text-gray-500 leading-relaxed">{error}</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={run}
                className="w-full py-4 rounded-2xl text-[15px] font-bold text-white"
                style={{ backgroundColor: NAVY }}>
                다시 시도
              </button>
              <button
                onClick={() => navigate('/e1/1')}
                className="w-full py-4 rounded-2xl text-[15px] font-semibold text-gray-500 border border-gray-200">
                1단계로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* 로딩 화면 */}
        {!ready && !error && (
          <div className="flex flex-col items-center justify-center h-full px-5 gap-8">
            <div className="flex gap-2.5">
              <LoadingDot delay={0} />
              <LoadingDot delay={0.15} />
              <LoadingDot delay={0.3} />
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold text-gray-900">AI가 매물 설명을 작성 중이에요</p>
              <p className="text-[14px] text-gray-400 mt-1.5">상권·시세·시설 정보를 분석하고 있어요</p>
            </div>
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
            <div className="w-full px-4 py-3 rounded-2xl border border-gray-100 text-center">
              <p className="text-[12px] text-gray-400">
                <span className="font-semibold text-gray-600">무료</span>: 기본 설명·위치·시설<br />
                <span className="font-semibold" style={{ color: AMBER }}>프리미엄</span>: 차별화 설명·경쟁 분석·노출 강화
              </p>
            </div>
          </div>
        )}

        {/* 초안 결과 */}
        {ready && (
          <div className="px-5 pt-5 pb-8">
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

            <div className="flex flex-col gap-4">
              {blocks.map(block => {
                const isFact = block.tone === 'fact'
                const accentColor = isFact ? NAVY : AMBER
                const accentBg = isFact ? NAVY_BG : AMBER_BG
                return (
                  <div key={block.id}
                    className="rounded-2xl border overflow-hidden"
                    style={{ borderColor: `${accentColor}30` }}>
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
