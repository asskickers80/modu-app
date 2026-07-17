const KEY = 'modu_user_profile'

// pageBg: 역할색을 흰색에 4% 섞은 앱 전체 페이지 배경 (거의 흰색, 역할 기운만)
export const CATEGORY_CONFIG = {
  seller:    { label: '양도자',   color: '#1a4d8f', bg: '#eef2fb', pageBg: '#f6f8fb', home: '/a7/seller',    message: '/d4/inbox' },
  landlord:  { label: '임대인',   color: '#1e6b6b', bg: '#eef6f6', pageBg: '#f6f9f9', home: '/a7/landlord',  message: '/d4/landlord/inbox' },
  startup:   { label: '창업준비', color: '#2b8ac9', bg: '#eef6fd', pageBg: '#f7fafd', home: '/a7/startup',   message: '/d4/startup/inbox' },
  operating: { label: '운영중',   color: '#2d7a4f', bg: '#edf7f1', pageBg: '#f7faf7', home: '/a7/operating', message: '/d4/operating/inbox' },
  business:  { label: '기업회원', color: '#7d4ba3', bg: '#f5eefb', pageBg: '#faf8fb', home: '/a7/business',  message: '/d4/business/inbox' },
  browsing:  { label: '그냥구경', color: '#8a8a8e', bg: '#f5f5f6', pageBg: '#fafafa', home: '/a7/browsing',  message: null },
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
  try { pendingIds = JSON.parse(sessionStorage.getItem('modu_pending_roles')) ?? [] } catch (_) {}
  sessionStorage.removeItem('modu_pending_roles')
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

/** 지연 온보딩 완료 — 현재 활성 프로필의 pending 해제 */
export function completeProfileOnboarding(category) {
  try {
    const profiles = getProfiles().map(p =>
      p.active && p.category === category ? { ...p, pending: false } : p
    )
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  } catch (_) {}
}

/** 프로필 전환 + 이동 — pending이면 해당 A3 질문(보완 모드)으로, 아니면 홈으로 */
export function activateProfile(navigate, profileId) {
  switchProfile(profileId)
  const p = getProfiles().find(x => x.id === profileId)
  const cfg = p ? CATEGORY_CONFIG[p.category] : null
  if (!p || !cfg) { navigate('/a2'); return }
  if (p.pending && p.category !== 'browsing') {
    navigate(`/a3/${p.category}?complete=1`)
  } else {
    navigate(cfg.home)
  }
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
