/**
 * 동의 이력 (ORDER-key-proxy-account-deletion B-2/B-4)
 *
 * 필수 동의(terms·privacy)와 선택 동의(marketing_contact·retention_after_withdrawal)를
 * consents 테이블에 계정 단위로 남긴다.
 * ※ 매물 공개 시 확인사항(listings.terms_version)은 매물 단위 기록이라 여기로 옮기지
 *    않는다 — 성격이 다르고, 중복 저장소를 만들지 않는다.
 *
 * 테이블 미생성(SQL 실행 전)이어도 저장 실패는 삼킨다 — 가입이 막히면 안 된다.
 */
// supabase는 각 함수 안에서 동적 import — 상수(REQUIRED·OPTIONAL·라벨)를 테스트가
// Node에서 직접 import할 수 있게 유지한다 (supabase.js는 Vite 전용 import.meta.env 사용)
const db = async () => (await import('./supabase')).supabase

export const CONSENT_VERSION = 'v1-2026-09'

export const REQUIRED = ['terms', 'privacy']
export const OPTIONAL = ['marketing_contact', 'retention_after_withdrawal']

export const CONSENT_LABEL = {
  terms: '이용약관 동의',
  privacy: '개인정보 처리방침 동의',
  marketing_contact: '양도·창업 정보와 중개 서비스 안내 받기',
  retention_after_withdrawal: '탈퇴 후에도 연락처를 남겨두기',
}

/** 선택 동의 설명 — 무엇에 쓰이는지 사실만 */
export const CONSENT_DESC = {
  marketing_contact: '새 매물·창업 정보, 업체 제안을 알려드려요. 언제든 끌 수 있어요.',
  retention_after_withdrawal: '나중에 다시 찾으실 때를 위해 연락처만 남겨둬요. 지금은 준비 중이라 실제로 남지 않아요.',
}

/**
 * 동의 기록 — 로그인 사용자만. 비로그인이면 no-op(다음 로그인 때 다시 받는다).
 * @param types 동의한 유형 배열
 */
export async function saveConsents(types = []) {
  if (!types.length) return { ok: true, skipped: true }
  try {
    const supabase = await db()
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) return { ok: true, skipped: true }
    const rows = types.map(t => ({
      user_id: userId, consent_type: t, version: CONSENT_VERSION, agreed_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('consents')
      .upsert(rows, { onConflict: 'user_id,consent_type,version' })
    return { ok: !error }
  } catch (_) { return { ok: false } }
}

/** 현재 유효한 동의 유형 목록 — 철회분 제외. 실패는 빈 배열 */
export async function fetchConsents() {
  try {
    const supabase = await db()
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) return []
    const { data, error } = await supabase.from('consents')
      .select('consent_type, withdrawn_at').eq('user_id', userId).is('withdrawn_at', null)
    if (error || !Array.isArray(data)) return []
    return data.map(r => r.consent_type)
  } catch (_) { return [] }
}

/** 선택 동의 철회 */
export async function withdrawConsent(type) {
  try {
    const supabase = await db()
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) return { ok: false }
    const { error } = await supabase.from('consents')
      .update({ withdrawn_at: new Date().toISOString() })
      .eq('user_id', userId).eq('consent_type', type).is('withdrawn_at', null)
    return { ok: !error }
  } catch (_) { return { ok: false } }
}
