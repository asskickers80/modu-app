/**
 * 탐색 조건 완화 단일 소스 (ORDER 2026-09-21 파트 A2). 값은 대표 확인 없이 바꾸지 않는다.
 *
 * 원칙: 모델 호출 없음 — 후보와 건수는 전부 룰과 카운팅이다.
 * 건수 0인 후보는 칩을 만들지 않는다. 정도 부사("조금·약간")·판정 문구("까다로워요")·"추천"·"AI" 금지.
 * 한 번에 한 칸만 푼다. 단일 완화가 전부 0건일 때만 서로 다른 두 필터를 각각 한 칸(=두 칸 조합)까지 시도한다.
 *
 * 현재 탐색 화면(ExplorePage)에 실제로 있는 필터는 query·type·area 셋이다.
 * 아래 사다리에는 아직 화면에 없는 필터(권리금·보증금·월세·층·면적·업종)도 정의해 둔다 —
 * 필터가 생겨 filters 에 그 키가 들어오면 코드 수정 없이 그대로 동작한다.
 */
export const RELAX = {
  MAX_OPTIONS: 3,        // PLACEHOLDER — 대표 확정 전
  MIN_COUNT: 1,          // PLACEHOLDER — 건수가 이 값 미만인 후보는 만들지 않는다
  FEW_THRESHOLD: 2,      // PLACEHOLDER — 결과가 이 건수 이하이면 목록 아래에도 카드
  MAX_STEPS: 2,          // 두 칸 조합까지. 세 칸은 다른 검색이다
  AREA_STEP_PCT: 30,     // PLACEHOLDER — 전용면적 ±%
  MAX_SAVED_SEARCHES: 5, // PLACEHOLDER — 저장 조건 상한
  MIN_DEMAND_SHOW: 3,    // PLACEHOLDER — 등록 화면 수요 신호 줄 최소 인원
}

/** 금액 사다리(만 원). null = 상한 없음 */
export const PRICE_LADDER = [2000, 3000, 4000, 5000, 7000, 10000, 15000, null]
export const RENT_LADDER = [100, 150, 200, 300, 500, 800, null]
export const DEPOSIT_LADDER = [1000, 2000, 3000, 5000, 10000, null]
export const RADIUS_LADDER = [1, 2, 3, 5]   // km — 반경 검색이 생기면 쓴다
export const FLOOR_STEP = ['1층만', '1층·지하1층·2층', '전층']

/** 푸는 순서 — 손님이 가장 쉽게 양보하는 조건부터 (PLACEHOLDER: 대표가 조정 가능) */
export const RELAX_PRIORITY = ['area', 'transferFee', 'floor', 'industry', 'areaSize', 'monthlyRent', 'deposit', 'type', 'query', 'check']

export const RELAX_COPY = {
  countLine: '이 조건에 맞는 매물이 {n}건이에요',
  chip: '{label} {count}건',
  notifyButton: '이 조건 그대로 새 매물 알림 받기',
  appliedLine: '{before} → {after}로 넓혔어요',
  appliedPair: '{first}, {second}로 넓혔어요',
  undo: '되돌리기',
  // 저장 조건 시트
  saveTitle: '이 조건으로 새 매물이 올라오면 알려드려요',
  saveButton: '알림 받기',
  saved: '조건을 저장했어요',
  savedMax: '저장한 조건은 {n}개까지예요',
  loginFirst: '로그인하면 조건을 저장할 수 있어요',
  sectionTitle: '저장한 조건',
  notif: '저장한 조건에 새 매물 {n}건',
  // 등록 화면 수요 신호 (판매자에게 유리한 사실만)
  demandLine: '이 동네에서 {industry} 매물 알림을 신청한 분이 {n}명 있어요 · 모두가 본 것(이번 달)',
}

/** 라벨 틀 — 정도 부사 없이 실제 다음 칸 값만 넣는다 */
export const RELAX_LABEL = {
  transferFee: '권리금 {v}까지 보면',
  monthlyRent: '월세 {v}까지 보면',
  deposit: '보증금 {v}까지 보면',
  area: '{v}까지 넓히면',
  areaSize: '면적 {min}~{max}평까지 보면',
  floor: '{v}까지 보면',
  industry: "'{v}' 전체로 보면",
  type: "'{v}' 조건을 빼면",
  query: "'{v}' 검색어를 빼면",
  check: "'{v}' 조건을 빼면",
  noLimit: '상한 없이',
}
