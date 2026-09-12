/**
 * 문의 원장 inquiry_ledger (ORDER 2026-09-09 파트 A5·B) — 기록만, 강제 없음.
 * 신원 모델: device_id 기준 + user_id 스탬프. 테이블 부재(SQL 실행 전)·실패는 정직한 실패 반환 — 흐름을 막지 않는다.
 */
import { supabase, getDeviceId } from './supabase'

async function currentUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  } catch (_) { return null }
}

/**
 * 원장 1행. source: sales_card|vendor_profile|demand_signal|other, channel: app|phone
 * @returns { ok, id }
 */
export async function recordInquiry({ vendorId = null, conversationId = null, source = 'other', signal = null, category = null, channel, status = 'sent', region = null, stage = null }) {
  try {
    const row = {
      device_id: getDeviceId(),
      user_id: await currentUserId(),
      vendor_id: vendorId,
      conversation_id: conversationId,
      source, signal, category, channel, status,
      ...(stage ? { stage } : {}), // quiet 단계 문의 (2026-09-12 파트 B7) — 컬럼 없으면 region 과 함께 재시도
    }
    // region(구 단위)은 시세 카드 집계 재료(파트 C4) — 컬럼이 아직 없으면 region 없이 다시 저장(스키마 의존 배포)
    let res = await supabase.from('inquiry_ledger').insert(region ? { ...row, region } : row).select('id').single()
    if (res.error && (region || stage)) { const { stage: _s, ...base } = row; res = await supabase.from('inquiry_ledger').insert(base).select('id').single() }
    return { ok: !res.error, id: res.data?.id ?? null }
  } catch (_) { return { ok: false, id: null } }
}

/** 최근 N일 시세 카드 클릭(price_card) 행의 region 목록 — 집계 재료. 컬럼 부재·실패는 빈 배열 */
export async function fetchPriceCardRegions(days = 7) {
  try {
    const since = new Date(Date.now() - days * 864e5).toISOString()
    const { data, error } = await supabase
      .from('inquiry_ledger')
      .select('region, created_at')
      .eq('source', 'price_card')
      .gte('created_at', since)
    if (error || !Array.isArray(data)) return []
    return data.map(r => r.region).filter(Boolean)
  } catch (_) { return [] }
}

/** 대화방 id 목록 → { [conversation_id]: { id, source, status, signal } } (문의함 라벨·상태 칩용) */
export async function fetchLedgerByConversations(conversationIds) {
  const ids = (conversationIds ?? []).filter(Boolean)
  if (!ids.length) return {}
  try {
    const { data, error } = await supabase
      .from('inquiry_ledger')
      .select('id, conversation_id, source, status, signal')
      .in('conversation_id', ids)
    if (error || !Array.isArray(data)) return {}
    const out = {}
    for (const r of data) if (r.conversation_id) out[r.conversation_id] = r
    return out
  } catch (_) { return {} }
}

/** 기업회원이 결과를 표시 — status: replied | closed */
export async function updateInquiryStatus(ledgerId, status) {
  try {
    const { error } = await supabase
      .from('inquiry_ledger')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ledgerId)
    return { ok: !error }
  } catch (_) { return { ok: false } }
}

/** 내 업체(들)로 걸려온 전화 문의 건수 — 집계만(누가 걸었는지는 조회하지 않는다). 실패는 null(표시 생략) */
export async function countPhoneInquiries(vendorIds) {
  const ids = (vendorIds ?? []).filter(Boolean)
  if (!ids.length) return null
  try {
    const { count, error } = await supabase
      .from('inquiry_ledger')
      .select('id', { count: 'exact', head: true })
      .in('vendor_id', ids)
      .eq('channel', 'phone')
    if (error) return null
    return count ?? 0
  } catch (_) { return null }
}
