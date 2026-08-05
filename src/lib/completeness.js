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
// Storage 공개 URL에서 path 역추출 (…/object/public/{bucket}/{path}) — E1·E1p 역매핑 공용
const urlToPhoto = url => {
  const m = String(url).match(/\/object\/public\/[^/]+\/(.+)$/)
  return { url, path: m ? decodeURIComponent(m[1]) : null }
}

export function listingToContext(row) {
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
    facilityAge:    row.facility_age   ?? '', // 시설 연차 (draft-quality — 컬럼 생성 전 옛 행은 빈값)
    // 입지 칩 (ad-frame) — 컬럼 생성 전/미입력 옛 행은 빈값
    spotFrontage:   row.spot_frontage  ?? '',
    spotParking:    row.spot_parking   ?? '',
    spotVisibility: row.spot_visibility ?? '',
    // 내/외부 분리 컬럼이 있으면 분리 복원, null인 옛 매물은 합본(image_urls)→내부 폴백
    interiorPhotos: (row.interior_image_urls ?? row.image_urls ?? []).map(urlToPhoto),
    exteriorPhotos: (row.exterior_image_urls ?? []).map(urlToPhoto),
    shopNamePublic: row.shop_name_public ?? true,
    title:          row.title ?? '', // 매물 제목 (listing-title — 왕복 보존)
    aiDraft:        row.ai_draft       ?? null,
    marketData:     null,              // DB 미저장 — 수정 모드에선 시세 블록 미표시
    termsVersion:   row.terms_version  ?? null, // 등록 확인사항 동의 버전 — 재공개 재동의 판정
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

// ═══ 임대인(landlord) 완성도 — 대표 확정 배점 (ORDER-landlord-completeness-v1, 100점) ═══
// 원칙: 완성도 = 정보 충실도(입력이 얼마나 채워졌는가). 매물의 질 평가가 아니며,
// 노출 순위를 파는 지표도 아니다 (헌법 — 노출 순위 직접 판매 금지).
// (양도인 calcScore와 배점 체계가 달라 점수식은 분리하되, 값 채움 판정(filledVal)·
//  사진 역매핑(urlToPhoto)·row 역변환(listingToLandlordContext)은 공용 재사용 — 복제 금지)

const filledVal = v => v !== null && v !== undefined && String(v).trim() !== ''

/**
 * 항목별 배점 상세 — { id, label, got, max, hint }[]
 * hint는 해당 항목이 깎였을 때 제시할 "모두 화법" 다음 액션 문구.
 */
export function landlordScoreBreakdown(data) {
  const isRent = data.listingType === 'rent' || data.listingType === 'both'
  const isSale = data.listingType === 'sale' || data.listingType === 'both'

  // 1. 기본 정보 20 — 주소+상세 5 / 면적·층 5 / 거래유형별 가격 조건 완비 10
  const priceOk = (isRent || isSale)
    && (!isRent || (filledVal(data.deposit) && filledVal(data.monthlyRent)))
    && (!isSale || filledVal(data.salePrice))
  const basic = (filledVal(data.address) && filledVal(data.detailAddress) ? 5 : 0)
    + (filledVal(data.area) && filledVal(data.floor) ? 5 : 0)
    + (priceOk ? 10 : 0)

  // 2. 임차 현황·수익률 15 — occupancy 응답 5 / 수익률 산출 가능 10
  //    매각·둘다: cap_rate 저장값 또는 매매가+월세로 산출 가능 / 임대 단독: 현 임대료(월세) 입력
  const yieldOk = isSale
    ? (filledVal(data.capRate) || (filledVal(data.salePrice) && filledVal(data.monthlyRent)))
    : (isRent && filledVal(data.monthlyRent))
  const tenancy = (data.occupancy ? 5 : 0) + (yieldOk ? 10 : 0)

  // 3. 사진 25 — 외관 1장 10 / 3장 이상 +5 / 도면 1장 이상 +10
  const ext = (data.exteriorPhotos ?? []).length
  const plan = (data.floorPlanPhotos ?? []).length
  const photos = (ext >= 1 ? 10 : 0) + (ext >= 3 ? 5 : 0) + (plan >= 1 ? 10 : 0)

  // 4. 소개글 20 — 초안 확정 10 / 소유주 수정 흔적 +5 / 전 블록 공개 +5 (확정 위 가산)
  const confirmed = !!data.reviewChoices?.confirmedAt
  const edited = Object.keys(data.editedTexts ?? {}).length > 0
  const allVisible = !Object.values(data.itemVisibility ?? {}).some(v => v === false)
  const draft = (confirmed ? 10 : 0) + (confirmed && edited ? 5 : 0) + (confirmed && allVisible ? 5 : 0)

  // 5. 위치 공개 10 — 지도·거리뷰 공개 ON
  const location = data.showMap !== false ? 10 : 0

  // 6. 부가 정보 10 — 권장 업종 5 / 권리관계 서류(extras: 건축물대장·분양계약서·재산세) 5
  //    ("입주 가능 시점" 별도 필드는 현재 스키마에 없음 — extras 서류로 판정, 오더 보고 참조)
  const extra = ((data.recommendedBiz ?? []).length > 0 ? 5 : 0)
    + ((data.extras ?? []).length > 0 ? 5 : 0)

  return [
    { id: 'basic',    label: '기본 정보',        got: basic,    max: 20, hint: '주소·면적·가격 조건을 채우면 완성도가 올라가요' },
    { id: 'tenancy',  label: '임차 현황·수익률', got: tenancy,  max: 15, hint: '임차 현황과 임대료를 알려주시면 완성도가 올라가요' },
    { id: 'photos',   label: '사진',             got: photos,   max: 25, hint: ext >= 1 && plan < 1 ? '도면을 추가하면 완성도가 올라가요' : '외관 사진을 추가하면 완성도가 올라가요' },
    { id: 'draft',    label: '소개글',           got: draft,    max: 20, hint: confirmed ? '소개글을 다듬고 전 항목을 공개하면 완성도가 올라가요' : '소개글을 확정하면 완성도가 올라가요' },
    { id: 'location', label: '위치 공개',        got: location, max: 10, hint: '지도·거리뷰를 공개하면 완성도가 올라가요' },
    { id: 'extra',    label: '부가 정보',        got: extra,    max: 10, hint: '권장 업종과 증빙 서류를 더하면 완성도가 올라가요' },
  ]
}

export function calcScoreLandlord(data) {
  return landlordScoreBreakdown(data).reduce((s, i) => s + i.got, 0)
}

/** 다음 액션 힌트 — 잃은 점수가 가장 큰 항목 우선(동률이면 배점표 순서). 만점이면 null. */
export function landlordNextHint(data) {
  const items = landlordScoreBreakdown(data)
  const worst = items.reduce((w, i) => (i.max - i.got) > (w.max - w.got) ? i : w)
  return worst.max - worst.got > 0 ? worst.hint : null
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
    occupancy:      row.occupancy      ?? null,
    showMap:        row.show_map       ?? true,
    termsVersion:   row.terms_version  ?? null, // 등록 확인사항 동의 버전 — 재공개 재동의 판정
    recommendedBiz: Array.isArray(row.recommended_biz) ? row.recommended_biz : [],
    aiDraft:        row.ai_draft       ?? null,
    reviewChoices:  row.review_choices ?? {},
    editedTexts:    row.edited_texts   ?? {},
    itemVisibility: row.item_visibility ?? {},
    // 사진 복원 — 누락 시 수정 저장에서 image_urls가 빈 배열로 덮여 기존 사진이 손실된다(데이터 손실 버그 수정)
    floorPlanPhotos: (row.interior_image_urls ?? []).map(urlToPhoto), // 도면 → interior 재사용 매핑의 역방향
    exteriorPhotos:  (row.exterior_image_urls ?? []).map(urlToPhoto),
    floorPlanAdded:  (row.interior_image_urls ?? []).length > 0,
    extras:         Array.isArray(row.extras) ? row.extras : [], // 권리관계 서류 체크 — 완성도 부가 5점
    spotFrontage:   row.spot_frontage  ?? '', // 입지 칩 (ad-frame)
    spotParking:    row.spot_parking   ?? '',
    spotVisibility: row.spot_visibility ?? '',
    title:          row.title ?? '', // 상가 제목 (listing-title — 왕복 보존)
    // 시설 현황 (e1p-facility)
    interiorState:  row.interior_state ?? null,
    remainingFacilities: Array.isArray(row.remaining_facilities) ? row.remaining_facilities : [],
    prevBiz:        row.prev_biz ?? '',
    buildingFacilities: Array.isArray(row.building_facilities) ? row.building_facilities : [],
    isDemo:         row.status === 'example', // 예시 수정 시 유지(양도인 동일 정책)
  }
}
