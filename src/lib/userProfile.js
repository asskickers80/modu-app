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
