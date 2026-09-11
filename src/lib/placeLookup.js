/**
 * 상호·주소로 시작하는 등록 — 조회 파이프라인 (ORDER 2026-09-11 파트 B2). AI 없음, 공식 API만.
 *  상호 → 네이버 지역검색(공식) 후보 ≤5 → 택1 → 역지오코딩(네이버, 법정동 코드) → 소진공 상가정보(업종) → 건축물대장(층·면적·연식)
 *  주소 → 지오코딩 → 같은 파이프라인.
 * 타 플랫폼 페이지 크롤링·파싱 코드 없음(lint). 외부 응답 원본은 저장하지 않고 필드값·출처만 돌려준다.
 * 돈 7칸(권리금·보증금·월세·관리비·월매출·양도 사유·잔여 계약기간)은 절대 채우지 않는다(MONEY_FIELDS 가드).
 */
// supabase·Vite 전용 모듈은 함수 안에서 동적 import — 테스트가 Node에서 이 파일을 직접 import한다
import { searchIndustry } from './categories'

export const MONEY_FIELDS = ['transferFee', 'deposit', 'monthlyRent', 'maintenance', 'monthlySales', 'transferReason', 'remainingTerm']
export const MAX_CANDIDATES = 5

/** 주소처럼 보이는 입력인가 — 도로명(로·길)+번호 또는 동+번지 */
export function isAddressLike(q) {
  const t = String(q ?? '').trim()
  return /(로|길)\s*\d+/.test(t) || /(동|읍|면|리)\s*\d+(-\d+)?/.test(t) || /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/.test(t) && /\d/.test(t)
}

const strip = s => String(s ?? '').replace(/<[^>]+>/g, '').trim()

/** 네이버 지역검색 응답 항목 → 후보 (상호·도로명·지번·카테고리·전화·좌표) */
export function candidateFrom(item, rank = 0) {
  return {
    rank,
    name: strip(item.title),
    roadAddress: item.roadAddress || '',
    address: item.address || '',      // 지번
    category: item.category || '',
    telephone: item.telephone || '',
    lat: item.mapy ? Number(item.mapy) / 1e7 : null,
    lng: item.mapx ? Number(item.mapx) / 1e7 : null,
  }
}

/** @returns { mode:'name'|'address', candidates:[] } */
export async function lookupPlace(query) {
  const q = String(query ?? '').trim()
  if (!q) return { mode: 'name', candidates: [] }
  if (isAddressLike(q)) {
    return { mode: 'address', candidates: [{ rank: 0, name: '', roadAddress: q, address: q, category: '', telephone: '', lat: null, lng: null }] }
  }
  try {
    const { fetchNaverSearch } = await import('./apiProxy')
    const res = await fetchNaverSearch({ kind: 'local', query: q, display: MAX_CANDIDATES })
    if (!res.ok) return { mode: 'name', candidates: [] }
    const j = await res.json()
    if (j.disabled || !Array.isArray(j.items)) return { mode: 'name', candidates: [] }
    return { mode: 'name', candidates: j.items.slice(0, MAX_CANDIDATES).map(candidateFrom) }
  } catch (_) { return { mode: 'name', candidates: [] } }
}

/** 소진공 라벨/KSIC → 모두 업종 대·소분류 */
export function mapIndustry(suggestion) {
  if (!suggestion) return null
  const hits = searchIndustry(suggestion.label ?? '')
  const byKsic = hits.find(h => h.ksic && suggestion.ksicCd && String(suggestion.ksicCd).startsWith(String(h.ksic).slice(0, 4)))
  const pick = byKsic ?? hits[0] ?? null
  return pick ? { categoryMain: pick.main, categorySub: pick.sub, ksicCode: pick.ksic ?? suggestion.ksicCd ?? null, bizType: pick.sub } : null
}

