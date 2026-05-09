import React from 'react'
import { motion } from 'framer-motion'
import './BackgroundEffects.css'

export default function BackgroundEffects() {
  return (
    <div className="bg-effects-container">
      {/* Top ambient glow */}
      <div className="ambient-orb orb-top"></div>
      {/* Bottom atmospheric depth */}
      <div className="ambient-orb orb-bottom"></div>
      {/* Subtle noise texture */}
      <div className="noise-overlay"></div>
    </div>
  )
}
