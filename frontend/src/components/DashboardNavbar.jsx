import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Briefcase, Search, Settings, LogOut } from 'lucide-react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { loadAuthProfile } from '../utils/authProfile'
import logoCroppedTight from '../assets/logo-cropped-tight.png'
import './Navbar.css'

export default function DashboardNavbar() {
  const [isHovered, setIsHovered] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState({})
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const AUTH_UI_DEBUG = import.meta.env.VITE_AUTH_UI_DEBUG === 'true'

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user || null)
      setProfile(loadAuthProfile(user?.uid))
      if (AUTH_UI_DEBUG) {
        console.info('[auth-ui] navbar_auth_state', { uid: user?.uid || null })
      }
    })
    return () => unsub()
  }, [AUTH_UI_DEBUG])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const displayName = authUser?.displayName || profile.fullName || authUser?.email || 'Not signed in'
  const companyLabel = profile.companyName || 'No company linked'

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
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{companyLabel}</div>
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
