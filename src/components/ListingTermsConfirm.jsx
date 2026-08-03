import { TERMS_CHECKBOX_LABEL } from '../lib/listingTerms'

/**
 * 매물 등록 확인사항 블록 — 공개 직전 노출(E1·E1p 공유, 복제 금지).
 * 전문은 스크롤 영역(접힘 금지 — 고지문 노출 원칙). 체크 상태는 호출부가 관리(공개 버튼 활성 연동).
 * 격식체 유지 — 법적 고지문이라 모두 화법 비적용.
 */
export default function ListingTermsConfirm({ terms, agreed, onToggle, accent = '#1a4d8f' }) {
  return (
    <div className="mb-4" data-testid="listing-terms">
      <p className="text-t13 font-bold text-gray-900 mb-2">등록 확인사항</p>
      <div className="rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-3 max-h-44 overflow-y-auto">
        <ol className="space-y-2">
          {terms.map((t, i) => (
            <li key={i} className="flex gap-1.5 text-t11 leading-relaxed text-gray-500">
              <span className="shrink-0 font-semibold text-gray-400">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>
      <label className="flex items-start gap-2.5 mt-3 cursor-pointer select-none" data-testid="terms-agree-row">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => onToggle(e.target.checked)}
          data-testid="terms-agree-checkbox"
          className="mt-0.5 w-4 h-4 shrink-0 accent-current"
          style={{ color: accent }}
        />
        <span className="text-t12 font-semibold text-gray-700 leading-snug">{TERMS_CHECKBOX_LABEL}</span>
      </label>
      {!agreed && (
        <p className="text-t11 text-gray-400 mt-1.5 ml-6" data-testid="terms-agree-hint">
          확인사항에 동의해야 공개할 수 있습니다
        </p>
      )}
    </div>
  )
}
