import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

const BUSINESS_TYPES = [
  '카페·디저트', '음식점', '술집·바', '미용·뷰티',
  '편의점·마트', '의류·패션', '헬스·스포츠', '기타',
]

const REGIONS = [
  '서울', '경기', '인천', '부산', '대구',
  '광주', '대전', '울산', '기타',
]

const TRANSFER_OPTIONS = [
  {
    id: 'bare',
    label: '자리·시설만',
    sub: '바닥권리',
    tip: '인테리어·집기 등 시설만 넘기는 방식. 영업권(단골, 매출)은 포함 안 돼요.',
  },
  {
    id: 'full',
    label: '영업까지 그대로',
    sub: '권리금',
    tip: '시설 + 영업권(단골, 매출 등)까지 통째로 넘기는 방식. 권리금이 붙어요.',
  },
  {
    id: 'undecided',
    label: '아직 고민 중',
    sub: '나중에 결정',
    tip: '지금 정하지 않아도 돼요. 나중에 매물 등록할 때 선택할 수 있어요.',
  },
]

// 이번 양도의 목적 — 홈 화면 개인화용 데이터 (transfer_priority)
const PRIORITY_OPTIONS = [
  { id: 'fast',     label: '하루라도 빨리 정리하고 싶어요' },
  { id: 'value',    label: '시간이 걸려도 제값 받고 싶어요' },
  { id: 'browsing', label: '일단 시세만 알아보는 중이에요' },
]

function Chip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-[14px] font-medium border transition-all duration-150 active:scale-[0.97]"
      style={{
        borderColor: selected ? NAVY : '#e5e7eb',
        backgroundColor: selected ? NAVY_BG : '#f9fafb',
        color: selected ? NAVY : '#374151',
      }}
    >
      {label}
    </button>
  )
}

function Tooltip({ text, visible }) {
  if (!visible) return null
  return (
    <div className="mt-2 px-3 py-2 rounded-xl text-[13px] text-gray-600 leading-snug"
      style={{ backgroundColor: '#f0f4fb' }}>
      {text}
    </div>
  )
}

