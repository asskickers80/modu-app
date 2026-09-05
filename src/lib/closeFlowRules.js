/**
 * 마감 흐름 순수 룰 (ORDER-close-flow-peer-stats-v1) — supabase 무의존.
 * 테스트(Node)에서 직접 import하므로 이 파일은 브라우저 전역·환경변수를 쓰지 않는다.
 */

// 명절 당일 상수(공휴일 테이블) — "명절 지나고" = 다음 설·추석 당일 +3일
export const HOLIDAYS = [
  { name: '설날', date: '2026-02-17' }, { name: '추석', date: '2026-09-25' },
  { name: '설날', date: '2027-02-07' }, { name: '추석', date: '2027-09-15' },
  { name: '설날', date: '2028-01-27' }, { name: '추석', date: '2028-10-03' },
]

export function nextHolidayRepost(now = new Date()) {
  const upcoming = HOLIDAYS.find(h => new Date(h.date) > now)
  if (!upcoming) return null
  return { name: upcoming.name, date: new Date(new Date(upcoming.date).getTime() + 3 * 864e5) }
}

/** choice: 'month'(+30일) | 'holiday'(다음 명절 +3일) | Date(내가 정한 날짜) → ISO 문자열 */
export function computeRepostRemindAt(choice, now = new Date()) {
  if (choice === 'month') return new Date(now.getTime() + 30 * 864e5).toISOString()
  if (choice === 'holiday') return nextHolidayRepost(now)?.date.toISOString() ?? null
  if (choice instanceof Date && !isNaN(choice)) return choice.toISOString()
  return null
}
