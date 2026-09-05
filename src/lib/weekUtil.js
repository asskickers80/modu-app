/**
 * 주(week) 경계 유틸 (ORDER-weekly-one-liner-v1) — 앱에 없던 공용 함수.
 * 기준: KST 월요일 00:00 시작. 서버(UTC 크론)와 클라이언트가 같은 주를 가리켜야 하므로
 * 계산은 항상 KST로 환산한 뒤 수행한다.
 */
const KST_OFFSET = 9 * 36e5

/** 임의 시각 → KST 기준 '그 주 월요일' YYYY-MM-DD */
export function weekStartOf(d = new Date()) {
  const kst = new Date(new Date(d).getTime() + KST_OFFSET)
  const dow = kst.getUTCDay()            // 0=일 … 6=토 (KST로 옮긴 값이라 UTC getter 사용)
  const backToMonday = (dow + 6) % 7     // 월=0, 일=6
  kst.setUTCDate(kst.getUTCDate() - backToMonday)
  return kst.toISOString().slice(0, 10)
}

/** KST 기준 오늘 YYYY-MM-DD */
export function kstToday(d = new Date()) {
  return new Date(new Date(d).getTime() + KST_OFFSET).toISOString().slice(0, 10)
}

/** YYYY-MM-DD 문자열에 일수 더하기 (문자열 in·out) */
export function addDays(ymd, n) {
  const t = new Date(`${ymd}T00:00:00Z`).getTime() + n * 864e5
  return new Date(t).toISOString().slice(0, 10)
}

/** 두 YYYY-MM-DD 사이 일수 (b - a) */
export function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 864e5)
}

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

/** YYYY-MM-DD → 요일 라벨 (KST 날짜 문자열이므로 UTC 파싱으로 안전) */
export function weekdayOf(ymd) {
  return WEEKDAY_LABELS[new Date(`${ymd}T00:00:00Z`).getUTCDay()]
}
