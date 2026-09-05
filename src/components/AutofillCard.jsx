/**
 * 자동 채움 확인 카드 (ORDER-address-autofill-v1 §3) — E1(양도인)·E1p(소유주) 공용.
 * "건축물대장에서 가져왔어요: 1층 · 45.2㎡ · 2009년 준공" + [맞아요] [고칠게요]
 *
 * 정직 원칙: 특정된 값만 보여준다(층·면적을 못 고르면 연식·용도만). 조회 실패·미매칭은
 * 이 카드 자체가 렌더되지 않고 기존 직접 입력이 그대로 유지된다.
 */
export default function AutofillCard({ summary, purpose, accent, accentBg, onAccept, onEdit, accepted }) {
  if (!summary) return null
  return (
    <div className="mt-2 rounded-2xl px-4 py-3 border" data-testid="autofill-card"
      style={{ backgroundColor: accentBg, borderColor: `${accent}33` }}>
      <p className="text-t12 font-bold" style={{ color: accent }}>🏢 건축물대장에서 가져왔어요</p>
      <p className="text-t14 font-bold text-gray-900 mt-1" data-testid="autofill-summary">{summary}</p>
      {purpose && <p className="text-t12 text-gray-500 mt-0.5">주용도 {purpose}</p>}
      {accepted ? (
        <p className="text-t12 mt-2" style={{ color: accent }} data-testid="autofill-accepted">
          ✓ 반영했어요 — 아래에서 언제든 고칠 수 있어요
        </p>
      ) : (
        <div className="flex gap-2 mt-3">
          <button onClick={onAccept} data-testid="autofill-accept"
            className="flex-1 py-2.5 rounded-xl text-t13 font-bold text-white"
            style={{ backgroundColor: accent }}>
            맞아요
          </button>
          <button onClick={onEdit} data-testid="autofill-edit"
            className="flex-1 py-2.5 rounded-xl text-t13 font-bold bg-white border border-gray-200 text-gray-600">
            고칠게요
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * 업종 확인 칩 (양도인 전용) — 소진공 데이터는 폐업·이전 반영이 늦어 확인을 받는다.
 * 같은 지번 업소가 많으면(집합건물) 호출부가 아예 제안하지 않는다(storeLookup.suggestIndustry).
 */
export function IndustryConfirm({ suggestion, accent, accentBg, onYes, onNo, answered }) {
  if (!suggestion || answered) return null
  return (
    <div className="mt-2 rounded-2xl px-4 py-3 border" data-testid="industry-confirm"
      style={{ backgroundColor: accentBg, borderColor: `${accent}33` }}>
      <p className="text-t13 text-gray-700">
        이 주소에 <span className="font-bold">{suggestion.label}</span>으로 등록된 곳이 있어요.
        <br />이 업종이 맞나요?
      </p>
      <div className="flex gap-2 mt-3">
        <button onClick={onYes} data-testid="industry-yes"
          className="flex-1 py-2.5 rounded-xl text-t13 font-bold text-white" style={{ backgroundColor: accent }}>
          맞아요
        </button>
        <button onClick={onNo} data-testid="industry-no"
          className="flex-1 py-2.5 rounded-xl text-t13 font-bold bg-white border border-gray-200 text-gray-600">
          다른 업종이에요
        </button>
      </div>
    </div>
  )
}
