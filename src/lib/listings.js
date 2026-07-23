import { supabase, getDeviceId } from './supabase'
import { isOwnerOf } from './ownership'

/**
 * 수정 모드용 매물 로드 — 조회 + 소유권 검증(user_id 우선, device 폴백). E1·E1p 공유(복제 금지).
 * 반환: { ok, row } 또는 { ok:false, denied } — 호출부가 denied면 상세로 돌려보낸다.
 */
export async function loadListingForEdit(editId) {
  if (!editId) return { ok: false }
  const { data: row, error } = await supabase.from('listings').select('*').eq('id', editId).single()
  if (error || !row) return { ok: false }
  const { data: { session } } = await supabase.auth.getSession()
  if (!isOwnerOf(row, session?.user?.id)) return { ok: false, denied: true }
  return { ok: true, row }
}

/**
 * listings 저장 공통 — 양도인(E1)·임대인(E1p) 공유(복제 금지).
 * 신규는 INSERT(소유권 + status 체계), 수정 모드는 UPDATE(소유권·공개상태 유지).
 * payload에 listing_type을 담아 seller/landlord를 구분한다(seller는 컬럼 default라 생략 가능).
 *
 * 소유권(IDENTITY-MODEL): 생성 시점에 user_id(로그인 사용자)를 함께 스탬프 —
 * isOwnerOf가 처음부터 user_id 우선으로 판정. 비로그인이면 user_id=null, device_id 폴백.
 */
export async function saveListing({ payload, editingListingId, isDemo }) {
  // occupancy 등 신설 컬럼이 아직 없어도(콘솔 SQL 전) 저장이 깨지지 않게 — 실패 시 해당 컬럼 제외 재시도
  const doWrite = (row) => editingListingId
    ? supabase.from('listings').update(row).eq('id', editingListingId)
    : supabase.from('listings').insert(row)
  const attempt = async (row) => {
    let { error } = await doWrite(row)
    if (error && 'occupancy' in row) {
      const rest = { ...row }; delete rest.occupancy
      ;({ error } = await doWrite(rest))
    }
    if (error) throw new Error(error.message)
  }

  if (editingListingId) {
    await attempt({ ...payload, updated_at: new Date().toISOString() })
    return
  }
  // getSession()은 로컬 스토리지 기반(네트워크 없음) — 로그인 사용자 id를 소유권으로 스탬프
  const { data: { session } } = await supabase.auth.getSession()
  await attempt({
    ...payload,
    device_id: getDeviceId(),
    user_id: session?.user?.id ?? null, // 계정 소유(우선), 비로그인은 null→device 폴백
    status: isDemo ? 'example' : 'published', // 예시✦ 채움 연습 등록은 마켓 미노출
  })
}
