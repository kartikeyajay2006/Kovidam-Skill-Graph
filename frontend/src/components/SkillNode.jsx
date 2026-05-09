import React from 'react'
import { motion } from 'framer-motion'
import './SkillNode.css'

export default function SkillNode({ title, x, y, delay }) {
  return (
    <motion.div 
      className="neural-node-wrapper"
      style={{ 
        position: 'absolute', 
        left: `calc(50% + ${x}px)`, 
        top: `calc(50% + ${y}px)`,
        x: '-50%',
        y: '-50%'
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: delay + 0.8, type: "spring", stiffness: 100 }}
    >
      <motion.div 
        className="skill-pill glass-panel"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: delay }}
        whileHover={{ scale: 1.05, borderColor: "rgba(124, 58, 237, 0.6)", y: 0 }}
      >
        <div className="pill-glow" />
        <span className="pill-text">{title}</span>
      </motion.div>
    </motion.div>
  )
}
