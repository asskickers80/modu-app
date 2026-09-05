/**
 * 문의 동향 순수 룰 (ORDER-close-flow-peer-stats-v1 항목 4) — supabase·전역 무의존.
 * 카드 = 숫자 하나 + 근거 한 줄: "비슷한 매물은 첫 문의까지 평균 N일 / {범위} M건 기준".
 *
 * 비교군 확장 — 첫 문의 받은 매물 ≥ SAMPLE_MIN 인 가장 좁은 단계:
 *  양도인: 동×업종소분류×평수±30% → 구×업종 → 시도×업종 → 전국×업종 → 전국×대분류
 *  소유주: 동×deal_type×면적±30% → 구×deal_type → 시도×deal_type → 전국×deal_type
 * 전 단계 미달 → null (카드 미표시 — 대체 카드 금지, 표본이 생기면 자동 등장).
 */
import { sidoFromAddress } from './regions'

export const SAMPLE_MIN = 5
export const PEER_WINDOW_DAYS = 180
export const PROMOTE_AFTER_DAYS = 21
const DAY = 864e5

// 주소 문자열 → {sido, gu, dong}. 구조화 컬럼이 없어 어절 파싱(기존 ExplorePage 패턴).
export function parseRegion(address) {
  const parts = String(address ?? '').split(/\s+/)
  return {
    sido: sidoFromAddress(address) ?? null,
    gu: parts.find(p => /[구군시]$/.test(p) && p !== parts[0]) ?? null,
    dong: parts.find(p => /(동|읍|면|가)$/.test(p)) ?? null,
  }
}

const areaNum = (a) => {
  const n = parseFloat(String(a ?? '').replace(/[^0-9.]/g, ''))
  return isNaN(n) ? null : n
}
const areaNear = (mine, theirs) => {
  const m = areaNum(mine), t = areaNum(theirs)
  if (m == null || t == null) return false
  return t >= m * 0.7 && t <= m * 1.3
}

/** 축별 확장 단계 — [필터, 범위 라벨] */
function stagesFor(my, axis) {
  const r = parseRegion(my.address)
  if (axis === 'landlord') {
    const deal = (p) => p.deal_type === my.deal_type
    return [
      [p => deal(p) && r.dong && parseRegion(p.address).dong === r.dong && areaNear(my.area, p.area), `${r.dong ?? ''} 비슷한 상가`],
      [p => deal(p) && r.gu && parseRegion(p.address).gu === r.gu, `${r.gu ?? ''} 같은 거래 상가`],
      [p => deal(p) && r.sido && parseRegion(p.address).sido === r.sido, `${r.sido ?? ''} 같은 거래 상가`],
      [p => deal(p), '전국 같은 거래 상가'],
    ]
  }
  const sub = (p) => my.category_sub && p.category_sub === my.category_sub
  const main = (p) => my.category_main && p.category_main === my.category_main
  return [
    [p => sub(p) && r.dong && parseRegion(p.address).dong === r.dong && areaNear(my.area, p.area), `${r.dong ?? ''} 같은 업종`],
    [p => sub(p) && r.gu && parseRegion(p.address).gu === r.gu, `${r.gu ?? ''} 같은 업종`],
    [p => sub(p) && r.sido && parseRegion(p.address).sido === r.sido, `${r.sido ?? ''} 같은 업종`],
    [p => sub(p), '전국 같은 업종'],
    [p => main(p), `전국 ${my.category_main ?? ''} 업종`],
  ]
}

/**
 * @param my 내 매물 행 (published_at 필수)
 * @param listings 최근 180일 후보 행들 (본인·example 제외는 여기서도 방어)
 * @param firstInquiryAt Map<listingId, ISO> — 매물별 첫 문의 시각
 * @returns { stage, stageLabel, M, avgDays, myDays, myInquired, peers } | null
 */
