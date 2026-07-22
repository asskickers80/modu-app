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

export function saveProfile(data) {
  try {
    const prev = getProfile()
    localStorage.setItem(KEY, JSON.stringify({ ...prev, ...data }))
  } catch (_) {}
}

export function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch (_) {
    return {}
  }
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
