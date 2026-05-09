import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    // Simulate auth, then redirect to ATS dashboard
    navigate('/dashboard')
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
          <img src="/src/assets/logo-cropped-tight.png" alt="Logo" style={{ width: '48px', height: '48px' }} />
        </div>
        
        <div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to access your ATS Dashboard and shortlists.</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="auth-input-group">
            <label>Email Address</label>
            <input type="email" className="auth-input" placeholder="recruiter@company.com" required />
          </div>
          
          <div className="auth-input-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              Password
              <span style={{ color: 'var(--accent-indigo)', cursor: 'pointer', fontSize: '0.8rem' }}>Forgot?</span>
            </label>
            <input type="password" className="auth-input" placeholder="••••••••" required />
          </div>

          <button type="submit" className="btn-premium btn-primary auth-button">
            Sign In to Dashboard
          </button>
        </form>

        <div className="auth-link">
          Don't have an account? <span onClick={() => navigate('/signup')}>Sign up</span>
        </div>
      </motion.div>
    </div>
  )
}
