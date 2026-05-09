import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Briefcase, Search, Settings, LogOut } from 'lucide-react'
import './Navbar.css'

export default function DashboardNavbar() {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  const navItems = [
    { name: 'Hub', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Shortlist', icon: Briefcase, path: '/dashboard/shortlist' },
    { name: 'Search', icon: Search, path: '/dashboard/search' },
    { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ]

  return (
    <header className="top-header">
      <div className="header-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
        <img src="/src/assets/logo-cropped-tight.png" alt="Kovidam Logo" className="brand-logo" />
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

      <div className="header-action">
        <motion.button 
          className="btn-premium btn-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
          whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/')}
        >
          <LogOut size={16} />
          <span>Exit ATS</span>
        </motion.button>
      </div>
    </header>
  )
}
