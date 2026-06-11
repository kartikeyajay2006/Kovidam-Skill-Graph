import React from 'react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import { Eye, EyeOff } from 'lucide-react'
import { auth, googleProvider } from '../firebase'
import { isAdminEmail } from '../utils/admin'
import logoCroppedTight from '../assets/logo-cropped-tight.png'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate(isAdminEmail(user.email) ? '/dashboard/admin' : '/dashboard', { replace: true })
      }
    })
    return () => unsub()
  }, [navigate])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const AUTH_UI_DEBUG = import.meta.env.VITE_AUTH_UI_DEBUG === 'true'

  const handleForgotPassword = () => {
    const query = new URLSearchParams({
      intent: 'forgot-password',
      email: email.trim(),
    })
    navigate(`/contact?${query.toString()}`)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      if (AUTH_UI_DEBUG) {
        console.info('[auth-ui] login_success_email', { uid: cred.user.uid, email: cred.user.email })
      }
      navigate(isAdminEmail(cred.user.email) ? '/dashboard/admin' : '/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setIsLoading(true)
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      if (AUTH_UI_DEBUG) {
        console.info('[auth-ui] login_success_google', { uid: cred.user.uid, email: cred.user.email })
      }
      navigate(isAdminEmail(cred.user.email) ? '/dashboard/admin' : '/dashboard')
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <img src={logoCroppedTight} alt="Logo" style={{ width: '48px', height: '48px' }} />
        </div>
        
        <div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to access your ATS Dashboard and shortlists.</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="auth-input-group">
            <label>Email Address</label>
            <input
              type="email"
              className="auth-input"
              placeholder="recruiter@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="auth-input-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              Password
              <span
                style={{ color: 'var(--accent-indigo)', cursor: 'pointer', fontSize: '0.8rem' }}
                onClick={handleForgotPassword}
              >
                Forgot?
              </span>
            </label>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input auth-password-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error ? <p style={{ color: '#ff6b6b', margin: 0 }}>{error}</p> : null}

          <button type="submit" className="btn-premium btn-primary auth-button" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
          </button>
          <button
            type="button"
            className="btn-premium auth-button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            style={{ marginTop: '0.65rem', background: '#fff', color: '#1f2937', border: '1px solid #d1d5db' }}
          >
            Continue with Google
          </button>
        </form>

        <div className="auth-link">
          Don't have an account? <span onClick={() => navigate('/signup')}>Sign up</span>
        </div>
      </motion.div>
    </div>
  )
}
