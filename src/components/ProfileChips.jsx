import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORY_CONFIG, getProfiles, activateProfile } from '../lib/userProfile'

/**
 * 헤더 프로필 칩 공용 컴포넌트.
 * - 활성 프로필: 카테고리 색으로 채운 칩 (탭하면 onActiveTap — 프로필 관리 시트)
 * - 비활성 프로필: 작고 흐린 칩 — 탭하면 즉시 전환 (pending이면 해당 A3 보완 모드)
 * - 칩 영역 좌우 스와이프: 다음/이전 프로필로 즉시 전환 (순환)
 */
export default function ProfileChips({ onActiveTap, dark = false }) {
  const navigate = useNavigate()
  const profiles = getProfiles()
  const touch = useRef(null)

  const activeIdx = Math.max(0, profiles.findIndex(p => p.active))

  const onTouchStart = (e) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return
    // 왼쪽으로 밀기 = 다음 프로필, 오른쪽으로 밀기 = 이전 프로필
    const nextIdx = dx < 0 ? activeIdx + 1 : activeIdx - 1
    // 그 방향에 더 넘길 프로필이 없으면 → 프로필 전환·추가 시트 열기
    if (nextIdx < 0 || nextIdx >= profiles.length) {
      onActiveTap?.()
      return
    }
    const target = profiles[nextIdx]
    if (target && !target.active) activateProfile(navigate, target.id)
  }

  return (
    <div
      className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0"
      style={{ scrollbarWidth: 'none' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {profiles.map(p => {
        const cfg = CATEGORY_CONFIG[p.category]
        if (!cfg) return null
        if (p.active) {
          return (
            <button
              key={p.id}
              onClick={onActiveTap}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold text-white active:opacity-80"
              style={{ backgroundColor: cfg.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />
              {cfg.label}
            </button>
          )
        }
        return (
          /* 비활성 프로필 — 글자 없이 카테고리 색 점만 (흐리게) */
          <button
            key={p.id}
            onClick={() => activateProfile(navigate, p.id)}
            aria-label={cfg.label}
            title={cfg.label}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center active:opacity-60"
          >
            <span className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: cfg.color, opacity: dark ? 0.65 : 0.5 }} />
          </button>
        )
      })}
      {/* 프로필 추가 */}
      <button
        onClick={onActiveTap}
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold"
        style={dark
          ? { border: '2px dashed rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.5)' }
          : { border: '2px dashed #d1d5db', color: '#d1d5db' }}
      >
        +
      </button>
    </div>
  )
}
