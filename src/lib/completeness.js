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
 * Supabase listings row(snake_case)를 E1Context 전체 형태(camelCase)로 역변환.
 * E1 수정 모드에서 기존 매물을 폼에 복원할 때 사용 — 19개 저장 컬럼 전부 대응.
 */
export function listingToContext(row) {
  // Storage 공개 URL에서 path 역추출 (…/object/public/{bucket}/{path})
  const urlToPhoto = url => {
    const m = String(url).match(/\/object\/public\/[^/]+\/(.+)$/)
    return { url, path: m ? decodeURIComponent(m[1]) : null }
  }
  return {
    address:        row.address        ?? '',
    detailAddress:  '',                // 저장 시 address에 합쳐지므로 통주소로 복원
    shopName:       row.shop_name      ?? '',
    floor:          row.floor          ?? '',
    area:           row.area           ?? '',
    deposit:        row.deposit        ?? '',
    monthlyRent:    row.monthly_rent   ?? '',
    maintenance:    row.maintenance    ?? '',
    transferFee:    row.transfer_fee   ?? '',
    transferType:   row.transfer_type  ?? null,
    monthlySales:   row.monthly_sales  ?? '',
    autoFilled:     false,
    reviewChoices:  row.review_choices ?? {},
    editedTexts:    row.edited_texts   ?? {},
    photosAdded:    row.photos_added   ?? false,
    salesProof:     row.sales_proof    ?? false,
    facilities:     row.facilities     ?? [],
    // TODO: DB에 내/외부 구분 컬럼 추가 후 분리 복원 — 지금은 전부 내부 사진으로 복원
    interiorPhotos: (row.image_urls ?? []).map(urlToPhoto),
    exteriorPhotos: [],
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
