// 동네 찜 주 1회 묶음 알림 — 순수 계산 (ORDER 2026-09-10 파트 A3 similar). 크론(send-notifications)이 호출.
// 서버 런타임은 config/watch.ts(TS)를 직접 import하지 않으므로 요일 값을 여기 두고, 테스트가 config 와 같은지 검증한다.
export const SIMILAR_WEEKDAY = 1 // = config/watch.ts WATCH.SIMILAR_WEEKDAY (월요일). 발송 시각은 크론 시각(05:30 KST)
const KST = 9 * 36e5

export function isDigestDay(now = new Date()) {
  return new Date(now.getTime() + KST).getUTCDay() === SIMILAR_WEEKDAY
}
export function weekKey(now = new Date()) {
  return new Date(now.getTime() + KST).toISOString().slice(0, 10)
}
const dongOf = (address) => String(address ?? '').split(/\s+/).find(t => /(동|읍|면|리|가)\d*$/.test(t)) ?? null

/**
 * @param areaWatches [{ id, device_id, user_id, target_id, muted_at }]
 * @param newListings 최근 7일 게시 [{ id, bjd_code, address }]
 * @returns notifications 행 배열 (n=0 인 동네는 발송 없음, 건별 푸시 없음)
 */
export function buildSimilarDigest({ areaWatches = [], newListings = [], existingKeys = new Set(), now = new Date() }) {
  const out = []
  const wk = weekKey(now)
  for (const w of areaWatches) {
    if (w.muted_at || !w.target_id) continue
    const matches = newListings.filter(l => l.bjd_code === w.target_id || String(l.address ?? '').includes(w.target_id))
    if (!matches.length) continue
    const key = `watch:similar:${w.target_id}:${w.device_id}:${wk}`
    if (existingKeys.has(key)) continue
    const dong = /^\d+$/.test(w.target_id) ? dongOf(matches[0].address) : w.target_id
    out.push({
      device_id: w.device_id, user_id: w.user_id ?? null, type: 'watch_similar',
      title: `찜한 동네에 새 매물 ${matches.length}건`, body: null,
      payload: { kind: 'similar', n: matches.length, link: dong ? `/explore?dong=${encodeURIComponent(dong)}` : '/explore', watchlist_id: w.id, dedupe_key: key },
      sent_at: now.toISOString(),
    })
  }
  return out
}
