import React from 'react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import logoCroppedTight from '../assets/logo-cropped-tight.png'
import './Auth.css'

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      if (fullName.trim()) {
        await updateProfile(cred.user, { displayName: fullName.trim() })
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError('')
    setIsLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Google sign-up failed. Please try again.')
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
          <h1 className="auth-title">Create an Account</h1>
          <p className="auth-subtitle">Join Kovidam to streamline your tech hiring pipeline.</p>
        </div>

        <form className="auth-form" onSubmit={handleSignup}>
          <div className="auth-input-group">
            <label>Full Name</label>
            <input
              type="text"
              className="auth-input"
              placeholder="Alex Recruiter"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label>Company Name</label>
            <input
              type="text"
              className="auth-input"
              placeholder="Tech Innovations Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label>Work Email</label>
            <input
              type="email"
              className="auth-input"
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="auth-input-group">
            <label>Password</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p style={{ color: '#ff6b6b', margin: 0 }}>{error}</p> : null}

          <button type="submit" className="btn-premium btn-primary auth-button" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Start Hiring Now'}
          </button>
          <button
            type="button"
            className="btn-premium auth-button"
            onClick={handleGoogleSignup}
            disabled={isLoading}
            style={{ marginTop: '0.65rem', background: '#fff', color: '#1f2937', border: '1px solid #d1d5db' }}
          >
            Continue with Google
          </button>
        </form>

        <div className="auth-link">
          Already have an account? <span onClick={() => navigate('/login')}>Sign in</span>
        </div>
      </motion.div>
    </div>
  )
}
