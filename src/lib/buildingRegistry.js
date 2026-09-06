/**
 * 건축물대장 조회 (ORDER-address-autofill-v1)
 * 국토부 건축HUB 건축물대장정보 서비스(BldRgstHubService) — 프록시 경유.
 *
 * 조회 3종:
 *  - 표제부(getBrTitleInfo)          : 건물명·주용도·사용승인일 — 지번당 1건, 가장 확실
 *  - 전유공용면적(getBrExposPubuseAreaInfo): 집합건물 호실별 전용면적·층
 *  - 층별개요(getBrFlrOulnInfo)       : 일반건축물 층별 면적 (전유부 폴백)
 *
 * 정직 원칙: 층·면적은 **특정이 될 때만** 채운다. 집합건물에서 호실을 모르면
 * 후보가 여러 개이므로 채우지 않고 직접 입력으로 넘긴다(틀린 자동 채움 금지).
 * 어떤 실패(키 미설정·미매칭·API 장애)도 null → 현행 직접 입력 유지.
 */
import { registryParams, normalizeFloor, matchUnit } from './addressParse'
import { fetchPublicData } from './apiProxy'

const BASE = '/api/opendata/1613000/BldRgstHubService'
// 개발(vite 프록시)은 서버 키 주입 경로를 타지 않으므로 클라이언트가 붙인다.
// 프로덕션 프록시는 서버 키로 덮어쓴다(api/opendata/[...path].js SERVER_KEYED).
// 지연 참조 — 순수 함수(summaryOf)를 Node 테스트에서 직접 import할 수 있게 한다
const clientKey = () => import.meta.env?.VITE_PUBLIC_DATA_KEY

async function call(op, params, { numOfRows = 100 } = {}) {
  const key = clientKey()
  const res = await fetchPublicData(`1613000/BldRgstHubService/${op}`, {
    ...params, _type: 'json', numOfRows: String(numOfRows), pageNo: '1',
    ...(key ? { serviceKey: key } : {}),
  })
  if (!res.ok) return null
  const json = await res.json()
  if (json?.response?.header?.resultCode !== '00') return null
  const item = json?.response?.body?.items?.item
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** YYYYMMDD → 2009 (연도만 — 준공 연식 표기용) */
const yearOf = (useAprDay) => {
  const m = String(useAprDay ?? '').match(/^(\d{4})/)
  return m ? Number(m[1]) : null
}

/**
 * 주소 → 건축물대장 요약.
 * @param picked Daum 콜백값 { bcode, jibunAddress }
 * @param detailAddress 상세주소(호실) — 있으면 전유부 매칭에 쓴다
 * @returns { buildingName, mainPurpose, useApprovalYear, useApprovalDate,
 *            floor, area, floorSource, unitCount } | null
 */
export async function fetchBuildingInfo(picked, detailAddress = null) {
  const params = registryParams(picked)
  if (!params) return null
  try {
    const titles = await call('getBrTitleInfo', params, { numOfRows: 5 })
    if (!titles?.length) return null
    // 지번에 동이 여러 개면 첫 동 기준 (건물명·연식은 대개 동일)
    const t = titles[0]

    const info = {
      buildingName: t.bldNm || null,
      mainPurpose: t.mainPurpsCdNm || null,
      useApprovalDate: /^\d{8}$/.test(String(t.useAprDay ?? '')) ? String(t.useAprDay) : null,
      useApprovalYear: yearOf(t.useAprDay),
      floor: null,
      area: null,
      floorSource: null,
      unitCount: 0,
    }

    // 1) 집합건물 전유부 — 호실이 있으면 매칭, 없으면 후보 1개일 때만 확정
    const expos = (await call('getBrExposPubuseAreaInfo', params, { numOfRows: 300 })) ?? []
    const exclusive = expos.filter(r => r.exposPubuseGbCdNm === '전유')
    info.unitCount = exclusive.length
    if (exclusive.length) {
      const hit = matchUnit(
        exclusive.map(r => ({ ...r, area: num(r.area) })), detailAddress)
      if (hit) {
        info.floor = normalizeFloor(hit.flrNoNm)
        info.area = num(hit.area)
        info.floorSource = 'expos'
      }
      return info // 집합건물: 못 고르면 층·면적은 비운 채 반환(연식·용도만 채움)
    }

    // 2) 일반건축물 층별개요 — 지상층이 1개뿐이면 확정(단층 상가)
    const floors = (await call('getBrFlrOulnInfo', params, { numOfRows: 50 })) ?? []
    const ground = floors.filter(r => r.flrGbCdNm === '지상' && num(r.area))
    if (ground.length === 1) {
      info.floor = normalizeFloor(ground[0].flrNoNm)
      info.area = num(ground[0].area)
      info.floorSource = 'flr'
    }
    return info
  } catch (_) { return null }
}

/** 확인 카드 문구 — 채워진 값만 이어 붙인다(없는 값은 말하지 않는다) */
export function summaryOf(info) {
  if (!info) return null
  const bits = []
  if (info.floor) bits.push(info.floor)
  if (info.area) bits.push(`${info.area}㎡`)
  if (info.useApprovalYear) bits.push(`${info.useApprovalYear}년 준공`)
  if (!bits.length && info.mainPurpose) bits.push(info.mainPurpose)
  return bits.length ? bits.join(' · ') : null
}