// 부드러운 접힘/펼침 — grid-template-rows 트랜지션 (높이 자동 계산)
function Collapse({ open, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
      <div style={{ overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

export default function A3SellerQuestions() {
  const navigate = useNavigate()

  const [bizType, setBizType] = useState(null)
  const [region, setRegion] = useState(null)
  const [transfer, setTransfer] = useState(null)
  const [priority, setPriority] = useState(null)
  const [openTip, setOpenTip] = useState(null)

  const [bizSearch, setBizSearch] = useState(false)
  const [regionSearch, setRegionSearch] = useState(false)

  // 화면엔 항상 한 섹션만 펼쳐진 상태 유지: 'shop' | 'priority'
  const [expanded, setExpanded] = useState('shop')

  const shopComplete = bizType !== null && region !== null && transfer !== null
  const canNext = shopComplete && priority !== null

  // 섹션 1이 "완료되는 순간"에만 자동 접힘 + 섹션 2 펼침
  // ((수정)으로 다시 펼쳤을 땐 이미 완료 상태라 발동하지 않음)
  const prevShopComplete = useRef(false)
  useEffect(() => {
    if (shopComplete && !prevShopComplete.current) setExpanded('priority')
    prevShopComplete.current = shopComplete
  }, [shopComplete])

  const toggleTip = (id) => setOpenTip((prev) => (prev === id ? null : id))

  const transferSub = TRANSFER_OPTIONS.find((o) => o.id === transfer)?.sub
  const priorityLabel = PRIORITY_OPTIONS.find((o) => o.id === priority)?.label

  return (
    <div className="flex flex-col min-h-screen px-5 pt-14 pb-8" style={{ background: 'linear-gradient(180deg, #9FD4FA 0%, #DFF1FE 30%, #F2F9FF 100%)' }}>
      {/* 뒤로가기 + 헤더 */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1 text-sm"
        style={{ color: 'rgba(18,58,99,0.6)' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 14l-5-5 5-5" stroke="rgba(18,58,99,0.6)" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        이전
      </button>

      <div className="mb-8">
        <p className="text-sm font-medium mb-1" style={{ color: NAVY }}>양도자</p>
        <h1 className="text-[24px] font-bold leading-snug" style={{ color: '#123A63' }}>
          양도하는 거, 시작해볼까요?
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: 'rgba(18,58,99,0.55)' }}>
          알려주신 만큼, 도움될 정보부터 부지런히 챙겨드릴게요
        </p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {/* ── 섹션 1: 가게 정보 ── */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          {expanded !== 'shop' && shopComplete ? (
            /* 접힘 상태 — 한 줄 요약 칩 */
            <button onClick={() => setExpanded('shop')} className="w-full text-left flex items-center gap-1.5">
              <span className="text-[14px] font-semibold truncate" style={{ color: '#123A63' }}>
                ☑️ {bizType} · {region} · {transferSub}
              </span>
              <span className="text-[13px] font-semibold shrink-0" style={{ color: NAVY }}>(수정)</span>
            </button>
          ) : (
            <p className="text-[15px] font-bold" style={{ color: '#123A63' }}>사장님 가게부터 알려주세요</p>
          )}

          <Collapse open={expanded === 'shop'}>
            <div className="flex flex-col gap-6 pt-4">
              {/* Q1 업종 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ backgroundColor: NAVY }}>1</span>
                  <p className="text-[15px] font-semibold text-gray-900">
                    어떤 업종을 양도하시나요?
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_TYPES.map((b) => (
                    <Chip
                      key={b}
                      label={b}
                      selected={bizType === b}
                      onClick={() => setBizType(bizType === b ? null : b)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setBizSearch(!bizSearch)}
                  className="mt-2 text-[13px] font-medium flex items-center gap-1"
                  style={{ color: NAVY }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke={NAVY} strokeWidth="1.5" />
                    <path d="M9.5 9.5l2 2" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  업종 직접 검색
                </button>
                {bizSearch && (
                  <input
                    type="text"
                    placeholder="업종을 입력해주세요"
                    className="mt-2 w-full border rounded-xl px-4 py-3 text-[14px] outline-none"
                    style={{ borderColor: NAVY }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        setBizType(e.target.value.trim())
                        setBizSearch(false)
                      }
                    }}
                  />
                )}
              </div>

              {/* Q2 지역 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ backgroundColor: NAVY }}>2</span>
                  <p className="text-[15px] font-semibold text-gray-900">
                    가게 위치는요?
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((r) => (
                    <Chip
                      key={r}
                      label={r}
                      selected={region === r}
                      onClick={() => setRegion(region === r ? null : r)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setRegionSearch(!regionSearch)}
                  className="mt-2 text-[13px] font-medium flex items-center gap-1"
                  style={{ color: NAVY }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke={NAVY} strokeWidth="1.5" />
                    <path d="M9.5 9.5l2 2" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  지역 직접 검색
                </button>
                {regionSearch && (
                  <input
                    type="text"
                    placeholder="시/도를 입력해주세요"
                    className="mt-2 w-full border rounded-xl px-4 py-3 text-[14px] outline-none"
                    style={{ borderColor: NAVY }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        setRegion(e.target.value.trim())
                        setRegionSearch(false)
                      }
                    }}
                  />
                )}
              </div>

              {/* Q3 양도 방식 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ backgroundColor: NAVY }}>3</span>
                  <p className="text-[15px] font-semibold text-gray-900">
                    어떤 방식으로 넘기시나요?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {TRANSFER_OPTIONS.map((opt) => {
                    const sel = transfer === opt.id
                    return (
                      <div key={opt.id}>
                        <div
                          onClick={() => setTransfer(sel ? null : opt.id)}
                          role="button"
                          className="w-full text-left rounded-2xl border-2 px-4 py-[14px] transition-all duration-150 active:scale-[0.98] flex items-center justify-between cursor-pointer select-none"
                          style={{
                            borderColor: sel ? NAVY : '#e5e7eb',
                            backgroundColor: sel ? NAVY_BG : '#ffffff',
                          }}
                        >
                          <div>
                            <span
                              className="text-[15px] font-semibold"
                              style={{ color: sel ? NAVY : '#111827' }}
                            >
                              {opt.label}
                            </span>
                            <span
                              className="ml-2 text-[12px]"
                              style={{ color: sel ? NAVY : '#9ca3af' }}
                            >
                              {opt.sub}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleTip(opt.id) }}
                            className="ml-2 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border"
                            style={{
                              borderColor: openTip === opt.id ? NAVY : '#d1d5db',
                              color: openTip === opt.id ? NAVY : '#9ca3af',
                              backgroundColor: openTip === opt.id ? NAVY_BG : 'transparent',
                            }}
                          >
                            ⓘ
                          </button>
                        </div>
                        <Tooltip text={opt.tip} visible={openTip === opt.id} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Collapse>
        </section>

        {/* ── 섹션 2: 목적 ── */}
        <section
          className="bg-white rounded-[20px] p-4"
          style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)', opacity: shopComplete ? 1 : 0.45, transition: 'opacity 0.3s ease' }}
        >
          <button
            disabled={!shopComplete}
            onClick={() => shopComplete && setExpanded('priority')}
            className="w-full text-left"
          >
            <p className="text-[15px] font-bold" style={{ color: '#123A63' }}>
              이번 양도에서 제일 중요한 건요?
            </p>
            {!shopComplete && (
              <p className="text-[12px] mt-1" style={{ color: 'rgba(18,58,99,0.5)' }}>
                가게 정보를 먼저 알려주시면 열려요
              </p>
            )}
            {shopComplete && expanded !== 'priority' && priority && (
              <p className="text-[13px] mt-1 font-semibold" style={{ color: '#123A63' }}>
                ☑️ {priorityLabel}
              </p>
            )}
          </button>

          <Collapse open={expanded === 'priority'}>
            <div className="flex flex-col gap-2 pt-3">
              {PRIORITY_OPTIONS.map((opt) => {
                const sel = priority === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPriority(sel ? null : opt.id)}
                    className="w-full text-left rounded-2xl border-2 px-4 py-[14px] transition-all duration-150 active:scale-[0.98]"
                    style={{
                      borderColor: sel ? NAVY : '#e5e7eb',
                      backgroundColor: sel ? NAVY_BG : '#ffffff',
                    }}
                  >
                    <span className="text-[15px] font-semibold" style={{ color: sel ? NAVY : '#111827' }}>
                      {opt.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </Collapse>
        </section>
      </div>

      {/* 다음 버튼 */}
      <div className="mt-8">
        <button
          disabled={!canNext}
          onClick={() => canNext && navigate('/a4', { state: { category: 'seller', bizType, region, transfer, transfer_priority: priority } })}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all duration-200"
          style={{
            background: canNext ? 'linear-gradient(100deg, #2F9BF0, #5BC0FF)' : 'rgba(255,255,255,0.7)',
            color: canNext ? '#ffffff' : 'rgba(23,57,92,0.4)',
            boxShadow: canNext ? '0 10px 28px rgba(47,155,240,0.35)' : 'none',
          }}
        >
          다음
        </button>
      </div>
    </div>
  )
}
