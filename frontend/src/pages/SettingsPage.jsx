import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onAuthStateChanged, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { 
  User, 
  Building2, 
  ShieldAlert, 
  Check, 
  Eye, 
  EyeOff, 
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
  Database,
  ShieldCheck,
  Fingerprint,
  FileJson,
  AlertTriangle,
  Info,
  CreditCard
} from 'lucide-react'
import { auth } from '../firebase'
import { loadAuthProfile, saveAuthProfile, normalizeAuthProfile } from '../utils/authProfile'
import { authFetch } from '../utils/api'
import { isAdminEmail } from '../utils/admin'
import './SettingsPage.css'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [authUser, setAuthUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [credits, setCredits] = useState(10)
  const [customCredits, setCustomCredits] = useState(5)

  // Profile and Org state
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [hiringVolume, setHiringVolume] = useState('')
  const [workEmail, setWorkEmail] = useState('')

  // Keep weights state in background for compatibility
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
        const isUserAdmin = isAdminEmail(user.email)
        setIsAdmin(isUserAdmin)
        const profile = normalizeAuthProfile(loadAuthProfile(user.uid))
        
        // Load Profile Fields
        setFullName(user.displayName || profile.fullName || '')
        setCompanyName(profile.companyName || '')
        setJobTitle(profile.jobTitle || '')
        setCompanySize(profile.companySize || '')
        setHiringVolume(profile.hiringVolume || '')
        setWorkEmail(profile.workEmail || user.email || '')
        setCredits(profile.credits ?? 10)

        authFetch('/account/profile')
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => {
            if (!data?.profile) return
            const serverProfile = normalizeAuthProfile(data.profile)
            setFullName(serverProfile.fullName || user.displayName || '')
            setCompanyName(serverProfile.companyName || '')
            setJobTitle(serverProfile.jobTitle || '')
            setCompanySize(serverProfile.companySize || '')
            setHiringVolume(serverProfile.hiringVolume || '')
            setWorkEmail(serverProfile.workEmail || user.email || '')
            setCredits(data.profile.credits ?? 10)
            saveAuthProfile(user.uid, serverProfile)
          })
          .catch(() => {
            // Local cache already populated.
          })

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

  const billingCreditsLabel = isAdmin ? 'Unlimited' : `${credits} credits`
  const billingPlanLabel = isAdmin ? 'Admin account' : '10 free credits on signup'

  // Sync active tab with URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['profile', 'organization', 'billing', 'security'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

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

      const response = await authFetch('/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: updatedProfile.fullName,
          company_name: updatedProfile.companyName,
          job_title: updatedProfile.jobTitle,
          company_size: updatedProfile.companySize,
          hiring_volume: updatedProfile.hiringVolume,
          work_email: updatedProfile.workEmail,
        }),
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const data = await response.json()
      saveAuthProfile(authUser.uid, normalizeAuthProfile(data?.profile || updatedProfile))

      showNotification('Profile and organization details saved successfully.')
    } catch (err) {
      showNotification(err.message || 'Failed to update profile.', 'error')
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

  const handleBuyPlan = async (planId, customCreditsCount = 0) => {
    try {
      setSaving(true)
      const token = await authUser?.getIdToken()
      if (!token) {
        showNotification('Session expired. Please log in again.', 'error')
        return
      }

      // 1. Call Backend Order endpoint
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: planId,
          credits: planId === 'individual' ? Number(customCreditsCount) : 0
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Failed to initiate Razorpay order.')
      }

      const orderData = await response.json()
      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || orderData.key_id

      // 2. Open Razorpay Checkout Modal
      if (!razorpayKeyId) {
        throw new Error('Razorpay key is not configured.')
      }

      const options = {
        key: razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Kovidam Medha',
        description: `Upgrade Plan - ${planId.replace('_', ' ').toUpperCase()}`,
        order_id: orderData.order_id,
        handler: async (response) => {
          try {
            setSaving(true)
            const verifyRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: planId,
                credits: planId === 'individual' ? Number(customCreditsCount) : 0
              })
            })

            if (!verifyRes.ok) {
              const errText = await verifyRes.text()
              throw new Error(errText || 'Payment verification failed.')
            }

            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              saveAuthProfile(authUser.uid, verifyData.profile)
              setCredits(verifyData.profile.credits ?? 10)
              window.dispatchEvent(new Event('profile-update'))
              showNotification(`Successfully purchased ${orderData.credits} credits!`, 'success')
            }
          } catch (verifyErr) {
            showNotification(verifyErr.message || 'Verification failed. Please contact support.', 'error')
          } finally {
            setSaving(false)
          }
        },
        prefill: {
          name: fullName || authUser.displayName || '',
          email: workEmail || authUser.email || '',
        },
        theme: {
          color: '#6366f1'
        },
        modal: {
          ondismiss: () => {
            showNotification('Payment cancelled.', 'info')
            setSaving(false)
          }
        }
      }

      if (!window.Razorpay) {
        throw new Error('Razorpay checkout script is not loaded.')
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      showNotification(err.message || 'Failed to checkout.', 'error')
      setSaving(false)
    }
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
    ...(!isAdmin ? [{ id: 'billing', name: 'Plans & Pricing', icon: CreditCard }] : []),
    { id: 'security', name: 'Security & Data', icon: ShieldAlert }
  ]

  // Avatar letter fallback helper
  const getAvatarInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }
    return authUser?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  // Returns array for rendering team avatars dynamically
  const getTeamAvatarsCount = () => {
    switch (companySize) {
      case '1-10': return 3
      case '11-50': return 7
      case '51-200': return 12
      case '201-1000': return 18
      case '1000+': return 25
      default: return 0
    }
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
          Kovidam System Workspace
        </p>
        <h1>Settings & <span>Configuration</span></h1>
        <p className="settings-desc">Manage account credential records, structure organization schemas, and audit local workspace sessions.</p>
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
              <p>{jobTitle || 'Recruitment Officer'}</p>
              <span className="settings-company-label">{companyName || 'No Workspace Linked'}</span>
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="settings-tab-content"
            >
              {/* TAB 1: PROFILE SETTINGS */}
              {activeTab === 'profile' && (
                <div className="tab-layout-split">
                  {/* Left Column: Premium Real-Time Profile Badge */}
                  <div className="profile-preview-card-wrap">
                    <div className="profile-preview-card">
                      <div className="profile-card-header">
                        <div className="verified-shield">
                          <ShieldCheck size={16} />
                          <span>VERIFIED MEMBER</span>
                        </div>
                        <div className="profile-card-logo">K</div>
                      </div>
                      
                      <div className="profile-card-body">
                        <div className="card-avatar-outer">
                          <div className="card-avatar">
                            {getAvatarInitials()}
                          </div>
                        </div>
                        
                        <div className="card-recruiter-details">
                          <h3>{fullName || 'Your Full Name'}</h3>
                          <p className="card-recruiter-title">{jobTitle || 'Recruitment Specialist'}</p>
                          <p className="card-recruiter-email">{workEmail || 'recruiter@company.com'}</p>
                        </div>
                      </div>

                      <div className="profile-card-footer">
                        <div className="footer-status-pill">
                          <span className="live-dot" />
                          <span>Database Connected</span>
                        </div>
                        <span className="footer-uuid">{authUser?.uid ? `ID: ${authUser.uid.substring(0, 8)}...` : 'ID: --'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Interactive Form */}
                  <form onSubmit={handleSaveProfile} className="settings-form-core">
                    <div className="tab-header-inline">
                      <h2>Recruiter Account Profile</h2>
                      <p>Ensure your contact coordinates are correct to preserve audit trails during candidate shortlisting.</p>
                    </div>

                    <div className="settings-form-fields">
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
                        <small className="help-text">System summaries and notifications will be forwarded to this address.</small>
                      </div>
                    </div>

                    <div className="tab-actions">
                      <button type="submit" className="btn-save btn-primary" disabled={saving}>
                        <Save size={16} />
                        <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: ORGANIZATION SETTINGS */}
              {activeTab === 'organization' && (
                <div className="tab-layout-split">
                  {/* Left Column: Interactive Workspace Team Visualizer */}
                  <div className="org-preview-card-wrap">
                    <div className="org-preview-card">
                      <div className="org-card-header">
                        <h4>Workspace Map</h4>
                        <span className="org-workspace-badge">Active</span>
                      </div>
                      
                      <div className="workspace-visualizer-box">
                        <div className="workspace-office-grid">
                          {getTeamAvatarsCount() > 0 ? (
                            Array.from({ length: getTeamAvatarsCount() }).map((_, idx) => (
                              <div 
                                key={idx} 
                                className="workspace-staff-node"
                                style={{
                                  animationDelay: `${idx * 0.1}s`,
                                  background: `radial-gradient(circle, hsl(${(idx * 45) % 360}, 75%, 60%) 0%, hsl(${(idx * 45) % 360}, 65%, 45%) 100%)`
                                }}
                                title="Active Workspace Seat"
                              />
                            ))
                          ) : (
                            <div className="workspace-empty-state">
                              <Building2 size={24} />
                              <p>Select Company Size</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="org-card-footer">
                        <span className="org-footer-details">{companyName || 'No Workspace Name'}</span>
                        <span className="org-volume-lbl">{hiringVolume ? `${hiringVolume}/mo` : '--'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Interactive Form */}
                  <form onSubmit={handleSaveProfile} className="settings-form-core">
                    <div className="tab-header-inline">
                      <h2>Organization Workspace</h2>
                      <p>Manage corporate parameters, company boundaries, and average monthly recruitment scopes.</p>
                    </div>

                    <div className="settings-form-fields">
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
                </div>
              )}

              {/* TAB: PLANS & PRICING */}
              {activeTab === 'billing' && (
                <div className="pricing-section-container">
                  <div className="pricing-balance-banner">
                    <div className="pricing-balance-info">
                      <h3>Active Resume Balance</h3>
                      <p>{isAdmin ? 'Admin accounts are not charged for shortlist runs.' : 'Used to parse candidate GitHub context, run semantic search & calculate fit scores.'}</p>
                    </div>
                    <div className="pricing-balance-value">
                      {billingCreditsLabel}
                    </div>
                  </div>

                  <div className="pricing-cards-grid">
                    {/* 1. FREE TRIAL */}
                    <div className="pricing-card">
                      <div className="pricing-header">
                        <h4>FREE TRIAL</h4>
                        <h3 className="plan-title">FREE TRIAL</h3>
                      </div>
                      <div className="pricing-price-wrapper">
                        <span className="pricing-price">FREE</span>
                      </div>
                      <p className="custom-price-note" style={{ minHeight: '3rem' }}>{billingPlanLabel}</p>
                      <ul className="pricing-features-list">
                        <li className="pricing-feature-item"><Check size={14} /> AI Resume Scoring</li>
                        <li className="pricing-feature-item"><Check size={14} /> GitHub & Project Analysis</li>
                        <li className="pricing-feature-item"><Check size={14} /> Skill & Keyword Analysis</li>
                        <li className="pricing-feature-item"><Check size={14} /> Basic Candidate Ranking</li>
                        <li className="pricing-feature-item"><Check size={14} /> Instant Results</li>
                      </ul>
                      <button className="pricing-action-btn" disabled style={{ opacity: 0.6 }}>Active Plan</button>
                    </div>

                    {/* 2. INDIVIDUALS / PAY AS YOU GO */}
                    <div className="pricing-card">
                      <div className="pricing-header">
                        <h4>INDIVIDUALS</h4>
                        <h3 className="plan-title">PAY AS YOU GO</h3>
                      </div>
                      <div className="pricing-price-wrapper">
                        <span className="pricing-price">₹ 20</span>
                        <span className="pricing-period">/ resume</span>
                      </div>
                      <div style={{ minHeight: '3rem' }}>
                        <p className="custom-price-note" style={{ margin: 0 }}>Pay only for what you use. (Min. 5 credits)</p>
                        <div className="custom-input-wrapper">
                          <label className="input-label" style={{ fontSize: '0.65rem' }}>Credits:</label>
                          <input 
                            type="number" 
                            min="5" 
                            className="custom-input-field" 
                            value={customCredits} 
                            onChange={(e) => setCustomCredits(Math.max(5, parseInt(e.target.value) || 5))} 
                          />
                        </div>
                      </div>
                      <ul className="pricing-features-list">
                        <li className="pricing-feature-item"><Check size={14} /> Pay only for what you use</li>
                        <li className="pricing-feature-item"><Check size={14} /> No monthly commitment</li>
                        <li className="pricing-feature-item"><Check size={14} /> AI-Powered Analysis</li>
                        <li className="pricing-feature-item"><Check size={14} /> Comprehensive Report</li>
                        <li className="pricing-feature-item"><Check size={14} /> Instant Results</li>
                      </ul>
                      <button className="pricing-action-btn" onClick={() => handleBuyPlan('individual', customCredits)}>Buy {customCredits} Credits</button>
                    </div>

                    {/* 3. STARTER PACK */}
                    <div className="pricing-card popular">
                      <span className="pricing-badge">Popular</span>
                      <div className="pricing-header">
                        <h4>STARTER PACK</h4>
                        <h3 className="plan-title">100 RESUMES</h3>
                      </div>
                      <div className="pricing-price-wrapper">
                        <span className="pricing-price">₹ 1,700</span>
                      </div>
                      <p className="custom-price-note" style={{ minHeight: '3rem', color: '#818cf8' }}>₹ 17 / resume. Save 15% vs Individual.</p>
                      <ul className="pricing-features-list">
                        <li className="pricing-feature-item"><Check size={14} /> All Pay As You Go Features</li>
                        <li className="pricing-feature-item"><Check size={14} /> Bulk Resume Analysis</li>
                        <li className="pricing-feature-item"><Check size={14} /> Candidate Ranking</li>
                        <li className="pricing-feature-item"><Check size={14} /> Export Reports</li>
                        <li className="pricing-feature-item"><Check size={14} /> Email Support</li>
                      </ul>
                      <div className="pricing-card-footer-note">Save 15% vs Individual</div>
                      <button className="pricing-action-btn" onClick={() => handleBuyPlan('starter')}>Get Started</button>
                    </div>

                    {/* 4. GROWTH PACK */}
                    <div className="pricing-card">
                      <div className="pricing-header">
                        <h4>GROWTH PACK</h4>
                        <h3 className="plan-title">250 RESUMES</h3>
                      </div>
                      <div className="pricing-price-wrapper">
                        <span className="pricing-price">₹ 3,750</span>
                      </div>
                      <p className="custom-price-note" style={{ minHeight: '3rem' }}>₹ 15 / resume. Save 25% vs Individual.</p>
                      <ul className="pricing-features-list">
                        <li className="pricing-feature-item"><Check size={14} /> All Starter Pack Features</li>
                        <li className="pricing-feature-item"><Check size={14} /> Advanced Skill Insights</li>
                        <li className="pricing-feature-item"><Check size={14} /> JD Matching</li>
                        <li className="pricing-feature-item"><Check size={14} /> Priority Support</li>
                        <li className="pricing-feature-item"><Check size={14} /> Bulk Export</li>
                      </ul>
                      <div className="pricing-card-footer-note">Save 25% vs Individual</div>
                      <button className="pricing-action-btn" onClick={() => handleBuyPlan('growth')}>Get Started</button>
                    </div>

                    {/* 5. BUSINESS PACK */}
                    <div className="pricing-card">
                      <div className="pricing-header">
                        <h4>BUSINESS PACK</h4>
                        <h3 className="plan-title">500 RESUMES</h3>
                      </div>
                      <div className="pricing-price-wrapper">
                        <span className="pricing-price">₹ 6,250</span>
                      </div>
                      <p className="custom-price-note" style={{ minHeight: '3rem' }}>₹ 12.5 / resume. Save 37.5% vs Individual.</p>
                      <ul className="pricing-features-list">
                        <li className="pricing-feature-item"><Check size={14} /> All Growth Pack Features</li>
                        <li className="pricing-feature-item"><Check size={14} /> API Access</li>
                        <li className="pricing-feature-item"><Check size={14} /> Custom Integrations</li>
                        <li className="pricing-feature-item"><Check size={14} /> Dedicated Support</li>
                        <li className="pricing-feature-item"><Check size={14} /> Advanced Analytics</li>
                      </ul>
                      <div className="pricing-card-footer-note">Save 37.5% vs Individual</div>
                      <button className="pricing-action-btn" onClick={() => handleBuyPlan('business')}>Get Started</button>
                    </div>

                    {/* 6. SUPER BUSINESS PACK */}
                    <div className="pricing-card">
                      <div className="pricing-header">
                        <h4>SUPER BUSINESS</h4>
                        <h3 className="plan-title">1000 RESUMES</h3>
                      </div>
                      <div className="pricing-price-wrapper">
                        <span className="pricing-price">₹ 10,000</span>
                      </div>
                      <p className="custom-price-note" style={{ minHeight: '3rem' }}>₹ 10 / resume. Save 50% vs Individual.</p>
                      <ul className="pricing-features-list">
                        <li className="pricing-feature-item"><Check size={14} /> All Business Pack Features</li>
                        <li className="pricing-feature-item"><Check size={14} /> Team Collaboration</li>
                        <li className="pricing-feature-item"><Check size={14} /> SSO & Role Management</li>
                        <li className="pricing-feature-item"><Check size={14} /> Dedicated Account Manager</li>
                        <li className="pricing-feature-item"><Check size={14} /> Enterprise Security</li>
                      </ul>
                      <div className="pricing-card-footer-note">Save 50% vs Individual</div>
                      <button className="pricing-action-btn" onClick={() => handleBuyPlan('super_business')}>Get Started</button>
                    </div>

                    {/* 7. CUSTOM PLAN */}
                    <div className="pricing-card">
                      <div className="pricing-header">
                        <h4>CUSTOM PLAN</h4>
                        <h3 className="plan-title">CUSTOMIZE</h3>
                      </div>
                      <div className="pricing-price-wrapper">
                        <span className="pricing-price">CUSTOM</span>
                      </div>
                      <p className="custom-price-note" style={{ minHeight: '3rem' }}>Tailored specifically to your business requirements.</p>
                      <ul className="pricing-features-list">
                        <li className="pricing-feature-item"><Check size={14} /> Custom Resume Limit</li>
                        <li className="pricing-feature-item"><Check size={14} /> Tailored Features</li>
                        <li className="pricing-feature-item"><Check size={14} /> Advanced Integrations</li>
                        <li className="pricing-feature-item"><Check size={14} /> On-Premise Options</li>
                        <li className="pricing-feature-item"><Check size={14} /> Priority & Dedicated Support</li>
                      </ul>
                      <div className="pricing-card-footer-note">Built for your needs</div>
                      <button 
                        className="pricing-action-btn" 
                        onClick={() => window.open(`mailto:kovidam26@gmail.com?subject=Custom%20Plan%20Inquiry%20-%20Kovidam%20Medha&body=Hi%20Kovidam%20Team%2C%0A%0AI%20am%20interested%20in%20a%20custom%20billing%20plan%20for%20resumes.%20Here%20are%20my%20details%3A%0A%0APreferred%20Volume%3A%20%0ACompany%20Name%3A%20${companyName}`, '_blank')}
                      >
                        Contact Us
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SECURITY & DATA EXPORT */}
              {activeTab === 'security' && (
                <div className="security-cards-grid">
                  {/* Password Card */}
                  <form onSubmit={handleUpdatePassword} className="security-card-block glass-panel-inner">
                    <div className="card-block-header">
                      <div className="header-icon-ring purple-ring">
                        <Fingerprint size={20} />
                      </div>
                      <div className="header-title-text">
                        <h3>Update Access Password</h3>
                        <p>Change your secure login key regularly to keep your candidate databases protected.</p>
                      </div>
                    </div>

                    <div className="security-form-fields-stack">
                      <div className="premium-input-group">
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

                    <div className="card-block-actions">
                      <button type="submit" className="btn-save btn-primary" disabled={saving}>
                        <Lock size={16} />
                        <span>{saving ? 'Updating...' : 'Update Password'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Right side: Portability and Danger Block */}
                  <div className="security-cards-substack">
                    {/* Data Portability */}
                    <div className="security-card-block glass-panel-inner portability-block">
                      <div className="card-block-header">
                        <div className="header-icon-ring blue-ring">
                          <FileJson size={20} />
                        </div>
                        <div className="header-title-text">
                          <h3>Backup & Export Configurations</h3>
                          <p>Download a backup JSON copy of all local configurations, profiles, and parameters.</p>
                        </div>
                      </div>

                      <div className="portability-info-box">
                        <Info size={16} className="info-icon" />
                        <p>Your exported file will exclude active passwords for safety.</p>
                      </div>

                      <div className="card-block-actions">
                        <button 
                          onClick={handleExportData}
                          className="btn-premium btn-export"
                        >
                          <Download size={16} />
                          <span>Export Config JSON</span>
                        </button>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="security-card-block glass-panel-inner danger-block">
                      <div className="card-block-header">
                        <div className="header-icon-ring red-ring">
                          <AlertTriangle size={20} />
                        </div>
                        <div className="header-title-text">
                          <h3 className="text-red">Danger Zone</h3>
                          <p>Clear all local cache and state. This cannot be undone.</p>
                        </div>
                      </div>

                      <div className="card-block-actions">
                        <button 
                          onClick={() => {
                            const confirm = window.confirm("Are you sure you want to clear your local configurations? This will reset all weights.")
                            if (confirm && authUser) {
                              localStorage.removeItem(`kovidam_weights_${authUser.uid}`)
                              setWeights({
                                technicalDepth: 35,
                                codeQuality: 25,
                                githubActivity: 20,
                                communication: 20
                              })
                              showNotification('Local weights reset successfully.', 'info')
                            }
                          }}
                          className="btn-premium btn-danger-glow"
                        >
                          <Trash2 size={16} />
                          <span>Reset Workspace Cache</span>
                        </button>
                      </div>
                    </div>
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
