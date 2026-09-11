// Vercel 서버리스 — 한국부동산원 임대동향 분기 배치 (ORDER 2026-09-11 파트 A1)
// 크론: 1·4·7·10월 28일 06:00 KST (vercel.json). 수동 실행: GET /api/reb-stats-batch?quarter=2026Q2 (CRON_SECRET 헤더)
// 실패 시 직전 분기 데이터를 그대로 두고 로그 1줄. 응답 원본은 저장하지 않는다.
import { createClient } from '@supabase/supabase-js'
import { fetchRebQuarter, decideBatch } from './_rebConnector.js'
import { quarterOf, prevQuarterOf } from '../src/lib/rebStatsRules.js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }
  const now = new Date()
  const quarter = req.query?.quarter ?? prevQuarterOf(quarterOf(now)) // 통계는 한 분기 늦게 공표된다
  const prev = prevQuarterOf(quarter)
  const fetched = await fetchRebQuarter({ quarter })
  const d = decideBatch({ fetched, quarter, prevQuarter: prev })
  console.log(d.log)
  if (d.action === 'keep') return res.status(200).json({ ok: true, action: 'keep', quarter, kept: prev, log: d.log })

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  let saved = 0
  const failed = []
  for (const row of d.rows) {
    const { error } = await supabase.from('reb_market_stats').upsert(row, { onConflict: 'quarter,region_level,region_name,store_type' })
    if (error) failed.push(error.message); else saved++
  }
  return res.status(failed.length ? 207 : 200).json({ ok: failed.length === 0, action: 'upsert', quarter, saved, failed: failed.slice(0, 3), log: d.log })
}
