import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import './HeroLeft.css'

export default function HeroLeft({ 
  heroOpacity, 
  heroY, 
  heroBlur,
  videoHeaderOpacity, 
  videoHeaderY,
  videoHeaderBlur
}) {
  const navigate = useNavigate()

  return (
    <section className="hero-left" style={{ display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr', alignItems: 'center' }}>
      
      {/* Original Hero Text - Fades out and moves left */}
      <motion.div 
        style={{ 
          gridColumn: 1, 
          gridRow: 1,
          opacity: heroOpacity, 
          y: heroY,
          filter: heroBlur
        }}
      >
        <motion.h1 
          className="hero-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="font-light">Smarter Shortlists.</span><br/>
          <span className="gradient-text font-bold">Right Talent. Faster.</span>
        </motion.h1>
        
        <motion.p 
          className="hero-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Kovidam maps real skills, GitHub analysis, and behavioral intelligence, helping companies hire top-tier candidates based on absolute capability rather than keyword matching.
        </motion.p>
        
        <motion.div 
          className="hero-ctas"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <button 
            className="btn-premium btn-primary"
            onClick={() => navigate('/signup')}
          >
            Start Hiring Now
          </button>
          <button 
            className="btn-premium btn-secondary"
            onClick={() => navigate('/product')}
          >
            Explore Platform
          </button>
        </motion.div>
      </motion.div>

    </section>
  )
}
