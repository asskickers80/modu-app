/**
 * 사장님 매출 서비스 카드 — 데이터 계층 (ORDER 2026-09-09 파트 A)
 * 판정은 salesSignalRules(순수)에 맡기고 여기서는 조회·노출 이력만 다룬다.
 * 신원 모델 그대로 device_id 기준 + user_id 스탬프. 테이블·컬럼 부재(SQL 실행 전)는 조용히 비활성:
 *  - daily_sales.source 부재 → sources 빈 배열(근거 줄 "입력하신 매출 기준")
 *  - sales_card_impressions 부재 → 로컬 기록(localStorage)만으로 30일 규칙 유지
 */
import { supabase, getDeviceId } from './supabase'
import { getProfileRaw } from './userProfile'
import { fetchSalesEntries } from './salesStore'
import { kstToday, addDays } from './weekUtil'
import { getSalesSignal, isSuppressed, WINDOW_DAYS } from './salesSignalRules'

const LOCAL_KEY = 'modu_sales_card_seen' // { [signal]: { shownOn, dismissedOn } }

async function currentUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  } catch (_) { return null }
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') || {} } catch (_) { return {} }
}
function writeLocal(signal, patch) {
  try {
    const all = readLocal()
    all[signal] = { ...(all[signal] ?? {}), ...patch }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch (_) {}
}

/** 최근 창의 source 값 목록 — 컬럼 부재·실패는 빈 배열 */
async function fetchSources(days) {
  try {
    const { data, error } = await supabase
      .from('daily_sales')
      .select('source')
      .eq('device_id', getDeviceId())
      .gte('sale_date', addDays(kstToday(), -days))
    if (error || !Array.isArray(data)) return []
    return data.map(r => r.source)
  } catch (_) { return [] }
}

/** 서버 노출 이력(같은 상황 최신 1건) — 테이블 부재·실패는 null */
async function fetchImpression(signal) {
  try {
    const { data, error } = await supabase
      .from('sales_card_impressions')
      .select('id, shown_at, dismissed_at')
      .eq('device_id', getDeviceId())
      .eq('signal', signal)
      .order('shown_at', { ascending: false })
      .limit(1)
    if (error || !Array.isArray(data) || !data[0]) return null
    return data[0]
  } catch (_) { return null }
}

/**
 * 카드에 보여줄 상황 1개 (없으면 null). 30일 규칙(노출 1회·닫기 30일)까지 적용한 결과.
 * @returns { signal, params, basis, entries, impressionId } | null
 */
export async function loadSalesCardSignal({ now = new Date() } = {}) {
  const [entries, sources] = await Promise.all([fetchSalesEntries(WINDOW_DAYS), fetchSources(WINDOW_DAYS)])
  const roleData = getProfileRaw()?.roleData?.operating ?? {}
  const result = getSalesSignal({ entries, roleData, sources, now })
  if (!result) return null

  const sup = await suppressionFor(result.signal, now)
  if (sup.suppressed) return null
  return { ...result, entries, impressionId: sup.impressionId }
}

/** 30일 규칙 판정(로컬 + 서버) — { suppressed, impressionId(당일 재진입이면 기존 id) } */
export async function suppressionFor(signal, now = new Date()) {
  const today = kstToday(now)
  const local = readLocal()[signal] ?? {}
  if (isSuppressed(local, today)) return { suppressed: true, impressionId: null }
  const imp = await fetchImpression(signal)
  if (imp) {
    const shownOn = kstToday(new Date(imp.shown_at))
    const dismissedOn = imp.dismissed_at ? kstToday(new Date(imp.dismissed_at)) : null
    if (isSuppressed({ shownOn, dismissedOn }, today)) return { suppressed: true, impressionId: null }
    if (shownOn === today) return { suppressed: false, impressionId: imp.id } // 당일 재진입 — 새 노출로 세지 않는다
  }
  return { suppressed: false, impressionId: null }
}

/** 노출 기록 — 로컬 + 서버(있으면). 반환: impression id | null */
export async function recordSalesCardShown(signal, { now = new Date() } = {}) {
  writeLocal(signal, { shownOn: kstToday(now) })
  try {
    const { data, error } = await supabase
      .from('sales_card_impressions')
      .insert({ device_id: getDeviceId(), user_id: await currentUserId(), signal, shown_at: now.toISOString() })
      .select('id')
      .single()
    return error ? null : (data?.id ?? null)
  } catch (_) { return null }
}

/** [닫기] — 그 상황 30일 숨김 (로컬 + 서버 dismissed_at) */
export async function dismissSalesCard(signal, impressionId, { now = new Date() } = {}) {
  writeLocal(signal, { dismissedOn: kstToday(now) })
  if (!impressionId) return
  try {
    await supabase.from('sales_card_impressions').update({ dismissed_at: now.toISOString() }).eq('id', impressionId)
  } catch (_) {}
}
