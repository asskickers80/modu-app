const KEY = 'modu_user_profile'

export const CATEGORY_CONFIG = {
  seller:    { label: '양도자',   color: '#1a4d8f', bg: '#eef2fb', home: '/a7/seller',    message: '/d4/inbox' },
  landlord:  { label: '임대인',   color: '#1e6b6b', bg: '#eef6f6', home: '/a7/landlord',  message: '/d4/landlord/inbox' },
  startup:   { label: '창업준비', color: '#2b8ac9', bg: '#eef6fd', home: '/a7/startup',   message: '/d4/startup/inbox' },
  operating: { label: '운영중',   color: '#2d7a4f', bg: '#edf7f1', home: '/a7/operating', message: '/d4/operating/inbox' },
  business:  { label: '기업회원', color: '#7d4ba3', bg: '#f5eefb', home: '/a7/business',  message: '/d4/business/inbox' },
  browsing:  { label: '그냥구경', color: '#8a8a8e', bg: '#f5f5f6', home: '/a7/browsing',  message: null },
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
