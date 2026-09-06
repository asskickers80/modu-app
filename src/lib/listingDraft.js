/**
 * 등록 초안 서버 저장 (ORDER-key-proxy-account-deletion 작업 D)
 *
 * 왜: 카카오 로그인 왕복에서 sessionStorage가 초기화돼 입력이 통째로 사라지는 경로가
 *     실재했다. 서버가 진실의 원천이고 sessionStorage는 대비책이다(D-5).
 *
 * 저장 위치: listings.status='draft' (별도 테이블 없음 — 게시 시 status만 바뀐다, D-1)
 * 저장 주체: **로그인 사용자만** (대표 승인 2026-09-06).
 *   device_id는 클라이언트가 보내는 값이라 RLS로 소유권을 증명할 수 없어,
 *   비로그인 초안을 서버에 두면 anon key로 읽히게 된다(D-2 위배).
 *   비로그인은 sessionStorage로만 두고 finishLogin이 승계한다(D-4, 병합 지점 단일).
 *
 * 테이블·정책 미비(SQL 실행 전)에도 저장 실패는 삼킨다 — 등록 흐름을 막지 않는다.
 */
import { supabase, getDeviceId } from './supabase'

export const DRAFT_STATUS = 'draft'

async function currentUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  } catch (_) { return null }
}

/**
 * 초안 생성·갱신 — 주소가 있어야만 만든다(D-3).
 * @param payload 저장 payload (E1Step5와 같은 형태의 부분집합)
 * @param draftId 이미 만든 초안 id (있으면 갱신)
 * @returns { id } | null
 */
export async function saveListingDraft(payload, draftId = null) {
  if (!payload?.address) return null // 주소 없이는 만들지 않는다
  const userId = await currentUserId()
  if (!userId) return null           // 비로그인 — 서버 초안 없음(sessionStorage가 담당)
  try {
    const row = {
      ...payload,
      status: DRAFT_STATUS,
      user_id: userId,
      device_id: getDeviceId(),
      updated_at: new Date().toISOString(),
    }
    if (draftId) {
      const { error } = await supabase.from('listings').update(row).eq('id', draftId).eq('user_id', userId)
      return error ? null : { id: draftId }
    }
    const { data, error } = await supabase.from('listings').insert(row).select('id').single()
    return error ? null : { id: data?.id ?? null }
  } catch (_) { return null }
}

/** 내 초안 1건 — 가장 최근 것. 없으면 null */
export async function fetchMyDraft(listingType = 'seller') {
  const userId = await currentUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase.from('listings')
      .select('id, address, shop_name, updated_at, image_urls')
      .eq('user_id', userId)
      .eq('status', DRAFT_STATUS)
      .eq('listing_type', listingType)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (error || !data?.length) return null
    return data[0]
  } catch (_) { return null }
}

/**
 * 로그인 직후 승계 (D-4) — sessionStorage 초안을 서버로 올린다.
 * finishLogin에서만 호출한다(병합 지점을 새로 만들지 않는다).
 */
export async function promoteLocalDraftOnLogin(buildPayload) {
  try {
    const raw = JSON.parse(sessionStorage.getItem('modu_e1_draft') || 'null')
    if (!raw?.address) return null
    if (raw.editingListingId) return null // 수정 세션 잔재는 초안이 아니다
    if (raw.draftListingId) return null   // 이미 서버에 있다
    const saved = await saveListingDraft(buildPayload(raw))
    if (saved?.id) {
      sessionStorage.setItem('modu_e1_draft', JSON.stringify({ ...raw, draftListingId: saved.id }))
    }
    return saved
  } catch (_) { return null }
}
