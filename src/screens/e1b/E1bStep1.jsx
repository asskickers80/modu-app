import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useE1b } from './E1bContext'
import { VENDOR_CATEGORIES } from '../../../config/salesCardCategories'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'
const PURPLE_DARK = '#5c3478'

const THIS_YEAR = new Date().getFullYear()

function ProgressBar() {
  return (
    <div className="flex gap-1.5 px-5 pb-4">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: s <= 1 ? PURPLE : '#e5e7eb' }} />
      ))}
    </div>
  )
}

export default function E1bStep1() {
  const navigate = useNavigate()
  const { data, update } = useE1b()
  const [loading, setLoading] = useState(true)
  const [dots, setDots] = useState(0)
  const [category, setCategory] = useState(data.category)
  const [founded, setFounded] = useState(data.founded)

  // 국세청 조회로는 업종·개업연도가 오지 않는다 — 사용자가 직접 고른 값으로만 만든다.
  const foundedYear = /^\d{4}$/.test(String(founded)) ? parseInt(founded, 10) : null
  const years = foundedYear ? THIS_YEAR - foundedYear : null
  const categoryLabel = VENDOR_CATEGORIES.find(c => c.key === category)?.label ?? ''
  const canNext = !!category && !!foundedYear && foundedYear >= 1900 && foundedYear <= THIS_YEAR
  const tagline = [
    data.region ? String(data.region).split(/\s+/).slice(0, 2).join(' ') : null,
    years != null ? `업력 ${years}년` : null,
    categoryLabel || null,
  ].filter(Boolean).join(' · ')

  const goNext = () => {
    if (!canNext || loading) return
    update({ category, founded: String(founded) })
    navigate('/e1b/2')
  }

  useEffect(() => {
    const tick = setInterval(() => setDots(d => (d + 1) % 4), 400)
    const done = setTimeout(() => { setLoading(false); clearInterval(tick) }, 1800)
    return () => { clearInterval(tick); clearTimeout(done) }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white">
        <div className="flex items-center px-5 pt-12 pb-2 gap-2">
          <button onClick={() => navigate('/a7/business')} className="text-gray-400">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14l-5-5 5-5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-t16 font-bold text-gray-900">노출 페이지</h1>
          <span className="text-t13 font-bold" style={{ color: PURPLE }}>1 / 5</span>
        </div>
        <ProgressBar />
        <div className="px-5 pb-5 border-b border-gray-50">
          <h2 className="text-t20 font-bold text-gray-900">① 한 줄 정체성</h2>
          <p className="text-t13 text-gray-400 mt-1">
            사업자 정보는 조회된 그대로예요 · 업종과 개업연도만 골라주세요
          </p>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-32" style={{ scrollbarWidth: 'none' }}>

        {/* 사업자 검증 정보 */}
        <div className="rounded-2xl border-2 p-4 mb-5"
          style={{ borderColor: PURPLE + '40', backgroundColor: PURPLE_BG }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-t16">🛡️</span>
            {data.verified ? (
              <>
                <p className="text-t13 font-bold" style={{ color: PURPLE }}>사업자 등록 조회됨</p>
                <span className="ml-auto text-t10 font-bold px-2 py-0.5 rounded-full bg-white" data-testid="vendor-biz-badge"
                  style={{ color: PURPLE }}>사업자 확인</span>
              </>
            ) : (
              <p className="text-t12" data-testid="vendor-biz-notice" style={{ color: '#A65A0C' }}>국세청 조회 결과 확인되지 않았어요 · 다시 확인해 주세요</p>
            )}
          </div>
          <div className="space-y-1.5">
            {[
              ['상호', data.bizName],
              ['등록번호', data.bizNumber],
              ['소재지', data.region],
            ].filter(([, v]) => !!v).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-t11 text-gray-400 w-16 shrink-0">{k}</span>
                <span className="text-t12 font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 업종 — listings.biz_category 로 저장되고 시세 문의 배정이 이 값으로 대상을 찾는다 */}
        <div className="mb-5">
          <p className="text-t12 font-bold text-gray-400 mb-2">어떤 일을 하세요?</p>
          <div className="grid grid-cols-2 gap-2">
            {VENDOR_CATEGORIES.map(c => (
              <button key={c.key} type="button"
                onClick={() => setCategory(c.key)}
                data-testid={`vendor-category-${c.key}`}
                aria-pressed={category === c.key}
                className="py-3.5 rounded-2xl border-2 text-t13 font-bold transition-all"
                style={{
                  borderColor: category === c.key ? PURPLE : '#e5e7eb',
                  backgroundColor: category === c.key ? PURPLE_BG : '#ffffff',
                  color: category === c.key ? PURPLE : '#374151',
                }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 개업연도 — 국세청 조회로는 오지 않아 직접 받는다 */}
        <div className="mb-5">
          <p className="text-t12 font-bold text-gray-400 mb-2">언제 시작하셨어요?</p>
          <div className="flex items-center gap-2">
            <input value={founded} onChange={e => setFounded(e.target.value.replace(/\D/g, '').slice(0, 4))}
              data-testid="vendor-founded" placeholder="2019" inputMode="numeric" maxLength={4}
              className="flex-1 border-2 rounded-2xl px-4 py-3.5 text-t15 outline-none"
              style={{ borderColor: foundedYear ? PURPLE : '#e5e7eb' }} />
            <span className="text-t14 text-gray-400 shrink-0">년</span>
          </div>
          {years != null && years >= 0 && (
            <p className="text-t11 text-gray-400 mt-1.5">업력 {years}년</p>
          )}
        </div>

        {/* 한 줄 정체성 — 조회된 소재지 + 고른 업종·개업연도를 그대로 이어 붙인다(꾸밈 없음) */}
        <div className="mb-5">
          <p className="text-t12 font-bold text-gray-400 mb-2">한 줄 정체성</p>
          {loading ? (
            <div className="rounded-2xl border border-gray-200 px-4 py-5 flex items-center gap-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: PURPLE, opacity: dots >= i ? 1 : 0.3 }} />
                ))}
              </div>
              <p className="text-t13 text-gray-400">사업자 정보 확인 중{'·'.repeat(dots)}</p>
            </div>
          ) : tagline ? (
            <div className="rounded-2xl border-2 px-4 py-4"
              style={{ borderColor: PURPLE, backgroundColor: PURPLE_BG }}>
              <p className="text-t16 font-black leading-snug" data-testid="vendor-tagline" style={{ color: PURPLE_DARK }}>
                {tagline}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" fill={PURPLE} />
                  <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-t11 text-gray-500">
                  자영업자가 업체를 고를 때 가장 먼저 보는 줄이에요.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 px-4 py-4">
              <p className="text-t13 text-gray-400">업종과 개업연도를 고르면 여기에 만들어져요.</p>
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="rounded-2xl bg-gray-50 px-4 py-3.5">
          <p className="text-t13 font-bold text-gray-700 mb-1.5">상호와 등록번호는 왜 못 고치나요?</p>
          <p className="text-t12 text-gray-500 leading-relaxed">
            국세청에 등록된 그대로예요. 사실이 아닌 정보를 막아 자영업자들이 안심하고 문의할 수 있도록 했어요.
            업종과 개업연도는 조회로 알 수 없어서 직접 받아요.
          </p>
        </div>

      </main>

      <div className="shrink-0 px-5 py-4 bg-white border-t border-gray-50">
        <button
          disabled={loading || !canNext}
          onClick={goNext}
          data-testid="vendor-step1-next"
          className="w-full py-[18px] rounded-2xl text-t16 font-bold transition-all"
          style={{
            backgroundColor: loading || !canNext ? '#e5e7eb' : PURPLE,
            color: loading || !canNext ? '#9ca3af' : '#ffffff',
          }}>
          {loading ? '정보 확인 중...' : '다음 — 이럴 때 부릅니다'}
        </button>
        {!loading && !canNext && (
          <p className="text-center text-t11 text-gray-400 mt-2">업종과 개업연도를 골라주세요</p>
        )}
      </div>
    </div>
  )
}
