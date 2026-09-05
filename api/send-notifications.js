// Vercel 서버리스 — "모두 발송" 알림 생성 배치 (일 1회, ORDER-close-flow-peer-stats-v1 항목 3).
// profiles.profile_data.roleData의 알림 신청(재등록·임대차 만료·동향)을 스캔해
// notifications 행을 생성한다. 룰은 _notificationRules(순수 함수) — 여기는 조회·저장만.
//
// 원칙: 사용자 간 활동(문의·답장)은 여기서 다루지 않는다(벨 원칙). 표본 미충족 동향은
// 생성하지 않는다(가짜 알림 금지). 중복은 payload.dedupe_key로 차단.
// vercel.json crons: 매일 20:30 UTC (KST 새벽 — 아침에 확인되는 타이밍).

import { createClient } from '@supabase/supabase-js'
import { computeNotifications } from './_notificationRules.js'

const SUPABASE_URL = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3F2bWdxc2tlb2VncHF4bHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDg1NTksImV4cCI6MjA5ODMyNDU1OX0.Bx9YR8dW-1c8BYB62oPOraPZm93G9iydB2jV5jzXR2U'

// 동향 표본 게이트 — 항목 4와 기준 공유: "첫 문의를 받은 매물 ≥ 5건"(전국 수준의 보수적 판정).
// 전국 표본이 이 문턱을 못 넘으면 어떤 비교군도 못 넘는다 — 충족 전엔 동향 알림 0건.
const PEER_SAMPLE_MIN = 5

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const now = new Date()

  // 1) 알림 신청이 담긴 프로필 스캔
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, profile_data')
    .not('profile_data', 'is', null)
  if (error) return res.status(500).json({ ok: false, error: error.message })
  const profiles = (rows ?? [])
    .map(r => ({ user_id: r.id, roleData: r.profile_data?.roleData ?? null }))
    .filter(p => p.roleData)

  // 2) 기존 발송분의 dedupe_key — 재발송 차단
  const { data: sent } = await supabase.from('notifications').select('payload')
  const existingKeys = new Set((sent ?? []).map(n => n?.payload?.dedupe_key).filter(Boolean))

  // 3) 동향 표본 게이트 — 첫 문의를 받은 매물 수(유니크 listing_id)
  const { data: convs } = await supabase.from('conversations').select('listing_id')
  const inquiredCount = new Set((convs ?? []).map(c => c.listing_id).filter(Boolean)).size
  const sampleOk = { peer: inquiredCount >= PEER_SAMPLE_MIN }

  // 4) 룰 적용 → 저장
  const toSend = computeNotifications({ profiles, existingKeys, sampleOk, now })
  let created = 0
  const failed = []
  for (const n of toSend) {
    const { error: insErr } = await supabase.from('notifications').insert(n)
    if (insErr) failed.push({ key: n.payload.dedupe_key, error: insErr.message })
    else created++
  }

  return res.status(failed.length ? 207 : 200).json({
    ok: failed.length === 0,
    scanned: profiles.length,
    created,
    peerSample: inquiredCount,
    failed,
    at: now.toISOString(),
  })
}
