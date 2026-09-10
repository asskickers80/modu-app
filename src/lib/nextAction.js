/**
 * '다음 행동' 카드 — 데이터 계층 (ORDER 2026-09-10 파트 B3). 판정은 nextActionRules(순수).
 * 우선순위 후보를 순서대로 30일 규칙(sales_card_impressions, signal 값 확장)으로 걸러 1장만 돌려준다.
 */
import { supabase, getDeviceId } from './supabase'
import { getProfileRaw } from './userProfile'
import { fetchSalesEntries } from './salesStore'
import { suppressionFor } from './salesSignal'
import { getSalesSignal } from './salesSignalRules'
import { priceRange, nextMonthRule } from './nextActionRules'
import { kstToday, addDays } from './weekUtil'

const DAYS = 150 // 3개월 연속 상승 판정(완결 월 4개)까지 덮는 창

async function fetchSources(days) {
  try {
    const { data, error } = await supabase.from('daily_sales').select('source').eq('device_id', getDeviceId()).gte('sale_date', addDays(kstToday(), -days))
    return error || !Array.isArray(data) ? [] : data.map(r => r.source)
  } catch (_) { return [] }
}
/** 같은 업종 양도 매물(진행 + 거래 완료) — 시세 범위 재료. 실패는 빈 배열 */
async function fetchIndustryListings(industry) {
  if (!industry) return []
  try {
    const { data, error } = await supabase.from('listings')
      .select('id, status, address, category_main, transfer_fee, monthly_rent, updated_at')
      .eq('listing_type', 'seller').eq('category_main', industry).in('status', ['published', 'negotiating', 'sold']).limit(200)
    return error || !Array.isArray(data) ? [] : data
  } catch (_) { return [] }
}

/** @returns { kind, signal, ..., entries, impressionId } | null */
export async function loadNextActionCard({ now = new Date() } = {}) {
  const roleData = getProfileRaw()?.roleData?.operating ?? {}
  const profile = { industry: roleData.category_main ?? null, gu: roleData.region_sub ?? null }
  const [entries, sources, listings] = await Promise.all([fetchSalesEntries(DAYS), fetchSources(DAYS), fetchIndustryListings(profile.industry)])

  const candidates = []
  const service = getSalesSignal({ entries, roleData, sources, now })
  if (service) candidates.push({ kind: 'service', ...service })
  const range = priceRange(listings, { industry: profile.industry, gu: profile.gu, now })
  if (range) candidates.push({ kind: 'price_range', signal: 'price_range', range, industry: profile.industry, gu: profile.gu, basis: null })
  const nm = nextMonthRule({ roleData, entries, now })
  if (nm) candidates.push({ kind: 'next_month', signal: `next_month:${nm.rule}`, rule: nm.rule, params: nm.params, basis: null })

  for (const c of candidates) {
    const sup = await suppressionFor(c.signal, now)
    if (!sup.suppressed) return { ...c, entries, impressionId: sup.impressionId }
  }
  return null
}
