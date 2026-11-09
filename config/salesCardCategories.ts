/**
 * 사장님 매출 '이 상황에 맞는 서비스' 카드 — 상황별 카테고리 칩 단일 소스 (ORDER 2026-09-09 파트 A4)
 * 화면·정렬·원장 기록이 전부 이 파일의 키를 쓴다. 칩을 늘리거나 줄일 때 여기만 고친다.
 * 칩 종류: vendor = 기업회원 목록 시트 / internal = 모두 내부 안내(양도 상담)
 */
export type SalesSignal = 'lease_end_near' | 'sales_drop' | 'weekday_gap' | 'vat_due'

export interface SalesCardCategory {
  key: string
  label: string
  kind: 'vendor' | 'internal'
  /** 업체 분류별 세부 서비스 — PC 계약서(shared-data-sync-contract.md)의 표기와 정확히 일치해야 한다. listings.biz_services 에 그대로 저장 */
  services?: string[]
}

export const CATEGORIES: Record<string, SalesCardCategory> = {
  // 업체 분류 7종 — PC판 기준(docs/shared-data-sync-contract.md, 2026-09-30 대표 결정: 앞으로 모든 건 PC 기준).
  // 키·표시명은 PC와 같아야 한다. 같은 DB 칸(listings.biz_category)을 앱·PC가 함께 읽는다.
  consulting: { key: 'consulting', label: '중개·컨설팅', kind: 'vendor', services: ['점포 중개', '상가 중개', '창업 컨설팅'] },
  interior: { key: 'interior', label: '인테리어·시설', kind: 'vendor', services: ['인테리어', '간판', '전기', '냉난방', '철거'] },
  equipment: { key: 'equipment', label: '장비·물품', kind: 'vendor', services: ['주방기기', '집기', '소모품', '식자재'] },
  professional: { key: 'professional', label: '세무·법무', kind: 'vendor', services: ['세무', '회계', '노무', '법률'] }, // 다음 달 준비 카드 vat_due (2026-09-10 파트 B2)
  finance: { key: 'finance', label: '금융·보험', kind: 'vendor', services: ['금융 상담', '보험', '정책자금 상담'] },
  operations: { key: 'operations', label: '운영·관리', kind: 'vendor', services: ['POS', '주문·결제', '청소', '방역', '보안'] },
  marketing: { key: 'marketing', label: '마케팅·인력', kind: 'vendor', services: ['광고', '디자인', '촬영', '채용·인력'] },
  transfer: { key: 'transfer', label: '양도 상담', kind: 'internal' },
}

/** 상황 → 칩 순서 (오더 A4 표 그대로) */
export const SIGNAL_CATEGORIES: Record<SalesSignal, string[]> = {
  // '메뉴·운영 컨설팅' 칩은 뺐다 — PC 7종에 맞는 분류가 없어 다른 칸에 억지로 붙이지 않는다(2026-11-09 대표 결정: PC 기준).
  sales_drop: ['marketing', 'transfer'],
  weekday_gap: ['marketing'],
  lease_end_near: ['consulting', 'transfer'],
  vat_due: ['professional'],
}

export const categoriesOf = (signal: SalesSignal): SalesCardCategory[] =>
  (SIGNAL_CATEGORIES[signal] ?? []).map(k => CATEGORIES[k]).filter(Boolean)

/**
 * 기업회원이 입점할 때 고르는 업종 — 위 CATEGORIES 중 kind='vendor' 인 것만.
 * 여기서 고른 키가 그대로 listings.biz_category 에 저장되고,
 * 시세 문의 배정(config/demandSignal.ts 의 DEMAND.categories)이 그 키로 대상을 찾는다.
 * 'transfer'(양도 상담)는 모두 내부 안내라 입점 대상이 아니다.
 */
export const VENDOR_CATEGORIES: SalesCardCategory[] =
  Object.values(CATEGORIES).filter(c => c.kind === 'vendor')

export const isVendorCategory = (key: string): boolean =>
  VENDOR_CATEGORIES.some(c => c.key === key)

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
