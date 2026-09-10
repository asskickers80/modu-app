/**
 * 찜(관심) 양방향 신호 — 임계값·템플릿 단일 소스 (ORDER 2026-09-10 파트 A)
 * 값을 바꾸기 전에 대표에게 확인한다(CLAUDE.md). 미확정 값은 // PLACEHOLDER — 대표 확정 전.
 */
export const WATCH = {
  ORDINAL_MIN: 5,              // 토스트 "이 매물 관심 n번째" — n<5 면 생략
  DENSITY_MIN: 5,              // 같은 매물 찜 7일 내 5건 이상 → density 1회
  DENSITY_DAYS: 7,
  PER_LISTING_PER_DAY: 1,      // 같은 매물 알림 하루 최대
  PER_USER_PER_DAY: 3,         // 사용자당 찜 알림 하루 최대
  OWNER_MSG_COOLDOWN_DAYS: 7,  // [관심 주신 분께 한마디] 매물당 7일 1회
  OWNER_PUSH_COOLDOWN_DAYS: 30, // [찜한 분들께 알리기] 매물당 30일 1회
  SIMILAR_WEEKDAY: 1,          // 동네 찜 주 1회 묶음 — 월요일 // PLACEHOLDER — 대표 확정 전
  SIMILAR_HOUR_KST: 9,         // 09:00 KST // PLACEHOLDER — 대표 확정 전
  BATCH_HOUR_KST: 5, BATCH_MINUTE: 30, // price/info 배치 발송 시각(알림 크론과 동일)
  SUMMARY_MIN: 3,              // 관심 n명 — n<3 이면 숫자만(익명 요약 없음)
  COMMON_MIN: 3,               // '찜한 매물의 공통점' 카드 — 매물 찜 3건 이상
  COMMON_HIDE_DAYS: 30,        // [괜찮아요] → 30일 숨김
  RESPONSE_HISTORY_MIN: 5,     // "보통 h시간 안에 답해요" — 응답 이력 5건 이상, 중앙값
  NO_INQUIRY_WATCH_MIN: 10,    // 찜 10건 이상 + 문의 0건 14일 → 보완 안내 1줄
  NO_INQUIRY_DAYS: 14,
  INFO_SCORE_DELTA: 10,        // 완성도 10점 이상 상승 = info 알림
  SIMILAR_FEE_RATIO: 0.3,      // 비슷한 매물: 권리금 ±30%
  COMPARE_MAX: 5,              // '내 관심' 비교표 최대 매물 수
}

export const TOAST = {
  listing: '양도인에게 관심이 전달됐어요',
  listingOrdinal: '이 매물 관심 {n}번째',
  vendor: '이 업체 소식을 받아볼게요',
  area: '이 동네 새 매물을 주 1회 모아서 알려드릴게요',
  removed: '관심을 해제했어요',
}

/** 양도인 '한마디' 템플릿 3개 — 자유 텍스트 없음 */
export const OWNER_TEMPLATES = [
  { key: 'ask_anytime', text: '궁금한 점은 편하게 물어보세요', slots: null },
  { key: 'visit_time', text: '방문은 {slot}에 편해요', slots: ['평일 오전', '평일 오후', '주말'] },
  { key: 'price_negotiable', text: '가격은 협의 가능해요', slots: null },
]

export const NOTIF = {
  price: '찜한 매물 가격이 바뀌었어요',
  info: '찜한 매물에 {what}이 추가됐어요',
  status: '찜한 매물이 {status}됐어요',
  similar: '찜한 동네에 새 매물 {n}건',
  density: '이 매물은 이번 주 관심이 많아요',
  owner_msg: '양도인이 답했어요: {text}',
  deal_result: '찜하신 매물이 권리금 {final}만에 거래됐어요 (등록가 {listed}만)',
  similarButton: '비슷한 매물 보기',
}

export const STATUS_LABEL: Record<string, string> = { sold: '거래 완료', hidden: '보류', deleted: '보류' }
export const PRICE_FIELDS = [
  { field: 'transfer_fee', label: '권리금' },
  { field: 'deposit', label: '보증금' },
  { field: 'monthly_rent', label: '월세' },
]
export const KIND_LABEL: Record<string, string> = {
  price: '가격 변경', info: '새 정보', status: '거래 완료·보류', similar: '동네 새 매물(주 1회)',
  density: '관심 많은 매물', owner_msg: '양도인 한마디', deal_result: '거래 결과',
}
export const WATCH_KINDS = ['price', 'info', 'status', 'similar', 'density', 'owner_msg', 'deal_result']
