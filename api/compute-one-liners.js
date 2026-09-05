// Vercel 서버리스 — "이번 주 한 줄" 주간 배치 (ORDER-weekly-one-liner-v1).
// 매주 월요일 06:00 KST(= 일요일 21:00 UTC) 실행. 신호 선별·문장은 순수 룰
// (src/lib/oneLinerRules) — AI 호출 0회. 홈은 이 테이블에 저장된 값만 읽는다.
//
// 신원: 앱 표준대로 device_id 기준. 매출(daily_sales)·문의(conversations)가 전부
// device_id로 저장되므로, 그 원장에서 device_id를 모아 계산하고 user_id는 스탬프로만 쓴다.

import { createClient } from '@supabase/supabase-js'
import { computeOperatingSignal, computeSellerSignal } from '../src/lib/oneLinerRules.js'
import { weekStartOf } from '../src/lib/weekUtil.js'

const SUPABASE_URL = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3F2bWdxc2tlb2VncHF4bHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDg1NTksImV4cCI6MjA5ODMyNDU1OX0.Bx9YR8dW-1c8BYB62oPOraPZm93G9iydB2jV5jzXR2U'

const ymd = (t) => new Date(t).toISOString().slice(0, 10)

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const now = new Date()
  const weekStart = weekStartOf(now)
  const rows = []

  // ── 사장님: 최근 8주 매출 원장 ────────────────────────────
  const { data: sales, error: salesErr } = await supabase
    .from('daily_sales')
    .select('device_id, user_id, sale_date, revenue')
    .gte('sale_date', ymd(now.getTime() - 56 * 864e5))
  if (salesErr) return res.status(500).json({ ok: false, error: salesErr.message })

  const byDevice = new Map()
  for (const s of sales ?? []) {
    if (!s.device_id) continue
    const cur = byDevice.get(s.device_id) ?? { userId: null, entries: [] }
    cur.entries.push({ sale_date: s.sale_date, revenue: s.revenue })
    if (s.user_id) cur.userId = s.user_id
    byDevice.set(s.device_id, cur)
  }

  // 임대차 만료 신호용 roleData — 계정이 있는 기기만 조회 가능
  const userIds = [...new Set([...byDevice.values()].map(v => v.userId).filter(Boolean))]
  const roleDataByUser = new Map()
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles').select('id, profile_data').in('id', userIds)
    for (const p of profiles ?? []) {
      roleDataByUser.set(p.id, p.profile_data?.roleData?.operating ?? {})
    }
  }

  for (const [deviceId, { userId, entries }] of byDevice) {
    const signal = computeOperatingSignal({
      entries, roleData: userId ? roleDataByUser.get(userId) ?? {} : {}, now,
    })
    if (signal) rows.push({ device_id: deviceId, user_id: userId, role: 'operating', week_start: weekStart, ...signal })
  }

  // ── 양도인: 최근 14일 첫 문의 주제 ────────────────────────
  const since = new Date(now.getTime() - 14 * 864e5).toISOString()
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, sender_id, receiver_id, listing_id, created_at')
    .gte('created_at', since)
  const recent = (convs ?? []).filter(c => c.receiver_id && c.id)

  if (recent.length) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, content, created_at')
      .in('conversation_id', recent.map(c => c.id))
      .order('created_at', { ascending: true })

    // 대화별 "문의자가 보낸 첫 메시지" 본문
    const firstText = new Map()
    for (const m of msgs ?? []) {
      if (firstText.has(m.conversation_id)) continue
      const conv = recent.find(c => c.id === m.conversation_id)
      if (!conv || m.sender_id !== conv.sender_id) continue // 문의자 발신만
      firstText.set(m.conversation_id, m.content ?? '')
    }

    const byOwner = new Map()
    for (const c of recent) {
      const text = firstText.get(c.id)
      if (!text) continue
      const list = byOwner.get(c.receiver_id) ?? []
      list.push({ text })
      byOwner.set(c.receiver_id, list)
    }

    // 매물 소유 계정(user_id) 스탬프용
    const { data: listings } = await supabase
      .from('listings').select('device_id, user_id').in('device_id', [...byOwner.keys()])
    const userByDevice = new Map((listings ?? []).filter(l => l.user_id).map(l => [l.device_id, l.user_id]))

    for (const [deviceId, inquiries] of byOwner) {
      const signal = computeSellerSignal({ inquiries })
      if (signal) {
        rows.push({
          device_id: deviceId, user_id: userByDevice.get(deviceId) ?? null,
          role: 'seller', week_start: weekStart, ...signal,
        })
      }
    }
  }

  // ── 저장 (한 주·한 축·한 줄) ──────────────────────────────
  let created = 0
  const failed = []
  for (const r of rows) {
    const { error } = await supabase
      .from('weekly_one_liners')
      .upsert({ ...r, computed_at: now.toISOString() }, { onConflict: 'device_id,role,week_start' })
    if (error) failed.push({ device: r.device_id, role: r.role, error: error.message })
    else created++
  }

  return res.status(failed.length ? 207 : 200).json({
    ok: failed.length === 0,
    weekStart,
    scannedDevices: byDevice.size,
    created,
    failed,
    at: now.toISOString(),
  })
}
