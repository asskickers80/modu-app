/**
 * 양도인 매물 완성도 — 항목별 가중치·조건·문안 단일 소스 (ORDER 2026-09-10 파트 C1)
 * 점수 산식(lib/completeness.calcScore)은 기존 그대로: 채워진 항목의 weight 합, 상한 100.
 * 순서 = 가중치 내림차순 = '다음 1개' 카드 우선순위. 문안은 효능 문구 없이 사실만.
 */
export interface CompletenessItem { key: string; weight: number; guide: string }

export const SELLER_ITEMS: CompletenessItem[] = [
  { key: 'address', weight: 20, guide: '주소를 입력하면' },
  { key: 'rent', weight: 15, guide: '보증금·월세를 채우면' },
  { key: 'photos', weight: 12, guide: '사진을 올리면' },
  { key: 'shopName', weight: 10, guide: '상호를 입력하면' },
  { key: 'transferFee', weight: 10, guide: '권리금을 입력하면' },
  { key: 'salesProof', weight: 8, guide: '매출 증빙을 더하면' },
  { key: 'area', weight: 5, guide: '면적을 입력하면' },
  { key: 'transferType', weight: 5, guide: '양도 방식을 선택하면' },
  { key: 'category', weight: 5, guide: '업종을 선택하면' },
]

/** 자동 채움(listing_field_sources.status=auto) 값은 사용자 확정 전까지 점수·배지에 넣지 않는다 (2026-09-11 파트 B5) */
export const AUTO_FIELDS_EXCLUDED = true

/** 사진 권장 장수 — 점수는 1장부터 인정(산식 유지), 카드는 3장까지 채우도록 안내 */
export const PHOTOS_RECOMMENDED = 3

/** '충실한 매물' 배지 기준 점수 */
export const BADGE_THRESHOLD = 80 // PLACEHOLDER — 대표 확정 전
export const BADGE_UNLOCK_TEXT = "'충실한 매물' 배지가 붙어요"

/** 양도 검토 신호 집계(파트 C4) — 동(구) 단위 최소 건수. 미만이면 카드 없음 */
export const DEMAND_SIGNAL_MIN = 3 // PLACEHOLDER — 대표 확정 전
export const DEMAND_SIGNAL_DAYS = 7
