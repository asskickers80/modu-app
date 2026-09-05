/**
 * 알림 센터 (ORDER-close-flow-peer-stats-v1 항목 3)
 * 유닛: 생성 룰 3종(재등록·임대차 만료·동향) + 중복 차단 + 표본 게이트
 * UI: 벨 미읽음 점 · 목록 · 읽음 처리 · 딥링크 (아래 UI 절)
 */
import { test, expect } from './fixtures.js'
import { mockGemini, mockMarketData } from './helpers.js'
import { computeNotifications } from '../api/_notificationRules.js'

const DAY = 864e5
const NOW = new Date('2026-09-05T00:00:00Z')
const profileOf = (roleData) => [{ user_id: 'u1', roleData }]

test.describe('알림 생성 룰 유닛', () => {
  test('재등록: repost_remind_at 도달 → 생성(축 어휘·딥링크), 미도달 → 침묵', () => {
    const due = new Date(NOW.getTime() - DAY).toISOString()
    const out = computeNotifications({
      profiles: profileOf({ seller: { repost_remind_at: due } }), now: NOW,
    })
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('repost_remind')
    expect(out[0].title).toBe('다시 올릴 때가 됐어요')
    expect(out[0].body).toContain('매물')
    expect(out[0].payload.link).toBe('/e1/1')

    const future = new Date(NOW.getTime() + DAY).toISOString()
    const none = computeNotifications({
      profiles: profileOf({ landlord: { repost_remind_at: future } }), now: NOW,
    })
    expect(none).toHaveLength(0)
  })

  test('재등록(소유주): 상가 어휘 + E1p 딥링크', () => {
    const due = new Date(NOW.getTime() - DAY).toISOString()
    const out = computeNotifications({
      profiles: profileOf({ landlord: { repost_remind_at: due } }), now: NOW,
    })
    expect(out[0].body).toContain('상가')
    expect(out[0].payload.link).toBe('/e1p/1')
  })

  test('임대차 만료: D-180/D-90/D-30 구간별 1건, 지난 계약은 침묵', () => {
    // 2026-09-05 기준 2027-02 만료 = 149일 → d180 구간
    const d180 = computeNotifications({
      profiles: profileOf({ operating: { lease_end_date: '2027-02' } }), now: NOW,
    })
    expect(d180).toHaveLength(1)
    expect(d180[0].type).toBe('lease_end')
    expect(d180[0].payload.dedupe_key).toContain('d180')
    expect(d180[0].payload.link).toBe('/a7/operating')

    // 2026-11 만료 = 57일 → d90
    const d90 = computeNotifications({
      profiles: profileOf({ operating: { lease_end_date: '2026-11' } }), now: NOW,
    })
    expect(d90[0].payload.dedupe_key).toContain('d90')

    // 2026-10 만료 = 26일 → d30 (한 달 문안)
    const d30 = computeNotifications({
      profiles: profileOf({ seller: { lease_end_date: '2026-10' } }), now: NOW,
    })
    expect(d30[0].payload.dedupe_key).toContain('d30')
    expect(d30[0].body).toContain('한 달')

    // 이미 지난 만료 → 침묵
    const past = computeNotifications({
      profiles: profileOf({ operating: { lease_end_date: '2026-08' } }), now: NOW,
    })
    expect(past).toHaveLength(0)

    // 아직 6개월 넘게 남음 → 침묵
    const far = computeNotifications({
      profiles: profileOf({ operating: { lease_end_date: '2027-06' } }), now: NOW,
    })
    expect(far).toHaveLength(0)
  })

  test('중복 차단: 같은 dedupe_key가 이미 발송됐으면 생성하지 않는다', () => {
    const due = new Date(NOW.getTime() - DAY).toISOString()
    const first = computeNotifications({
      profiles: profileOf({ seller: { repost_remind_at: due } }), now: NOW,
    })
    const again = computeNotifications({
      profiles: profileOf({ seller: { repost_remind_at: due } }),
      existingKeys: new Set([first[0].payload.dedupe_key]), now: NOW,
    })
    expect(again).toHaveLength(0)
  })

  test('동향·시세: 표본 미충족이면 신청자라도 생성 0 (가짜 알림 금지)', () => {
    const rd = { seller: { alert_peer_trend: true, alert_my_value: true } }
    const blocked = computeNotifications({
      profiles: profileOf(rd), sampleOk: { peer: false }, now: NOW,
    })
    expect(blocked).toHaveLength(0)

    const ok = computeNotifications({
      profiles: profileOf(rd), sampleOk: { peer: true }, now: NOW,
    })
    expect(ok).toHaveLength(2)
    expect(ok.map(n => n.type).sort()).toEqual(['my_value', 'peer_trend'])
    expect(ok.find(n => n.type === 'peer_trend').title).toContain('매물 동향')
    // 소유주 어휘 = 시세
    const lord = computeNotifications({
      profiles: profileOf({ landlord: { alert_peer_trend: true } }), sampleOk: { peer: true }, now: NOW,
    })
    expect(lord[0].title).toContain('시세')
  })

  test('미신청·빈 프로필은 어떤 알림도 만들지 않는다', () => {
    expect(computeNotifications({ profiles: profileOf({ seller: { region: '서울' } }), sampleOk: { peer: true }, now: NOW })).toHaveLength(0)
    expect(computeNotifications({ profiles: [], now: NOW })).toHaveLength(0)
  })
})

