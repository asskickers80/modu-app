import { useNavigate } from 'react-router-dom'
import { CATEGORY_CONFIG, getProfiles, activateProfile } from '../lib/userProfile'

const ALL_CATEGORIES = Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== 'browsing')

export default function ProfileSwitchSheet({ isOpen, onClose }) {
  const navigate = useNavigate()
  const profiles = getProfiles()
  const active = profiles.find(p => p.active) ?? profiles[0]

  if (!isOpen) return null

  const handleSwitch = (profile) => {
    onClose()
    // pending(질문 미완) 프로필이면 해당 A3 질문(보완 모드)으로 이동
    activateProfile(navigate, profile.id)
  }

  const handleAdd = () => {
    onClose()
    navigate('/a2?multiprofile=1')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <p className="text-[16px] font-black text-gray-900 mb-4">프로필 전환</p>

        {/* 현재 등록된 프로필 목록 */}
        <div className="flex flex-col gap-2 mb-4">
          {profiles.map(profile => {
            const cfg = CATEGORY_CONFIG[profile.category]
            if (!cfg) return null
            return (
              <button
                key={profile.id}
                onClick={() => handleSwitch(profile)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all text-left"
                style={profile.active
                  ? { borderColor: cfg.color, backgroundColor: cfg.bg }
                  : { borderColor: '#f3f4f6', backgroundColor: 'white' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-black text-white shrink-0"
                  style={{ backgroundColor: cfg.color }}>
                  {(profile.name || cfg.label).slice(0, 1)}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold text-gray-900">{profile.name || cfg.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{cfg.label}</p>
                </div>
                {profile.active && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="8" fill={cfg.color} />
                    <path d="M5 9l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {/* 다른 카테고리 빠른 전환 */}
        {profiles.length < 6 && (
          <>
            <p className="text-[11px] font-bold text-gray-400 mb-2">다른 카테고리로 추가</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {ALL_CATEGORIES
                .filter(([cat]) => !profiles.some(p => p.category === cat))
                .map(([cat, cfg]) => (
                  <button key={cat} onClick={() => {
                    onClose()
                    navigate(`/a2?multiprofile=1&preset=${cat}`)
                  }}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
                    style={{ borderColor: cfg.color, color: cfg.color, backgroundColor: cfg.bg }}>
                    + {cfg.label}
                  </button>
                ))}
            </div>
          </>
        )}

        <button
          onClick={handleAdd}
          className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-gray-500 border-2 border-dashed border-gray-200">
          + 새 프로필 추가
        </button>
      </div>
    </div>
  )
}
