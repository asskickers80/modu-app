/**
 * 매물 날짜 표기 — 판매자 우선 원칙 (대표 결정 2026-09-15, docs/향후개발아이디어_백로그.md 방향 원칙)
 *
 * 타 사용자(창업준비·방문자·기업회원) 화면에는 **등록일·등록 경과일을 쓰지 않는다.**
 * 오래 안 팔린 기간이 드러나면 파는 사람에게 불리하다. 대신 "최근 확인일"만 쓴다 — 살아 있는 매물이라는 유리한 신호다.
 * 등록일은 본인(양도인·소유주) 관리 화면에서만 쓴다.
 */
const pad = n => String(n).padStart(2, '0')

/** 타 사용자 화면 — 확인일이 실제로 기록됐을 때만 문장이 생긴다(없으면 null, 빈 줄 금지) */
export function checkedLabel(listing) {
  const v = listing?.last_checked_at
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getMonth() + 1}월 ${d.getDate()}일 확인된 매물`
}

/** 본인 관리 화면 전용 — 등록일 */
export function registeredLabel(listing) {
  const v = listing?.created_at
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} 등록`
}
