const KEY = 'modu_user_profile'

// pageBg: 역할색을 흰색에 4% 섞은 앱 전체 페이지 배경 (거의 흰색, 역할 기운만)
export const CATEGORY_CONFIG = {
  seller:    { label: '양도인',   color: '#1a4d8f', bg: '#eef2fb', pageBg: '#f6f8fb', home: '/a7/seller',    message: '/d4/inbox' },
  landlord:  { label: '소유주',   color: '#1e6b6b', bg: '#eef6f6', pageBg: '#f6f9f9', home: '/a7/landlord',  message: '/d4/landlord/inbox' },
  startup:   { label: '창업자', color: '#2b8ac9', bg: '#eef6fd', pageBg: '#f7fafd', home: '/a7/startup',   message: '/d4/startup/inbox' },
  operating: { label: '사장님',   color: '#2d7a4f', bg: '#edf7f1', pageBg: '#f7faf7', home: '/a7/operating', message: '/d4/operating/inbox' },
  business:  { label: '기업회원', color: '#7d4ba3', bg: '#f5eefb', pageBg: '#faf8fb', home: '/a7/business',  message: '/d4/business/inbox' },
  browsing:  { label: '방문자', color: '#8a8a8e', bg: '#f5f5f6', pageBg: '#fafafa', home: '/a7/browsing',  message: null },
}

// ── 축별 사업체 정보 분리 (ORDER-profile-data-split-v1) ──────
// 대상 3축만 분리 — 창업준비·기업회원·방문자는 현행 flat 유지(희망 조건·회사 정보는 성격이 다름).
export const ROLE_DATA_CATS = ['seller', 'operating', 'landlord']
// 축별로 분리 저장하는 필드 — 사업체(업종·지역) + 축별 온보딩 응답(잔존·충돌 방지).
// name·category(활성)는 공통 유지. 여기 없는 키는 공통(flat)으로 저장된다.
export const ROLE_DATA_FIELDS = [
  'category_main', 'category_sub', 'ksic_code', 'bizType', 'bizLabel',
  'region', 'region_sub', 'transfer_priority', 'sales', 'status', 'count',
]

const splitRoleFields = (data) => {
  const role = {}, common = {}
  for (const [k, v] of Object.entries(data)) {
    if (ROLE_DATA_FIELDS.includes(k)) role[k] = v
    else common[k] = v
  }
  return { role, common }
}

/**
 * 저장 관문 — 활성(또는 data.category) 축이 대상 3축이면 사업체 필드를 roleData[축]으로
 * 라우팅. flat에 남은 레거시 사업체 필드는 "현재 활성 축" 기준으로 선이관(lazy migration —
 * 서버 SQL과 동일 귀속 기준. SQL 실행 전에도 저장이 실패하지 않는다: 스키마 의존 배포 규칙).
 */
export function saveProfile(data) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY)) || {}
    const cat = data.category ?? raw.category
    if (!ROLE_DATA_CATS.includes(cat)) {
      // 비대상 축 — 현행 flat 병합 (roleData는 raw에 있으면 그대로 보존)
      localStorage.setItem(KEY, JSON.stringify({ ...raw, ...data }))
      return
    }
    const roleData = { ...(raw.roleData ?? {}) }
    // 레거시 flat 사업체 필드 → 이전 활성 축(불명이면 이번 축)으로 귀속 후 flat에서 제거
    const legacy = {}
    for (const k of ROLE_DATA_FIELDS) {
      if (k in raw) { legacy[k] = raw[k]; delete raw[k] }
    }
    if (Object.keys(legacy).length) {
      const owner = ROLE_DATA_CATS.includes(raw.category) ? raw.category : cat
      roleData[owner] = { ...legacy, ...(roleData[owner] ?? {}) }
    }
    const { role, common } = splitRoleFields(data)
    // data.roleData(병합 결과 통째 전달 — finishLogin)가 있으면 축별 병합
    const incoming = common.roleData ?? {}
    delete common.roleData
    const merged = { ...roleData }
    for (const [c, v] of Object.entries(incoming)) merged[c] = { ...(merged[c] ?? {}), ...v }
    merged[cat] = { ...(merged[cat] ?? {}), ...role }
    localStorage.setItem(KEY, JSON.stringify({ ...raw, ...common, roleData: merged }))
  } catch (_) {}
}

/**
 * 읽기 관문 — 활성 축이 대상 3축이면 roleData[축]을 평탄화해 반환.
 * 소비처(축 홈·헤더·완성도·개인화·소개글 생성)는 기존 필드명 그대로 자기 축 값을 받는다.
 */
export function getProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY)) || {}
    const { roleData, ...flat } = p
    if (!roleData) return p // 레거시(분리 전) — 그대로
    if (!ROLE_DATA_CATS.includes(p.category)) return flat
    // 대상 축: flat의 레거시 사업체 필드보다 자기 축 roleData가 우선
    return { ...flat, ...(roleData[p.category] ?? {}) }
  } catch (_) {
    return {}
  }
}

