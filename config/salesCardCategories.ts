/**
 * 사장님 매출 '이 상황에 맞는 서비스' 카드 — 상황별 카테고리 칩 단일 소스 (ORDER 2026-09-09 파트 A4)
 * 화면·정렬·원장 기록이 전부 이 파일의 키를 쓴다. 칩을 늘리거나 줄일 때 여기만 고친다.
 * 칩 종류: vendor = 기업회원 목록 시트 / internal = 모두 내부 안내(양도 상담)
 */
export type SalesSignal = 'lease_end_near' | 'sales_drop' | 'weekday_gap'

export interface SalesCardCategory {
  key: string
  label: string
  kind: 'vendor' | 'internal'
}

export const CATEGORIES: Record<string, SalesCardCategory> = {
  marketing: { key: 'marketing', label: '마케팅·홍보', kind: 'vendor' },
  consulting: { key: 'consulting', label: '메뉴·운영 컨설팅', kind: 'vendor' },
  realestate: { key: 'realestate', label: '부동산(재계약·이전)', kind: 'vendor' },
  transfer: { key: 'transfer', label: '양도 상담', kind: 'internal' },
}

/** 상황 → 칩 순서 (오더 A4 표 그대로) */
export const SIGNAL_CATEGORIES: Record<SalesSignal, string[]> = {
  sales_drop: ['marketing', 'consulting', 'transfer'],
  weekday_gap: ['marketing'],
  lease_end_near: ['realestate', 'transfer'],
}

export const categoriesOf = (signal: SalesSignal): SalesCardCategory[] =>
  (SIGNAL_CATEGORIES[signal] ?? []).map(k => CATEGORIES[k]).filter(Boolean)

/**
 * 문의 자동 첨부의 "최근 3개월 매출 구간" 5단계 (파트 B2) — 금액이 아니라 구간 문자열만 보낸다.
 * 경계는 월 평균 매출(원). 위에서부터 처음 걸리는 구간.
 */
export const SALES_BANDS: { max: number; label: string }[] = [
  { max: 3_000_000, label: '월 300만 미만' },
  { max: 5_000_000, label: '월 300만~500만' },
  { max: 10_000_000, label: '월 500만~1,000만' },
  { max: 30_000_000, label: '월 1,000만~3,000만' },
  { max: Infinity, label: '월 3,000만 이상' },
]
