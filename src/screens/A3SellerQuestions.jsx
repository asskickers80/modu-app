import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { saveProfile, completeProfileOnboarding } from '../lib/userProfile'
import { INDUSTRY_CATEGORIES, FALLBACK_MAIN, searchIndustry } from '../lib/categories'
import { REGION_CATEGORIES, searchRegion } from '../lib/regions'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

// 이번 양도의 목적 — 홈 화면 개인화용 데이터 (transfer_priority)
// short: 완료 후 요약 칩에 쓰는 축약 라벨
const PRIORITY_OPTIONS = [
  { id: 'fast',     label: '하루라도 빨리 정리하고 싶어요', short: '빨리 정리' },
  { id: 'value',    label: '시간이 걸려도 제값 받고 싶어요', short: '제값 받기' },
  { id: 'browsing', label: '일단 시세만 알아보는 중이에요', short: '시세 파악' },
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

// 부드러운 접힘/펼침 — grid-template-rows 트랜지션 (높이 자동 계산)
// 닫힘 시 visibility:hidden — 클리핑만 하면 접힌 내용이 포커스·접근성 트리에 남는다
function Collapse({ open, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
      <div style={{ overflow: 'hidden', visibility: open ? 'visible' : 'hidden', transition: 'visibility 0.3s' }}>{children}</div>
    </div>
  )
}

export default function A3SellerQuestions() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // 보완 모드 — 이미 가입된 멀티프로필(B안 지연 온보딩)의 질문만 마저 받는 경우
  const isComplete = searchParams.get('complete') === '1'

  // 업종 — 2단계 드릴다운 (대분류 필수, 소분류 선택 사항)
  const [categoryMain, setCategoryMain] = useState(null)
  const [categorySub, setCategorySub] = useState(null)
  const [ksicCode, setKsicCode] = useState(null)
  // 지역 — 2단계 드릴다운 (시/도 필수, 구·군 선택 사항)
  const [region, setRegion] = useState(null)
  const [regionSub, setRegionSub] = useState(null)
  const [priority, setPriority] = useState(null)

  const [bizSearch, setBizSearch] = useState(false)
  const [bizQuery, setBizQuery] = useState('')
  const [regionSearch, setRegionSearch] = useState(false)
  const [regionQuery, setRegionQuery] = useState('')

  // 완료 시 요약 칩으로 접힘, (수정)으로 재펼침
  const [expanded, setExpanded] = useState(true)

  const allAnswered = categoryMain !== null && region !== null && priority !== null
  const canNext = allAnswered

  const selectMain = (label) => {
    if (categoryMain === label) {
      setCategoryMain(null); setCategorySub(null); setKsicCode(null)
    } else {
      setCategoryMain(label); setCategorySub(null); setKsicCode(null)
    }
  }
  const selectSub = (sub) => {
    if (categorySub === sub.label) {
      setCategorySub(null); setKsicCode(null)
    } else {
      setCategorySub(sub.label); setKsicCode(sub.ksic)
    }
  }
  // 검색 결과 선택 → 대분류·소분류·KSIC 자동 세팅
  const pickSearchResult = (r) => {
    setCategoryMain(r.main); setCategorySub(r.sub); setKsicCode(r.ksic)
    setBizSearch(false); setBizQuery('')
  }
  // 매칭 없는 직접입력 폴백 — sub = 입력값, ksic = null
  const pickCustomInput = () => {
    const v = bizQuery.trim()
    if (!v) return
    setCategoryMain(categoryMain ?? FALLBACK_MAIN)
    setCategorySub(v); setKsicCode(null)
    setBizSearch(false); setBizQuery('')
  }
  const searchResults = bizQuery.trim() ? searchIndustry(bizQuery).slice(0, 6) : []

  const selectRegionMain = (label) => {
    if (region === label) {
      setRegion(null); setRegionSub(null)
    } else {
      setRegion(label); setRegionSub(null)
    }
  }
  const selectRegionSub = (sub) => {
    setRegionSub(regionSub === sub ? null : sub)
  }
  // 지역 검색 결과 선택 → 시/도·구 자동 세팅
  const pickRegionResult = (r) => {
    setRegion(r.main); setRegionSub(r.sub)
    setRegionSearch(false); setRegionQuery('')
  }
  // 매칭 없는 직접입력 폴백
  const pickRegionCustom = () => {
    const v = regionQuery.trim()
    if (!v) return
    setRegion(region ?? '기타'); setRegionSub(v)
    setRegionSearch(false); setRegionQuery('')
  }
  const regionResults = regionQuery.trim() ? searchRegion(regionQuery).slice(0, 6) : []

  // "완료되는 순간"에만 자동 접힘 ((수정)으로 다시 펼쳤을 땐 발동하지 않음)
  const prevAnswered = useRef(false)
  useEffect(() => {
    if (allAnswered && !prevAnswered.current) setExpanded(false)
    prevAnswered.current = allAnswered
  }, [allAnswered])

  const priorityShort = PRIORITY_OPTIONS.find((o) => o.id === priority)?.short

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
        <p className="text-sm font-medium mb-1" style={{ color: NAVY }}>양도인</p>
        <h1 className="text-[24px] font-bold leading-snug" style={{ color: '#123A63' }}>
          양도하는 거, 시작해볼까요?
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: 'rgba(18,58,99,0.55)' }}>
          알려주신 만큼, 도움될 정보부터 부지런히 챙겨드릴게요
        </p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {/* ── 질문 카드 (완료 시 요약 칩으로 접힘) ── */}
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          {!expanded && allAnswered && (
            /* 접힘 상태 — 한 줄 요약 칩 */
            <button onClick={() => setExpanded(true)} className="w-full text-left flex items-center gap-1.5">
              <span className="text-[14px] font-semibold truncate" style={{ color: '#123A63' }}>
                ☑️ {categorySub ?? categoryMain} · {regionSub ? `${region} ${regionSub}` : region} · {priorityShort}
              </span>
              <span className="text-[13px] font-semibold shrink-0" style={{ color: NAVY }}>(수정)</span>
            </button>
          )}

          <Collapse open={expanded}>
            <div className="flex flex-col gap-6">
              {/* Q1 업종 — 대분류 8개 → 탭하면 그 자리에서 소분류 펼침 (소분류는 선택 사항) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                    style={{ backgroundColor: NAVY }}>1</span>
                  <p className="text-[17px] font-bold text-gray-900">
                    어떤 업종을 양도하시나요?
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRY_CATEGORIES.map((mc) => (
                    <Chip
                      key={mc.label}
                      label={mc.label}
                      selected={categoryMain === mc.label}
                      onClick={() => selectMain(mc.label)}
                    />
                  ))}
                </div>
                {/* 소분류 드릴다운 — 대분류 선택 시 그 자리에 펼침 */}
                <Collapse open={categoryMain !== null && INDUSTRY_CATEGORIES.some((mc) => mc.label === categoryMain)}>
                  <div className="mt-3 rounded-xl px-3 py-3" style={{ backgroundColor: '#f4f8fc' }}>
                    <p className="text-[12px] mb-2" style={{ color: 'rgba(18,58,99,0.5)' }}>
                      더 자세한 업종을 고를 수 있어요
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(INDUSTRY_CATEGORIES.find((mc) => mc.label === categoryMain)?.subs ?? []).map((sub) => (
                        <button
                          key={sub.label}
                          onClick={() => selectSub(sub)}
                          className="px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-150 active:scale-[0.97]"
                          style={{
                            borderColor: categorySub === sub.label ? NAVY : '#dbe4ef',
                            backgroundColor: categorySub === sub.label ? NAVY_BG : '#ffffff',
                            color: categorySub === sub.label ? NAVY : '#4b5563',
                          }}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                    {/* 직접입력으로 들어온 소분류 표시 (목록에 없는 업종) */}
                    {categorySub && !(INDUSTRY_CATEGORIES.find((mc) => mc.label === categoryMain)?.subs ?? []).some((s) => s.label === categorySub) && (
                      <p className="mt-2 text-[13px] font-semibold" style={{ color: NAVY }}>
                        ✓ 직접입력: {categorySub}
                      </p>
                    )}
                    {/* 직접 검색 — 세부 선택 단계에서만 노출 */}
                    <button
                      onClick={() => setBizSearch(!bizSearch)}
                      className="mt-3 px-3.5 py-2 rounded-full border inline-flex items-center gap-1.5 text-[13px] font-semibold transition-all active:scale-[0.97]"
                      style={{ borderColor: NAVY, color: NAVY, backgroundColor: bizSearch ? NAVY_BG : '#ffffff' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="6" cy="6" r="4.5" stroke={NAVY} strokeWidth="1.6" />
                        <path d="M9.5 9.5l2 2" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      업종 직접 검색
                    </button>
                    {bizSearch && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={bizQuery}
                          onChange={(e) => setBizQuery(e.target.value)}
                          placeholder="업종을 입력해보세요 (예: 통닭, 헤어샵)"
                          className="w-full border rounded-xl px-4 py-3 text-[14px] outline-none"
                          style={{ borderColor: NAVY }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && bizQuery.trim()) {
                              if (searchResults.length > 0) pickSearchResult(searchResults[0])
                              else pickCustomInput()
                            }
                          }}
                        />
                        {searchResults.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1">
                            {searchResults.map((r) => (
                              <button
                                key={`${r.main}/${r.sub}`}
                                onClick={() => pickSearchResult(r)}
                                className="w-full text-left rounded-xl border px-3.5 py-2.5 flex items-center justify-between active:scale-[0.98] transition-all"
                                style={{ borderColor: '#dbe4ef', backgroundColor: '#ffffff' }}
                              >
                                <span className="text-[14px] font-semibold text-gray-800">{r.sub}</span>
                                <span className="text-[12px]" style={{ color: 'rgba(18,58,99,0.5)' }}>{r.main}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {bizQuery.trim() && searchResults.length === 0 && (
                          <button
                            onClick={pickCustomInput}
                            className="mt-2 w-full text-left rounded-xl border px-3.5 py-2.5 text-[14px] active:scale-[0.98] transition-all"
                            style={{ borderColor: '#dbe4ef', backgroundColor: '#ffffff', color: NAVY }}
                          >
                            "{bizQuery.trim()}" 그대로 입력하기
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </Collapse>
              </div>

              {/* Q2 지역 — 시/도 → 탭하면 그 자리에서 구·군·시 펼침 (Q1과 동일 형태, 소분류 선택 사항) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                    style={{ backgroundColor: NAVY }}>2</span>
                  <p className="text-[17px] font-bold text-gray-900">
                    어디에 있는 곳인가요?
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {REGION_CATEGORIES.map((rc) => (
                    <Chip
                      key={rc.label}
                      label={rc.label}
                      selected={region === rc.label}
                      onClick={() => selectRegionMain(rc.label)}
                    />
                  ))}
                </div>
                {/* 구·군 드릴다운 */}
                <Collapse open={region !== null && REGION_CATEGORIES.some((rc) => rc.label === region)}>
                  <div className="mt-3 rounded-xl px-3 py-3" style={{ backgroundColor: '#f4f8fc' }}>
                    <p className="text-[12px] mb-2" style={{ color: 'rgba(18,58,99,0.5)' }}>
                      더 자세한 지역을 고를 수 있어요
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(REGION_CATEGORIES.find((rc) => rc.label === region)?.subs ?? []).map((sub) => (
                        <button
                          key={sub}
                          onClick={() => selectRegionSub(sub)}
                          className="px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-150 active:scale-[0.97]"
                          style={{
                            borderColor: regionSub === sub ? NAVY : '#dbe4ef',
                            backgroundColor: regionSub === sub ? NAVY_BG : '#ffffff',
                            color: regionSub === sub ? NAVY : '#4b5563',
                          }}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                    {/* 직접입력으로 들어온 지역 표시 */}
                    {regionSub && !(REGION_CATEGORIES.find((rc) => rc.label === region)?.subs ?? []).includes(regionSub) && (
                      <p className="mt-2 text-[13px] font-semibold" style={{ color: NAVY }}>
                        ✓ 직접입력: {regionSub}
                      </p>
                    )}
                    {/* 직접 검색 — 세부 선택 단계에서만 노출 */}
                    <button
                      onClick={() => setRegionSearch(!regionSearch)}
                      className="mt-3 px-3.5 py-2 rounded-full border inline-flex items-center gap-1.5 text-[13px] font-semibold transition-all active:scale-[0.97]"
                      style={{ borderColor: NAVY, color: NAVY, backgroundColor: regionSearch ? NAVY_BG : '#ffffff' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="6" cy="6" r="4.5" stroke={NAVY} strokeWidth="1.6" />
                        <path d="M9.5 9.5l2 2" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      지역 직접 검색
                    </button>
                    {regionSearch && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={regionQuery}
                          onChange={(e) => setRegionQuery(e.target.value)}
                          placeholder="지역을 입력해보세요 (예: 강남, 수원)"
                          className="w-full border rounded-xl px-4 py-3 text-[14px] outline-none"
                          style={{ borderColor: NAVY }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && regionQuery.trim()) {
                              if (regionResults.length > 0) pickRegionResult(regionResults[0])
                              else pickRegionCustom()
                            }
                          }}
                        />
                        {regionResults.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1">
                            {regionResults.map((r) => (
                              <button
                                key={`${r.main}/${r.sub}`}
                                onClick={() => pickRegionResult(r)}
                                className="w-full text-left rounded-xl border px-3.5 py-2.5 flex items-center justify-between active:scale-[0.98] transition-all"
                                style={{ borderColor: '#dbe4ef', backgroundColor: '#ffffff' }}
                              >
                                <span className="text-[14px] font-semibold text-gray-800">{r.sub}</span>
                                <span className="text-[12px]" style={{ color: 'rgba(18,58,99,0.5)' }}>{r.main}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {regionQuery.trim() && regionResults.length === 0 && (
                          <button
                            onClick={pickRegionCustom}
                            className="mt-2 w-full text-left rounded-xl border px-3.5 py-2.5 text-[14px] active:scale-[0.98] transition-all"
                            style={{ borderColor: '#dbe4ef', backgroundColor: '#ffffff', color: NAVY }}
                          >
                            "{regionQuery.trim()}" 그대로 입력하기
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </Collapse>
              </div>

              {/* Q3 목적 — 홈 화면 개인화용 (transfer_priority) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                    style={{ backgroundColor: NAVY }}>3</span>
                  <p className="text-[17px] font-bold text-gray-900">
                    이번 양도에서 제일 중요한 건요?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
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
              </div>
            </div>
          </Collapse>
        </section>
      </div>

      {/* 다음 버튼 */}
      <div className="mt-8">
        <button
          disabled={!canNext}
          onClick={() => {
            if (!canNext) return
            const answers = {
              category: 'seller',
              // 신규 3필드 (INDUSTRY-CATEGORY-MAP 저장 구조)
              category_main: categoryMain,
              category_sub: categorySub,
              ksic_code: ksicCode,
              // 기존 화면들이 쓰는 표시용 라벨 (하위 호환)
              bizType: categorySub ?? categoryMain,
              region, region_sub: regionSub, transfer_priority: priority,
            }
            if (isComplete) {
              completeProfileOnboarding('seller', searchParams.get('pid')) // 전환 확정 + pending 해제
              saveProfile(answers)
              navigate('/a7/seller', { replace: true })
              return
            }
            navigate('/a4', { state: answers })
          }}
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
