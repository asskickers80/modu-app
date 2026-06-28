const KEY = 'modu_user_profile'

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
