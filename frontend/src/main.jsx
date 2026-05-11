import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { auth, authReady } from './firebase'

const originalFetch = window.fetch.bind(window)

window.fetch = async (input, init = {}) => {
  const requestUrl = typeof input === 'string' ? input : input?.url || ''
  const isBackendRoute = requestUrl.startsWith('/hiring') || requestUrl.startsWith('/resume')
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
