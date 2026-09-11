/**
 * AI 호출 상한·모델 단일 소스 (ORDER 2026-09-11 파트 B4). 값은 대표 확인 없이 바꾸지 않는다.
 */
export const AI = {
  MODEL: 'gemini-2.5-flash',           // PLACEHOLDER — 대표 확정 전 (오더 기본: Haiku급)
  INTRO_MAX_PER_LISTING: 2,            // 소개글 초안: 매물당 1회 + 재생성 1회
  PHOTO_INPUT_TOKENS: 12000,           // 사진 초안 입력 상한
  PHOTO_OUTPUT_TOKENS: 1500,           // 사진 초안 출력 상한
  PHOTO_MAX_PER_LISTING: 1,            // 매물당 1회
  PHOTO_MIN_COUNT: 3,                  // 사진 3장 이상일 때만
  PHOTO_MAX_IMAGES: 3,                 // 프롬프트에 넣는 사진 수 (입력 토큰 상한 방어)
  COST_LOG_DAILY: true,                // 월 호출 수·비용 추정을 운영 로그에 일 1회 (서버 배치에서)
}

/** 사진 초안 — 제안 가능 항목만(JSON 스키마 고정) */
export const PHOTO_DRAFT_KEYS = ['interior_state', 'seats', 'kitchen', 'restroom', 'signboard', 'corner', 'quality_note']
export const PHOTO_DRAFT_LABEL: Record<string, string> = {
  interior_state: '인테리어 상태', seats: '홀 좌석', kitchen: '주방 내부', restroom: '화장실 내부', signboard: '간판', corner: '코너 자리', quality_note: '사진 품질',
}
export const INTERIOR_STATES = ['새것 같음', '보통', '손볼 곳 있음']
/** 금지 항목 — 응답 어디에든 있으면 그 항목 폐기 (면적·평수·권리금·월세·보증금·매출·상권 평가) */
export const PHOTO_DRAFT_FORBIDDEN = /평수|\d+\s*평|㎡|면적|권리금|월세|보증금|매출|상권|입지가|목이/
