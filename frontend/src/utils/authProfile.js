const PROFILE_KEY_PREFIX = 'kovidam_profile_'

export function saveAuthProfile(uid, profile) {
  if (!uid) return
  try {
    localStorage.setItem(`${PROFILE_KEY_PREFIX}${uid}`, JSON.stringify(profile || {}))
  } catch {
    // Ignore storage errors in restricted contexts.
  }
}

export function loadAuthProfile(uid) {
  if (!uid) return {}
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${uid}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
