// 국세청 사업자등록정보 상태조회 공용 호출 (공공데이터포털 odcloud).
// 진위 게이트(api/verify-bizno.js)와 폐업 배치(api/check-business-closure.js)가 함께 쓴다.
//
// 상태조회 한 콜에 최대 100건. b_stt_cd: 01 계속 · 02 휴업 · 03 폐업.
// 등록되지 않은 번호는 tax_type 에 "국세청에 등록되지 않은 사업자등록번호입니다." 가 온다.

const STATUS_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/status'

// 서버 전용 키 (브라우저 노출 없음). 승인 후 Vercel 환경변수로 주입.
// 미설정이면 null 을 반환해 호출부가 '장애(unavailable)'로 처리한다.
function serviceKey() {
  return process.env.PUBLIC_DATA_KEY ?? process.env.VITE_PUBLIC_DATA_KEY ?? null
}

/**
 * 사업자번호 배열의 상태를 한 번에 조회.
 * @param {string[]} bnos 하이픈 없는 10자리 번호들 (최대 100)
 * @returns {Promise<{ ok: boolean, byBno: Record<string,{code:string,status:string,registered:boolean}> }>}
 *   ok=false 는 API 장애 — 호출부는 이 경우 아무 매물도 건드리지 않는다.
 */
export async function fetchBusinessStatus(bnos) {
  const key = serviceKey()
  if (!key || bnos.length === 0) return { ok: false, byBno: {} }

  try {
    const res = await fetch(`${STATUS_URL}?serviceKey=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ b_no: bnos }),
    })
    if (!res.ok) return { ok: false, byBno: {} }
    const data = await res.json()
    const byBno = {}
    for (const row of data.data ?? []) {
      const registered = row.b_stt_cd !== '' && !/등록되지 않은/.test(row.tax_type ?? '')
      byBno[row.b_no] = {
        code: row.b_stt_cd ?? '',   // '01' | '02' | '03' | ''
        status: row.b_stt ?? '',    // '계속사업자' | '휴업자' | '폐업자' | ''
        registered,
      }
    }
    return { ok: true, byBno }
  } catch {
    return { ok: false, byBno: {} }
  }
}

/** 상태 코드 → 공개 게이트 판정 */
export function gateResultFromStatus(entry) {
  if (!entry || !entry.registered) return 'mismatch'   // 미등록
  if (entry.code === '03') return 'mismatch'           // 폐업 — 공개 불가
  return 'verified'                                    // 01 계속 / 02 휴업
}
