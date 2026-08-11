import { CATEGORY_CONFIG } from '../lib/userProfile'

/**
 * 프로필 추가 승계 확인 (ORDER-profile-data-split-v1) — 대상 3축 A3 공용.
 * "기존에 등록하신 가게와 같은 가게인가요?" — 같은 가게면 업종·지역을 복사해
 * 해당 질문을 건너뛴다(나중에 수정 가능). 후보(donors)는 부모가 getCarryoverDonors로 계산.
 *
 * donors: [{ cat, data: { category_sub|category_main|bizType?, region?, region_sub? } }]
 * onPick(donor | null): donor = 같은 가게(그 축 정보 승계), null = 다른 가게(전체 질문)
 */
export default function SameBusinessPrompt({ donors, accent, accentBg, onPick }) {
  const label = (d) => {
    const biz = d.data.category_sub ?? d.data.category_main ?? d.data.bizType
    const region = d.data.region_sub ? `${d.data.region} ${d.data.region_sub}` : d.data.region
    return [biz, region].filter(Boolean).join(' · ')
  }
  return (
    <section className="bg-white rounded-[20px] p-4 mb-2" style={{ boxShadow: '0 6px 22px rgba(22,131,184,0.08)' }}
      data-testid="same-business-prompt">
      <p className="text-t15 font-semibold text-gray-900 mb-1">
        기존에 등록하신 가게와 같은 가게인가요?
      </p>
      <p className="text-t12 text-gray-400 mb-3">같은 가게면 업종·지역을 다시 입력하지 않아도 돼요</p>
      <div className="flex flex-col gap-2">
        {donors.map((d) => (
          <button
            key={d.cat}
            data-testid={`same-business-${d.cat}`}
            onClick={() => onPick(d)}
            className="w-full text-left rounded-2xl border-2 px-4 py-3 transition-all active:scale-[0.98]"
            style={{ borderColor: accent, backgroundColor: accentBg }}
          >
            <span className="text-t14 font-bold" style={{ color: accent }}>같은 가게예요</span>
            <p className="text-t12 text-gray-500 mt-0.5">
              {label(d)} <span className="text-gray-400">({CATEGORY_CONFIG[d.cat]?.label})</span>
            </p>
          </button>
        ))}
        <button
          data-testid="same-business-no"
          onClick={() => onPick(null)}
          className="w-full text-left rounded-2xl border-2 border-gray-200 px-4 py-3 transition-all active:scale-[0.98]"
        >
          <span className="text-t14 font-bold text-gray-600">다른 가게예요</span>
          <p className="text-t12 text-gray-400 mt-0.5">업종·지역을 새로 입력할게요</p>
        </button>
      </div>
    </section>
  )
}
