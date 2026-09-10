/**
 * 요금제 상수 단일 소스 (docs/principles/PRICING.md §4)
 * 등급 이름·사진 슬롯·한도는 전부 여기. 코드 다른 곳에 숫자 직접 쓰지 않는다.
 * 프리미엄 미출시 — 화면에서 프리미엄 언급은 PRICING §3-a 가 허용한 자리(사진 슬롯 1줄)뿐.
 */
export type PlanTier = 'free' | 'premium'
export type VendorTier = 'vendor_free' | 'vendor_paid'

export const PLAN_TIERS: PlanTier[] = ['free', 'premium']
export const VENDOR_TIERS: VendorTier[] = ['vendor_free', 'vendor_paid']

/** 사진 슬롯(내부+외부 합산) — 무료 5 는 현행값, 프리미엄 15 는 // PLACEHOLDER — 대표 확정 전 */
export const PHOTO_SLOTS: Record<PlanTier, number> = { free: 5, premium: 15 }

/** 사진 슬롯 확장 안내 1줄 (PRICING §3-a) — 무료 슬롯을 다 쓴 사용자에게만 */
export const PHOTO_SLOT_NOTE = '사진 슬롯을 늘릴 수 있어요'
