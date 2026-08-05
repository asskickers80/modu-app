/**
 * 매물 제목 — 단일 소스 (ORDER-listing-title-v1)
 *
 * [원칙 — 대표 확정] 제목은 소유주의 것. 자동 생성은 초안이며 최종 결정권은 소유주에게 있다.
 * 시스템 자리 채움 문구("이름 미정 상가" 등) 노출 금지.
 *
 * 규칙:
 * - 저장된 title이 있으면 무조건 그것 (전 표시 지점 공통).
 * - 없으면(옛 매물) 초안 규칙으로 즉석 조합 — 자리 채움 문구가 아니라 실입력 기반.
 * - 양도인 초안은 상호 공개 토글을 존중한다: 비공개면 상호·프랜차이즈 브랜드를 절대 포함하지
 *   않는다 (기존 displayShopName은 비공개+프랜차이즈에서 브랜드명을 노출하던 구멍이 있었음).
 */

// 주소에서 지역 토큰 추출 — "경기 수원시 팔달구 인계로138번길 8" → { gu: '팔달구', dong: '인계로138번길' 아님 }
// 동(법정동/행정동)이 있으면 동, 없으면 도로명 앞의 구·군을 쓴다.
function regionTokens(address) {
  const tokens = String(address ?? '').trim().split(/\s+/)
  // 구·군 우선, 없으면 시(첫 토큰 광역명 제외 — "강원특별자치도 원주시"의 원주시 채택)
  const gu = tokens.find(t => /[구군]$/.test(t) && t.length >= 2)
    ?? tokens.slice(1).find(t => /시$/.test(t) && t.length >= 2) ?? null
  const dong = tokens.find(t => /(동|읍|면|리|가)\d*$/.test(t) && !/[로길]/.test(t)) ?? null
  return { gu, dong }
}
const floorLabel = f => {
  const s = String(f ?? '').trim()
  if (!s) return null
  return /층|B\d|지하/i.test(s) ? s : `${s}층`
}

/** 임대인 초안 — "팔달구 인계동 1층 54㎡ 상가" (있는 정보만) */
export function buildLandlordTitleDraft({ address, floor, area }) {
  const { gu, dong } = regionTokens(address)
  const parts = [gu, dong, floorLabel(floor), area ? `${area}㎡` : null, '상가'].filter(Boolean)
  return parts.length > 1 ? parts.join(' ') : ''
}

/** 양도인 초안 — 상호 공개 존중. 비공개면 상호·브랜드 미포함("인계동 1층 카페 매물") */
export function buildSellerTitleDraft({ address, floor, shopName, shopNamePublic, categorySub, categoryMain, bizType }) {
  if (shopNamePublic !== false && shopName) return shopName
  const { gu, dong } = regionTokens(address)
  const biz = categorySub ?? categoryMain ?? bizType ?? null
  const parts = [dong ?? gu, floorLabel(floor), biz, '매물'].filter(Boolean)
  return parts.length > 1 ? parts.join(' ') : ''
}

/**
 * 표시용 제목 — listings row(snake_case) 기준. 전 표시 지점(E2·E2L·홈·탐색·인박스)이
 * 이 함수 하나만 참조한다. 자리 채움 문구 없음: 재료가 전혀 없으면 주소, 그마저 없으면 빈 문자열.
 */
export function displayTitle(row) {
  if (!row) return ''
  const saved = String(row.title ?? '').trim()
  if (saved) return saved
  const draft = row.listing_type === 'landlord'
    ? buildLandlordTitleDraft({ address: row.address, floor: row.floor, area: row.area })
    : buildSellerTitleDraft({
        address: row.address, floor: row.floor,
        shopName: row.shop_name, shopNamePublic: row.shop_name_public,
        categorySub: row.category_sub, categoryMain: row.category_main, bizType: row.biz_type,
      })
  return draft || String(row.address ?? '').trim()
}
