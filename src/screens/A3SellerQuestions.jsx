import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { saveProfile, completeProfileOnboarding, completeLoggedInRoleAdd, ensurePendingRole, getCarryoverDonors } from '../lib/userProfile'
import SameBusinessPrompt from '../components/SameBusinessPrompt'
import { syncRolesToServer } from '../lib/auth'
import { useAuth } from '../contexts/AuthContext'
import IndustryPicker from '../components/IndustryPicker'
import RegionPicker from '../components/RegionPicker'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

// 이번 양도의 목적 — 홈 화면 개인화용 데이터 (transfer_priority)
// short: 완료 후 요약 칩에 쓰는 축약 라벨
const PRIORITY_OPTIONS = [
  { id: 'fast',     label: '하루라도 빨리 정리하고 싶어요', short: '빨리 정리' },
  { id: 'value',    label: '시간이 걸려도 제값 받고 싶어요', short: '제값 받기' },
  { id: 'browsing', label: '일단 시세만 알아보는 중이에요', short: '시세 파악' },
]

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
  useEffect(() => { ensurePendingRole('seller') }, []) // 진입 즉시 역할 보장(URL 직접 진입 커버)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // 보완 모드 — 이미 가입된 멀티프로필(B안 지연 온보딩)의 질문만 마저 받는 경우
  const isComplete = searchParams.get('complete') === '1'
  const { user } = useAuth() // 로그인 상태면 A4 우회 대상 (ORDER-profile-add-no-login-v1)

  // 업종 — 2단계 드릴다운 (대분류 필수, 소분류 선택 사항)
  const [categoryMain, setCategoryMain] = useState(null)
  const [categorySub, setCategorySub] = useState(null)
  const [ksicCode, setKsicCode] = useState(null)
  // 지역 — 2단계 드릴다운 (시/도 필수, 구·군 선택 사항)
  const [region, setRegion] = useState(null)
  const [regionSub, setRegionSub] = useState(null)
  const [priority, setPriority] = useState(null)

  // 완료 시 요약 칩으로 접힘, (수정)으로 재펼침
  const [expanded, setExpanded] = useState(true)

  // 승계 확인 (profile-data-split) — 다른 대상 축(사장님·소유주) 보유 시 질문 전에 같은 가게인지 확인
  const donors = useMemo(() => getCarryoverDonors('seller'), [])
  const [carryover, setCarryover] = useState(undefined)
  const needPrompt = donors.length > 0 && carryover === undefined
  const pickCarryover = (donor) => {
    if (!donor) { setCarryover(null); return }
    const d = donor.data
    setCarryover(d)
    if (d.category_main || d.bizType) {
      setCategoryMain(d.category_main ?? null); setCategorySub(d.category_sub ?? null); setKsicCode(d.ksic_code ?? null)
    }
    if (d.region) { setRegion(d.region); setRegionSub(d.region_sub ?? null) }
  }
  const skipIndustry = !!carryover && !!(carryover.category_main || carryover.bizType)
  const skipRegion = !!carryover && !!carryover.region

  const allAnswered = categoryMain !== null && region !== null && priority !== null
  const canNext = allAnswered

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
        className="mb-6 flex items-center gap-1 text-t14"
        style={{ color: 'rgba(18,58,99,0.6)' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 14l-5-5 5-5" stroke="rgba(18,58,99,0.6)" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        이전
      </button>

      <div className="mb-8">
        <p className="text-t14 font-medium mb-1" style={{ color: NAVY }}>양도인</p>
        <h1 className="text-[24px] font-bold leading-snug" style={{ color: '#123A63' }}>
          양도하는 거, 시작해볼까요?
        </h1>
        <p className="mt-2 text-t14" style={{ color: 'rgba(18,58,99,0.55)' }}>
          알려주신 만큼, 도움될 정보부터 부지런히 챙겨드릴게요
        </p>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {/* 승계 확인 — 미결정 동안은 질문 대신 이것만 (profile-data-split) */}
        {needPrompt && (
          <SameBusinessPrompt donors={donors} accent={NAVY} accentBg={NAVY_BG} onPick={pickCarryover} />
        )}

        {/* ── 질문 카드 (완료 시 요약 칩으로 접힘) ── */}
        {!needPrompt && (
        <section className="bg-white rounded-[20px] p-4" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}>
          {!expanded && allAnswered && (
            /* 접힘 상태 — 한 줄 요약 칩 */
            <button onClick={() => setExpanded(true)} className="w-full text-left flex items-center gap-1.5">
              <span className="text-t14 font-semibold truncate" style={{ color: '#123A63' }}>
                ☑️ {categorySub ?? categoryMain} · {regionSub ? `${region} ${regionSub}` : region} · {priorityShort}
              </span>
              <span className="text-t13 font-semibold shrink-0" style={{ color: NAVY }}>(수정)</span>
            </button>
          )}

          <Collapse open={expanded}>
            <div className="flex flex-col gap-6">
              {/* Q1 업종 — 승계 시 요약만 (나중에 수정 가능) */}
              {skipIndustry ? (
                <p className="text-t13 font-semibold" style={{ color: NAVY }} data-testid="carryover-industry">
                  ☑️ {categorySub ?? categoryMain} — 기존 가게에서 가져왔어요 (나중에 수정할 수 있어요)
                </p>
              ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-t12 font-bold text-white"
                    style={{ backgroundColor: NAVY }}>1</span>
                  <p className="text-t17 font-bold text-gray-900">
                    어떤 업종을 양도하시나요?
                  </p>
                </div>
                <IndustryPicker
                  value={{ main: categoryMain, sub: categorySub, ksic: ksicCode }}
                  onChange={(next) => {
                    setCategoryMain(next.main); setCategorySub(next.sub); setKsicCode(next.ksic)
                  }}
                />
              </div>
              )}

              {/* Q2 지역 — 승계 시 요약만 */}
              {skipRegion ? (
                <p className="text-t13 font-semibold" style={{ color: NAVY }} data-testid="carryover-region">
                  ☑️ {regionSub ? `${region} ${regionSub}` : region} — 기존 가게에서 가져왔어요
                </p>
              ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-t12 font-bold text-white"
                    style={{ backgroundColor: NAVY }}>2</span>
                  <p className="text-t17 font-bold text-gray-900">
                    어디에 있는 곳인가요?
                  </p>
                </div>
                {/* 공용 RegionPicker (a3-operating-detail에서 추출 — 동작 동일) */}
                <RegionPicker
                  value={{ main: region, sub: regionSub }}
                  onChange={(next) => { setRegion(next.main); setRegionSub(next.sub) }}
                />
              </div>
              )}

              {/* Q3 목적 — 홈 화면 개인화용 (transfer_priority) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-t12 font-bold text-white"
                    style={{ backgroundColor: NAVY }}>3</span>
                  <p className="text-t17 font-bold text-gray-900">
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
                        <span className="text-t15 font-semibold" style={{ color: sel ? NAVY : '#111827' }}>
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
        )}
      </div>

      {/* 다음 버튼 */}
      {!needPrompt && (
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
            if (isComplete || user) {
              if (isComplete) completeProfileOnboarding('seller', searchParams.get('pid')) // 전환 확정 + pending 해제
              else completeLoggedInRoleAdd('seller') // 로그인 상태 신규 역할 추가 — 인증 없이 즉시 확정
              syncRolesToServer() // 로그인 상태면 서버 roles 즉시 반영(로그아웃 불필요)
              saveProfile(answers)
              navigate('/a7/seller', { replace: true })
              return
            }
            navigate('/a4', { state: answers })
          }}
          className="w-full py-[18px] rounded-2xl text-t16 font-bold transition-all duration-200"
          style={{
            background: canNext ? 'linear-gradient(100deg, #2F9BF0, #5BC0FF)' : 'rgba(255,255,255,0.7)',
            color: canNext ? '#ffffff' : 'rgba(23,57,92,0.4)',
            boxShadow: canNext ? '0 10px 28px rgba(47,155,240,0.35)' : 'none',
          }}
        >
          다음
        </button>
      </div>
      )}
    </div>
  )
}
