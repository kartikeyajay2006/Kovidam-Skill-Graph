import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import SkillNode from './SkillNode'
import './HeroRight.css'

export default function HeroRight() {
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
    <section className="hero-right">
      <div className="neural-system">
        
        {/* SVG Connection Lines */}
        <svg className="neural-lines-svg" viewBox="-300 -300 600 600">
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
            // Curve control point for smooth neural aesthetic
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

        {/* Central Orb */}
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
          <motion.div 
            className="glass-orb"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="orb-inner-reflection" />
            <img src="/src/assets/logo.png" alt="Kovidam AI" className="orb-dolphin" />
          </motion.div>
        </div>

        {/* Neural Nodes */}
        <div className="nodes-container">
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

      </div>
    </section>
  )
}
