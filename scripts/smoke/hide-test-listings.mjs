/**
 * 테스트 잔재 숨김 — 마켓플레이스 정리 (일회성, 2026-07-04)
 *
 * 잔재 기준: status='published' AND shop_name='서교동 고양이 카페'
 *            AND device_id != 대표님 기기(08cfb0e2-…)  ← 보존 조건 우선
 * 삭제 아님 — status='hidden' 전환만. 숨긴 id는 로그 파일로 저장해 원복 가능.
 *
 * 원복: 로그의 ids를 status='published'로 update
 * 실행: node scripts/smoke/hide-test-listings.mjs         (드라이런 — 목록만)
 *       node scripts/smoke/hide-test-listings.mjs --run   (실제 숨김)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const REMNANT_NAME = '서교동 고양이 카페'
const OWNER_DEVICE = '08cfb0e2-e201-4dd7-9eb3-74c228bd3120' // 대표님 기기 ('우리집' 등록 기기)
const LOG_PATH = fileURLToPath(new URL('./hidden-listings-20260704.json', import.meta.url))

const envPath = fileURLToPath(new URL('../../.env', import.meta.url))
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const doRun = process.argv.includes('--run')

// ── 1) 현황 실증 ────────────────────────────────────────────
const { data: pub, error: e1 } = await supabase.from('listings')
  .select('id, shop_name, device_id, created_at').eq('status', 'published')
if (e1) { console.error('조회 실패:', e1.message); process.exit(1) }

const remnants = pub.filter(r => r.shop_name === REMNANT_NAME && r.device_id !== OWNER_DEVICE)
const preserved = pub.filter(r => !remnants.includes(r))

console.log(`published 총 ${pub.length}건 · 잔재 ${remnants.length}건 · 보존 ${preserved.length}건\n`)
console.log('[보존 목록]')
for (const r of preserved) console.log(` - ${r.id.slice(0, 8)} "${r.shop_name || '(빈 이름)'}" dev=${String(r.device_id).slice(0, 8)}… ${r.created_at.slice(0, 16)}`)
console.log('\n[잔재 목록 — 앞 5건 + 개수]')
for (const r of remnants.slice(0, 5)) console.log(` - ${r.id.slice(0, 8)} "${r.shop_name}" ${r.created_at.slice(0, 16)}`)
if (remnants.length > 5) console.log(` … 외 ${remnants.length - 5}건`)

if (!doRun) { console.log('\n(드라이런 — 숨기려면 --run)'); process.exit(0) }

// ── 2) 숨김 실행 (where 절: published + 잔재명 + 대표님 기기 제외) ──
const { data: hidden, error: e2 } = await supabase.from('listings')
  .update({ status: 'hidden' })
  .eq('status', 'published')
  .eq('shop_name', REMNANT_NAME)
  // device_id가 NULL인 잔재도 포함 (SQL neq는 NULL을 제외하므로 or로 명시)
  .or(`device_id.neq.${OWNER_DEVICE},device_id.is.null`)
  .select('id, shop_name, created_at')
if (e2) { console.error('숨김 실패:', e2.message); process.exit(1) }

// 재실행 시 기존 로그와 병합 (원복 목록 유실 방지)
let prevIds = []
try { prevIds = JSON.parse(readFileSync(LOG_PATH, 'utf8')).ids ?? [] } catch { /* 첫 실행 */ }
const allIds = [...new Set([...prevIds, ...hidden.map(r => r.id)])]
writeFileSync(LOG_PATH, JSON.stringify({
  hiddenAt: new Date().toISOString(),
  criteria: `status='published' AND shop_name='${REMNANT_NAME}' AND (device_id != '${OWNER_DEVICE}' OR device_id IS NULL)`,
  restore: "update listings set status='published' where id in (ids)",
  count: allIds.length,
  ids: allIds,
}, null, 2))
console.log(`\n숨김 완료: ${hidden.length}건 → 로그 저장 ${LOG_PATH}`)

// ── 3) 검증 — ExplorePage와 동일 쿼리(status=published 전체 select) ──
const { data: after } = await supabase.from('listings').select('id, shop_name').eq('status', 'published')
console.log(`\n[검증] ExplorePage 쿼리(published) 잔여 ${after.length}건:`)
for (const r of after) console.log(` - ${r.id.slice(0, 8)} "${r.shop_name || '(빈 이름)'}"`)
const leak = after.filter(r => hidden.some(h => h.id === r.id))
console.log(leak.length === 0 ? '숨김 매물 노출 0건 ✓' : `❌ 숨김 매물이 여전히 노출: ${leak.length}건`)
