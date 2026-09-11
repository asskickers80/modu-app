// 한국부동산원 부동산통계 조회 서비스 커넥터 (ORDER 2026-09-11 파트 A1) — 서버 전용, 키는 .env(REB_API_KEY).
// 키가 없으면 모의 모드: null 을 돌려주고 배치는 "직전 분기 유지"로 처리한다(기존 기능 유지).
// 응답 원본은 저장하지 않는다 — 아래 정규화 행만 만든다.
// PLACEHOLDER — 대표 확정 전: 실제 엔드포인트·통계표 ID는 기술문서 확인 후 채운다.
export const REB_ENDPOINT = 'https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do' // PLACEHOLDER
export const STORE_TYPE_MAP = { '소규모': 'small', '중대형': 'medium_large', '집합': 'aggregate' }

/** 응답 → reb_market_stats 행. 알 수 없는 형식이면 빈 배열 */
export function normalizeRows(json, quarter) {
  const rows = json?.SttsApiTblData?.[1]?.row ?? json?.rows ?? []
  const out = []
  for (const r of rows) {
    const storeType = STORE_TYPE_MAP[String(r.store_type ?? r.ITM_NM ?? '').replace(/\s/g, '').slice(0, 3)] ?? null
    const regionName = r.region_name ?? r.CLS_NM ?? null
    if (!storeType || !regionName) continue
    out.push({
      quarter,
      region_level: r.region_level ?? (r.CLS_ID && String(r.CLS_ID).length <= 2 ? 'sido' : 'sigungu'),
      region_code: r.region_code ?? (r.CLS_ID ? String(r.CLS_ID) : null),
      region_name: regionName,
      store_type: storeType,
      vacancy_rate: r.vacancy_rate ?? null,
      rent_per_m2: r.rent_per_m2 ?? null,
      rent_index_change: r.rent_index_change ?? null,
      source_url: 'https://www.data.go.kr/data/15134761/openapi.do',
      fetched_at: new Date().toISOString(),
    })
  }
  return out
}

/** @returns rows[] | null (키 없음·실패) */
export async function fetchRebQuarter({ quarter, apiKey = process.env.REB_API_KEY ?? null, fetchImpl = fetch } = {}) {
  if (!apiKey) return null // 모의 모드
  try {
    const url = `${REB_ENDPOINT}?KEY=${encodeURIComponent(apiKey)}&Type=json&pIndex=1&pSize=1000&WRTTIME_IDTF_ID=${quarter}`
    const r = await fetchImpl(url)
    if (!r.ok) return null
    const j = await r.json()
    const rows = normalizeRows(j, quarter)
    return rows.length ? rows : null
  } catch (_) { return null }
}

/** 배치 판정 — 실패면 직전 분기 유지 + 운영 로그 1줄 (순수) */
export function decideBatch({ fetched, quarter, prevQuarter }) {
  if (!fetched || !fetched.length) {
    return { action: 'keep', rows: [], log: `[reb-stats] ${quarter} 수집 실패 — 직전 분기(${prevQuarter}) 데이터 유지` }
  }
  return { action: 'upsert', rows: fetched, log: `[reb-stats] ${quarter} ${fetched.length}행 저장` }
}
