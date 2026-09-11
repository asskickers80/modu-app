/**
 * 사진 초안 — 순수 룰 (ORDER 2026-09-11 파트 B4). AI 응답(JSON)을 스키마에 맞춰 걸러낸다.
 * 금지 항목(면적·평수·권리금·월세·보증금·매출·상권 평가)이 값에 섞이면 그 항목만 폐기. 전체 실패는 조용히 null.
 */
import { PHOTO_DRAFT_KEYS, PHOTO_DRAFT_FORBIDDEN, INTERIOR_STATES } from '../../config/ai'

export function parsePhotoDraft(raw) {
  if (!raw) return null
  let obj = raw
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (!m) return null
    try { obj = JSON.parse(m[0]) } catch (_) { return null }
  }
  if (!obj || typeof obj !== 'object') return null
  const items = {}
  let dropped = 0
  for (const k of PHOTO_DRAFT_KEYS) {
    if (obj[k] == null || obj[k] === '') continue
    const v = obj[k]
    const text = typeof v === 'boolean' ? (v ? '있음' : '없음') : String(v).trim()
    if (PHOTO_DRAFT_FORBIDDEN.test(text)) { dropped++; continue }
    if (k === 'interior_state' && !INTERIOR_STATES.includes(text)) { dropped++; continue }
    if (k === 'seats') {
      const n = Number(String(text).replace(/[^\d]/g, ''))
      if (!n) { dropped++; continue }
      items[k] = `약 ${n}석`
      continue
    }
    items[k] = text.slice(0, 60)
  }
  return { items, dropped, count: Object.keys(items).length }
}