/** 원본(비평탄화) 프로필 — 승계 확인 등 다른 축의 roleData를 봐야 할 때만 사용 */
export function getProfileRaw() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch (_) {
    return {}
  }
}

/**
 * 서버/레거시 profile_data 정규화 — roleData 없는 flat 데이터의 사업체 필드를
 * 계정 활성 축으로 귀속(마이그레이션 SQL과 동일 기준). 대상 축이 아니면 그대로.
 */
export function normalizeProfileData(pd, accountCategory) {
  if (!pd || pd.roleData) return pd ?? {}
  const { role, common } = splitRoleFields(pd)
  if (!Object.keys(role).length || !ROLE_DATA_CATS.includes(accountCategory)) return pd
  return { ...common, roleData: { [accountCategory]: role } }
}

/** 온보딩 답변을 profile_data에 축 라우팅 병합 — 대상 축 답변은 roleData[축]으로 */
export function mergeProfileData(pd, answers) {
  const base = { ...(pd ?? {}) }
  if (!answers || !ROLE_DATA_CATS.includes(answers.category)) return { ...base, ...(answers ?? {}) }
  const { role, common } = splitRoleFields(answers)
  return {
    ...base, ...common,
    roleData: { ...(base.roleData ?? {}), [answers.category]: { ...(base.roleData?.[answers.category] ?? {}), ...role } },
  }
}

/** 승계 확인용 — 해당 축이 보유한 사업체 정보 (roleData 우선, 레거시 flat은 활성 축일 때만) */
export function getRoleBusinessData(cat) {
  const raw = getProfileRaw()
  if (raw.roleData?.[cat] && Object.keys(raw.roleData[cat]).length) return raw.roleData[cat]
  if (!raw.roleData && raw.category === cat) {
    const { role } = splitRoleFields(raw)
    return Object.keys(role).length ? role : null
  }
  return null
}

/**
 * 프로필 추가 승계 후보 — 대상 3축 중 이미 보유(질문 완료)했고 사업체 정보가 있는 축.
 * 대상 축이 아닌 프로필 추가에는 후보가 없다(호출부가 미노출 처리).
 */
export function getCarryoverDonors(targetCat) {
  if (!ROLE_DATA_CATS.includes(targetCat)) return []
  return getProfiles()
    .filter(p => ROLE_DATA_CATS.includes(p.category) && p.category !== targetCat && !p.pending)
    .map(p => ({ cat: p.category, data: getRoleBusinessData(p.category) }))
    .filter(d => d.data && (d.data.category_main || d.data.bizType || d.data.region))
}

export function clearProfile() {
  localStorage.removeItem(KEY)
}

// ── 멀티프로필 ────────────────────────────────────────────
const PROFILES_KEY = 'modu_profiles'

export function getProfiles() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILES_KEY))
    if (Array.isArray(raw) && raw.length > 0) return raw
    const current = getProfile()
    if (!current.category) return []
    const defaults = [{ id: 'p1', category: current.category, name: current.name || '홍길동', active: true }]
    localStorage.setItem(PROFILES_KEY, JSON.stringify(defaults))
    return defaults
  } catch (_) { return [] }
}

export function switchProfile(id) {
  try {
    const profiles = getProfiles().map(p => ({ ...p, active: p.id === id }))
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
    const target = profiles.find(p => p.id === id)
    if (target) saveProfile({ category: target.category, name: target.name })
  } catch (_) {}
}

/**
 * 온보딩(A2) 다중 선택 처리 — B안.
 * 대표 역할만 A3 질문을 거치고, 나머지 선택 역할은 여기서 멀티프로필로 자동 등록한다.
 * pending: true 프로필은 처음 전환할 때 해당 A3 질문을 받는다 (지연 온보딩).
 */
export function registerPendingRoles(name) {
  let pendingIds = []
  try { pendingIds = JSON.parse(localStorage.getItem('modu_pending_roles')) ?? [] } catch (_) {}
  localStorage.removeItem('modu_pending_roles')
  sessionStorage.removeItem('modu_pending_roles') // 구버전 잔재 정리
  if (!Array.isArray(pendingIds) || pendingIds.length === 0) return
  const idMap = { browse: 'browsing' } // A2 선택 id → 프로필 category 표기
  try {
    const profiles = getProfiles() // 대표 프로필 부트스트랩 포함
    let changed = false
    for (const raw of pendingIds) {
      const cat = idMap[raw] ?? raw
      if (!CATEGORY_CONFIG[cat]) continue
      if (profiles.some(p => p.category === cat)) continue
      profiles.push({ id: `p${Date.now()}_${cat}`, category: cat, name: name || '새 프로필', active: false, pending: true })
      changed = true
    }
    if (changed) localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  } catch (_) {}
}

/**
 * 지연 온보딩 완료 — pending 해제 + (pid가 있으면) 그 프로필로 전환 확정.
 * 전환은 질문 완료 시점에 확정된다 — 질문 중 이탈하면 기존 프로필 유지.
 */
export function completeProfileOnboarding(category, profileId = null) {
  try {
    const profiles = getProfiles().map(p => {
      const match = profileId ? p.id === profileId : (p.active && p.category === category)
      return match ? { ...p, pending: false } : p
    })
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
    if (profileId) switchProfile(profileId)
  } catch (_) {}
}

