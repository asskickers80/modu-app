/**
 * 후기 규칙 단일 소스 (ORDER 2026-09-12 파트 A). PLACEHOLDER 값은 대표 확인 없이 바꾸지 않는다.
 * 원칙(A1): 매물에 대한 평가는 없다. 매물 후기 = "가서 본 것", 기업회원 후기 = "맡겨 본 것". 별점·점수·좋아요 없음.
 * 로그인 규칙: 작성·열람 모두 로그인 회원만. 비로그인 화면에는 숫자도 없이 안내 1줄만.
 */
export const REVIEWS = {
  BODY_MAX: 200,
  EDIT_HOURS: 24,                 // 작성 후 24시간 이내만 수정
  BLIND_DAYS: 30,                 // PLACEHOLDER — 대표 확정 전
  REPEAT_ALERT: { vendors: 3, days: 30 }, // PLACEHOLDER — 대표 확정 전 (같은 작성자가 30일 안에 3곳 이상 업체 후기 → 운영 알림)
  MASS_DELETE_ALERT: { count: 3, days: 7 }, // 한 매물에서 7일 내 삭제 3건 이상 → 운영 알림
  SHOW_DELETED_TRACE: false,      // PLACEHOLDER — 대표 확정 전 (true 면 "양도인이 지운 후기 n건" 1줄)
  MIN_COUNT_TO_SHOW: 1,
}

export const LISTING_CHIPS = {
  when: ['평일 점심', '평일 저녁', '주말 낮', '주말 저녁'],
  seen: ['외관', '내부', '주변 동선', '주차', '간판 시인성'],
  match: ['같았어요', '달랐어요'],
  differs: ['면적', '층', '사진', '주변'],
}
export const VENDOR_CHIPS = {
  what: ['중개', '인테리어', '세무', '간판', '시설', '기타'],
  progress: ['상담만', '계약까지', '완료까지'],
}
export const APPEAL_REASONS = [
  { key: 'not_customer', label: '우리 고객이 아니에요' },
  { key: 'false_claim', label: '사실과 달라요' },
  { key: 'coercion', label: '무상 요구 후 작성' },
  { key: 'other', label: '기타' },
]
export const AXIS_LABEL: Record<string, string> = { prep: '창업준비', owner: '소유주', seller: '양도인', vendor: '기업회원' }

export const REVIEW_COPY = {
  loginToSee: '로그인하면 볼 수 있어요',
  listingWrite: '방문 후기 남기기',
  vendorWrite: '후기 남기기',
  listingSection: '방문 후기 {n}건',
  vendorSection: '후기 {n}건',
  writeNotice: '가서 보신 것만 적어 주세요 · 양도인이 지울 수 있어요',
  vendorWriteNotice: '맡겨 보신 것만 적어 주세요',
  afterVisitLabel: '방문 일정 후 작성',
  deleteConfirm: '지운 후기는 되돌릴 수 없어요',
  deletedTrace: '양도인이 지운 후기 {n}건',
  deletedNotice: '남기신 후기가 양도인에 의해 지워졌어요',
  appealNotice: '남기신 후기에 업체가 이의신청해서 {days}일간 보이지 않아요',
  appealKept: '이의신청이 검토되어 후기가 다시 보여요',
  appealRemoved: '검토 결과 후기가 내려갔어요',
  appealKeptVendor: '이의신청을 검토했어요 · 후기는 그대로 둡니다',
  appealRemovedVendor: '이의신청을 검토했어요 · 후기를 내렸어요',
  vendorReviewFoot: '모두 회원이 남긴 후기 · 업체가 고르지 않아요',
}
