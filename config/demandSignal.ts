/**
 * 수요 신호 배정 (지시문 E 첫 구현 — ORDER 2026-09-11 파트 C4). 값은 대표 확인 없이 바꾸지 않는다.
 */
export const DEMAND = {
  categories: ['realestate', 'consulting'],       // 시세 문의 대상 카테고리 (consulting = 양도 상담)
  radiusKm: { realestate: 1.5, consulting: 5 },   // PLACEHOLDER — 대표 확정 전
  retryMultiplier: 2,                             // 대상 0 → 반경 2배 재시도 → 그래도 0 이면 pending
  expireDays: 7,
  freeResponsesPerMonth: 10,                      // 무료 응답 한도 // PLACEHOLDER — 대표 확정 전 (초과 시 [입점 업그레이드] 안내만)
  replyMaxChars: 200,
}
