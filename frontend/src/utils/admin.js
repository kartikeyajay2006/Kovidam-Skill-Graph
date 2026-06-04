export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'admin@kovidam.co.in').trim().toLowerCase()

export function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL
}
