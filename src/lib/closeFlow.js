/**
 * 매물 마감 흐름 저장 계층 (ORDER-close-flow-peer-stats-v1 항목 2)
 * 신원 모델 그대로 device_id 기준 + user_id 스탬프(로그인 시).
 * 테이블 미생성(SQL 실행 전)이어도 실패는 정직 반환 — 상태 전환(기존 기능)과 분리돼
 * 마감 흐름의 설문·프리미엄만 조용히 비활성 (스키마 의존 배포 규칙).
 */
import { supabase, getDeviceId } from './supabase'

async function currentUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  } catch (_) { return null }
}

/** 1단계 선택 즉시 기록 — 이후 단계는 updateCloseSurvey로 갱신 (스킵해도 사유는 남는다) */
export async function saveCloseSurvey({ listingId, closeReason }) {
  try {
    const { data, error } = await supabase.from('listing_close_surveys').insert({
      listing_id: listingId,
      device_id: getDeviceId(),
      user_id: await currentUserId(),
      close_reason: closeReason,
    }).select('id').single()
    if (error) return { ok: false, id: null }
    return { ok: true, id: data?.id ?? null }
  } catch (_) { return { ok: false, id: null } }
}

export async function updateCloseSurvey(surveyId, fields) {
  if (!surveyId) return { ok: false }
  try {
    const { error } = await supabase.from('listing_close_surveys')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', surveyId)
    return { ok: !error }
  } catch (_) { return { ok: false } }
}

/**
 * 프리미엄 부여 — 연장은 새 행 insert(이력 불변). 기존 유효분이 있으면 그 만료일에 +days,
 * 없으면 오늘부터 +days. 실효(기능 해제)는 상품 구성 후 연결 — 지금은 부여·표시만.
 */
export async function grantPremium({ days = 30, reason = 'sold_survey' } = {}) {
  try {
    const current = await getPremiumUntil()
    const base = current && current > new Date() ? current : new Date()
    const expiresAt = new Date(base.getTime() + days * 864e5)
    const { error } = await supabase.from('premium_grants').insert({
      device_id: getDeviceId(),
      user_id: await currentUserId(),
      days,
      reason,
      expires_at: expiresAt.toISOString(),
    })
    if (error) return { ok: false, expiresAt: null }
    return { ok: true, expiresAt }
  } catch (_) { return { ok: false, expiresAt: null } }
}

/** 현재 유효한 프리미엄 만료일 — 없으면 null (마이 화면 표시·연장 기준) */
export async function getPremiumUntil() {
  try {
    const { data, error } = await supabase.from('premium_grants')
      .select('expires_at')
      .eq('device_id', getDeviceId())
      .order('expires_at', { ascending: false })
      .limit(1)
    if (error || !data?.length) return null
    const d = new Date(data[0].expires_at)
    return d > new Date() ? d : null
  } catch (_) { return null }
}

// ── 재등록 시기 계산 — 순수 룰은 closeFlowRules.js (테스트 직접 import 대상) ──
export { HOLIDAYS, nextHolidayRepost, computeRepostRemindAt } from './closeFlowRules'
