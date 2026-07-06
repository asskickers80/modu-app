/** '3,000' | 3000 → "3,000만" (0이나 빈 값이면 null) — 매물 카드 금액 표기 공용 */
export function manwon(v) {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10)
  return isNaN(n) || !n ? null : `${n.toLocaleString()}만`
}

/** 상호 공개 여부에 따른 표시 이름 — 비공개+프랜차이즈는 "동 브랜드", 비공개+개인은 "동 업종" */
export function displayShopName(listing, fallback = '(상호 없음)') {
  if (listing.shop_name_public !== false) return listing.shop_name || fallback
  const dong = listing.address?.match(/(\S+동)/)?.[1] || ''
  if (listing.is_franchise && listing.franchise_brand_name) {
    return dong ? `${dong} ${listing.franchise_brand_name}` : listing.franchise_brand_name
  }
  const biz = listing.biz_type || '가게'
  return dong ? `${dong} ${biz}` : biz
}
