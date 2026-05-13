import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause } from 'lucide-react'
import SkillNode from './SkillNode'
import logo from '../assets/logo.png'
import './HeroRight.css'

export default function HeroRight({ 
  mouseX, 
  mouseY,
  morphWidth,
  morphHeight,
  morphBorderRadius,
  logoOpacity,
  videoContentOpacity,
  neuralLinesOpacity
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const radius = 240
  const skillLabels = [
    "Skill Graph AI",
    "GitHub Analysis",
    "Bias-Free Hiring",
    "Resume Intelligence",
    "Behavioral Insights",
    "System Design",
    "Real Skill Matching"
  ]

  const nodes = useMemo(() => {
    return skillLabels.map((title, i) => {
      // Offset by -90deg (top) and spread evenly
      const angle = (i / skillLabels.length) * 2 * Math.PI - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      return { title, x, y, delay: i * 0.2 }
    })
  }, [])

  return (
    <section className="hero-right" style={{ position: 'relative' }}>
      
      {/* 1. Background Neural System - Fades out */}
      <motion.div 
        className="neural-system"
        style={{ 
          opacity: neuralLinesOpacity,
          position: 'absolute',
          inset: 0
        }}
      >
        {/* SVG Connection Lines */}
        <svg 
          className="neural-lines-svg" 
          viewBox="-300 -300 600 600"
        >
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(79, 70, 229, 0.8)" />
              <stop offset="100%" stopColor="rgba(12, 12, 18, 0)" />
            </linearGradient>
            <filter id="glowLine">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {nodes.map((node, idx) => {
            const cx = node.x * 0.4 - node.y * 0.2
            const cy = node.y * 0.4 + node.x * 0.2
            return (
              <motion.path 
                key={`line-${idx}`}
                d={`M 0 0 Q ${cx} ${cy} ${node.x} ${node.y}`}
                stroke="url(#lineGrad)"
                strokeWidth="1.5"
                fill="none"
                filter="url(#glowLine)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                transition={{ duration: 1.5, delay: node.delay + 0.5, ease: "easeOut" }}
                className="animated-neural-line"
              />
            )
          })}
        </svg>

        {/* Rotating Halos */}
        <div className="orb-center">
          <motion.div 
            className="halo-ring halo-outer"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="halo-ring halo-inner"
            animate={{ rotate: -360, scale: [1, 1.05, 1] }}
            transition={{ rotate: { duration: 15, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity } }}
          />
        </div>

        {/* Neural Nodes */}
        <div className="nodes-container" style={{ pointerEvents: 'auto' }}>
          {nodes.map((node, idx) => (
            <SkillNode 
              key={`node-${idx}`} 
              title={node.title} 
              x={node.x} 
              y={node.y} 
              delay={node.delay} 
            />
          ))}
        </div>
      </motion.div>

      {/* 2. Seamless Morphing Container (Orb -> Video Player) */}
      <motion.div 
        className="video-container"
        style={{ 
          width: morphWidth,
          height: morphHeight,
          borderRadius: morphBorderRadius,
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          x: '-50%',
          y: '-50%',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {/* Initial Logo Content */}
        <motion.div 
          style={{ 
            opacity: logoOpacity, 
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none'
          }}
        >
          <div className="orb-inner-reflection" />
          <img src={logo} alt="Kovidam AI" className="orb-dolphin" style={{ width: '120px', height: '120px' }} />
        </motion.div>

        {/* Final Video Content */}
        <motion.div
          style={{
            opacity: videoContentOpacity,
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: videoContentOpacity === 0 ? 'none' : 'auto'
          }}
        >
          <button 
            className="play-btn"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
          </button>
          <div className="video-controls" style={{ position: 'absolute', bottom: 0, width: '100%', padding: '20px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <span>{isPlaying ? '▶ 0:12 / 1:30' : '▶ 0:00 / 1:30'}</span>
            <div className="controls-right" style={{ display: 'flex', gap: '15px' }}>
              <span>⚙</span>
              <span>⛶</span>
            </div>
          </div>
        </motion.div>

      </motion.div>

    </section>
  )
}
