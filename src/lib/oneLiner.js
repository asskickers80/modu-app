/**
 * "이번 주 한 줄" 조회 계층 (ORDER-weekly-one-liner-v1)
 * 홈은 크론이 저장한 값만 읽는다(클라이언트 재계산 없음).
 * 실패(테이블 미비 포함)는 null — 카드가 안 보이고 기존 "오늘의 한 마디"가 그대로 표시된다.
 */
import { supabase, getDeviceId } from './supabase'
import { weekStartOf } from './weekUtil'

/** 이번 주 카드 1건 — 이미 X를 누른 주면 null */
export async function fetchWeeklyOneLiner(role) {
  try {
    const { data, error } = await supabase
      .from('weekly_one_liners')
      .select('id, signal_key, headline, evidence, cta_key, cta_payload, dismissed_at')
      .eq('device_id', getDeviceId())
      .eq('role', role)
      .eq('week_start', weekStartOf())
      .is('dismissed_at', null)
      .maybeSingle()
    // 빈 결과가 배열로 오는 경우(0행)도 "신호 없음"으로 취급 — 필드 없는 카드가 그려지면 안 된다
    if (error || !data || Array.isArray(data)) return null
    return data
  } catch (_) { return null }
}

/** X — 그 주만 숨김. 실패는 침묵(다음 방문에 다시 보일 뿐) */
export async function dismissOneLiner(id) {
  try {
    await supabase.from('weekly_one_liners')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id)
  } catch (_) {}
}
