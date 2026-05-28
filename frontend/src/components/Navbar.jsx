import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Sparkles, Zap, Info, Mail } from 'lucide-react'
import logoCroppedTight from '../assets/logo-cropped-tight.png'
import './Navbar.css'

export default function Navbar() {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()
  
  const navItems = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Product', icon: Sparkles, path: '/product' },
    { name: 'Features', icon: Zap, path: '/features' },
    { name: 'About', icon: Info, path: '/about' },
    { name: 'Contact', icon: Mail, path: '/contact' },
  ]

  return (
    <header className="top-header">
      <div className="header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src={logoCroppedTight} alt="Kovidam Logo" className="brand-logo" />
        <span className="brand-text">KOVI<span className="sanskrit">दम्</span></span>
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
            return (
              <motion.li 
                key={idx} 
                className="nav-item"
                whileHover={{ color: "#ffffff", backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                onClick={() => navigate(item.path)}
                style={{ cursor: 'pointer' }}
              >
                <Icon size={18} className="nav-icon" />
                <AnimatePresence>
                  {isHovered && (
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

      <div className="header-action" style={{ display: 'flex', gap: '10px' }}>
        <motion.button 
          className="btn-premium btn-primary btn-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/contact')}
        >
          Book a Demo
        </motion.button>
        <motion.button
          className="btn-premium btn-sm"
          style={{ background: 'rgba(79, 70, 229, 0.22)', border: '1px solid rgba(129,140,248,0.35)', color: 'white' }}
          whileHover={{ scale: 1.02, background: 'rgba(79, 70, 229, 0.35)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/signup')}
        >
          Sign Up
        </motion.button>
        <motion.button 
          className="btn-premium btn-sm"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
          whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.2)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/login')}
        >
          Login
        </motion.button>
      </div>
    </header>
  )
}
