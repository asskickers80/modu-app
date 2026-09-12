/**
 * 한마디 — 순수 룰 (ORDER 2026-09-12 파트 C). supabase 무의존.
 * 승인 슬롯·정렬(position)·초대 상태·음성 상한·로그인 게이트. plan_tier 는 어디에도 없다(§1-3).
 */
import { TAKES } from '../../config/vendorTakes'

export const inviteExpiry = (now = new Date()) => new Date(now.getTime() + TAKES.INVITE_HOURS * 36e5).toISOString()
export const newToken = () => `t_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`

/** open | expired | full | closed */
export function inviteState(invite, now = new Date()) {
  if (!invite) return 'closed'
  if (invite.closed_at) return 'closed'
  if (invite.expires_at && new Date(invite.expires_at) <= now) return 'expired'
  if ((invite.response_count ?? 0) >= (invite.max_responses ?? TAKES.MAX_RESPONSES)) return 'full'
  return 'open'
}
export const canApprove = (approvedCount) => approvedCount < TAKES.MAX_APPROVED
export const validateVoiceSec = (sec) => Number.isFinite(sec) && sec > 0 && sec <= TAKES.VOICE_SEC
export const clampName = (s) => String(s ?? '').trim().slice(0, TAKES.NAME_MAX)
export const clampBody = (s) => { const t = String(s ?? '').trim().slice(0, TAKES.BODY_MAX); return t || null }
/** 링크 페이지 게이트 — require_login_for_take=true 면 비로그인은 앱 로그인으로 */
export const takeGate = (cfg = TAKES, user = null) => (cfg.require_login_for_take && !user ? 'login' : 'ok')
/** 게시 목록 — position 순, MAX_APPROVED 까지. 다른 정렬 키 없음 */
export const approvedOrdered = (takes = []) => (takes ?? []).filter(t => t.approved_at && !t.removed_at).sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).slice(0, TAKES.MAX_APPROVED)
export const pendingList = (takes = []) => (takes ?? []).filter(t => !t.approved_at && !t.removed_at).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
