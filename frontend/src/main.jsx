import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { auth, authReady } from './firebase'

const originalFetch = window.fetch.bind(window)
const AUTH_FETCH_DEBUG = import.meta.env.VITE_AUTH_FETCH_DEBUG === 'true'

window.fetch = async (input, init = {}) => {
  const requestUrl = typeof input === 'string' ? input : input?.url || ''
  let pathname = ''
  try {
    pathname = new URL(requestUrl, window.location.origin).pathname || ''
  } catch {
    pathname = requestUrl
  }
  const backendPrefixes = ['/hiring', '/resume', '/account', '/admin', '/chat', '/api', '/debug']
  const isBackendRoute = backendPrefixes.some(prefix => pathname.startsWith(prefix))
  if (!isBackendRoute) {
    return originalFetch(input, init)
  }

  // Wait for Firebase to restore persisted session before issuing protected calls.
  await authReady

  const user = auth.currentUser
  let token = ''
  if (user) {
    try {
      token = await user.getIdToken()
    } catch {
      token = ''
    }
  }

  const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined) || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  } else if (AUTH_FETCH_DEBUG) {
    // Useful while diagnosing missing bearer-token issues on protected routes.
    console.warn('[auth-fetch] missing token for backend route', { requestUrl, pathname })
  }

  return originalFetch(input, {
    ...init,
    headers,
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
