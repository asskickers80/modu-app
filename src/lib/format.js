/** '3,000' | 3000 → "3,000만" (0이나 빈 값이면 null) — 매물 카드 금액 표기 공용 */
export function manwon(v) {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10)
  return isNaN(n) || !n ? null : `${n.toLocaleString()}만`
}

/**
 * 캡레이트(수익률) = 연 임대수익(월세×12) ÷ 매매가 × 100. 소수 1자리(%).
 * 월세·매매가 모두 만원 단위라 비율은 무차원. 값 부족하면 null(자동계산 불가).
 * occupancy는 라벨(수익률/예상 수익률) 구분용 — 계산식은 동일.
 */
export function computeCapRate(monthlyRent, salePrice) {
  const m = parseInt(String(monthlyRent ?? '').replace(/[^0-9]/g, ''), 10)
  const s = parseInt(String(salePrice ?? '').replace(/[^0-9]/g, ''), 10)
  if (!m || !s) return null
  return Math.round((m * 12 / s) * 100 * 10) / 10
}

/** 상호 공개 여부에 따른 표시 이름 — 비공개+프랜차이즈는 "동 브랜드", 비공개+개인은 "동 업종" */
export function displayShopName(listing, fallback = '(상호 없음)') {
  if (listing.shop_name_public !== false) return listing.shop_name || fallback
  const dong = listing.address?.match(/(\S+동)/)?.[1] || ''
  if (listing.is_franchise && listing.franchise_brand_name) {
    return dong ? `${dong} ${listing.franchise_brand_name}` : listing.franchise_brand_name
  }
  // 카드명은 좁은 자리라 "대분류 > 소분류" 대신 가장 구체적인 한 단계만 쓴다
  const biz = listing.category_sub || listing.category_main || listing.biz_type || '가게'
  return dong ? `${dong} ${biz}` : biz
}
