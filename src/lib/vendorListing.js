import { saveListing } from './listings'
import { geocodeAddress } from './geocode'
import { buildVendorPayload, missingRequired } from './vendorListingRules'

/**
 * 기업회원(E1b) 입점 저장 — 양도인·임대인과 같은 listings 테이블에 listing_type='business' 로 저장한다.
 * 소비처가 이 구조를 전제한다:
 *   - 시세 문의 배정  lib/priceInquiry.js  (listing_type='business' + status='published' + biz_category)
 *   - 기업회원 상세   screens/VendorDetailPage.jsx
 *   - 한마디 프로필   lib/vendorTakes.js
 * 순수 룰(payload 조립·검증)은 lib/vendorListingRules.js.
 */

/**
 * 실제 저장. 주소가 있으면 좌표를 1회 변환해 함께 넣는다(배정이 좌표 기준).
 * @returns {{ ok:boolean, missing?:string[], error?:string }}
 */
export async function publishVendor(data) {
  const missing = missingRequired(data)
  if (missing.length) return { ok: false, missing }
  let coords = null
  try { coords = await geocodeAddress(String(data?.region ?? '').trim()) } catch (_) { coords = null }
  try {
    await saveListing({ payload: buildVendorPayload(data, coords) })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message ?? '저장에 실패했어요' }
  }
}
