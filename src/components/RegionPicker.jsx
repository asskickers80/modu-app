import { useState } from 'react'
import { REGION_CATEGORIES, searchRegion } from '../lib/regions'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

function Chip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-t14 font-medium border transition-all duration-150 active:scale-[0.97]"
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

/**
 * 지역 2단계 드릴다운(시/도 → 구·군·시) + 실검색 — A3 온보딩 공용 (a3-operating-detail에서
 * A3Seller 인라인 구현을 추출, 복제 금지). IndustryPicker와 동형 인터페이스.
 *
 * 시/도는 필수, 구·군은 선택 사항. 검색·직접입력 폴백 포함(타이핑 최소 원칙 — 검색은 옵션).
 *
 * value:    { main, sub } — 각각 null 가능
 * onChange: (next) => void  같은 형태의 객체를 돌려준다
 */
export default function RegionPicker({ value, onChange }) {
  const { main = null, sub = null } = value ?? {}
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const subsOf = (m) => REGION_CATEGORIES.find((rc) => rc.label === m)?.subs ?? []

  const selectMain = (label) => {
    if (main === label) onChange({ main: null, sub: null })
    else onChange({ main: label, sub: null })
  }
  const selectSub = (s) => {
    onChange({ main, sub: sub === s ? null : s })
  }
  // 검색 결과 선택 → 시/도·구 자동 세팅
  const pickSearchResult = (r) => {
    onChange({ main: r.main, sub: r.sub })
    setSearchOpen(false); setQuery('')
  }
  // 매칭 없는 직접입력 폴백
  const pickCustomInput = () => {
    const v = query.trim()
    if (!v) return
    onChange({ main: main ?? '기타', sub: v })
    setSearchOpen(false); setQuery('')
  }
  const searchResults = query.trim() ? searchRegion(query).slice(0, 6) : []

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {REGION_CATEGORIES.map((rc) => (
          <Chip
            key={rc.label}
            label={rc.label}
            selected={main === rc.label}
            onClick={() => selectMain(rc.label)}
          />
        ))}
      </div>
      {/* 구·군 드릴다운 */}
      <Collapse open={main !== null && REGION_CATEGORIES.some((rc) => rc.label === main)}>
        <div className="mt-3 rounded-xl px-3 py-3" style={{ backgroundColor: '#f4f8fc' }}>
          <p className="text-t12 mb-2" style={{ color: 'rgba(18,58,99,0.5)' }}>
            더 자세한 지역을 고를 수 있어요
          </p>
          <div className="flex flex-wrap gap-2">
            {subsOf(main).map((s) => (
              <button
                key={s}
                onClick={() => selectSub(s)}
                className="px-3 py-1.5 rounded-full text-t13 font-medium border transition-all duration-150 active:scale-[0.97]"
                style={{
                  borderColor: sub === s ? NAVY : '#dbe4ef',
                  backgroundColor: sub === s ? NAVY_BG : '#ffffff',
                  color: sub === s ? NAVY : '#4b5563',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          {/* 직접입력으로 들어온 지역 표시 */}
          {sub && !subsOf(main).includes(sub) && (
            <p className="mt-2 text-t13 font-semibold" style={{ color: NAVY }}>
              ✓ 직접입력: {sub}
            </p>
          )}
          {/* 직접 검색 — 세부 선택 단계에서만 노출 */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="mt-3 px-3.5 py-2 rounded-full border inline-flex items-center gap-1.5 text-t13 font-semibold transition-all active:scale-[0.97]"
            style={{ borderColor: NAVY, color: NAVY, backgroundColor: searchOpen ? NAVY_BG : '#ffffff' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke={NAVY} strokeWidth="1.6" />
              <path d="M9.5 9.5l2 2" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            지역 직접 검색
          </button>
          {searchOpen && (
            <div className="mt-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="지역을 입력해보세요 (예: 강남, 수원)"
                className="w-full border rounded-xl px-4 py-3 text-t14 outline-none"
                style={{ borderColor: NAVY }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
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
                      <span className="text-t14 font-semibold text-gray-800">{r.sub}</span>
                      <span className="text-t12" style={{ color: 'rgba(18,58,99,0.5)' }}>{r.main}</span>
                    </button>
                  ))}
                </div>
              )}
              {query.trim() && searchResults.length === 0 && (
                <button
                  onClick={pickCustomInput}
                  className="mt-2 w-full text-left rounded-xl border px-3.5 py-2.5 text-t14 active:scale-[0.98] transition-all"
                  style={{ borderColor: '#dbe4ef', backgroundColor: '#ffffff', color: NAVY }}
                >
                  "{query.trim()}" 그대로 입력하기
                </button>
              )}
            </div>
          )}
        </div>
      </Collapse>
    </>
  )
}
