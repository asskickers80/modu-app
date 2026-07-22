import { supabase, getDeviceId } from './supabase'
import { saveProfile, getProfile, getProfiles, registerPendingRoles, buildMergedProfiles } from './userProfile'

export const DEST_MAP = {
  seller:    '/a7/seller',
  landlord:  '/a7/landlord',
  startup:   '/a7/startup',
  operating: '/a7/operating',
  business:  '/a7/business',
  browsing:  '/a7/browsing',
}

/**
 * 로그인 후 이동 목적지.
 * 방문자가 행동(문의 등) 시점에 가입한 경우, 원래 보던 화면(returnTo)으로 되돌린다.
 * returnTo가 없으면 역할별 대시보드(fallback)로.
 */
function loginDest(fallback) {
  try {
    const rt = localStorage.getItem('modu_return_to')
    if (rt) { localStorage.removeItem('modu_return_to'); return rt }
  } catch (_) {}
  return fallback
}

/**
 * 로그인 성공 후 공통 후처리.
 * 1) device_id 기반 데이터를 auth user_id로 귀속 시도
 * 2) profiles 체크 → 기존: 복원 / 신규: 생성
 * 3) 대시보드로 이동 (navigate 함수를 받아 실행)
 */
export async function finishLogin({ user, navigate, category, extraProfileFields = {} }) {
  // 가입/로그인 의도 플래그 정리 — 소셜 콜백은 이미 소비했고, 이메일·개발용 경로는 여기서 지운다
  localStorage.removeItem('modu_auth_intent')
  // 계정 기준 기기 ID 동기화 — 어느 브라우저에서 로그인해도 매물·메시지가 동일하게 보이도록
  await syncCanonicalDeviceId()
  // device_id → user_id 귀속 (user_id 컬럼이 없으면 조용히 skip)
  await migrateDeviceId(user.id)

  const { data: existing } = await supabase
    .from('profiles')
    .select('category, nickname, profile_data')
    .eq('id', user.id)
    .maybeSingle()

  // 온보딩을 방금 거쳐 온 경우의 답변 (A4에서 보관) — 기존 계정 로그인이어도 버리지 않는다
  let onboardingAnswers = null
  try { onboardingAnswers = JSON.parse(localStorage.getItem('modu_onboarding_answers')) } catch (_) {}
  localStorage.removeItem('modu_onboarding_answers')

  if (existing) {
    // ── 멀티프로필 합집합 병합 (덮어쓰기 금지) ──
    // 계정에 저장된 역할 목록(profile_data.roles) + 단수 category + 온보딩 선택 + 합류 선택(pending)을 전부 모은다.
    let pendingRaw = []
    try { pendingRaw = JSON.parse(localStorage.getItem('modu_pending_roles')) ?? [] } catch (_) {}
    localStorage.removeItem('modu_pending_roles')

    const { profiles, activeCat, roles } = buildMergedProfiles({
      existingCategory: existing.category,
      serverRoles: existing.profile_data?.roles,
      nickname: existing.nickname,
      onboardingCategory: onboardingAnswers?.category ?? null,
      pendingRaw,
    })
    try { localStorage.setItem('modu_profiles', JSON.stringify(profiles)) } catch (_) {}

    // 활성 역할로 로컬 프로필 세팅 (온보딩 답변이 있으면 병합)
    const mergedData = { ...(existing.profile_data || {}), ...(onboardingAnswers || {}), roles }
    saveProfile({ ...mergedData, name: existing.nickname, category: activeCat })

    // 서버 영속: profile_data.roles에 합집합 목록 저장(어느 브라우저에서 로그인해도 전 프로필 복원)
    try {
      await supabase.from('profiles').update({
        profile_data: mergedData,
        category: activeCat,
        category_main: mergedData.category_main ?? null,
        category_sub: mergedData.category_sub ?? null,
        ksic_code: mergedData.ksic_code ?? null,
      }).eq('id', user.id)
    } catch (_) {}

    navigate(loginDest(DEST_MAP[activeCat] ?? '/a2'), { replace: true })
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

  const baseRow = {
    id: user.id,
    category: cat,
    nickname,
    profile_data: profileData,
    ...otherExtraFields,
  }
  // 업종 분류 3필드 전용 컬럼 (INDUSTRY-CATEGORY-MAP) — 컬럼 미생성(콘솔 SQL 전)이면 폴백
  const { error: insertError } = await supabase.from('profiles').insert({
    ...baseRow,
    category_main: profileData.category_main ?? null,
    category_sub: profileData.category_sub ?? null,
    ksic_code: profileData.ksic_code ?? null,
  })
  if (insertError) await supabase.from('profiles').insert(baseRow)

  saveProfile({ ...localProfile, category: cat })
  registerPendingRoles(nickname) // 온보딩에서 추가 선택한 역할 → 멀티프로필 등록
  // 서버 영속: 합류 선택 포함 역할 목록을 profile_data.roles에 저장 (재로그인 시 전 프로필 복원)
  try {
    const roles = getProfiles().map(p => p.category).filter(c => c !== 'browsing')
    if (roles.length) await supabase.from('profiles').update({ profile_data: { ...profileData, roles } }).eq('id', user.id)
  } catch (_) {}
  navigate(loginDest(DEST_MAP[cat] ?? '/a7/seller'), { replace: true })
}

/**
 * "진짜 로그인" 보장 — 계정의 기준 기기 ID(canonical device_id) 동기화.
 *
 * 매물·대화·메시지·커뮤니티 글은 전부 기기 ID(localStorage UUID) 기준으로 조회하므로,
 * 브라우저가 바뀌면 같은 계정이어도 데이터가 빈 것처럼 보였다. 해결:
 * 1) 처음 로그인한 브라우저의 기기 ID를 계정 기준값으로 저장 (auth user_metadata.device_id)
 * 2) 다른 브라우저에서 로그인하면 — 그 브라우저에서 로그인 전에 만든 데이터를
 *    기준 ID로 병합한 뒤, localStorage 기기 ID를 기준값으로 교체
 * → 기존의 모든 기기 ID 기반 조회·전송·읽음 로직이 무변경으로 계정 단위 동작.
 */
async function syncCanonicalDeviceId() {
  const current = getDeviceId()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const canonical = user.user_metadata?.device_id
    if (!canonical) {
      // 첫 로그인 브라우저 — 현재 기기 ID를 계정 기준값으로 채택
      await supabase.auth.updateUser({ data: { device_id: current } })
      return
    }
    if (canonical !== current) {
      await mergeDeviceData(current, canonical)
      localStorage.setItem('modu_device_id', canonical)
    }
  } catch {
    // 인증 조회 실패 시 기존 동작(현재 기기 ID) 유지
  }
}

