/**
 * 기업회원 [문의하기] — 자동 첨부 조립·전송 (ORDER 2026-09-09 파트 B2)
 * 기존 DM 구조(conversations·messages) 그대로 쓴다. 매출 금액은 첨부하지 않는다 —
 * 사용자가 켤 때만 "최근 3개월 매출 구간"(5단계 문자열)을 더한다.
 * 순수 함수(revenueBandOf·buildAttachment)는 supabase 무의존.
 */
import { SALES_BANDS } from '../../config/salesCardCategories'
import { kstToday, addDays } from './weekUtil'

/** 최근 90일 daily_sales → 월 평균 매출 → 구간 문자열 (데이터 없으면 null) */
export function revenueBandOf(entries, now = new Date()) {
  const since = addDays(kstToday(now), -90)
  const rows = (entries ?? []).filter(e => e?.sale_date >= since && Number.isFinite(e.revenue))
  if (!rows.length) return null
  const monthly = rows.reduce((s, e) => s + e.revenue, 0) / 3
  return SALES_BANDS.find(b => monthly < b.max)?.label ?? null
}

/** 첨부 항목 목록 — 체크 해제 가능한 단위 [{ key, label, value }] */
export function attachmentItems({ bizLabel, regionLabel, situationLine }) {
  return [
    bizLabel ? { key: 'biz', label: '업종', value: bizLabel } : null,
    regionLabel ? { key: 'region', label: '지역', value: regionLabel } : null,
    situationLine ? { key: 'situation', label: '상황', value: situationLine } : null,
  ].filter(Boolean)
}

/** 전송 본문 — 켜진 항목만. band 는 사용자가 켠 경우에만 넘어온다 */
export function buildAttachment(items, enabled, band = null) {
  const lines = items.filter(it => enabled[it.key] !== false).map(it => `${it.label}: ${it.value}`)
  if (band) lines.push(`최근 3개월 매출 구간: ${band}`)
  return lines.join('\n')
}

/**
 * 대화 시작(또는 기존 대화 재사용) + 첫 메시지로 첨부 본문 전송 + 원장(channel=app).
 * @returns { ok, conversationId }
 */
export async function sendVendorInquiry({ vendor, body, source, signal = null, category = null }) {
  const { supabase, getDeviceId } = await import('./supabase')
  const { getProfile } = await import('./userProfile')
  const { recordInquiry } = await import('./inquiryLedger')
  const myId = getDeviceId()
  let conversationId = null
  try {
    const { data: existing } = await supabase
      .from('conversations').select('id').eq('sender_id', myId).eq('listing_id', vendor.id).maybeSingle()
    if (existing?.id) conversationId = existing.id
    else {
      const { data, error } = await supabase.from('conversations').insert({
        listing_id: vendor.id,
        listing_name: vendor.name || '업체',
        listing_emoji: '🏢',
        sender_id: myId,
        receiver_id: vendor.deviceId,
        sender_name: getProfile().name ?? '문의자',
        receiver_name: vendor.name || '업체',
      }).select('id').single()
      if (error) return { ok: false, conversationId: null }
      conversationId = data.id
    }
    if (body) {
      await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: myId, content: body })
      await supabase.from('conversations')
        .update({ last_message: body.split('\n')[0], last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
    }
  } catch (_) {
    return { ok: false, conversationId: null }
  }
  await recordInquiry({ vendorId: vendor.id, conversationId, source, signal, category, channel: 'app', status: 'sent' })
  return { ok: true, conversationId }
}
