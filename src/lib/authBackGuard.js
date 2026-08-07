/**
 * 로그인 왕복 히스토리 바닥 가드 (auth-loop-fix v2).
 *
 * location.replace로 인증 이동을 해도 히스토리에는 kauth/nid 항목이 "그 자리 대체"로 남는다.
 * 로그인 후 뒤로가기를 반복하면 결국 그 항목에 닿아 카카오 SSO 자동 재승인 → 콜백 →
 * "로그인 처리 중" → 홈 → 뒤로 … 무한 루프(실기기 재발 신고).
 *
 * 해법: 로그인 직후 도착한 히스토리 항목을 '바닥(floor)'으로 표시하고 같은 URL 더미를
 * 하나 얹는다. 뒤로가기가 바닥에 닿으면(popstate) 즉시 같은 URL을 다시 밀어 올린다 —
 * 인증 항목으로는 내려갈 수 없고, 바닥 위에서의 앱 내 뒤로가기는 정상 동작한다.
 */
export function installAuthBackFloor() {
  try {
    if (window.__moduAuthFloorArmed) return // Strict 이중 실행 — 더미 중복 적재 방지
    window.__moduAuthFloorArmed = true
    const s = window.history.state
    window.history.replaceState({ ...(s ?? {}), moduAuthFloor: true }, '', window.location.href)
    window.history.pushState(s ?? null, '', window.location.href)
  } catch (_) { /* 히스토리 접근 불가 환경 — 가드 없이 진행 */ }
}

/** App 루트에서 1회 등록 — 바닥에 닿는 뒤로가기를 되밀어 인증 항목 재진입을 차단 */
export function initAuthBackGuard() {
  if (window.__moduAuthGuardInit) return
  window.__moduAuthGuardInit = true
  window.addEventListener('popstate', () => {
    const s = window.history.state
    if (s?.moduAuthFloor) {
      const { moduAuthFloor, ...rest } = s // eslint-disable-line no-unused-vars
      window.history.pushState(Object.keys(rest).length ? rest : null, '', window.location.href)
    }
  })
}
