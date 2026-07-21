// Vercel 서버리스 — 사업자 폐업 자동 감지 배치 (주 1회).
// published·negotiating 매물 중 사업자번호가 있는 건을 국세청 상태조회로 확인,
// 폐업(b_stt_cd='03') 감지 시 즉시 hidden 전환 + closure 표식 기록.
//
// 원칙: 폐업 ≠ 양도 완료. 자동 완료 금지 — 비공개로 내리고 소유자 확인 카드로 넘긴다.
// vercel.json crons: 매주 월요일 20:00 UTC.

import { createClient } from '@supabase/supabase-js'
import { fetchBusinessStatus } from './_ntsBusinessman.js'

const SUPABASE_URL = 'https://edcqvmgqskeoegpqxlzy.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkY3F2bWdxc2tlb2VncHF4bHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDg1NTksImV4cCI6MjA5ODMyNDU1OX0.Bx9YR8dW-1c8BYB62oPOraPZm93G9iydB2jV5jzXR2U'

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const now = new Date().toISOString()

  // 노출 중이면서 사업자번호가 있는 매물만 대상
  const { data: rows, error } = await supabase
    .from('listings')
    .select('id, status, business_number')
    .in('status', ['published', 'negotiating'])
    .not('business_number', 'is', null)
  if (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }

  const targets = rows ?? []
  if (targets.length === 0) {
    return res.status(200).json({ ok: true, checked: 0, closed: 0, at: now })
  }

  // 상태조회는 한 콜에 100건까지 — 현 규모(10여 건)는 1콜. 100건씩 끊어 안전하게.
  const closedIds = []
  const failedChunks = []
  for (let i = 0; i < targets.length; i += 100) {
    const chunk = targets.slice(i, i + 100)
    const bnos = chunk.map(r => String(r.business_number).replace(/[^0-9]/g, ''))
    const { ok, byBno } = await fetchBusinessStatus(bnos)
    if (!ok) {
      // 국세청 장애 — 이 묶음은 건드리지 않는다 (오탐으로 매물 내리는 것 방지)
      failedChunks.push(i / 100)
      continue
    }
    for (const row of chunk) {
      const bno = String(row.business_number).replace(/[^0-9]/g, '')
      const entry = byBno[bno]
      if (entry?.code === '03') closedIds.push({ id: row.id, prev: row.status })
    }
  }

  // 폐업 감지분을 hidden 으로 내리고 표식 기록 (device_id 없이 — 배치 권한, PROGRESS 보안 부채 참조)
  let closed = 0
  const updateFailed = []
  for (const { id, prev } of closedIds) {
    const { error: upErr } = await supabase
      .from('listings')
      .update({
        status: 'hidden',
        closure_detected_at: now,
        closure_prev_status: prev,
        closure_resolved_at: null,   // 소유자 확인 대기 상태로 초기화
        bizno_status_code: '03',
        updated_at: now,
      })
      .eq('id', id)
    if (upErr) updateFailed.push({ id, error: upErr.message })
    else closed++
  }

  const ok = failedChunks.length === 0 && updateFailed.length === 0
  return res.status(ok ? 200 : 207).json({
    ok,
    checked: targets.length,
    closed,
    apiFailedChunks: failedChunks.length,
    updateFailed,
    at: now,
  })
}
