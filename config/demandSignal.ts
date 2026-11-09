/**
 * 수요 신호 배정 (지시문 E 첫 구현 — ORDER 2026-09-11 파트 C4). 값은 대표 확인 없이 바꾸지 않는다.
 */
export const DEMAND = {
  categories: ['consulting'],                     // 시세 문의 대상 카테고리 (consulting = 중개·컨설팅: 점포·상가 중개, 창업 컨설팅)
  radiusKm: { consulting: 1.5 },                  // 2026-11-09 대표: 1.5km 하나로 (옛 부동산 1.5 + 양도 상담 5 통합)
  retryMultiplier: 2,                             // 대상 0 → 반경 2배 재시도 → 그래도 0 이면 pending
  expireDays: 7,
  freeResponsesPerMonth: 10,                      // 무료 응답 한도 // PLACEHOLDER — 대표 확정 전 (초과 시 [입점 업그레이드] 안내만)
  replyMaxChars: 200,
}
