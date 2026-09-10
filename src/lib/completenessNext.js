/**
 * 완성도 '다음 1개' 카드 — 순수 룰 (ORDER 2026-09-10 파트 C2). supabase 무의존.
 * 비어 있는 항목 중 가중치 최대 1개. 전부 채웠고 사진도 권장 장수면 null(카드 없음).
 * 문안: "{항목 안내} 완성도 {현재}→{예상}점 · {열리는 것}" — 열리는 것은 사실(배지)만.
 */
import { SELLER_ITEMS, PHOTOS_RECOMMENDED, BADGE_THRESHOLD, BADGE_UNLOCK_TEXT } from '../../config/completeness'
import { PHOTO_SLOTS, PHOTO_SLOT_NOTE } from '../../config/plans'
import { calcScore, listingToScoreInput, ITEM_FILLED, photoCountOf } from './completeness'

/**
 * @param row listings 행(snake_case)
 * @param opts.photoSlots 무료 사진 슬롯 수 (기본 config) — 다 쓴 사용자에게만 슬롯 안내 1줄
 * @returns { key, line, current, projected, unlock, slotNote, step } | null
 */
export function getNextCompletenessItem(row, { photoSlots = PHOTO_SLOTS.free } = {}) {
  if (!row) return null
  const data = listingToScoreInput(row)
  const current = calcScore(data)
  const photos = photoCountOf(data)
  const slotNote = photos >= photoSlots ? PHOTO_SLOT_NOTE : null

  const missing = SELLER_ITEMS.find(it => !ITEM_FILLED[it.key]?.(data)) // 가중치 내림차순 배열 — 첫 항목이 최대
  if (missing) {
    const projected = Math.min(current + missing.weight, 100)
    const unlock = current < BADGE_THRESHOLD && projected >= BADGE_THRESHOLD ? BADGE_UNLOCK_TEXT : null
    return {
      key: missing.key,
      line: `${missing.guide} 완성도 ${current}→${projected}점${unlock ? ` · ${unlock}` : ''}`,
      current, projected, unlock,
      slotNote: missing.key === 'photos' ? slotNote : null,
      step: missing.key === 'photos' ? '/e1/3' : '/e1/1',
    }
  }
  // 점수는 만점(모든 항목 충족)이지만 사진이 권장 장수에 못 미치면 — 점수 변화 없이 사실만 안내
  if (photos < PHOTOS_RECOMMENDED) {
    return {
      key: 'photos',
      line: `사진 ${PHOTOS_RECOMMENDED - photos}장을 더 올리면 권장 ${PHOTOS_RECOMMENDED}장이 채워져요 · 완성도 ${current}점`,
      current, projected: current, unlock: null, slotNote, step: '/e1/3',
    }
  }
  return null
}
