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

export function normalizeAuthProfile(profile) {
  if (!profile || typeof profile !== 'object') return {}
  return {
    fullName: profile.fullName || profile.full_name || '',
    companyName: profile.companyName || profile.company_name || '',
    jobTitle: profile.jobTitle || profile.job_title || '',
    companySize: profile.companySize || profile.company_size || '',
    hiringVolume: profile.hiringVolume || profile.hiring_volume || '',
    workEmail: profile.workEmail || profile.work_email || profile.auth_email || '',
    status: profile.status || 'active',
    credits: profile.credits !== undefined ? profile.credits : (profile.credits_left !== undefined ? profile.credits_left : 10),
    updatedAtIso: profile.updatedAtIso || profile.updated_at || '',
    createdAtIso: profile.createdAtIso || profile.created_at || '',
    lastSeenAtIso: profile.lastSeenAtIso || profile.last_seen_at || '',
  }
}
