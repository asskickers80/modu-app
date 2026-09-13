/**
 * 기업회원 갱신 리포트 단일 소스 (ORDER 2026-09-13 파트 B1). 값은 대표 확인 없이 바꾸지 않는다.
 * 사실 숫자만 보여준다 — 할인 팝업·만류 문구·해지 숨김은 만들지 않는다(PRICING §1-4, B4).
 */
export const RENEWAL = {
  WINDOW_MONTHS: 3,        // 최근 3개월 집계 (대표 확정 2026-09-13)
  REPORT_DAYS_BEFORE: 7,   // 갱신 D-7 리포트 1회
  OPS_DAYS_BEFORE: 14,     // 운영 목록 D-14
  MIN_DEALS_TO_SHOW: 3,    // 성사 건수는 표본 3건 미만이면 그 줄만 숨김 (PRICING §1-2)
}

/** 문의 출처 라벨 — inquiry_ledger.source 그대로 (없는 출처는 줄에서 빠진다) */
export const SOURCE_LABEL: Record<string, string> = {
  demand_signal: '수요 신호',
  sales_card: '매출 상황 카드',
  price_inquiry: '시세 문의',
  price_card: '시세 문의',
  listing_ask: '모두에 질문하기',
  vendor_profile: '기타',
  other: '기타',
}

export const RENEWAL_COPY = {
  title: '갱신 전 확인',
  line: '최근 {months}개월 · 받은 문의 {n}건 · 답한 문의 {m}건 · 대화로 이어진 {k}건 · 전화 문의 {p}건',
  sourceLine: '문의 출처 · {parts}',
  dealLine: '업체가 성사로 표시한 문의 {d}건',
  dueIn: '갱신까지 {d}일',
  notice: '집계만 보여드려요 · 누가 문의했는지는 전달되지 않아요',
  opsTitle: '갱신 임박 · 문의 0건 또는 응답 0%',
}