/**
 * 후보 1개 → 자동 채움 초안. 실패한 단계는 그 필드만 비우고 나머지 진행(전체 실패 금지).
 * @returns { fields:{...}, sources:{ field: 'naver_local'|'sbiz'|'building_ledger' }, flags:{ field: '확인 필요' }, extras:{ sameIndustryNearby } }
 */
export async function autofillFromCandidate(cand, { detailAddress = '', geo = null, stores = null, registry = null } = {}) {
  if (!geo) geo = (await import('./apiProxy')).fetchGeo
  if (!stores) stores = (await import('./storeLookup')).storesAtAddress
  if (!registry) registry = (await import('./buildingRegistry')).fetchBuildingInfo
  const { suggestIndustry } = await import('./storeLookup')
  const fields = {}, sources = {}, flags = {}, extras = {}
  const road = cand.roadAddress || cand.address || ''
  if (road) { fields.address = road; sources.address = 'naver_local' }
  if (cand.address) { fields.jibunAddress = cand.address }
  if (cand.name) { fields.shopName = cand.name; sources.shopName = 'naver_local' }
  if (cand.telephone) { fields.telephone = cand.telephone; sources.telephone = 'naver_local' }

  // 좌표·법정동 코드 (자동, 확인 불필요)
  let lat = cand.lat, lng = cand.lng, bcode = ''
  try {
    if ((lat == null || lng == null) && road) {
      const r = await geo({ address: road }); const j = await r.json(); lat = j?.lat ?? null; lng = j?.lng ?? null
    }
    if (lat != null && lng != null) {
      fields.latitude = lat; fields.longitude = lng
      const r = await geo({ lat, lng }); const j = await r.json()
      bcode = j?.code ? String(j.code) : ''
      if (j?.region) fields.region = j.region
    }
  } catch (_) { /* 좌표 실패 — 나머지 진행 */ }
  if (bcode) fields.bcode = bcode

  // 업종 — 소진공 상호 대조 (초안, 확인 필수)
  try {
    const result = await stores({ address: road, jibunAddress: cand.address || null })
    const list = result?.stores ?? []
    const byName = cand.name ? list.find(s => s.name && (s.name.includes(cand.name) || cand.name.includes(s.name))) : null
    const sug = byName?.ksicCd ? { ksicCd: byName.ksicCd, label: byName.indsSclsNm || byName.ksicNm, confident: true } : suggestIndustry(result, detailAddress)
    const mapped = mapIndustry(sug)
    if (mapped) {
      Object.assign(fields, mapped); sources.categoryMain = 'sbiz'
      if (!sug.confident) flags.categoryMain = '확인 필요' // 상호 대조 실패 — 반영 지연 가능
    }
    if (mapped?.ksicCode) extras.sameIndustryNearby = list.filter(s => s.ksicCd && String(s.ksicCd).slice(0, 4) === String(mapped.ksicCode).slice(0, 4)).length
  } catch (_) { /* 업종 실패 — 비움 */ }

  // 건축물대장 — 층·전용면적·연식 (초안, 확인). 표제부 폴백 면적은 확인 필요
  try {
    if (bcode || cand.address) {
      const info = await registry({ address: road, jibunAddress: cand.address || '', bcode, zonecode: '', buildingName: '' }, detailAddress)
      if (info) {
        if (info.floor) { fields.floor = info.floor; sources.floor = 'building_ledger' }
        if (info.area) { fields.area = String(info.area); sources.area = 'building_ledger'; if (info.kind !== 'exclusive') flags.area = '확인 필요' }
        if (info.useApprovalYear) { fields.buildingYear = info.useApprovalYear; sources.buildingYear = 'building_ledger' }
        fields.buildingRegistry = info
      }
    }
  } catch (_) { /* 대장 실패 — 비움 */ }

  for (const k of MONEY_FIELDS) delete fields[k] // 돈·매출·사유는 절대 자동 채움 없음
  return { fields, sources, flags, extras }
}
