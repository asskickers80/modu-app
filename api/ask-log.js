/**
 * 질문 로그 적재 (ORDER 2026-09-13 C1) — pseudonym_id 는 서버에서만 만든다.
 * 클라이언트가 보낸 user_id 는 해시에만 쓰고 저장하지 않는다. 임베딩·벡터·대화 전문은 저장하지 않는다.
 */
import { createClient } from '@supabase/supabase-js'
import { pseudonymOf } from './_askBatch.js'

const URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
const SALT = process.env.ASK_PSEUDONYM_SALT ?? ''

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    if (!b.target_id) return res.status(400).json({ error: 'target_id' })
    const row = {
      pseudonym_id: pseudonymOf(b.user_id ?? null, SALT),   // user_id 는 여기서 사라진다
      target_type: b.target_type ?? 'listing',
      target_id: b.target_id,
      raw_text: (b.raw_text ?? '').slice(0, 200) || null,
      topic_axis: b.topic_axis ?? 'other',
      intent: b.intent ?? 'fact',
      branch: b.branch ?? 'data',
      answered: !!b.answered,
      ledger_id: b.ledger_id ?? null,
    }
    const supabase = createClient(URL, KEY)
    const { error } = await supabase.from('ask_question_events').insert(row)
    if (error) return res.status(200).json({ ok: false })   // 로그 실패가 사용자 흐름을 막지 않는다
    return res.status(200).json({ ok: true })
  } catch (_) { return res.status(200).json({ ok: false }) }
}
