import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onAuthStateChanged, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { 
  User, 
  Building2, 
  Sliders, 
  ShieldAlert, 
  Check, 
  Eye, 
  EyeOff, 
  Bell, 
  Save, 
  Lock, 
  AlertCircle,
  Download,
  Trash2,
  Mail,
  Briefcase,
  Users,
  Compass,
  Sparkles,
  Database
} from 'lucide-react'
import { auth } from '../firebase'
import { loadAuthProfile, saveAuthProfile } from '../utils/authProfile'
import './SettingsPage.css'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [authUser, setAuthUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // Profile and Org state
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [hiringVolume, setHiringVolume] = useState('')
  const [workEmail, setWorkEmail] = useState('')

  // Skill Graph Weights
  const [weights, setWeights] = useState({
    technicalDepth: 35,
    codeQuality: 25,
    githubActivity: 20,
    communication: 20
  })

  // Security
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [securityError, setSecurityError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: 'Too Short', color: '#ef4444' })

  // Load existing profile & config
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user)
        const profile = loadAuthProfile(user.uid)
        
        // Load Profile Fields
        setFullName(user.displayName || profile.fullName || '')
        setCompanyName(profile.companyName || '')
        setJobTitle(profile.jobTitle || '')
        setCompanySize(profile.companySize || '')
        setHiringVolume(profile.hiringVolume || '')
        setWorkEmail(profile.workEmail || user.email || '')

        // Load Custom Settings if saved in localStorage
        try {
          const savedWeights = localStorage.getItem(`kovidam_weights_${user.uid}`)
          if (savedWeights) setWeights(JSON.parse(savedWeights))
        } catch (e) {
          console.error("Error loading customized weights", e)
        }
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Live Password Strength Check
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength({ score: 0, text: 'Empty', color: '#64748b' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordStrength({ score: 1, text: 'Too Short (Min 6 chars)', color: '#ef4444' })
      return
    }
    
    let score = 2
    let hasLetters = /[a-zA-Z]/.test(newPassword)
    let hasNumbers = /[0-9]/.test(newPassword)
    let hasSpecial = /[^A-Za-z0-9]/.test(newPassword)

    if (hasLetters && hasNumbers) score = 3
    if (hasLetters && hasNumbers && hasSpecial) score = 4
    if (newPassword.length >= 10 && hasLetters && hasNumbers && hasSpecial) score = 5

    const textMap = {
      2: 'Weak',
      3: 'Medium',
      4: 'Strong',
      5: 'Excellent'
    }

    const colorMap = {
      2: '#f97316', // Orange
      3: '#eab308', // Yellow
      4: '#22c55e', // Green
      5: '#10b981'  // Emerald
    }

    setPasswordStrength({
      score,
      text: textMap[score],
      color: colorMap[score]
    })
  }, [newPassword])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }))
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [toast.show])

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  // Handle General Profile & Org Save
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!authUser) return

    setSaving(true)
    try {
      // 1. Sync with Firebase displayName if changed
      if (fullName.trim() !== (authUser.displayName || '')) {
        await updateProfile(authUser, { displayName: fullName.trim() })
      }

      // 2. Build Profile Payload
      const updatedProfile = {
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        companySize,
        hiringVolume,
        workEmail: workEmail.trim().toLowerCase(),
        updatedAtIso: new Date().toISOString()
      }

      // 3. Save to localStorage
      saveAuthProfile(authUser.uid, updatedProfile)

      showNotification('Profile and organization details saved successfully.')
    } catch (err) {
      showNotification(err.message || 'Failed to update profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handle Skill Weights Save
  const handleSaveWeights = (e) => {
    e.preventDefault()
    if (!authUser) return

    const total = weights.technicalDepth + weights.codeQuality + weights.githubActivity + weights.communication
    if (total !== 100) {
      showNotification(`Warning: Configured weights add up to ${total}%. Standard models calculate matches out of 100%.`, 'info')
    }

    setSaving(true)
    try {
      localStorage.setItem(`kovidam_weights_${authUser.uid}`, JSON.stringify(weights))
      showNotification('Skill graph scoring weights updated.')
    } catch (err) {
      showNotification('Failed to save skill graph settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handle Password Update
  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setSecurityError('')

    if (!newPassword) {
      setSecurityError('New password is required.')
      return
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setSecurityError('Password must be at least 6 characters.')
      return
    }

    setSaving(true)
    try {
      // Reauthenticate user first
      const credential = EmailAuthProvider.credential(authUser.email, currentPassword)
      await reauthenticateWithCredential(authUser, credential)

      // Update password
      await updatePassword(authUser, newPassword)
      
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showNotification('Password updated successfully.')
    } catch (err) {
      setSecurityError(err.message || 'Failed to update password. Check your current password.')
    } finally {
      setSaving(false)
    }
  }

  // Preset scoring profiles
  const applyPreset = (presetName) => {
    const presets = {
      balanced: { technicalDepth: 25, codeQuality: 25, githubActivity: 25, communication: 25 },
      deepTech: { technicalDepth: 45, codeQuality: 35, githubActivity: 10, communication: 10 },
      githubScout: { technicalDepth: 20, codeQuality: 15, githubActivity: 50, communication: 15 },
      cultureFit: { technicalDepth: 15, codeQuality: 15, githubActivity: 15, communication: 55 }
    }
    if (presets[presetName]) {
      setWeights(presets[presetName])
      showNotification(`Scoring profile reset to ${presetName === 'deepTech' ? 'Deep Engineering' : presetName === 'githubScout' ? 'GitHub Scout' : presetName === 'cultureFit' ? 'Culture First' : 'Balanced'} preset.`)
    }
  }

  // Weight Slider helper to adjust weights dynamically
  const adjustWeight = (key, value) => {
    setWeights(prev => ({
      ...prev,
      [key]: parseInt(value, 10)
    }))
  }

  const handleExportData = () => {
    const profile = loadAuthProfile(authUser?.uid)
    const exportObj = {
      user: {
        uid: authUser?.uid,
        email: authUser?.email,
        displayName: authUser?.displayName
      },
      profile,
      scoringWeights: weights,
      exportedAt: new Date().toISOString()
    }
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `kovidam_settings_export.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    
    showNotification('Settings export downloaded successfully.')
  }

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="settings-spinner" />
        <p>Syncing dashboard configurations...</p>
      </div>
    )
  }

  const tabItems = [
    { id: 'profile', name: 'Profile & Account', icon: User },
    { id: 'organization', name: 'Organization Info', icon: Building2 },
    { id: 'weights', name: 'Skill Calibrator', icon: Sliders },
    { id: 'security', name: 'Security & Data', icon: ShieldAlert }
  ]

  // Avatar letter fallback helper
  const getAvatarInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }
    return authUser?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  return (
    <div className="settings-container">
      {/* Background radial glows */}
      <div className="settings-glow settings-glow-left" />
      <div className="settings-glow settings-glow-right" />

      {/* Toast notifications */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            className={`settings-toast ${toast.type}`}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Title */}
      <div className="settings-page-header">
        <p className="settings-kicker">
          <Sparkles size={14} className="sparkle-icon-spin" />
          CALIBRATION CENTER
        </p>
        <h1>Settings & <span>Configuration</span></h1>
        <p className="settings-desc">Fine-tune candidate evaluation weights, manage security logs, and customize profile information.</p>
      </div>

      {/* Main Settings Panel */}
      <div className="settings-grid">
        {/* Navigation Sidebar */}
        <aside className="settings-sidebar glass-panel">
          {/* User mini badge */}
          <div className="settings-user-badge">
            <div className="settings-avatar-wrapper">
              <div className="settings-avatar-circle">
                {getAvatarInitials()}
              </div>
              <div className="settings-status-ring pulsing" />
            </div>
            <div className="settings-user-info">
              <h4>{fullName || 'Recruiter'}</h4>
              <p>{jobTitle || 'Lead Recruiter'}</p>
              <span className="settings-company-label">{companyName || 'No Company Linked'}</span>
            </div>
          </div>

          <nav className="settings-nav">
            {tabItems.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSecurityError('')
                  }}
                  className={`settings-nav-btn ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{tab.name}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabIndicator"
                      className="active-indicator" 
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Content Pane */}
        <main className="settings-pane glass-panel">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="settings-tab-content"
            >
              {/* TAB 1: PROFILE SETTINGS */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="settings-animate-form">
                  <div className="tab-header">
                    <h2>Profile Details</h2>
                    <p>Update your personal information and contact details displayed on your profile card.</p>
                  </div>

                  <div className="settings-form-grid">
                    <div className="premium-input-group">
                      <label className="input-label">Full Name</label>
                      <div className="settings-input-wrapper">
                        <User size={18} className="input-inline-icon" />
                        <input
                          type="text"
                          className="premium-input-field"
                          placeholder="e.g. Kartikeya Yadav"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="premium-input-group">
                      <label className="input-label">Job Title / Role</label>
                      <div className="settings-input-wrapper">
                        <Briefcase size={18} className="input-inline-icon" />
                        <input
                          type="text"
                          className="premium-input-field"
                          placeholder="e.g. Senior Tech Recruiter"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="premium-input-group span-2">
                      <label className="input-label">Work Email</label>
                      <div className="settings-input-wrapper">
                        <Mail size={18} className="input-inline-icon" />
                        <input
                          type="email"
                          className="premium-input-field"
                          placeholder="e.g. kartikeya@kovidam.ai"
                          value={workEmail}
                          onChange={(e) => setWorkEmail(e.target.value)}
                          required
                        />
                      </div>
                      <small className="help-text">We'll use this address to send system reports and notifications.</small>
                    </div>
                  </div>

                  <div className="tab-actions">
                    <button type="submit" className="btn-save btn-primary" disabled={saving}>
                      <Save size={16} />
                      <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: ORGANIZATION SETTINGS */}
              {activeTab === 'organization' && (
                <form onSubmit={handleSaveProfile} className="settings-animate-form">
                  <div className="tab-header">
                    <h2>Organization Info</h2>
                    <p>Manage your company details and candidate hiring volume parameters.</p>
                  </div>

                  <div className="settings-form-grid">
                    <div className="premium-input-group span-2">
                      <label className="input-label">Company Name</label>
                      <div className="settings-input-wrapper">
                        <Building2 size={18} className="input-inline-icon" />
                        <input
                          type="text"
                          className="premium-input-field"
                          placeholder="e.g. Kovidam AI"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="premium-input-group">
                      <label className="input-label">Company Size</label>
                      <div className="settings-input-wrapper">
                        <Users size={18} className="input-inline-icon" />
                        <select
                          className="premium-input-field select-field"
                          value={companySize}
                          onChange={(e) => setCompanySize(e.target.value)}
                          required
                        >
                          <option value="">Select range</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-1000">201-1000 employees</option>
                          <option value="1000+">1000+ employees</option>
                        </select>
                      </div>
                    </div>

                    <div className="premium-input-group">
                      <label className="input-label">Hiring Volume / Month</label>
                      <div className="settings-input-wrapper">
                        <Compass size={18} className="input-inline-icon" />
                        <select
                          className="premium-input-field select-field"
                          value={hiringVolume}
                          onChange={(e) => setHiringVolume(e.target.value)}
                          required
                        >
                          <option value="">Select volume</option>
                          <option value="1-5">1-5 candidates</option>
                          <option value="6-20">6-20 candidates</option>
                          <option value="21-100">21-100 candidates</option>
                          <option value="100+">100+ candidates</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="tab-actions">
                    <button type="submit" className="btn-save btn-primary" disabled={saving}>
                      <Save size={16} />
                      <span>{saving ? 'Saving...' : 'Save Organization'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: SKILL GRAPH CONFIGURATION */}
              {activeTab === 'weights' && (
                <form onSubmit={handleSaveWeights} className="settings-calibrator-form">
                  <div className="tab-header">
                    <h2>Skill Calibrator</h2>
                    <p>Customize candidate match scoring logic. Tune how candidate profiles, resumes, and GitHub skills verify against requirements.</p>
                  </div>

                  {/* Calibration Presets */}
                  <div className="calibrator-presets">
                    <span className="preset-label">Scoring Presets:</span>
                    <div className="preset-buttons">
                      <button type="button" className="preset-btn" onClick={() => applyPreset('balanced')}>
                        Balanced
                      </button>
                      <button type="button" className="preset-btn deep-tech-border" onClick={() => applyPreset('deepTech')}>
                        Engineering Focus
                      </button>
                      <button type="button" className="preset-btn github-border" onClick={() => applyPreset('githubScout')}>
                        GitHub Scout
                      </button>
                      <button type="button" className="preset-btn comms-border" onClick={() => applyPreset('cultureFit')}>
                        Culture First
                      </button>
                    </div>
                  </div>

                  {/* Visualizer Row */}
                  <div className="weights-visualizer-row">
                    {/* Donut Chart Visualizer */}
                    <div className="donut-chart-container">
                      <svg viewBox="0 0 160 160" className="donut-chart">
                        {/* Technical circle */}
                        <circle 
                          cx="80" cy="80" r="55" 
                          stroke="#6366f1" strokeWidth="14" fill="transparent"
                          strokeDasharray="345.6"
                          strokeDashoffset="0"
                          style={{
                            strokeDasharray: '345.6',
                            strokeDashoffset: (345.6 - (345.6 * weights.technicalDepth) / 100).toString(),
                            transform: 'rotate(-90deg)',
                            transformOrigin: '50% 50%'
                          }}
                        />
                        {/* Code Quality circle */}
                        <circle 
                          cx="80" cy="80" r="55" 
                          stroke="#a855f7" strokeWidth="14" fill="transparent"
                          strokeDasharray="345.6"
                          strokeDashoffset="0"
                          style={{
                            strokeDasharray: '345.6',
                            strokeDashoffset: (345.6 - (345.6 * weights.codeQuality) / 100).toString(),
                            transform: `rotate(${((weights.technicalDepth * 360) / 100) - 90}deg)`,
                            transformOrigin: '50% 50%'
                          }}
                        />
                        {/* GitHub Verification circle */}
                        <circle 
                          cx="80" cy="80" r="55" 
                          stroke="#22d3ee" strokeWidth="14" fill="transparent"
                          strokeDasharray="345.6"
                          strokeDashoffset="0"
                          style={{
                            strokeDasharray: '345.6',
                            strokeDashoffset: (345.6 - (345.6 * weights.githubActivity) / 100).toString(),
                            transform: `rotate(${(((weights.technicalDepth + weights.codeQuality) * 360) / 100) - 90}deg)`,
                            transformOrigin: '50% 50%'
                          }}
                        />
                        {/* Communication circle */}
                        <circle 
                          cx="80" cy="80" r="55" 
                          stroke="#fbbf24" strokeWidth="14" fill="transparent"
                          strokeDasharray="345.6"
                          strokeDashoffset="0"
                          style={{
                            strokeDasharray: '345.6',
                            strokeDashoffset: (345.6 - (345.6 * weights.communication) / 100).toString(),
                            transform: `rotate(${(((weights.technicalDepth + weights.codeQuality + weights.githubActivity) * 360) / 100) - 90}deg)`,
                            transformOrigin: '50% 50%'
                          }}
                        />
                        {/* Donut inner text */}
                        <circle cx="80" cy="80" r="42" fill="#090a14" />
                      </svg>
                      <div className="donut-center-label">
                        <span className="donut-pct">{weights.technicalDepth + weights.codeQuality + weights.githubActivity + weights.communication}%</span>
                        <span className="donut-txt">Total Scale</span>
                      </div>
                    </div>

                    <div className="weights-legend-pane">
                      <div className="legend-card tech-depth">
                        <div className="legend-head">
                          <div className="legend-color-dot" />
                          <span>Technical Depth</span>
                        </div>
                        <p>Projects, experience & skill match.</p>
                      </div>

                      <div className="legend-card code-quality">
                        <div className="legend-head">
                          <div className="legend-color-dot" />
                          <span>Code Quality</span>
                        </div>
                        <p>Styling, structure & structure verification.</p>
                      </div>

                      <div className="legend-card github-activity">
                        <div className="legend-head">
                          <div className="legend-color-dot" />
                          <span>GitHub Activity</span>
                        </div>
                        <p>Commit volume, releases & open source.</p>
                      </div>

                      <div className="legend-card comms">
                        <div className="legend-head">
                          <div className="legend-color-dot" />
                          <span>Communication</span>
                        </div>
                        <p>Behavioral signals, video, & fit score.</p>
                      </div>
                    </div>
                  </div>

                  <div className="sliders-stack">
                    <div className="slider-group">
                      <div className="slider-label-row">
                        <span>Technical Depth (Experience)</span>
                        <strong>{weights.technicalDepth}%</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={weights.technicalDepth} 
                        onChange={(e) => adjustWeight('technicalDepth', e.target.value)}
                        className="weight-slider slider-tech"
                      />
                    </div>

                    <div className="slider-group">
                      <div className="slider-label-row">
                        <span>Code Quality (Verification)</span>
                        <strong>{weights.codeQuality}%</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={weights.codeQuality} 
                        onChange={(e) => adjustWeight('codeQuality', e.target.value)}
                        className="weight-slider slider-code"
                      />
                    </div>

                    <div className="slider-group">
                      <div className="slider-label-row">
                        <span>GitHub Engagement</span>
                        <strong>{weights.githubActivity}%</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={weights.githubActivity} 
                        onChange={(e) => adjustWeight('githubActivity', e.target.value)}
                        className="weight-slider slider-github"
                      />
                    </div>

                    <div className="slider-group">
                      <div className="slider-label-row">
                        <span>Communication / Behavioral</span>
                        <strong>{weights.communication}%</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={weights.communication} 
                        onChange={(e) => adjustWeight('communication', e.target.value)}
                        className="weight-slider slider-comms"
                      />
                    </div>
                  </div>

                  <div className="weight-status-note">
                    <AlertCircle size={16} />
                    <span>
                      Total Score Target: <strong>{weights.technicalDepth + weights.codeQuality + weights.githubActivity + weights.communication}%</strong>
                      {weights.technicalDepth + weights.codeQuality + weights.githubActivity + weights.communication !== 100 ? ' (Must equal exactly 100% for proper calculations)' : ' (Calibrated)'}
                    </span>
                  </div>

                  <div className="tab-actions">
                    <button type="submit" className="btn-save btn-primary" disabled={saving}>
                      <Save size={16} />
                      <span>{saving ? 'Calibrating...' : 'Apply Calibrated Model'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: SECURITY & DATA EXPORT */}
              {activeTab === 'security' && (
                <div className="security-tab-container">
                  <form onSubmit={handleUpdatePassword} className="settings-animate-form">
                    <div className="tab-header">
                      <h2>Update Password</h2>
                      <p>Ensure your account is secure by setting a strong, unique access key.</p>
                    </div>

                    <div className="settings-form-grid">
                      <div className="premium-input-group span-2">
                        <label className="input-label">Current Password</label>
                        <div className="settings-input-wrapper">
                          <Lock size={18} className="input-inline-icon" />
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            className="premium-input-field password-padding"
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                          />
                          <button 
                            type="button" 
                            className="pwd-toggle-btn"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="premium-input-group">
                        <label className="input-label">New Password</label>
                        <div className="settings-input-wrapper">
                          <Lock size={18} className="input-inline-icon" />
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            className="premium-input-field password-padding"
                            placeholder="At least 6 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                          />
                          <button 
                            type="button" 
                            className="pwd-toggle-btn"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {/* Live strength meter */}
                        <div className="password-strength-meter">
                          <div className="strength-bar-track">
                            <div 
                              className="strength-bar-fill" 
                              style={{ 
                                width: `${(passwordStrength.score / 5) * 100}%`,
                                backgroundColor: passwordStrength.color
                              }} 
                            />
                          </div>
                          <span className="strength-text" style={{ color: passwordStrength.color }}>
                            Strength: {passwordStrength.text}
                          </span>
                        </div>
                      </div>

                      <div className="premium-input-group">
                        <label className="input-label">Confirm New Password</label>
                        <div className="settings-input-wrapper">
                          <Lock size={18} className="input-inline-icon" />
                          <input
                            type="password"
                            className="premium-input-field password-padding"
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {securityError && (
                      <div className="security-error-msg">
                        <AlertCircle size={16} />
                        <span>{securityError}</span>
                      </div>
                    )}

                    <div className="tab-actions">
                      <button type="submit" className="btn-save btn-primary" disabled={saving}>
                        <Lock size={16} />
                        <span>{saving ? 'Updating...' : 'Update Password'}</span>
                      </button>
                    </div>
                  </form>

                  <div className="security-divider" />

                  {/* DATA PORTABILITY */}
                  <div className="security-section">
                    <div className="tab-header">
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Database size={18} style={{ color: '#818cf8' }} />
                        Export Configurations
                      </h3>
                      <p>Download a backup JSON copy of your local configurations, weights, and customized parameters.</p>
                    </div>

                    <button 
                      onClick={handleExportData}
                      className="btn-premium btn-export"
                      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <Download size={16} />
                      <span>Export Settings JSON</span>
                    </button>
                  </div>

                  <div className="security-divider" />

                  {/* DANGER ZONE */}
                  <div className="security-section danger-zone">
                    <div className="tab-header">
                      <h3 style={{ color: '#ef4444' }}>Danger Zone</h3>
                      <p>Clear all local cached configurations. These settings cannot be recovered.</p>
                    </div>

                    <button 
                      onClick={() => {
                        const confirm = window.confirm("Are you sure you want to clear your local configurations? This resets weights to default values.")
                        if (confirm && authUser) {
                          localStorage.removeItem(`kovidam_weights_${authUser.uid}`)
                          setWeights({
                            technicalDepth: 35,
                            codeQuality: 25,
                            githubActivity: 20,
                            communication: 20
                          })
                          showNotification('Local weights and configurations reset successfully.', 'info')
                        }
                      }}
                      className="btn-premium btn-danger"
                      style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
                    >
                      <Trash2 size={16} />
                      <span>Reset Local Settings</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
