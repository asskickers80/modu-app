/**
 * 매물 완성도 계산 공용 모듈
 *
 * calcScore(data)          — E1Context(camelCase) 기준 점수 계산
 * listingToScoreInput(row) — Supabase listings row(snake_case) → calcScore 입력 변환
 */

export function calcScore(data) {
  let score = 0
  if (data.address) score += 20
  if (data.shopName) score += 10
  if (data.area) score += 5
  if (data.deposit && data.monthlyRent) score += 15
  if (data.transferFee) score += 10
  if (data.transferType) score += 5
  // 업종 — 대분류만 있어도 인정(소분류는 선택 사항), 옛 매물은 biz_type 폴백.
  // 필수 입력은 아니고 점수로만 유도한다.
  if (data.categoryMain || data.bizType) score += 5
  if ((data.interiorPhotos?.length ?? 0) + (data.exteriorPhotos?.length ?? 0) > 0) score += 12
  if (data.salesProof) score += 8
  return Math.min(score, 100)
}

/**
 * 매물 카드 신뢰 신호 — 실데이터로 판정 가능한 것만, 최대 2개.
 * 완성도는 높을 때만 칭찬(80%+)하고 낮다고 벌주는 표시는 하지 않는다
 * (낮은 완성도는 이미 노출 순위에 반영돼 있음).
 */
export function trustBadges(row) {
  const badges = []
  if (calcScore(listingToScoreInput(row)) >= 80) {
    badges.push({ id: 'complete', label: '✓ 충실한 매물' })
  }
  if (Object.keys(row.review_choices ?? {}).length > 0) {
    badges.push({ id: 'reviewed', label: '검수 완료' })
  }
  return badges.slice(0, 2)
}

/**
 * Supabase listings row(snake_case)를 E1Context 전체 형태(camelCase)로 역변환.
 * E1 수정 모드에서 기존 매물을 폼에 복원할 때 사용 — 19개 저장 컬럼 전부 대응.
 */
export function listingToContext(row) {
  // Storage 공개 URL에서 path 역추출 (…/object/public/{bucket}/{path})
  const urlToPhoto = url => {
    const m = String(url).match(/\/object\/public\/[^/]+\/(.+)$/)
    return { url, path: m ? decodeURIComponent(m[1]) : null }
  }
  // 상세주소 분리 복원: address_detail이 있으면 합본(address)에서 접미사를 떼어 기본주소로,
  // null인 옛 매물은 기존대로 통주소 + 상세 빈칸
  const fullAddress = row.address ?? ''
  const detail = row.address_detail ?? ''
  const hasDetail = !!detail && fullAddress.endsWith(' ' + detail)
  return {
    address:        hasDetail ? fullAddress.slice(0, -(detail.length + 1)) : fullAddress,
    detailAddress:  hasDetail ? detail : '',
    shopName:       row.shop_name      ?? '',
    floor:          row.floor          ?? '',
    area:           row.area           ?? '',
    deposit:        row.deposit        ?? '',
    monthlyRent:    row.monthly_rent   ?? '',
    maintenance:    row.maintenance    ?? '',
    transferFee:    row.transfer_fee   ?? '',
    transferType:   row.transfer_type  ?? null,
    monthlySales:   row.monthly_sales  ?? '',
    bizType:          row.biz_type           ?? '',
    categoryMain:     row.category_main      ?? null,
    categorySub:      row.category_sub       ?? null,
    ksicCode:         row.ksic_code          ?? null,
    businessNumber:   row.business_number    ?? '',
    biznoVerified:    !!row.bizno_verified_at,
    isFranchise:      row.is_franchise      ?? false,
    franchiseBrandId: row.franchise_brand_id ?? null,
    franchiseBrandName: row.franchise_brand_name ?? '',
    autoFilled:     false,
    reviewChoices:  row.review_choices ?? {},
    editedTexts:    row.edited_texts   ?? {},
    itemVisibility: row.item_visibility ?? {},
    photosAdded:    row.photos_added   ?? false,
    salesProof:     row.sales_proof    ?? false,
    facilities:     row.facilities     ?? [],
    // 내/외부 분리 컬럼이 있으면 분리 복원, null인 옛 매물은 합본(image_urls)→내부 폴백
    interiorPhotos: (row.interior_image_urls ?? row.image_urls ?? []).map(urlToPhoto),
    exteriorPhotos: (row.exterior_image_urls ?? []).map(urlToPhoto),
    shopNamePublic: row.shop_name_public ?? true,
    aiDraft:        row.ai_draft       ?? null,
    marketData:     null,              // DB 미저장 — 수정 모드에선 시세 블록 미표시
    marketInsight:  null,
  }
}

/**
 * Supabase listings row(snake_case)를 calcScore 입력 형태(camelCase)로 변환.
 * calcScore는 사진 배열의 length만 참조하므로 image_urls 개수를 interiorPhotos에 매핑한다.
 */
export function listingToScoreInput(row) {
  return {
    address:        row.address        ?? '',
    shopName:       row.shop_name      ?? '',
    area:           row.area           ?? '',
    deposit:        row.deposit        ?? '',
    monthlyRent:    row.monthly_rent   ?? '',
    transferFee:    row.transfer_fee   ?? '',
    transferType:   row.transfer_type  ?? null,
    categoryMain:   row.category_main  ?? null,
    bizType:        row.biz_type       ?? '',
    reviewChoices:  row.review_choices ?? {},
    interiorPhotos: (row.image_urls ?? []).map(u => ({ url: u })),
    exteriorPhotos: [],
    salesProof:     row.sales_proof    ?? false,
  }
}

/**
 * 임대인(landlord) 완성도 — 배점 미확정(시뮬레이션 중 확정 예정, ORDER #3).
 * 스텁: 아직 계산하지 않는다. 홈은 이 값이 null이면 '준비중'으로 표시한다.
 * (양도인 calcScore를 그대로 쓰면 transfer_fee 등 임대인에 없는 항목으로 왜곡되므로 재사용 금지)
 */
export function calcScoreLandlord() {
  return null // 미구현 — 배점 확정 후 임대 필드 기준으로 구현
}

/**
 * listings row(snake) → E1pContext data(camel) 역매핑 — 임대인(E1p) 수정 모드 로드용.
 * seller 전용 listingToContext와 컬럼이 달라(deal_type·sale_price·cap_rate·recommended_biz) 별도 함수.
 * address_detail가 있으면 base/detail 분리 복원(양도인 정책과 동일).
 */
const DEAL_TYPE_REV = { lease: 'rent', sale: 'sale', both: 'both' }
export function listingToLandlordContext(row) {
  const detail = row.address_detail ?? ''
  const base = detail && typeof row.address === 'string' && row.address.endsWith(detail)
    ? row.address.slice(0, row.address.length - detail.length).trim()
    : (row.address ?? '')
  return {
    listingType:    DEAL_TYPE_REV[row.deal_type] ?? null,
    address:        base,
    detailAddress:  detail,
    floor:          row.floor          ?? '',
    area:           row.area           ?? '',
    deposit:        row.deposit        ?? '',
    monthlyRent:    row.monthly_rent   ?? '',
    maintenance:    row.maintenance    ?? '',
    salePrice:      row.sale_price     ?? '',
    capRate:        row.cap_rate       ?? '',
    recommendedBiz: Array.isArray(row.recommended_biz) ? row.recommended_biz : [],
    aiDraft:        row.ai_draft       ?? null,
    reviewChoices:  row.review_choices ?? {},
    editedTexts:    row.edited_texts   ?? {},
    isDemo:         row.status === 'example', // 예시 수정 시 유지(양도인 동일 정책)
  }
}