/**
 * 프로필 전환 + 이동.
 * - pending 프로필: 전환하지 않고 해당 A3 질문(보완 모드)으로만 이동 —
 *   질문을 완료해야 전환 확정 (중도 이탈 시 칩과 화면이 어긋나는 것 방지)
 * - 일반 프로필: 즉시 전환 + 홈 이동
 */
export function activateProfile(navigate, profileId) {
  const p = getProfiles().find(x => x.id === profileId)
  const cfg = p ? CATEGORY_CONFIG[p.category] : null
  if (!p || !cfg) { navigate('/a2'); return }
  if (p.pending && p.category !== 'browsing') {
    navigate(`/a3/${p.category}?complete=1&pid=${p.id}`)
    return
  }
  switchProfile(profileId)
  navigate(cfg.home)
}

/**
 * 로그인 시 프로필 합집합 병합 — 계정 저장 역할(profile_data.roles) + 계정 단수 category
 * + 온보딩 선택 + 합류 선택(pending) 을 전부 모아 modu_profiles를 재구성한다. 덮어쓰기 금지.
 * 반환: { profiles(로컬 저장용), activeCat(현재 입장 역할), roles(서버 영속용 목록) }
 */
export function buildMergedProfiles({ existingCategory, serverRoles = [], nickname, onboardingCategory = null, pendingRaw = [] }) {
  const idMap = { browse: 'browsing' }
  const cats = []
  const add = raw => {
    const c = idMap[raw] ?? raw
    if (CATEGORY_CONFIG[c] && !cats.includes(c)) cats.push(c)
  }
  if (existingCategory) add(existingCategory)
  ;(Array.isArray(serverRoles) ? serverRoles : []).forEach(add)
  ;(Array.isArray(pendingRaw) ? pendingRaw : []).forEach(add)
  if (onboardingCategory) add(onboardingCategory)

  // 활성 = 온보딩 답변 역할(A3 거친 경우) > 선택 역할(로그인 지름길로 고른 역할) > 계정 기존 > 첫번째
  const primaryPending = (Array.isArray(pendingRaw) ? pendingRaw : [])
    .map(r => idMap[r] ?? r).find(c => CATEGORY_CONFIG[c] && c !== 'browsing')
  const activeCat = (idMap[onboardingCategory] ?? onboardingCategory) || primaryPending || existingCategory || cats[0] || null
  const profiles = cats.map(c => ({ id: `p_${c}`, category: c, name: nickname || '프로필', active: c === activeCat, pending: false }))
  // browsing(방문자)은 계정 역할 목록에 넣지 않는다 — 실역할만 서버 영속
  const roles = cats.filter(c => c !== 'browsing')
  return { profiles, activeCat, roles }
}

/**
 * 역할을 modu_pending_roles에 즉시 보장 — 선택/진입 시점 저장(내비 시점 저장 금지 원칙).
 * A2 토글·A3 진입 어디서든 호출하면, 이후 어떤 로그인 경로든 finishLogin 병합에 합류한다.
 */
export function ensurePendingRole(category) {
  if (!CATEGORY_CONFIG[category]) return
  try {
    let roles = []
    try { roles = JSON.parse(localStorage.getItem('modu_pending_roles')) ?? [] } catch (_) {}
    if (!Array.isArray(roles)) roles = []
    if (!roles.includes(category)) {
      roles.push(category)
      localStorage.setItem('modu_pending_roles', JSON.stringify(roles))
    }
  } catch (_) {}
}

/**
 * 로그인 상태 역할 추가 확정 — 인증 절차 없이 즉시 완료 (ORDER-profile-add-no-login-v1).
 * 목록에 해당 역할이 있으면 pending 해제 + 활성 전환, 없으면 새 프로필 추가(활성).
 * A2 다중 선택의 나머지 역할(modu_pending_roles)도 이어서 pending 등록 —
 * A4(finishLogin)를 우회하므로 가입 경로가 하던 잔여 역할 등록을 여기서 수행한다.
 */
export function completeLoggedInRoleAdd(category) {
  try {
    const profiles = getProfiles()
    const existing = profiles.find(p => p.category === category)
    const name = profiles.find(p => p.active)?.name ?? existing?.name
    if (existing) {
      const updated = profiles.map(p => ({
        ...p,
        active: p.id === existing.id,
        pending: p.id === existing.id ? false : p.pending,
      }))
      localStorage.setItem(PROFILES_KEY, JSON.stringify(updated))
      saveProfile({ category, name: existing.name })
    } else {
      addProfile(category, name)
    }
    registerPendingRoles(name)
  } catch (_) {}
}

export function addProfile(category, name) {
  try {
    const profiles = getProfiles().map(p => ({ ...p, active: false }))
    const id = 'p' + Date.now()
    profiles.push({ id, category, name: name || '새 프로필', active: true })
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
    saveProfile({ category, name: name || '새 프로필' })
    return id
  } catch (_) { return null }
}
