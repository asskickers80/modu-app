// quiet 공개 단계 배치 — 순수 판정 (ORDER 2026-09-12 파트 B8). 크론(send-notifications)이 호출.
// 자동 공개 없음: 기한이 지나면 status 를 보류(hidden)로 내리고 알림 1줄. 남은 기간 7일·1일에 알림 1줄.
export const REMIND_DAYS = [7, 1] // = config/quiet.ts QUIET.REMIND_DAYS
export const QUIET_BATCH_COPY = {
  remind: '조용히 보기 기간이 {d}일 남았어요 · 공개할지 정해 주세요',
  expired: '조용히 보기 기간이 끝나 매물을 보류했어요 · 공개하거나 다시 올릴 수 있어요',
}
const daysLeft = (iso, now) => Math.ceil((new Date(iso) - now) / 864e5)

/** @returns { expire:[listing], remind:[{ listing, d }] } */
export function quietDue(listings = [], now = new Date()) {
  const expire = [], remind = []
  for (const l of listings) {
    if (l.visibility !== 'quiet' || !l.quiet_deadline_at || !['published', 'negotiating'].includes(l.status)) continue
    const d = daysLeft(l.quiet_deadline_at, now)
    if (d <= 0) expire.push(l)
    else if (REMIND_DAYS.includes(d)) remind.push({ listing: l, d })
  }
  return { expire, remind }
}
