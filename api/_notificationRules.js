// 알림 생성 룰 — 순수 함수 (ORDER-close-flow-peer-stats-v1 항목 3).
// 크론(send-notifications)이 소비하고, 테스트가 직접 import한다 — supabase·전역 무의존.
//
// 룰 3종 ("모두 발송" 전용 — 사용자 간 활동 제외):
// 1) repost_remind : roleData.{seller|landlord}.repost_remind_at 도달 → "다시 올릴 때가 됐어요"
// 2) lease_end     : roleData.{축}.lease_end_date(YYYY-MM) D-180/D-90/D-30 구간 진입 → 만료 안내
// 3) peer_trend / my_value : 신청자에 한해, 동향 표본 충족 시에만 (미충족 = 생성 0 — 가짜 알림 금지)
// 중복 방지: payload.dedupe_key — 이미 존재하는 키는 생성하지 않는다.

const DAY = 864e5
const AXES = ['seller', 'landlord', 'operating']
const HOME = { seller: '/a7/seller', landlord: '/a7/landlord', operating: '/a7/operating' }

// 'YYYY-MM' → 그 달 1일 (만료가 몇 일인지 모르므로 보수적으로 월초 기준 — 이르게 알리는 쪽)
const monthStart = (ym) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym ?? ''))
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, 1)) : null
}

const LEASE_MILESTONES = [
  { id: 'd30', maxDays: 30, body: '만료까지 한 달이에요. 재계약 이야기를 시작해 보세요.' },
  { id: 'd90', maxDays: 90, body: '만료까지 3개월이에요. 조건을 미리 알아보면 유리해요.' },
  { id: 'd180', maxDays: 180, body: '만료까지 6개월이에요. 미리 준비하면 조건이 달라져요.' },
]

/**
 * @param profiles [{ user_id, roleData }] — profiles.profile_data.roleData 추출본
 * @param existingKeys Set<string> — 이미 발송된 dedupe_key 집합
 * @param sampleOk { peer: boolean } — 동향 표본 충족 여부 (항목 4 표본 기준 공유: 첫 문의 매물 ≥5)
 * @param now Date
 * @returns 생성할 알림 행 배열 (user_id, type, title, body, payload, sent_at)
 */
export function computeNotifications({ profiles = [], existingKeys = new Set(), sampleOk = { peer: false }, now = new Date() }) {
  const out = []
  const push = (userId, type, title, body, payload) => {
    if (existingKeys.has(payload.dedupe_key)) return
    out.push({ user_id: userId, type, title, body, payload, sent_at: now.toISOString() })
  }

  for (const { user_id: uid, roleData } of profiles) {
    if (!uid || !roleData) continue
    for (const axis of AXES) {
      const rd = roleData[axis]
      if (!rd) continue
      const noun = axis === 'landlord' ? '상가' : '매물'

      // 1) 재등록 알림 (매물·상가 축만 — 마감 흐름 "잠깐 쉴게요"에서 신청)
      if (axis !== 'operating' && rd.repost_remind_at && new Date(rd.repost_remind_at) <= now) {
        push(uid, 'repost_remind', '다시 올릴 때가 됐어요',
          `쉬어가던 ${noun}, 다시 올려볼까요? 준비되면 1분이면 돼요.`,
          {
            dedupe_key: `repost:${uid}:${axis}:${rd.repost_remind_at}`,
            link: axis === 'seller' ? '/e1/1' : '/e1p/1', axis,
          })
      }

      // 2) 임대차 만료 안내 — 구간 진입 시 해당 구간 1회 (지났으면 침묵)
      const leaseEnd = monthStart(rd.lease_end_date)
      if (leaseEnd) {
        const daysLeft = Math.floor((leaseEnd.getTime() - now.getTime()) / DAY)
        const ms = daysLeft >= 0 ? LEASE_MILESTONES.find(m => daysLeft <= m.maxDays) : null
        if (ms) {
          push(uid, 'lease_end', '임대차 만료가 다가와요', ms.body, {
            dedupe_key: `lease:${uid}:${axis}:${rd.lease_end_date}:${ms.id}`,
            link: HOME[axis], axis,
          })
        }
      }

      // 3) 동향·시세 — 신청자 + 표본 충족일 때만, 월 1회
      if (sampleOk.peer && axis !== 'operating') {
        const ym = now.toISOString().slice(0, 7)
        if (rd.alert_peer_trend) {
          push(uid, 'peer_trend',
            axis === 'seller' ? '비슷한 매물 동향이 갱신됐어요' : '이 상권 시세가 갱신됐어요',
            '홈에서 최근 동향을 확인해 보세요.',
            { dedupe_key: `peer:${uid}:${axis}:${ym}`, link: HOME[axis], axis })
        }
        if (rd.alert_my_value) {
          push(uid, 'my_value',
            axis === 'seller' ? '내 매물 동향에 변화가 있어요' : '상가 시세에 변화가 있어요',
            '홈에서 최근 변화를 확인해 보세요.',
            { dedupe_key: `value:${uid}:${axis}:${ym}`, link: HOME[axis], axis })
        }
      }
    }
  }
  return out
}
