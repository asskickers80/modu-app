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
  if (Object.keys(data.reviewChoices || {}).length >= 3) score += 15
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
    badges.push({ id: 'reviewed', label: 'AI 검수 완료' })
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
    isFranchise:      row.is_franchise      ?? false,
    franchiseBrandId: row.franchise_brand_id ?? null,
    franchiseBrandName: row.franchise_brand_name ?? '',
    autoFilled:     false,
    reviewChoices:  row.review_choices ?? {},
    editedTexts:    row.edited_texts   ?? {},
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
    reviewChoices:  row.review_choices ?? {},
    interiorPhotos: (row.image_urls ?? []).map(u => ({ url: u })),
    exteriorPhotos: [],
    salesProof:     row.sales_proof    ?? false,
  }
}
