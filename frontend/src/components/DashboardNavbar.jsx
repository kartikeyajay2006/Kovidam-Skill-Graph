import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Briefcase, Search, Settings, LogOut, ShieldCheck } from 'lucide-react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { loadAuthProfile, normalizeAuthProfile } from '../utils/authProfile'
import { authFetch } from '../utils/api'
import { isAdminEmail } from '../utils/admin'
import logoCroppedTight from '../assets/logo-cropped-tight.png'
import './Navbar.css'

export default function DashboardNavbar() {
  const [isHovered, setIsHovered] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState({})
  const [scrolled, setScrolled] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const AUTH_UI_DEBUG = import.meta.env.VITE_AUTH_UI_DEBUG === 'true'

  const fetchProfile = React.useCallback(() => {
    if (auth.currentUser) {
      authFetch('/account/profile')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.profile) {
            setProfile((prev) => ({ ...prev, ...normalizeAuthProfile(data.profile) }))
          }
        })
        .catch(() => {})
    }
  }, [])

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user || null)
      setIsAdmin(isAdminEmail(user?.email))
      setProfile(normalizeAuthProfile(loadAuthProfile(user?.uid)))
      if (user) {
        fetchProfile()
      }
    })
    return () => unsub()
  }, [fetchProfile])

  React.useEffect(() => {
    fetchProfile()
    const handleStart = () => setIsParsing(true)
    const handleEnd = () => setIsParsing(false)
    
    window.addEventListener('profile-update', fetchProfile)
    window.addEventListener('shortlist-start', handleStart)
    window.addEventListener('shortlist-end', handleEnd)
    
    return () => {
      window.removeEventListener('profile-update', fetchProfile)
      window.removeEventListener('shortlist-start', handleStart)
      window.removeEventListener('shortlist-end', handleEnd)
    }
  }, [fetchProfile, location.pathname])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const displayName = authUser?.displayName || profile.fullName || authUser?.email || 'Not signed in'
  const companyLabel = profile.companyName || 'No company linked'
  const adminLabel = isAdmin ? 'Platform Admin · Unlimited' : companyLabel

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (err) {
      if (AUTH_UI_DEBUG) {
        console.error('[auth-ui] signout_failed', err)
      }
    }
  }
  
  const navItems = [
    { name: 'Hub', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Shortlist', icon: Briefcase, path: '/dashboard/shortlist' },
    { name: 'Search', icon: Search, path: '/dashboard/search' },
    ...(isAdmin ? [{ name: 'Admin', icon: ShieldCheck, path: '/dashboard/admin' }] : []),
    { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ]

  const sideStyle = {
    opacity: scrolled ? 0 : 1,
    transform: scrolled ? 'translateY(-12px)' : 'translateY(0)',
    pointerEvents: scrolled ? 'none' : 'auto',
    transition: 'opacity 0.35s ease, transform 0.35s ease',
  }

  return (
    <header className="top-header">
      <div
        className="header-logo"
        onClick={() => !scrolled && navigate('/dashboard')}
        style={{ cursor: scrolled ? 'default' : 'pointer', ...sideStyle }}
      >
        <img src={logoCroppedTight} alt="Kovidam Logo" className="brand-logo" />
        <span className="brand-text">KOVI<span className="sanskrit">दम्</span><span style={{ fontSize: '1.2rem', marginLeft: '10px', fontWeight: 500, color: '#e2e8f0', letterSpacing: '1px' }}>Medha</span></span>
      </div>
      
      <motion.nav 
        className="glass-nav"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <ul className="nav-links">
          {navItems.map((item, idx) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <motion.li 
                key={idx} 
                className="nav-item"
                whileHover={{ color: "#ffffff", backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                onClick={() => navigate(item.path)}
                style={{ 
                  cursor: 'pointer',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                }}
              >
                <Icon size={18} className="nav-icon" />
                <AnimatePresence>
                  {(isHovered || isActive) && (
                    <motion.span 
                      className="nav-text"
                      initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, width: "auto", marginLeft: 8 }}
                      exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </ul>
      </motion.nav>

      <div className="header-action" style={sideStyle}>
        <div style={{ textAlign: 'right', marginRight: '0.75rem', lineHeight: 1.2 }}>
          <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>{displayName}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
            <span>{adminLabel}</span>
            {!isAdmin && (() => {
              const currentCredits = profile.credits ?? 10;
              const maxCredits = currentCredits <= 10 ? 10 : (currentCredits <= 100 ? 100 : (currentCredits <= 250 ? 250 : (currentCredits <= 500 ? 500 : 1000)));
              const percentage = isParsing ? 100 : Math.min(100, Math.max(0, (currentCredits / maxCredits) * 100));
              const midTick = Math.max(0, currentCredits - 1);
              return (
                <div 
                  className="credits-cylinder-widget" 
                  onClick={() => navigate('/dashboard/settings?tab=billing')}
                  title={`Remaining credits: ${currentCredits} / ${maxCredits}. Click to buy more.`}
                  style={{ display: 'inline-flex', marginLeft: '8px' }}
                >
                  <div className="cylinder-glass-container">
                    <div 
                      className="cylinder-liquid-fill" 
                      style={{ 
                        height: `${percentage}%`,
                        background: isParsing 
                          ? 'linear-gradient(to top, #10b981, #34d399, #6ee7b7)' 
                          : 'linear-gradient(to top, #4f46e5, #818cf8, #a78bfa)',
                        boxShadow: isParsing 
                          ? '0 0 10px rgba(52, 211, 153, 0.9)' 
                          : '0 0 10px rgba(129, 140, 248, 0.9)'
                      }} 
                    >
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '50% 50% 0 0',
                        boxShadow: '0 0 4px #ffffff'
                      }} />
                    </div>
                    <div className="cylinder-glass-highlight" />
                    <div className="cylinder-tick tick-top">{currentCredits}</div>
                    <div className="cylinder-tick tick-mid">{midTick}</div>
                    <div className="cylinder-tick tick-bottom">0</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1 }}>
                    <span style={{ color: '#e2e8f0', fontSize: '0.78rem', fontWeight: 800 }}>
                      {isParsing ? 'Parsing...' : `${currentCredits} Cr`}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.55rem', fontWeight: 650 }}>
                      cap: {maxCredits}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        <motion.button 
          className="btn-premium btn-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
          whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </motion.button>
      </div>
    </header>
  )
}
