import React, { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { isAdminEmail } from '../utils/admin'

export default function AdminRoute() {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser || null)
      setStatus('ready')
    })
    return () => unsub()
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#e2e8f0' }}>
        Loading admin access...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdminEmail(user.email)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
