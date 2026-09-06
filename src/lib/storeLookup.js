/**
 * 주소로 업소 찾기 (ORDER-address-autofill-v1 §2 — 업종 확인 칩)
 * 소진공 상가업소 반경 조회 응답에서 **그 주소의 업소**를 골라 업종을 제안한다.
 *
 * 정직 원칙: 소진공 데이터는 폐업·이전 반영이 늦다. 그래서 자동 확정하지 않고
 * "이 업종 맞아요?" 확인 칩으로만 쓴다(오더 명시). 못 찾으면 조용히 생략.
 *
 * 응답 항목에 지번주소(lnoAdr)·도로명주소(rdnmAdr)·법정동코드(ldongCd)·본번/부번
 * (lnoMnno/lnoSlno)·건축물관리번호(bldMngNo)가 함께 온다 — 주소 매칭에 이걸 쓴다.
 */
import { geocodeAddress } from './geocode'
import { fetchPublicData } from './apiProxy'

// 지연 참조 — 순수 함수(suggestIndustry)를 Node 테스트에서 직접 import할 수 있게 한다
const districtKey = () => import.meta.env?.VITE_DISTRICT_DATA_KEY
const BASE = '/api/opendata/B553077/api/open/sdsc2/storeListInRadius'

/** 비교용 정규화 — 공백·시도 축약 차이를 흡수 ("서울"·"서울특별시") */
const norm = (s) => String(s ?? '')
  .replace(/\s+/g, '')
  .replace(/특별시|광역시|특별자치시|특별자치도/g, '')
  .replace(/^([가-힣]{2})도/, '$1')

/** 지번주소 끝의 "165-8" 추출 → "165-8" (부번 없으면 "165") */
const lotOf = (addr) => {
  const m = String(addr ?? '').match(/(\d{1,4})(?:-(\d{1,4}))?\s*(?:번지)?\s*$/)
  return m ? (m[2] ? `${m[1]}-${m[2]}` : m[1]) : null
}

/**
 * 같은 지번(또는 같은 도로명 건물)에 있는 업소들.
 * @returns { stores: [{ name, ksicCd, ksicNm, indsSclsNm, floor, unit }], meta } | null
 */
export async function storesAtAddress({ address, jibunAddress = null, radius = 100 } = {}) {
  const key = districtKey()
  if (!key || !address) return null
  try {
    const coords = await geocodeAddress(address)
    if (!coords?.lat) return null
    const res = await fetchPublicData('B553077/api/open/sdsc2/storeListInRadius', {
      serviceKey: key, radius: String(radius),
      cx: String(coords.lng), cy: String(coords.lat),
      type: 'json', numOfRows: '1000', pageNo: '1',
    })
    if (!res.ok) return null
    const json = await res.json()
    const items = json?.body?.items ?? []
    if (!items.length) return null

    const wantLot = lotOf(jibunAddress || address)
    const wantJibun = norm(jibunAddress)
    const wantRoad = norm(address)

    const hits = items.filter(it => {
      if (wantJibun && norm(it.lnoAdr) === wantJibun) return true
      if (wantRoad && norm(it.rdnmAdr) === wantRoad) return true
      // 번지만 일치(동까지 같은 반경이라 오탐 위험이 낮다)
      return !!wantLot && lotOf(it.lnoAdr) === wantLot
    })
    if (!hits.length) return null

    return {
      stores: hits.map(it => ({
        name: it.bizesNm ?? '',
        ksicCd: String(it.ksicCd ?? '').replace(/^[A-Z]/, ''),
        ksicNm: it.ksicNm ?? '',
        indsSclsNm: it.indsSclsNm ?? '',
        indsLclsNm: it.indsLclsNm ?? '',
        floor: it.flrNo || null,
        unit: it.hoNo || null,
      })),
      meta: {
        // 건축물대장 조회에 그대로 쓸 수 있는 값들 (주소 파싱 대체 경로)
        ldongCd: hits[0].ldongCd ?? null,
        bun: hits[0].lnoMnno ?? null,
        ji: hits[0].lnoSlno ?? null,
        bldMngNo: hits[0].bldMngNo ?? null,
        bldNm: hits[0].bldNm ?? null,
      },
    }
  } catch (_) { return null }
}

// 같은 지번의 업소가 이보다 많으면 업종을 제안하지 않는다.
// 실데이터 근거: 서교동 한 건물(동교동 165-8)에 등록 업소 193곳 — 대형 집합건물에서
// "최빈 업종"은 그 점포의 업종과 무관하다. 틀린 제안보다 미제안이 낫다(정직 원칙).
export const MAX_CANDIDATES = 3

/**
 * 확인 칩용 업종 제안.
 * - 호실(상세주소)이 있으면 그 호실 업소를 우선 매칭 → 후보 수와 무관하게 제안
 * - 호실이 없으면 같은 지번 업소가 MAX_CANDIDATES 이하일 때만 제안(단독·소형 건물)
 * @returns { ksicCd, label, sampleName, confident } | null
 */
export function suggestIndustry(result, detailAddress = null) {
  const stores = result?.stores ?? []
  if (!stores.length) return null

  const wantUnit = String(detailAddress ?? '').match(/(\d+)\s*호/)?.[1] ?? null
  if (wantUnit) {
    const hit = stores.find(s => String(s.unit ?? '').replace(/\D/g, '') === wantUnit)
    if (hit?.ksicCd) {
      return { ksicCd: hit.ksicCd, label: hit.indsSclsNm || hit.ksicNm, sampleName: hit.name, confident: true }
    }
  }
  if (stores.length > MAX_CANDIDATES) return null // 집합건물 — 특정 불가, 침묵

  const counts = {}
  for (const s of stores) {
    const k = s.ksicCd
    if (!k) continue
    counts[k] = counts[k] ?? { count: 0, label: s.indsSclsNm || s.ksicNm, ksicCd: k }
    counts[k].count++
  }
  const best = Object.values(counts).sort((a, b) => b.count - a.count)[0]
  return best
    ? { ksicCd: best.ksicCd, label: best.label, sampleName: stores[0].name, confident: false }
    : null
}
