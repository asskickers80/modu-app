import { useNavigate } from 'react-router-dom'
import { CATEGORY_CONFIG, getProfiles, activateProfile } from '../lib/userProfile'

/**
 * 헤더 프로필 칩 공용 컴포넌트.
 * - 활성 프로필: 카테고리 색으로 채운 칩 (탭하면 onActiveTap — 프로필 관리 시트)
 * - 비활성 프로필: 색 점 — 탭하면 즉시 전환 (pending이면 해당 A3 보완 모드)
 * - 좌우 스와이프 전환은 대시보드 루트의 useProfileSwipe 훅이 담당 (화면 전체)
 */
export default function ProfileChips({ onActiveTap, dark = false }) {
  const navigate = useNavigate()
  const profiles = getProfiles()

  return (
    <div
      className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0"
      style={{ scrollbarWidth: 'none' }}
    >
      {profiles.map(p => {
        const cfg = CATEGORY_CONFIG[p.category]
        if (!cfg) return null
        if (p.active) {
          return (
            <button
              key={p.id}
              data-active="true"
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
            data-active="false"
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
