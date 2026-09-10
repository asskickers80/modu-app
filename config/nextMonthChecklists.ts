/**
 * '다음 달 준비' 카드 체크리스트 — 정적 문안 단일 소스 (ORDER 2026-09-10 파트 B2)
 * 사실만 적는다. 효능·결과 약속 없음.
 */
export const CHECKLISTS: Record<string, { title: string; items: string[] }> = {
  lease_prep: {
    title: '재계약 전에 정리해 둘 것',
    items: [
      '현재 월세·보증금·관리비 — 계약서 원본 기준으로 적어 두기',
      '월세 인상 상한 5% — 상가건물임대차보호법 기준(환산보증금 범위 안)',
      '계약갱신요구권 — 만료 6개월~1개월 전에 요구해야 하고, 최초 계약일부터 10년까지',
      '권리금 회수 기회 — 만료 6개월 전부터 종료 시까지 임대인이 방해하면 안 되는 기간',
      '원상복구 범위 — 계약서에 적힌 범위와 입점 당시 사진 확인',
    ],
  },
}

/** 다음 달 준비 카드 임계값 */
export const NEXT_MONTH = {
  LEASE_PREP_DAYS: 180,      // 임대차 만료 180일 이내 (90일 이내는 상황 카드 lease_end_near 가 우선)
  VAT_DUE_DAYS: 15,          // 1월·7월 1일 기준 D-15 이내
  GROWTH_MONTHS: 3,          // 3개월 연속 상승
  GROWTH_MIN_DAYS_PER_MONTH: 10, // 한 달에 입력일 10일 이상일 때만 그 달을 센다 // PLACEHOLDER — 대표 확정 전
  PRICE_RANGE_MIN: 3,        // 시세 카드 — 같은 구·같은 업종 매물 3건 이상
  PRICE_RANGE_SOLD_MONTHS: 12, // 거래 완료는 최근 12개월
}
