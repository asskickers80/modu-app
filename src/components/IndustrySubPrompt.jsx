import ModuWord from './ModuWord'
import { INDUSTRY_CATEGORIES } from '../lib/categories'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

/**
 * 업종 소분류 재질문 카드.
 *
 * 옛 평면 12종으로 등록된 매물은 라벨이 여러 소분류를 뭉친 형태라
 * 백필로 대분류까지만 복원됐다. 소유자에게 소분류만 한 번 더 묻는다.
 *
 * 강제 게이트가 아니다 — 닫으면 이번 접속에는 다시 뜨지 않고, 다음 접속에 재노출된다.
 */
export default function IndustrySubPrompt({ listing, onPick, onClose }) {
  const subs = INDUSTRY_CATEGORIES.find(m => m.label === listing.category_main)?.subs ?? []
  if (subs.length === 0) return null

  return (
    <div
      data-testid="industry-sub-prompt"
      className="rounded-2xl border p-4 mb-4"
      style={{ backgroundColor: NAVY_BG, borderColor: `${NAVY}25` }}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-[14px] font-bold text-gray-900">업종을 새 분류로 확인해주세요</p>
          <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
            <ModuWord />가 업종 분류를 정리했어요. 더 자세한 업종을 골라주시면
            비슷한 매물과 정보를 더 잘 찾아드려요.
          </p>
        </div>
        <button
          onClick={onClose}
          data-testid="industry-sub-prompt-close"
          aria-label="닫기"
          className="w-8 h-8 -mr-1 -mt-1 flex items-center justify-center text-gray-400 text-lg leading-none shrink-0 active:opacity-60">
          ×
        </button>
      </div>

      <p className="text-[11px] font-semibold mt-3 mb-2" style={{ color: NAVY }}>
        {listing.category_main}
      </p>
      <div className="flex flex-wrap gap-2">
        {subs.map(s => (
          <button
            key={s.label}
            onClick={() => onPick(s)}
            data-testid={`industry-sub-${s.label}`}
            className="px-3 py-1.5 rounded-full text-[13px] font-medium border bg-white transition-all duration-150 active:scale-[0.97]"
            style={{ borderColor: '#dbe4ef', color: '#4b5563' }}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