// ── UI: 벨 점 · 목록 · 읽음 · 딥링크 ────────────────────────
const SUPABASE = 'https://edcqvmgqskeoegpqxlzy.supabase.co/rest/v1'
const NOTIF = (over = {}) => ({
  id: 'n1', type: 'repost_remind', title: '다시 올릴 때가 됐어요',
  body: '쉬어가던 매물, 다시 올려볼까요? 준비되면 1분이면 돼요.',
  payload: { link: '/e1/1', axis: 'seller' }, read_at: null,
  sent_at: '2026-09-04T00:00:00Z', created_at: '2026-09-04T00:00:00Z', ...over,
})

async function setupUi(page, { notifications = [] } = {}) {
  await mockGemini(page)
  await mockMarketData(page)
  await page.route(`${SUPABASE}/**`, r => r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    : r.fulfill({ status: 204, body: '' }))
  const patches = []
  await page.route(`${SUPABASE}/notifications*`, r => {
    if (r.request().method() === 'PATCH') {
      patches.push(JSON.parse(r.request().postData() || '{}'))
      return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(notifications) })
  })
  await page.addInitScript(() => {
    localStorage.setItem('modu_device_id', 'nc-dev')
    localStorage.setItem('modu_user_profile', JSON.stringify({ category: 'seller', name: '김알림' }))
    localStorage.setItem('modu_profiles', JSON.stringify([{ id: 'p_s', category: 'seller', name: '김알림', active: true }]))
  })
  return { patches }
}

test('벨 점: 미읽음 알림 있으면 UnreadDot, 전부 읽음이면 없음', async ({ page }) => {
  await setupUi(page, { notifications: [NOTIF()] })
  await page.goto('/a7/seller')
  await expect(page.getByTestId('notify-dot')).toBeVisible()
})

test('벨 점: 알림이 전부 읽음이면 점 없음 (가짜 점 금지)', async ({ page }) => {
  await setupUi(page, { notifications: [] }) // hasUnread는 read_at null 필터 조회 — 빈 결과
  await page.goto('/a7/seller')
  await expect(page.getByTestId('notify-bell')).toBeVisible()
  await expect(page.getByTestId('notify-dot')).toHaveCount(0)
})

test('목록: 미읽음 강조 → 탭 시 읽음 PATCH + 딥링크(payload.link) 이동', async ({ page }) => {
  const { patches } = await setupUi(page, { notifications: [NOTIF()] })
  await page.goto('/notifications')

  const item = page.getByTestId('notification-item')
  await expect(item).toContainText('다시 올릴 때가 됐어요')
  await expect(page.getByTestId('notification-unread')).toBeVisible()

  await item.click()
  await expect(page).toHaveURL('/e1/1') // 재등록 딥링크 — E1 등록 흐름
  expect(patches[0].read_at).toBeTruthy()
})

test('목록: 읽은 알림은 점 없이 회색 톤', async ({ page }) => {
  await setupUi(page, { notifications: [NOTIF({ read_at: '2026-09-04T01:00:00Z' })] })
  await page.goto('/notifications')
  await expect(page.getByTestId('notification-item')).toBeVisible()
  await expect(page.getByTestId('notification-unread')).toHaveCount(0)
})