/** 로그인 전 이 브라우저에서 만든 데이터를 계정 기준 기기 ID로 병합 */
async function mergeDeviceData(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return
  try {
    await Promise.all([
      supabase.from('listings').update({ device_id: toId }).eq('device_id', fromId),
      supabase.from('conversations').update({ sender_id: toId }).eq('sender_id', fromId),
      supabase.from('conversations').update({ receiver_id: toId }).eq('receiver_id', fromId),
      supabase.from('messages').update({ sender_id: toId }).eq('sender_id', fromId),
      supabase.from('community_posts').update({ author_device_id: toId }).eq('author_device_id', fromId),
      supabase.from('community_comments').update({ author_device_id: toId }).eq('author_device_id', fromId),
    ])
  } catch {
    // 일부 테이블 실패는 무시 (다음 로그인 때 재시도됨)
  }
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
      // sender/receiver 각각 독립 FK — 같은 row를 두 유저가 서로 덮어쓰지 않도록 분리
      supabase.from('conversations')
        .update({ sender_user_id: userId })
        .eq('sender_id', deviceId)
        .is('sender_user_id', null),
      supabase.from('conversations')
        .update({ receiver_user_id: userId })
        .eq('receiver_id', deviceId)
        .is('receiver_user_id', null),
    ])
  } catch {
    // user_id 컬럼 미생성 시 무시
  }
}
