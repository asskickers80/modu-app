import { supabase, getDeviceId } from './supabase'
import { saveProfile, getProfile } from './userProfile'

export const DEST_MAP = {
  seller:    '/a7/seller',
  landlord:  '/a7/landlord',
  startup:   '/a7/startup',
  operating: '/a7/operating',
  business:  '/a7/business',
  browsing:  '/a7/browsing',
}

/**
 * 로그인 성공 후 공통 후처리.
 * 1) device_id 기반 데이터를 auth user_id로 귀속 시도
 * 2) profiles 체크 → 기존: 복원 / 신규: 생성
 * 3) 대시보드로 이동 (navigate 함수를 받아 실행)
 */
export async function finishLogin({ user, navigate, category, extraProfileFields = {} }) {
  // device_id → user_id 귀속 (user_id 컬럼이 없으면 조용히 skip)
  await migrateDeviceId(user.id)

  const { data: existing } = await supabase
    .from('profiles')
    .select('category, nickname, profile_data')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) {
    saveProfile({
      ...(existing.profile_data || {}),
      name: existing.nickname,
      category: existing.category,
    })
    navigate(DEST_MAP[existing.category] ?? '/a2', { replace: true })
    return
  }

  // 신규 유저
  const cat = localStorage.getItem('modu_pending_category') ?? category
  localStorage.removeItem('modu_pending_category')

  const localProfile = getProfile()
  const profileData = { ...localProfile }
  delete profileData.name

  // extraProfileFields의 nickname이 있으면 우선 사용, 없으면 로컬 프로필 이름
  const { nickname: extraNickname, ...otherExtraFields } = extraProfileFields
  const nickname = extraNickname ?? localProfile.name ?? null

  await supabase.from('profiles').insert({
    id: user.id,
    category: cat,
    nickname,
    profile_data: profileData,
    ...otherExtraFields,
  })

  saveProfile({ ...localProfile, category: cat })
  navigate(DEST_MAP[cat] ?? '/a7/seller', { replace: true })
}

/**
 * 로그인 후 device_id 기반 listings·conversations를 auth user_id로 연결.
 * user_id 컬럼이 아직 없으면(콘솔 SQL 미실행) 조용히 무시.
 */
export async function migrateDeviceId(userId) {
  const deviceId = getDeviceId()
  if (!deviceId || !userId) return
  try {
    await Promise.all([
      supabase.from('listings')
        .update({ user_id: userId })
        .eq('device_id', deviceId)
        .is('user_id', null),
      supabase.from('conversations')
        .update({ user_id: userId })
        .eq('sender_id', deviceId)
        .is('user_id', null),
      supabase.from('conversations')
        .update({ user_id: userId })
        .eq('receiver_id', deviceId)
        .is('user_id', null),
    ])
  } catch {
    // user_id 컬럼 미생성 시 무시
  }
}
