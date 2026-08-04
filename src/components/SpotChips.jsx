/**
 * 입지 칩 — 도로 접면·주차·전면 노출 (ORDER-ad-frame-v1, E1·E1p 공용. 복제 금지)
 * 정의: 상권 = 동네 단위 / 입지 = 이 건물·이 점포의 자리.
 * 타이핑 최소 원칙 — 전부 탭 선택, 전부 선택 사항(미입력이면 입지 블록은 다른 재료로만 생성).
 */
export const FRONTAGE_OPTIONS = ['대로변', '이면도로', '코너']
export const PARKING_OPTIONS = ['가능', '불가', '인근 공영']
export const VISIBILITY_OPTIONS = ['좋음', '보통']

function ChipRow({ label, hint, options, value, onPick, accent, accentBg, testPrefix }) {
  return (
    <div className="mt-4">
      <p className="text-t14 font-bold text-gray-900">{label} <span className="text-t12 font-normal text-gray-400">(선택)</span></p>
      {hint && <p className="text-t12 text-gray-400 mt-0.5 mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2 mt-2">
        {options.map(o => {
          const on = value === o
          return (
            <button key={o} type="button"
              data-testid={`${testPrefix}-${o}`}
              onClick={() => onPick(on ? '' : o)}
              className="px-3 py-2 rounded-full text-t13 font-medium border transition-all active:scale-[0.97]"
              style={on
                ? { borderColor: accent, backgroundColor: accentBg, color: accent, fontWeight: 700 }
                : { borderColor: '#e5e7eb', backgroundColor: 'white', color: '#4b5563' }}>
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function SpotChips({ data, update, accent, accentBg }) {
  return (
    <div data-testid="spot-chips">
      <ChipRow label="도로 접면" hint="이 자리가 어떤 길에 접해 있나요?" options={FRONTAGE_OPTIONS}
        value={data.spotFrontage ?? ''} onPick={v => update({ spotFrontage: v })}
        accent={accent} accentBg={accentBg} testPrefix="spot-frontage" />
      <ChipRow label="주차" options={PARKING_OPTIONS}
        value={data.spotParking ?? ''} onPick={v => update({ spotParking: v })}
        accent={accent} accentBg={accentBg} testPrefix="spot-parking" />
      <ChipRow label="전면 노출" hint="길에서 가게가 잘 보이나요?" options={VISIBILITY_OPTIONS}
        value={data.spotVisibility ?? ''} onPick={v => update({ spotVisibility: v })}
        accent={accent} accentBg={accentBg} testPrefix="spot-visibility" />
    </div>
  )
}
