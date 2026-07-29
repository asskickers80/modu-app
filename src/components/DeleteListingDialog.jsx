/**
 * 매물 내리기(삭제하기) 확인 다이얼로그 — E2(양도인)·E2L(임대인) 공유(복제 금지).
 * 동작 = 소프트 삭제(status='deleted', 탐색·홈·상세 영구 제외). 되돌릴 수 없음 정직 고지.
 */
export default function DeleteListingDialog({ noun = '매물', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" data-testid="delete-confirm">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-[340px] bg-white rounded-3xl p-6 text-center">
        <span className="text-[36px]">🗑️</span>
        <p className="text-[17px] font-bold text-gray-900 mt-2 mb-1">{noun} 내리기 — 정말 내릴까요?</p>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
          내린 {noun}은(는) 되돌릴 수 없어요.<br />목록·탐색에서 완전히 사라지고, 문의 대화 기록만 남아요.
        </p>
        <button onClick={onConfirm} data-testid="delete-confirm-yes"
          className="w-full py-[14px] rounded-2xl text-[15px] font-bold text-white mb-2" style={{ backgroundColor: '#ef4444' }}>
          내리기 (삭제)
        </button>
        <button onClick={onCancel}
          className="w-full py-[12px] rounded-2xl text-[14px] font-medium text-gray-400">
          취소
        </button>
      </div>
    </div>
  )
}
