/**
 * 매물 '조용히 반응 보기'(quiet 공개 단계) 단일 소스 (ORDER 2026-09-12 파트 B). PLACEHOLDER 값은 대표 확인 없이 바꾸지 않는다.
 * 원칙: 자동 공개 없음. 정렬·노출에서 visibility 를 키로 쓰지 않는다(§1-1). 좋은 점·대신은 등록 화면에 항상 나란히(§1-4).
 * PROS_LINES 에 숫자(효능)는 자체 데이터 검증 전까지 넣지 않는다.
 */
export const QUIET = {
  QUIET_DAYS: 30,               // PLACEHOLDER — 대표 확정 전
  MAX_QUIET_PER_USER: 2,        // PLACEHOLDER — 대표 확정 전
  MAP_BLUR_MODE: 'dong_center', // PLACEHOLDER — 대표 확정 전 (대안 'random_offset' 미구현)
  MAP_BLUR_RADIUS_M: 300,
  COMPARE_MIN_SAMPLE: 3,
  COMPARE_WINDOW_DAYS: 14,
  REMIND_DAYS: [7, 1],          // 남은 기간 알림
}

/** 서버(DB 뷰)가 마스킹하는 필드 — 클라이언트는 이 목록으로 "숨김 상태"만 표시한다 */
export const HIDDEN_FIELDS = ['shop_name', 'title', 'image_urls', 'interior_image_urls', 'exterior_image_urls', 'address_detail', 'building_name', 'postal_code', 'latitude', 'longitude', 'franchise_brand_name', 'franchise_brand_id', 'autofill']

export const PROS_LINES = [
  '직원·손님·건물주가 매물을 알아보기 어려워요',
  '가격에 대한 반응(찜·문의)을 먼저 볼 수 있어요',
  '문의한 분에게만 골라서 공개할 수 있어요',
]
export const PROS_LINES_OWNER_FIRST = '세입자·이웃이 매각 사실을 알아보기 어려워요'
export const CONS_LINES = [
  "'충실한 매물' 배지가 붙지 않아요",
  '{QUIET_DAYS}일 안에 공개 여부를 정해야 해요',
  '위치를 모르는 분들의 조건 문의만 받아요',
]

export const QUIET_COPY = {
  publicCard: '바로 공개',
  quietCard: '조용히 반응 보기',
  prosTitle: '좋은 점',
  consTitle: '대신',
  maxNotice: '조용히 보는 매물은 {n}개까지예요',
  labelSeller: '양도인이 아직 조용히 알아보는 중 · 상호·사진·정확한 위치는 문의 후 양도인이 공개해요',
  labelOwner: '소유주가 아직 조용히 알아보는 중 · 상호·사진·정확한 위치는 문의 후 소유주가 공개해요',
  inquiryAttach: '이 매물은 조건만 공개된 상태예요',
  reaction: '조용히 본 지 {d}일 · 조회 {v} · 찜 {w} · 문의 {q}',
  compare: '같은 동 {industry} 공개 매물의 첫 {days}일 평균 찜 {avg}',
  compareSource: '모두가 본 것(기록일)',
  toPublic: '공개로 바꾸기',
  keepQuiet: '이대로 두기',
  revealButton: '이 분께 공개',
  revealed: '양도인이 상호·사진·위치를 공개했어요',
  publicNotice: '찜한 매물의 상호·사진이 공개됐어요',
  remind: '조용히 보기 기간이 {d}일 남았어요 · 공개할지 정해 주세요',
  expired: '조용히 보기 기간이 끝나 매물을 보류했어요 · 공개하거나 다시 올릴 수 있어요',
}
