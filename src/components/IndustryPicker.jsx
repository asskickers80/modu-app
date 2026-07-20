import { useState } from 'react'
import { INDUSTRY_CATEGORIES, FALLBACK_MAIN, searchIndustry } from '../lib/categories'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

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

/**
 * 업종 2단계 드릴다운 + 동의어 검색 — A3 온보딩과 E1 매물 등록의 단일 구현.
 *
 * 대분류는 필수, 소분류는 선택 사항(categories.ts가 sub=null을 정상 상태로 허용).
 * 세 값(main/sub/ksic)은 항상 함께 갱신되므로 객체 하나로 주고받는다.
 *
 * value:    { main, sub, ksic } — 각각 null 가능
 * onChange: (next) => void  같은 형태의 객체를 돌려준다
 */
export default function IndustryPicker({ value, onChange }) {
  const { main = null, sub = null } = value ?? {}
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const subsOf = (m) => INDUSTRY_CATEGORIES.find((mc) => mc.label === m)?.subs ?? []

  const selectMain = (label) => {
    if (main === label) onChange({ main: null, sub: null, ksic: null })
    else onChange({ main: label, sub: null, ksic: null })
  }
  const selectSub = (s) => {
    if (sub === s.label) onChange({ main, sub: null, ksic: null })
    else onChange({ main, sub: s.label, ksic: s.ksic })
  }
  // 검색 결과 선택 → 대분류·소분류·KSIC 자동 세팅
  const pickSearchResult = (r) => {
    onChange({ main: r.main, sub: r.sub, ksic: r.ksic })
    setSearchOpen(false); setQuery('')
  }
  // 매칭 없는 직접입력 폴백 — sub = 입력값, ksic = null
  const pickCustomInput = () => {
    const v = query.trim()
    if (!v) return
    onChange({ main: main ?? FALLBACK_MAIN, sub: v, ksic: null })
    setSearchOpen(false); setQuery('')
  }
  const searchResults = query.trim() ? searchIndustry(query).slice(0, 6) : []

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {INDUSTRY_CATEGORIES.map((mc) => (
          <Chip
            key={mc.label}
            label={mc.label}
            selected={main === mc.label}
            onClick={() => selectMain(mc.label)}
          />
        ))}
      </div>
      {/* 소분류 드릴다운 — 대분류 선택 시 그 자리에 펼침 */}
      <Collapse open={main !== null && INDUSTRY_CATEGORIES.some((mc) => mc.label === main)}>
        <div className="mt-3 rounded-xl px-3 py-3" style={{ backgroundColor: '#f4f8fc' }}>
          <p className="text-[12px] mb-2" style={{ color: 'rgba(18,58,99,0.5)' }}>
            더 자세한 업종을 고를 수 있어요
          </p>
          <div className="flex flex-wrap gap-2">
            {subsOf(main).map((s) => (
              <button
                key={s.label}
                onClick={() => selectSub(s)}
                className="px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-150 active:scale-[0.97]"
                style={{
                  borderColor: sub === s.label ? NAVY : '#dbe4ef',
                  backgroundColor: sub === s.label ? NAVY_BG : '#ffffff',
                  color: sub === s.label ? NAVY : '#4b5563',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          {/* 직접입력으로 들어온 소분류 표시 (목록에 없는 업종) */}
          {sub && !subsOf(main).some((s) => s.label === sub) && (
            <p className="mt-2 text-[13px] font-semibold" style={{ color: NAVY }}>
              ✓ 직접입력: {sub}
            </p>
          )}
          {/* 직접 검색 — 세부 선택 단계에서만 노출 */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="mt-3 px-3.5 py-2 rounded-full border inline-flex items-center gap-1.5 text-[13px] font-semibold transition-all active:scale-[0.97]"
            style={{ borderColor: NAVY, color: NAVY, backgroundColor: searchOpen ? NAVY_BG : '#ffffff' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke={NAVY} strokeWidth="1.6" />
              <path d="M9.5 9.5l2 2" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            업종 직접 검색
          </button>
          {searchOpen && (
            <div className="mt-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="업종을 입력해보세요 (예: 통닭, 헤어샵)"
                className="w-full border rounded-xl px-4 py-3 text-[14px] outline-none"
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
                      <span className="text-[14px] font-semibold text-gray-800">{r.sub}</span>
                      <span className="text-[12px]" style={{ color: 'rgba(18,58,99,0.5)' }}>{r.main}</span>
                    </button>
                  ))}
                </div>
              )}
              {query.trim() && searchResults.length === 0 && (
                <button
                  onClick={pickCustomInput}
                  className="mt-2 w-full text-left rounded-xl border px-3.5 py-2.5 text-[14px] active:scale-[0.98] transition-all"
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
