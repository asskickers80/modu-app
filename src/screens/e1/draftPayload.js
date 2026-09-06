/**
 * 초안 payload (ORDER-key-proxy-account-deletion 작업 D)
 *
 * 게시 payload(E1Step5)의 부분집합 — 초안 단계에서 확정된 값만 담는다.
 * 게시 시점에는 E1Step5가 전체 payload로 같은 행을 UPDATE하며 status만 published로 바뀐다
 * (D-1: 별도 테이블 없음 = 데이터 이동 없음).
 */
export function draftPayload(data) {
  return {
    listing_type: 'seller',
    address: [data.address, data.detailAddress].filter(Boolean).join(' ') || null,
    address_detail: data.detailAddress || null,
    shop_name: data.shopName || null,
    shop_name_public: data.shopNamePublic ?? true,
    title: data.title || null,
    floor: data.floor || null,
    area: data.area || null,
    deposit: data.deposit || null,
    monthly_rent: data.monthlyRent || null,
    maintenance: data.maintenance || null,
    transfer_fee: data.transferFee || null,
    transfer_type: data.transferType || null,
    monthly_sales: data.monthlySales || null,
    biz_type: data.bizType || null,
    category_main: data.categoryMain ?? null,
    category_sub: data.categorySub ?? null,
    ksic_code: data.ksicCode ?? null,
    is_franchise: data.isFranchise ?? false,
    franchise_brand_id: data.franchiseBrandId ?? null,
    franchise_brand_name: data.franchiseBrandName || null,
    ai_draft: data.aiDraft ?? null,
    review_choices: data.reviewChoices ?? {},
    edited_texts: data.editedTexts ?? {},
    item_visibility: data.itemVisibility ?? {},
    image_urls: [...(data.interiorPhotos || []), ...(data.exteriorPhotos || [])].map(p => p.url),
    interior_image_urls: (data.interiorPhotos || []).map(p => p.url),
    exterior_image_urls: (data.exteriorPhotos || []).map(p => p.url),
    facilities: data.facilities ?? [],
    facility_age: data.facilityAge || null,
    spot_frontage: data.spotFrontage || null,
    spot_parking: data.spotParking || null,
    spot_visibility: data.spotVisibility || null,
    bjd_code: data.bcode || null,
    postal_code: data.postalCode || null,
  }
}
