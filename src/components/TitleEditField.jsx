/**
 * 매물 제목 입력 — 공개 직전 단계 공용 (listing-title, E1·E1p 복제 금지).
 * 초안이 미리 채워지고 소유주가 자유 수정. 강제 검열 없음 — 등록 확인사항 4조 고지만.
 */
export default function TitleEditField({ value, draft, onChange, accent = '#1a4d8f' }) {
  return (
    <div className="mb-4" data-testid="title-edit">
      <p className="text-t14 font-bold text-gray-900 mb-1">매물 제목</p>
      <p className="text-t12 text-gray-400 mb-2">광고 맨 위에 크게 보여요 — 자유롭게 고쳐 쓰세요</p>
      <input
        data-testid="title-input"
        value={value || draft}
        onChange={e => onChange(e.target.value)}
        maxLength={40}
        className="w-full text-t15 font-semibold text-gray-900 rounded-xl border px-4 py-3 outline-none"
        style={{ borderColor: '#e5e7eb' }}
        onFocus={e => { e.target.style.borderColor = accent }}
        onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
      />
      <p className="mt-1.5 text-t11 text-gray-400">
        제목에도 등록 확인사항이 적용돼요 — 근거 없는 보장·과장 표현은 쓸 수 없어요
      </p>
    </div>
  )
}
