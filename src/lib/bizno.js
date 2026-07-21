/**
 * 사업자등록번호 — 형식 검증 + 국세청 진위/상태 확인 래퍼.
 *
 * 진위확인은 브라우저에서 국세청(odcloud)을 직접 못 부른다(CORS) → 서버 함수
 * /api/verify-bizno 를 경유한다 (카카오·네이버 OAuth와 같은 패턴).
 *
 * 결과 3분류 — 오더의 "장애 vs 불일치 구분" 결정 반영:
 *   'verified'    국세청에 등록된 계속/휴업 사업자 → 공개 허용
 *   'mismatch'    등록되지 않은 번호 또는 폐업 → 공개 차단
 *   'unavailable' API 장애(타임아웃·5xx·네트워크) → 미검증 표식 + 공개 허용
 */

/** 하이픈·공백 제거 후 숫자만 */
export function normalizeBizno(raw) {
  return String(raw ?? '').replace(/[^0-9]/g, '')
}

/** "123-45-67890" 표기 */
export function formatBizno(raw) {
  const n = normalizeBizno(raw)
  if (n.length !== 10) return n
  return `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}`
}

/**
 * 국세청 표준 체크섬 — 10자리 사업자번호 검증식.
 * 형식(10자리)뿐 아니라 자리수 가중합까지 봐서 오타를 걸러낸다.
 */
export function isValidBiznoFormat(raw) {
  const n = normalizeBizno(raw)
  if (!/^\d{10}$/.test(n)) return false
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5]
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(n[i]) * w[i]
  sum += Math.floor((Number(n[8]) * 5) / 10)
  const check = (10 - (sum % 10)) % 10
  return check === Number(n[9])
}

/**
 * 공개 게이트용 진위·상태 확인.
 * @returns {Promise<'verified'|'mismatch'|'unavailable'>}
 */
export async function verifyBizno(raw) {
  const bizno = normalizeBizno(raw)
  if (!isValidBiznoFormat(bizno)) return 'mismatch' // 형식부터 틀리면 조회 볼 것도 없음

  try {
    const res = await fetch('/api/verify-bizno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bizno }),
    })
    // 서버·국세청 장애 — 공개는 막지 않는다 (완화안)
    if (!res.ok) return 'unavailable'
    const data = await res.json()
    // 서버가 명시적으로 result 를 준다: verified | mismatch | unavailable
    return data.result ?? 'unavailable'
  } catch {
    // 네트워크·타임아웃 — 장애로 취급
    return 'unavailable'
  }
}
