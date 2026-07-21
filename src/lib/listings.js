import { supabase, getDeviceId } from './supabase'

/**
 * listings 저장 공통 — 양도인(E1)·임대인(E1p) 공유(복제 금지).
 * 신규는 INSERT(device_id 소유권 + status 체계), 수정 모드는 UPDATE(소유권·공개상태 유지).
 * payload에 listing_type을 담아 seller/landlord를 구분한다(seller는 컬럼 default라 생략 가능).
 */
export async function saveListing({ payload, editingListingId, isDemo }) {
  if (editingListingId) {
    const { error } = await supabase
      .from('listings')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', editingListingId)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase.from('listings').insert({
    ...payload,
    device_id: getDeviceId(),
    // 예시✦ 채움 연습 등록은 마켓 미노출
    status: isDemo ? 'example' : 'published',
  })
  if (error) throw new Error(error.message)
}