export function computePeerStats({ my, listings, firstInquiryAt, axis = 'seller', now = new Date() }) {
  if (!my?.published_at) return null
  const since = now.getTime() - PEER_WINDOW_DAYS * DAY
  const pool = (listings ?? []).filter(p =>
    p.id !== my.id
    && p.status !== 'example'
    && p.published_at && new Date(p.published_at).getTime() >= since
    && firstInquiryAt.has(p.id) // "첫 문의를 받은" 매물만 표본
  )
  const stages = stagesFor(my, axis)
  for (let i = 0; i < stages.length; i++) {
    const [match, label] = stages[i]
    const peers = pool.filter(match)
    if (peers.length < SAMPLE_MIN) continue
    const days = peers.map(p => Math.max(0,
      (new Date(firstInquiryAt.get(p.id)).getTime() - new Date(p.published_at).getTime()) / DAY))
    const avgDays = Math.max(1, Math.round(days.reduce((s, d) => s + d, 0) / days.length))
    return {
      stage: i + 1,
      stageLabel: label.trim(),
      M: peers.length,
      avgDays,
      myDays: Math.max(0, Math.floor((now.getTime() - new Date(my.published_at).getTime()) / DAY)),
      myInquired: firstInquiryAt.has(my.id),
      peers,
    }
  }
  return null
}

/** 승격 판정 — 등록 21일 넘고 문의 0이면 카드가 객체 카드 바로 아래로 + 시트 펼침 */
export function shouldPromote(stats) {
  return !!stats && !stats.myInquired && stats.myDays >= PROMOTE_AFTER_DAYS
}

/**
 * 차이 항목 — 비교군 충족 ≥60% & 내 매물 미충족, 차이 큰 순 최대 3.
 * ※ '특이사항'·'잔여 계약기간'은 listings에 해당 컬럼이 없어 제외(가짜 판정 금지).
 * @param soldBands sold 설문 final_price_band 배열 — <SAMPLE_MIN 이면 가격 항목 스킵
 */
export function computeGaps({ my, peers, soldBands = [], axis = 'seller' }) {
  const M = peers.length
  const ratio = (pred) => peers.filter(pred).length / M
  const photoCount = (p) => (p.image_urls ?? []).length
  const gaps = []

  const photoRatio = ratio(p => photoCount(p) >= 3)
  if (photoRatio >= 0.6 && photoCount(my) < 3) {
    gaps.push({
      id: 'photos', score: photoRatio,
      label: '사진 수',
      detail: `문의 받은 ${M}곳 중 ${Math.round(photoRatio * 100)}%는 사진이 3장 이상이에요 — 내 ${axis === 'landlord' ? '상가' : '매물'}은 ${photoCount(my)}장`,
    })
  }

  if (axis === 'seller') {
    const salesRatio = ratio(p => !!p.monthly_sales)
    if (salesRatio >= 0.6 && !my.monthly_sales) {
      gaps.push({
        id: 'sales', score: salesRatio,
        label: '월매출 입력',
        detail: `문의 받은 ${M}곳 중 ${Math.round(salesRatio * 100)}%는 월매출을 공개했어요 — 내 매물은 미입력`,
      })
    }
    // 가격 위치: sold 표본의 조정 비율 (권리금 어휘)
    if (soldBands.length >= SAMPLE_MIN) {
      const adjusted = soldBands.filter(b => b && b !== 'same').length / soldBands.length
      if (adjusted >= 0.6) {
        gaps.push({
          id: 'price', score: adjusted,
          label: '권리금 위치',
          detail: `최근 팔린 ${soldBands.length}곳 중 ${Math.round(adjusted * 100)}%는 권리금을 조정하고 거래됐어요`,
        })
      }
    }
  }

  return gaps.sort((a, b) => b.score - a.score).slice(0, 3)
}

/** 접힘 "이 매물은 이렇게 했어요" — 첫 문의가 가장 빨랐던 비교군 1건 익명 요약 */
export function exampleSummary({ peers, firstInquiryAt, axis = 'seller' }) {
  if (!peers?.length) return null
  const best = [...peers].sort((a, b) =>
    (new Date(firstInquiryAt.get(a.id)) - new Date(a.published_at))
    - (new Date(firstInquiryAt.get(b.id)) - new Date(b.published_at)))[0]
  const days = Math.max(1, Math.round((new Date(firstInquiryAt.get(best.id)) - new Date(best.published_at)) / DAY))
  const bits = [`사진 ${(best.image_urls ?? []).length}장`]
  if (axis === 'seller' && best.monthly_sales) bits.push('월매출 공개')
  return `${bits.join(' · ')} — 등록 ${days}일 만에 첫 문의를 받았어요`
}
