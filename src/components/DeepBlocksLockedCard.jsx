import { DEEP_BLOCKS_ENABLED } from '../lib/memberTier'

/**
 * 특이사항·경쟁력 심화 블록 잠금 카드 (draft-quality — 유료 전용 구조).
 * 원칙: "유료 = 더 깊은 AI 생성". 멤버십 미출시 동안 검수 화면 최후미에 이 카드만 노출.
 * 가격·혜택 약속 금지(미출시 상품 약속 문구 감사 원칙) — 기존 "준비 중" 규격과 동일 톤.
 * DEEP_BLOCKS_ENABLED가 true가 되면 이 카드는 사라지고 실제 블록이 표시된다.
 */
export default function DeepBlocksLockedCard() {
  if (DEEP_BLOCKS_ENABLED) return null
  return (
    <div
      data-testid="deep-blocks-locked"
      className="rounded-2xl border border-dashed border-gray-200 px-4 py-4 bg-gray-50/60">
      <div className="flex items-center gap-2">
        <span className="text-t14">🔒</span>
        <p className="text-t13 font-bold text-gray-500">특이사항 · 경쟁력 분석</p>
      </div>
      <p className="mt-1 text-t12 text-gray-400 leading-relaxed">
        멤버십에서 제공될 예정이에요 (준비 중)
      </p>
    </div>
  )
}
