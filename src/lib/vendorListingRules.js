import { isVendorCategory } from '../../config/salesCardCategories'

/**
 * 기업회원(E1b) 입점 저장의 순수 룰 — 네트워크·supabase 의존 없음(테스트가 이 결과를 그대로 고정한다).
 * 실제 저장은 lib/vendorListing.js.
 *
 * 저장하는 값은 전부 사용자가 직접 넣었거나 공공 조회로 확인된 것만이다(추정·기본값 없음).
 */

/** 빈 쌍은 버린다 — 채운 것만 노출된다(빈껍데기 금지) */
export function cleanSolutions(solutions) {
  return (Array.isArray(solutions) ? solutions : [])
    .map(s => ({ problem: String(s?.problem ?? '').trim(), solve: String(s?.solve ?? '').trim() }))
    .filter(s => s.problem || s.solve)
}

/** 소재지·업력·업종을 있는 것만 이어 붙인다. 없는 정보는 만들지 않는다. */
export function buildTagline({ region, founded, categoryLabel }, now = new Date()) {
  const year = /^\d{4}$/.test(String(founded)) ? parseInt(founded, 10) : null
  const years = year ? now.getFullYear() - year : null
  return [
    region ? String(region).split(/\s+/).slice(0, 2).join(' ') : null,
    years != null && years >= 0 ? `업력 ${years}년` : null,
    categoryLabel || null,
  ].filter(Boolean).join(' · ')
}

/**
 * 입력값 → listings payload.
 * @param {object} data E1bContext 의 data
 * @param {{lat:number,lng:number}|null} coords 지오코딩 결과(없으면 null)
 */
export function buildVendorPayload(data, coords = null, now = new Date()) {
  const founded = /^\d{4}$/.test(String(data?.founded)) ? parseInt(data.founded, 10) : null
  const solutions = cleanSolutions(data?.solutions)
  const tags = (Array.isArray(data?.triggers) ? data.triggers : []).map(t => String(t).trim()).filter(Boolean)
  return {
    listing_type: 'business',
    shop_name: String(data?.bizName ?? '').trim() || null,
    business_number: String(data?.bizNumber ?? '').trim() || null,
    biz_category: isVendorCategory(data?.category) ? data.category : null,
    biz_phone: String(data?.phone ?? '').trim() || null,
    address: String(data?.region ?? '').trim() || null,
    biz_tagline: buildTagline({
      region: data?.region, founded: data?.founded, categoryLabel: data?.categoryLabel,
    }, now) || null,
    biz_tags: tags.length ? tags : null,
    biz_founded: founded,
    biz_solutions: solutions.length ? solutions : null,
    biz_settings: {
      speed: data?.dmSpeed ?? 'normal',
      deposit: !!data?.dmDeposit,
      active: data?.dmActive !== false,
    },
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
    published_at: now.toISOString(),
  }
}

/** 저장 전 최소 요건 — 이게 없으면 배정·상세가 동작하지 않는다 */
export function missingRequired(data) {
  const missing = []
  if (!String(data?.bizName ?? '').trim()) missing.push('상호')
  if (!isVendorCategory(data?.category)) missing.push('업종')
  return missing
}
