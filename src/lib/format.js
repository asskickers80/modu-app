/** '3,000' | 3000 → "3,000만" (0이나 빈 값이면 null) — 매물 카드 금액 표기 공용 */
export function manwon(v) {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10)
  return isNaN(n) || !n ? null : `${n.toLocaleString()}만`
}
