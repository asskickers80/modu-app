const NAVY = '#1a4d8f'
const AMBER = '#d68b2a'
const AMBER_BG = '#fef3e2'

/**
 * 사업자 폐업 감지 확인 카드.
 *
 * 주 1회 배치가 폐업을 감지하면 매물을 hidden 으로 내리고 표식만 남긴다
 * (자동 완료 금지). 소유자에게 어떻게 할지 묻는다 — 폐업이 곧 양도 완료는 아니다.
 *
 * 3택: 완료 / 시설·집기 양도로 계속 / 내리기.
 * 무응답 시 hidden 유지 (닫아도 다음 접속에 다시 뜬다 — 방치만은 막는다).
 */
export default function ClosurePrompt({ listing, onComplete, onContinue, onKeepHidden, onClose }) {
  return (
    <div
      data-testid="closure-prompt"
      className="rounded-2xl border p-4 mb-4"
      style={{ backgroundColor: AMBER_BG, borderColor: '#f0d9b5' }}>
      <div className="flex items-start gap-2">
        <span className="text-[18px]">🏢</span>
        <div className="flex-1">
          <p className="text-[14px] font-bold text-gray-900">사업자 폐업이 확인됐어요</p>
          <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
            국세청에서 폐업이 확인돼 매물을 잠시 내려뒀어요. 어떻게 할까요?
          </p>
        </div>
        <button
          onClick={onClose}
          data-testid="closure-close"
          aria-label="닫기"
          className="w-7 h-7 -mr-1 -mt-1 flex items-center justify-center text-gray-400 text-lg leading-none shrink-0 active:opacity-60">
          ×
        </button>
      </div>

      <div className="flex flex-col gap-2 mt-3">
        <button
          onClick={onComplete}
          data-testid="closure-complete"
          className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white active:scale-[0.99] transition-transform"
          style={{ backgroundColor: NAVY }}>
          양도를 완료했어요
        </button>
        <button
          onClick={onContinue}
          data-testid="closure-continue"
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold border bg-white active:scale-[0.99] transition-transform"
          style={{ borderColor: `${AMBER}66`, color: AMBER }}>
          시설·집기 양도로 계속할게요
        </button>
        <button
          onClick={onKeepHidden}
          data-testid="closure-keep-hidden"
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-gray-500 bg-gray-100 active:scale-[0.99] transition-transform">
          매물을 내릴게요
        </button>
      </div>
    </div>
  )
}
