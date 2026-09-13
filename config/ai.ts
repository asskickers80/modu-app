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
  /**
   * 모두에 질문하기 (ORDER 2026-09-13 A7). 이미 연결된 구글 모델을 그대로 재사용한다 — 새 provider·SDK·키 없음.
   * tier: 무료 등급(free)은 약관상 입력·출력이 제품 개선에 쓰이고 사람이 읽을 수 있다. 그래서 프로덕션 무료 등급에서는
   * 사용자 자유 입력·연락처·양도인 답장을 모델에 보내지 않는다(룰 라우팅으로 동작). 유료 전환은 이 값 하나만 바꾼다.
   * 개발·스테이징은 무료, 프로덕션 출시는 유료 등급 전환이 전제다.
   */
  ASK: {
    provider: 'google',
    model: 'gemini-2.5-flash',         // PLACEHOLDER — 대표 확정 전 (소개글 생성기와 동일 모델로 시작)
    tier: 'free' as 'free' | 'paid',   // PLACEHOLDER — 대표 확정 전 (프로덕션 출시 시 'paid')
    INPUT_TOKENS: 6000,
    OUTPUT_TOKENS: 600,
    BATCH_RETRY: 3,                    // 예시 사전 생성 배치 — 지수 백오프 재시도 횟수
    BATCH_BACKOFF_MS: 1000,
  },
}

/** 무료 등급 가드 — 프로덕션 + 무료 등급이면 사용자 자유 입력을 모델에 보내지 않는다 (A7) */
export function canSendUserInputToModel(tier: string = AI.ASK.tier, isProd: boolean = false): boolean {
  return tier === 'paid' || !isProd
}

/** 사진 초안 — 제안 가능 항목만(JSON 스키마 고정) */
export const PHOTO_DRAFT_KEYS = ['interior_state', 'seats', 'kitchen', 'restroom', 'signboard', 'corner', 'quality_note']
export const PHOTO_DRAFT_LABEL: Record<string, string> = {
  interior_state: '인테리어 상태', seats: '홀 좌석', kitchen: '주방 내부', restroom: '화장실 내부', signboard: '간판', corner: '코너 자리', quality_note: '사진 품질',
}
export const INTERIOR_STATES = ['새것 같음', '보통', '손볼 곳 있음']
/** 금지 항목 — 응답 어디에든 있으면 그 항목 폐기 (면적·평수·권리금·월세·보증금·매출·상권 평가) */
export const PHOTO_DRAFT_FORBIDDEN = /평수|\d+\s*평|㎡|면적|권리금|월세|보증금|매출|상권|입지가|목이/
