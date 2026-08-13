/**
 * 매출 기록·고정비 저장 계층 (ORDER-sales-tracking-v1)
 * 신원 모델 그대로 device_id 기준 + user_id 스탬프(로그인 시).
 * 테이블 미생성(SQL 실행 전)이어도 조회는 빈 상태, 저장은 정직한 실패 반환 —
 * 기존 기능은 어떤 경우에도 깨지지 않는다(스키마 의존 배포 규칙).
 */
import { supabase, getDeviceId } from './supabase'

async function currentUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  } catch (_) { return null }
}

/** 최근 N일 매출 행 조회 — 실패(테이블 부재 포함)는 빈 배열 (분석은 침묵) */
export async function fetchSalesEntries(days = 35) {
  try {
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('daily_sales')
      .select('sale_date, revenue, delivery_revenue, customers, memo')
      .eq('device_id', getDeviceId())
      .gte('sale_date', since)
      .order('sale_date', { ascending: false })
    if (error || !Array.isArray(data)) return []
    return data
  } catch (_) { return [] }
}

/** 일 매출 저장(같은 날 재입력 = 갱신). 소급 7일 제한은 호출부 UI가 담당. */
export async function saveSalesEntry({ date, revenue, deliveryRevenue = null, customers = null, memo = null }) {
  try {
    const row = {
      device_id: getDeviceId(),
      user_id: await currentUserId(),
      sale_date: date,
      revenue,
      delivery_revenue: deliveryRevenue,
      customers,
      memo,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('daily_sales').upsert(row, { onConflict: 'device_id,sale_date' })
    return { ok: !error, error: error?.message ?? null }
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}

export async function fetchFixedCosts() {
  try {
    const { data, error } = await supabase
      .from('fixed_costs')
      .select('rent, rent_due_day, labor, labor_due_day, maintenance, maintenance_due_day, others')
      .eq('device_id', getDeviceId())
      .maybeSingle()
    if (error) return null
    return data ?? null
  } catch (_) { return null }
}

export async function saveFixedCosts(costs) {
  try {
    const row = {
      device_id: getDeviceId(),
      user_id: await currentUserId(),
      ...costs,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('fixed_costs').upsert(row, { onConflict: 'device_id' })
    return { ok: !error, error: error?.message ?? null }
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}

export const fixedTotalOf = (fixed) =>
  fixed ? ['rent', 'labor', 'maintenance', 'others'].reduce((s, k) => s + (Number(fixed[k]) || 0), 0) : 0
