import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

export default function Signup() {
  const navigate = useNavigate()

  const handleSignup = (e) => {
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
          <h1 className="auth-title">Create an Account</h1>
          <p className="auth-subtitle">Join Kovidam to streamline your tech hiring pipeline.</p>
        </div>

        <form className="auth-form" onSubmit={handleSignup}>
          <div className="auth-input-group">
            <label>Full Name</label>
            <input type="text" className="auth-input" placeholder="Alex Recruiter" required />
          </div>

          <div className="auth-input-group">
            <label>Company Name</label>
            <input type="text" className="auth-input" placeholder="Tech Innovations Inc." required />
          </div>

          <div className="auth-input-group">
            <label>Work Email</label>
            <input type="email" className="auth-input" placeholder="alex@company.com" required />
          </div>
          
          <div className="auth-input-group">
            <label>Password</label>
            <input type="password" className="auth-input" placeholder="••••••••" required />
          </div>

          <button type="submit" className="btn-premium btn-primary auth-button">
            Start Hiring Now
          </button>
        </form>

        <div className="auth-link">
          Already have an account? <span onClick={() => navigate('/login')}>Sign in</span>
        </div>
      </motion.div>
    </div>
  )
}
