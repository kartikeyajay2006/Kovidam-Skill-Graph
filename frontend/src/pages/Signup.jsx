import React from 'react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth'
import { Eye, EyeOff } from 'lucide-react'
import { auth, googleProvider } from '../firebase'
import { saveAuthProfile } from '../utils/authProfile'
import logoCroppedTight from '../assets/logo-cropped-tight.png'
import './Auth.css'

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [hiringVolume, setHiringVolume] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptPolicy, setAcceptPolicy] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const AUTH_UI_DEBUG = import.meta.env.VITE_AUTH_UI_DEBUG === 'true'

  const buildProfilePayload = (resolvedEmail = '') => ({
    fullName: fullName.trim(),
    companyName: companyName.trim(),
    jobTitle: jobTitle.trim(),
    companySize,
    hiringVolume,
    workEmail: String(resolvedEmail || email).trim().toLowerCase(),
    createdAtIso: new Date().toISOString(),
  })

  const validateBusinessFields = () => {
    if (!fullName.trim()) return 'Full name is required.'
    if (!companyName.trim()) return 'Company name is required.'
    if (!jobTitle.trim()) return 'Role/Title is required.'
    if (!companySize) return 'Company size is required.'
    if (!hiringVolume) return 'Hiring volume is required.'
    return ''
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    if (!acceptPolicy) {
      setError('Please accept terms and privacy notice to continue.')
      return
    }
    const businessValidationError = validateBusinessFields()
    if (businessValidationError) {
      setError(businessValidationError)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setIsLoading(true)

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      if (fullName.trim()) {
        await updateProfile(cred.user, { displayName: fullName.trim() })
      }
      saveAuthProfile(cred.user.uid, buildProfilePayload(cred.user.email || email))
      if (AUTH_UI_DEBUG) {
        console.info('[auth-ui] signup_success_email', { uid: cred.user.uid, email: cred.user.email })
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
    if (!acceptPolicy) {
      setError('Please accept terms and privacy notice to continue.')
      return
    }
    const businessValidationError = validateBusinessFields()
    if (businessValidationError) {
      setError(businessValidationError)
      return
    }
    setIsLoading(true)
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      if (fullName.trim() && !cred.user.displayName) {
        await updateProfile(cred.user, { displayName: fullName.trim() })
      }
      // For Google sign-up, use verified Google account email as source of truth.
      saveAuthProfile(cred.user.uid, buildProfilePayload(cred.user.email || email))
      if (AUTH_UI_DEBUG) {
        console.info('[auth-ui] signup_success_google', { uid: cred.user.uid, email: cred.user.email })
      }
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
        className="auth-card auth-card-wide"
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

        <form className="auth-form auth-form-grid" onSubmit={handleSignup}>
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
            <label>Your Role / Title</label>
            <input
              type="text"
              className="auth-input"
              placeholder="Hiring Manager"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label>Company Size</label>
            <select
              className="auth-input"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              required
            >
              <option value="">Select employee range</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-1000">201-1000 employees</option>
              <option value="1000+">1000+ employees</option>
            </select>
          </div>

          <div className="auth-input-group">
            <label>Hiring Volume / Month</label>
            <select
              className="auth-input"
              value={hiringVolume}
              onChange={(e) => setHiringVolume(e.target.value)}
              required
            >
              <option value="">Select expected hiring volume</option>
              <option value="1-5">1-5 candidates</option>
              <option value="6-20">6-20 candidates</option>
              <option value="21-100">21-100 candidates</option>
              <option value="100+">100+ candidates</option>
            </select>
          </div>

          <div className="auth-input-group auth-grid-span-2">
            <label>Work Email (Email Signup)</label>
            <input
              type="email"
              className="auth-input"
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <small style={{ color: '#94a3b8' }}>
              If you choose Google below, we automatically use your Google account email.
            </small>
          </div>
          
          <div className="auth-input-group">
            <label>Password</label>
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

          <div className="auth-input-group">
            <label>Confirm Password</label>
            <div className="auth-password-wrap">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-input auth-password-input"
                placeholder="Retype password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <label className="auth-consent-row auth-grid-span-2">
            <input
              type="checkbox"
              checked={acceptPolicy}
              onChange={(e) => setAcceptPolicy(e.target.checked)}
            />
            <span>I agree to the terms and privacy notice.</span>
          </label>
          {error ? <p className="auth-error auth-grid-span-2">{error}</p> : null}

          <button type="submit" className="btn-premium btn-primary auth-button auth-grid-span-2" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Start Hiring Now'}
          </button>
          <button
            type="button"
            className="btn-premium auth-button auth-grid-span-2"
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
