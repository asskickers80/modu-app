// 계정 완전 삭제 — Auth 사용자까지 서버에서 파기 (대표 결정: (가)안).
// 카카오 식별자가 Auth 계정 이메일(kakao_{id}@kakao.modu.internal)에 들어 있어
// 클라이언트에서는 파기가 불가능하다. Auth를 남기면 같은 카카오 계정으로 재가입할 때
// 옛 계정에 다시 붙으므로 "파기"가 아니라 "정지"가 된다.
//
// verify_jwt = true — 필수. 호출자 본인 계정만 삭제한다.
// user_id를 파라미터로 받지 않는다(다른 계정 삭제 경로를 만들지 않기 위해).
// 삭제 대상은 오직 요청 JWT에서 꺼낸 sub.
import { handler, json } from '../_shared/proxy.ts'

const ANON_LABEL = '탈퇴한 사용자'

/**
 * 삭제 순서 — 되돌릴 수 없는 것을 마지막에 둔다.
 *  1) 앱 데이터 비식별화 (실패해도 Auth는 살아 있어 재시도 가능)
 *  2) Auth 사용자 삭제 (여기까지 오면 되돌릴 수 없다)
 * 1에서 실패하면 2를 실행하지 않고 중단한다 — Auth만 지워지고 앱 데이터가 남는
 * "주인 없는 데이터" 상태를 만들지 않기 위해서다.
 */
Deno.serve(handler('delete-account', async (req) => {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'service role not configured' }, 503)

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!jwt) return json({ error: 'unauthorized' }, 401)

  // 본인 확인 — JWT로 조회한 사용자만 대상
  const meRes = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${jwt}` },
  })
  if (!meRes.ok) return json({ error: 'unauthorized' }, 401)
  const me = await meRes.json()
  const userId: string | undefined = me?.id
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const admin = (path: string, init: RequestInit) =>
    fetch(`${url}${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
        ...(init.headers ?? {}),
      },
    })

  const steps: Record<string, string> = {}
  const step = async (name: string, run: () => Promise<Response>) => {
    const r = await run()
    steps[name] = r.ok ? 'ok' : `failed(${r.status})`
    return r.ok
  }

  // 앱의 신원 모델은 기기 ID 기준이라, 계정에 묶인 device_id로도 지워야 한다.
  // (conversations·events·daily_sales는 user_id가 아니라 device_id로 연결된다)
  const deviceId: string | null = me?.user_metadata?.device_id ?? null

  // ── 1) 앱 데이터 비식별화 ──────────────────────────────────
  // profiles 실제 컬럼: nickname·kakao_id·naver_id·profile_data (name/phone/email 컬럼은 없음)
  const okProfile = await step('profiles', () =>
    admin(`/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        nickname: null, kakao_id: null, naver_id: null,
        profile_data: null, deleted_at: new Date().toISOString(),
      }),
    }))
  if (!okProfile) return json({ ok: false, stage: 'profiles', steps }, 500)

  // 매물·상가: 기존 soft delete 규칙 그대로 (계정·기기 양쪽)
  await step('listings_user', () =>
    admin(`/rest/v1/listings?user_id=eq.${userId}`, {
      method: 'PATCH', body: JSON.stringify({ status: 'deleted' }),
    }))
  if (deviceId) {
    await step('listings_device', () =>
      admin(`/rest/v1/listings?device_id=eq.${deviceId}`, {
        method: 'PATCH', body: JSON.stringify({ status: 'deleted' }),
      }))

    // 대화: 내용은 남기고 표시 이름만 바꾼다 (상대방 화면이 비지 않게).
    // conversations는 device_id로 연결된다(sender_id/receiver_id = device_id).
    await step('conv_sender', () =>
      admin(`/rest/v1/conversations?sender_id=eq.${deviceId}`, {
        method: 'PATCH', body: JSON.stringify({ sender_name: ANON_LABEL }),
      }))
    await step('conv_receiver', () =>
      admin(`/rest/v1/conversations?receiver_id=eq.${deviceId}`, {
        method: 'PATCH', body: JSON.stringify({ receiver_name: ANON_LABEL }),
      }))

    // 매출·고정비: 개인 영업 기록 — 계정 귀속만 끊는다(기기 원장은 남되 사람과 무관해진다)
    await step('daily_sales', () =>
      admin(`/rest/v1/daily_sales?device_id=eq.${deviceId}`, {
        method: 'PATCH', body: JSON.stringify({ user_id: null }),
      }))
    await step('fixed_costs', () =>
      admin(`/rest/v1/fixed_costs?device_id=eq.${deviceId}`, {
        method: 'PATCH', body: JSON.stringify({ user_id: null }),
      }))

    // 주간 한 줄·알림: 사람과 연결된 파생물 — 계정 귀속 해제
    await step('weekly_one_liners', () =>
      admin(`/rest/v1/weekly_one_liners?device_id=eq.${deviceId}`, {
        method: 'PATCH', body: JSON.stringify({ user_id: null }),
      }))
  }

  // 이벤트 로그: 식별자만 끊는다 (통계는 남는다)
  await step('events', () =>
    admin(`/rest/v1/events?user_id=eq.${userId}`, {
      method: 'PATCH', body: JSON.stringify({ user_id: null, device_id: 'deleted' }),
    }))

  // ── 2) Auth 사용자 삭제 — 여기부터 되돌릴 수 없다 ──────────
  const authRes = await admin(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
  steps.auth = authRes.ok ? 'ok' : `failed(${authRes.status})`
  if (!authRes.ok) {
    // 앱 데이터는 이미 비식별화됐고 Auth만 남은 상태 — 재호출로 이어서 지울 수 있다.
    return json({ ok: false, stage: 'auth', retryable: true, steps }, 500)
  }

  return json({ ok: true, steps })
}))
