/**
 * 주소 → 건축물대장 조회 파라미터 (ORDER-address-autofill-v1) — 순수 함수.
 *
 * 건축물대장 API는 도로명주소를 받지 않는다. 필요한 값은 4개:
 *   sigunguCd(5) · bjdongCd(5) · bun(4, 본번) · ji(4, 부번)
 * Daum 우편번호 서비스는 bcode(법정동코드 10자리)를 주지만 **본번·부번은 주지 않는다**.
 * 따라서 bcode는 그대로 쪼개 쓰고, 번지는 지번주소 문자열에서 파싱한다.
 *
 * 판정(오더 §4):
 * - 시군구·법정동: bcode 앞 5 / 뒤 5로 확정 — 파싱 불확실성 없음.
 * - 번지: 지번주소 끝의 "산 123-45" 패턴을 읽는다. '산'(임야)은 특수번지 플래그.
 * - 호실 표기("101호" vs "1층 1호")는 **조회 파라미터로 쓰지 않는다** — 대장 조회는
 *   지번 단위로 하고, 반환된 전유부 목록에서 호실을 매칭한다(matchUnit). 표기 흔들림을
 *   숫자만 남겨 비교하므로 "101호"·"1층 101호"·"제101호"가 같은 값으로 취급된다.
 */

/** 지번주소 → { bun, ji, isMountain } (실패 null) */
export function parseJibun(jibunAddress) {
  const s = String(jibunAddress ?? '').trim()
  if (!s) return null
  // 끝부분의 번지: "… 서교동 산 332-4" / "… 서교동 332-4" / "… 서교동 332"
  const m = s.match(/(산\s*)?(\d{1,4})(?:-(\d{1,4}))?\s*(?:번지)?\s*$/)
  if (!m) return null
  return {
    bun: String(m[2]).padStart(4, '0'),
    ji: String(m[3] ?? '0').padStart(4, '0'),
    isMountain: !!m[1],
  }
}

/**
 * 조회 파라미터 조립 — 하나라도 못 만들면 null(=자동 채움 생략, 현행 직접 입력).
 * ※ 반드시 **지번주소만** 파싱한다. 도로명주소("양화로 45")를 넣으면 도로 번호를
 *   본번으로 잘못 읽어 엉뚱한 건물을 가져온다 — 틀린 자동 채움보다 미채움이 낫다.
 * @param {{ bcode?: string, jibunAddress?: string }} picked Daum 콜백값
 */
export function registryParams(picked = {}) {
  const bcode = String(picked.bcode ?? '').replace(/\D/g, '')
  if (bcode.length !== 10) return null
  const jibun = parseJibun(picked.jibunAddress)
  if (!jibun) return null
  return {
    sigunguCd: bcode.slice(0, 5),
    bjdongCd: bcode.slice(5),
    platGbCd: jibun.isMountain ? '1' : '0', // 0=대지, 1=산
    bun: jibun.bun,
    ji: jibun.ji,
  }
}

/** 호실 표기 정규화 — "제101호"·"101호"·"1층 101호" → "101" (숫자만) */
export function normalizeUnit(text) {
  const s = String(text ?? '')
  const m = s.match(/(\d+)\s*호/)
  if (m) return m[1]
  const digits = s.replace(/\D/g, '')
  return digits || null
}

/** 층 표기 정규화 — "지1층"·"B1"·"1층"·"제1층" → "B1" / "1층" */
export function normalizeFloor(text) {
  const s = String(text ?? '').trim()
  if (!s) return null
  const base = /지하|^지\d|^B/i.test(s) ? 'B' : ''
  const n = s.replace(/\D/g, '')
  if (!n) return null
  return base ? `B${Number(n)}` : `${Number(n)}층`
}

/**
 * 전유부 목록에서 내 호실 찾기.
 * 호실을 모르면(상가는 대개 모름) 후보가 1개일 때만 확정 — 여러 개면 null(수동 입력).
 */
export function matchUnit(rows, detailAddress) {
  const list = (rows ?? []).filter(r => r && (r.area ?? r.flrNoNm))
  if (!list.length) return null
  const want = normalizeUnit(detailAddress)
  if (want) {
    const hit = list.find(r => normalizeUnit(r.hoNm) === want)
    if (hit) return hit
  }
  return list.length === 1 ? list[0] : null
}
