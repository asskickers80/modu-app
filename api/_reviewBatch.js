// 후기 이의신청 자동 복구 — 순수 판정 (ORDER 2026-09-12 파트 A6). 크론(send-notifications)이 호출.
// 미판정 이의신청이 블라인드 기간(blinded_until)을 넘기면 keep(자동 복구). 삭제된 후기는 대상 아님.
export function dueRestores(reviews = [], now = new Date()) {
  return reviews.filter(r => r.blinded_until && new Date(r.blinded_until) <= now && !r.deleted_at)
}
export const RESTORE_COPY = {
  author: '이의신청이 검토되어 후기가 다시 보여요',
  vendor: '이의신청 기간이 지나 후기가 다시 보여요',
}
