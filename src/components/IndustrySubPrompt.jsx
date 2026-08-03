import { useState } from 'react'
import ModuWord from './ModuWord'
import IndustryPicker from './IndustryPicker'
import { INDUSTRY_CATEGORIES } from '../lib/categories'
import { coverPhoto } from './ListingCardRow'
import { displayShopName } from '../lib/format'

const NAVY = '#1a4d8f'
const NAVY_BG = '#eef2fb'

/**
 * 업종 소분류 재질문 카드 — 매물 단위 (industry-banner-per-listing).
 *
 * [원칙 — 대표 확정] 업종은 매물의 속성이지 프로필의 속성이 아니다.
 * 미확인 매물을 카드 헤더에 지목(상호/주소 요약+썸네일)하고 그 매물의 업종만 채운다.
 * 복수 미확인이면 한 건 저장 → 목록 갱신 → 다음 매물이 이어서 뜨는 순차 처리
 * (remainingCount 안내). 프로필 단위 일괄 지정 없음 — 저장은 호출부에서 해당 매물 id로만.
 *
 * 강제 게이트가 아니다 — 닫으면 이번 접속에는 다시 뜨지 않고, 다음 접속에 재노출된다.
 * (완성도·가이드 집계는 닫아도 계속 미확인으로 계산된다)
 */
export default function IndustrySubPrompt({ listing, onPick, onClose, remainingCount = 1 }) {
  // 업종이 아예 없는 매물은 대분류부터 골라야 한다 — 기존 IndustryPicker를 그대로 쓴다
  const [picked, setPicked] = useState({ main: null, sub: null, ksic: null })
  const needsMain = !listing.category_main
  const subs = INDUSTRY_CATEGORIES.find(m => m.label === listing.category_main)?.subs ?? []
  if (!needsMain && subs.length === 0) return null

  return (
    <div
      data-testid="industry-sub-prompt"
      className="rounded-2xl border p-4 mb-4"
      style={{ backgroundColor: NAVY_BG, borderColor: `${NAVY}25` }}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-t14 font-bold text-gray-900">업종을 새 분류로 확인해주세요</p>
          <p className="text-t12 text-gray-500 mt-0.5 leading-relaxed">
            <ModuWord />가 업종 분류를 정리했어요. 더 자세한 업종을 골라주시면
            비슷한 매물과 정보를 더 잘 찾아드려요.
          </p>
        </div>
        <button
          onClick={onClose}
          data-testid="industry-sub-prompt-close"
          aria-label="닫기"
          className="w-8 h-8 -mr-1 -mt-1 flex items-center justify-center text-gray-400 text-t18 leading-none shrink-0 active:opacity-60">
          ×
        </button>
      </div>

      {/* 대상 매물 지목 — 어느 매물의 업종을 채우는지 명시 (매물 단위 원칙) */}
      <div
        data-testid="industry-prompt-target"
        className="flex items-center gap-2.5 mt-3 rounded-xl bg-white border px-3 py-2.5"
        style={{ borderColor: '#dbe4ef' }}>
        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: NAVY_BG }}>
          {coverPhoto(listing) && <img src={coverPhoto(listing)} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-t13 font-bold text-gray-900 truncate">{displayShopName(listing)}</p>
          <p className="text-t11 text-gray-400 truncate">{listing.address ?? ''}</p>
        </div>
        {remainingCount > 1 && (
          <span data-testid="industry-prompt-remaining"
            className="text-t10 font-semibold shrink-0 px-1.5 py-0.5 rounded-full"
            style={{ color: NAVY, backgroundColor: NAVY_BG }}>
            미확인 {remainingCount}건 중 1번째
          </span>
        )}
      </div>

      {needsMain ? (
        <div className="mt-3" data-testid="industry-main-picker">
          <IndustryPicker
            value={picked}
            onChange={next => {
              setPicked(next)
              // 소분류까지 고르면 바로 저장 (대분류만 고른 단계에서는 기다린다)
              if (next.main && next.sub) {
                onPick({ label: next.sub, ksic: next.ksic }, next.main)
              }
            }}
          />
        </div>
      ) : (
        <>
          <p className="text-t11 font-semibold mt-3 mb-2" style={{ color: NAVY }}>
            {listing.category_main}
          </p>
          <div className="flex flex-wrap gap-2">
            {subs.map(s => (
              <button
                key={s.label}
                onClick={() => onPick(s)}
                data-testid={`industry-sub-${s.label}`}
                className="px-3 py-1.5 rounded-full text-t13 font-medium border bg-white transition-all duration-150 active:scale-[0.97]"
                style={{ borderColor: '#dbe4ef', color: '#4b5563' }}>
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
