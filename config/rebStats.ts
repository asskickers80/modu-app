/**
 * 한국부동산원 상업용부동산 임대동향 비교선 — 단일 소스 (ORDER 2026-09-11 파트 A)
 * 값·문안을 바꾸기 전에 대표에게 확인한다(CLAUDE.md). 판단 문구 없음 — 숫자와 출처만.
 */
export const REB = {
  SOURCE_URL: 'https://www.data.go.kr/data/15134761/openapi.do',
  DEFAULT_STORE_TYPE: 'small',      // 집합건물이면 aggregate, 아니면 small
  BATCH_MONTHS: [1, 4, 7, 10],      // 분기 1회
  BATCH_DAY: 28,                    // PLACEHOLDER — 대표 확정 전 (오더: 마지막 영업일. 크론 표현 한계로 28일)
  BATCH_HOUR_KST: 6,
  LOOKBACK_QUARTERS: 4,             // 최신 분기가 없으면 최대 4분기 전까지 폴백
}

export const STORE_TYPE_LABEL: Record<string, string> = {
  small: '소규모 상가',
  medium_large: '중대형 상가',
  aggregate: '집합 상가',
}

export const REB_COPY = {
  line1: '{region} {type}: {facts} (한국부동산원 {yyyy}년 {q}분기)',
  factVacancy: '공실률 {v}%',
  factRent: '임대료 ㎡당 {r}원',
  mineOwner: '내 임대료 ㎡당 {mine}원 · 평균 대비 {p}%',
  mineListing: '이 매물 월세 ㎡당 {mine}원 · 평균 대비 {p}%',
  note: '공식 통계예요 · 상가마다 조건이 달라 참고용으로 보세요',
}

/** 평균 대비 구간 — 이벤트 reb_stat_compare_bucket */
export const COMPARE_BUCKETS = [
  { key: 'under_-20', max: -20 },
  { key: '-20_-5', max: -5 },
  { key: '-5_5', max: 5 },
  { key: '5_20', max: 20 },
  { key: 'over_20', max: Infinity },
]
