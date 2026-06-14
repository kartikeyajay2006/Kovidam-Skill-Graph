import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Code2, Crown, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Footer from '../components/Footer'
import './AboutTeam.css'
import './TeamIntro3D.css'

const members = [
  {
    id: 'kartikeya',
    name: 'Kartikeya Yadav',
    focus: 'AI and Platform Engineering',
    roles: ['Chief Technology Officer (CTO)', 'Co-Founder'],
    bio1: 'Kartikeya is an AI enthusiast with strong expertise in intelligent chatbots and automation-driven systems. He works with Python, SQL, and Generative AI to build data-driven and conversational solutions.',
    bio2: 'His technical stack includes Ruby, AWS, and MongoDB, enabling scalable AI-backed applications with real-world impact.',
    expertise: ['GenAI', 'Python', 'Ruby', 'Database Management', 'AWS', 'Backend Development', 'Data Analysis'],
  },
  {
    id: 'chitwan',
    name: 'Chitwan Patel',
    focus: 'Operations and Delivery',
    roles: ['Chief Operating Officer (COO)', 'Co-Founder'],
    bio1: 'Chitwan specializes in building robust and scalable backend systems using Java. He focuses on clean architecture, efficient code, and reliable APIs.',
    bio2: 'Driven by problem-solving and performance optimization, he delivers stable, secure, and maintainable solutions aligned with both client and business goals.',
    expertise: ['Java', 'Data Analysis', 'Backend Architecture', 'API Development', 'System Design'],
  },
]

/* ─── 3D Particle Canvas ──────────────────────────────────────────── */
function ParticleCanvas({ phase }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const particlesRef = useRef([])

  const initParticles = useCallback((w, h) => {
    const particles = []
    const count = Math.min(220, Math.floor((w * h) / 4200))
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 600 - 300,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2.2 + 0.5,
        hue: 230 + Math.random() * 30,
        alpha: Math.random() * 0.5 + 0.3,
      })
    }
    particlesRef.current = particles
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    initParticles(w, h)

    const handleResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
      initParticles(w, h)
    }
    window.addEventListener('resize', handleResize)

    let t = 0
    const draw = () => {
      t += 0.008
      ctx.clearRect(0, 0, w, h)

      const particles = particlesRef.current
      const cx = w / 2
      const cy = h / 2
      const fov = 600

      // Sort by z for depth
      particles.sort((a, b) => a.z - b.z)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Orbit motion
        p.x += p.vx + Math.sin(t + i * 0.02) * 0.15
        p.y += p.vy + Math.cos(t + i * 0.015) * 0.12
        p.z += p.vz

        // Wrap around
        if (p.x < 0) p.x += w
        if (p.x > w) p.x -= w
        if (p.y < 0) p.y += h
        if (p.y > h) p.y -= h
        if (p.z < -300) p.z = 300
        if (p.z > 300) p.z = -300

        // 3D projection
        const scale = fov / (fov + p.z)
        const px = cx + (p.x - cx) * scale
        const py = cy + (p.y - cy) * scale
        const sz = p.size * scale

        // Depth-based alpha
        const depthAlpha = ((p.z + 300) / 600) * 0.6 + 0.2

        ctx.beginPath()
        ctx.arc(px, py, sz, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 80%, 72%, ${p.alpha * depthAlpha})`
        ctx.fill()

        // Glow for closer particles
        if (p.z > 100) {
          ctx.beginPath()
          ctx.arc(px, py, sz * 3, 0, Math.PI * 2)
          const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 3)
          g.addColorStop(0, `hsla(${p.hue}, 85%, 72%, ${0.18 * depthAlpha})`)
          g.addColorStop(1, `hsla(${p.hue}, 85%, 72%, 0)`)
          ctx.fillStyle = g
          ctx.fill()
        }

        // Connection lines for nearby particles
        for (let j = i + 1; j < Math.min(i + 8, particles.length); j++) {
          const q = particles[j]
          const dx = p.x - q.x
          const dy = p.y - q.y
          const dz = p.z - q.z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (dist < 140) {
            const qScale = fov / (fov + q.z)
            const qx = cx + (q.x - cx) * qScale
            const qy = cy + (q.y - cy) * qScale
            const lineAlpha = (1 - dist / 140) * 0.12
            ctx.beginPath()
            ctx.moveTo(px, py)
            ctx.lineTo(qx, qy)
            ctx.strokeStyle = `hsla(235, 75%, 70%, ${lineAlpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [initParticles])

  return <canvas ref={canvasRef} className="team-intro-canvas" />
}

/* ─── 3D Wireframe Cube Component ─────────────────────────────────── */
function WireframeCube() {
  return (
    <div className="cube-scene">
      <div className="cube-wrapper">
        <div className="cube-3d">
          <div className="cube-face cube-front" />
          <div className="cube-face cube-back" />
          <div className="cube-face cube-right" />
          <div className="cube-face cube-left" />
          <div className="cube-face cube-top" />
          <div className="cube-face cube-bottom" />
          {/* Corner glowing dots */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`cube-vertex cube-vertex-${i}`} />
          ))}
        </div>
      </div>
      {/* Outer orbit rings */}
      <div className="cube-orbit cube-orbit-1" />
      <div className="cube-orbit cube-orbit-2" />
      <div className="cube-orbit cube-orbit-3" />
    </div>
  )
}

/* ─── Holographic text reveal ─────────────────────────────────────── */
function HoloText({ phase }) {
  return (
    <motion.div
      className="holo-text-wrapper"
      initial={{ opacity: 0 }}
      animate={{
        opacity: phase >= 1 ? 1 : 0,
      }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="holo-line holo-line-top"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.h1
        className="holo-title"
        initial={{ opacity: 0, y: 30, rotateX: -30 }}
        animate={{
          opacity: phase >= 1 ? 1 : 0,
          y: phase >= 1 ? 0 : 30,
          rotateX: phase >= 1 ? 0 : -30,
        }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="holo-word">KOVIDAM</span>
      </motion.h1>

      <motion.p
        className="holo-sub"
        initial={{ opacity: 0, y: 20, letterSpacing: '0.6em' }}
        animate={{
          opacity: phase >= 1 ? 0.85 : 0,
          y: phase >= 1 ? 0 : 20,
          letterSpacing: phase >= 1 ? '0.28em' : '0.6em',
        }}
        transition={{ duration: 1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        ENGINEERING THE FUTURE
      </motion.p>

      <motion.div
        className="holo-line holo-line-bottom"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Scanning line effect */}
      {phase >= 1 && <div className="holo-scan-line" />}
    </motion.div>
  )
}

/* ─── Main TeamPage ───────────────────────────────────────────────── */
export default function TeamPage() {
  const [showIntro, setShowIntro] = useState(true)
  const [introPhase, setIntroPhase] = useState(0)

  useEffect(() => {
    // Phase 1: Cube + particles visible (immediate)
    const p1 = setTimeout(() => setIntroPhase(1), 200)
    // Phase 2: Text appears
    const p2 = setTimeout(() => setIntroPhase(2), 800)
    // Phase 3: Exit animation begins
    const p3 = setTimeout(() => setIntroPhase(3), 3200)
    // Phase 4: Remove intro
    const p4 = setTimeout(() => setShowIntro(false), 3900)

    return () => {
      clearTimeout(p1)
      clearTimeout(p2)
      clearTimeout(p3)
      clearTimeout(p4)
    }
  }, [])

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <motion.main
            className={`team-intro-3d phase-${introPhase}`}
            aria-label="Kovidam Team Intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <ParticleCanvas phase={introPhase} />

            {/* Central 3D element */}
            <motion.div
              className="intro-3d-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: introPhase >= 1 ? 1 : 0,
                scale: introPhase >= 3 ? 1.3 : introPhase >= 1 ? 1 : 0.5,
              }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <WireframeCube />
            </motion.div>

            {/* Holographic text overlay */}
            <HoloText phase={introPhase} />

            {/* Radial burst on exit */}
            {introPhase >= 3 && (
              <motion.div
                className="intro-burst"
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: [0, 0.8, 0], scale: [0.3, 2.5, 4] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            )}

            {/* Corner HUD elements */}
            <div className="hud-corner hud-tl" />
            <div className="hud-corner hud-tr" />
            <div className="hud-corner hud-bl" />
            <div className="hud-corner hud-br" />

            {/* Loading progress bar */}
            <motion.div
              className="intro-progress"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: introPhase >= 3 ? 1 : introPhase / 3 }}
              transition={{ duration: 0.5 }}
            />
          </motion.main>
        )}
      </AnimatePresence>

      {!showIntro && (
        <motion.main
          className="about-team-page team-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="team-bg team-bg-left" />
          <div className="team-bg team-bg-right" />

          <motion.section
            className="about-hero-card team-hero"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="about-kicker">Kovidam Team</p>
            <h1>
              Meet Our <span>Team</span>
            </h1>
            <p className="about-intro">The people designing trusted AI hiring infrastructure for modern companies.</p>
          </motion.section>

          <motion.div
            className="team-hero-arc"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 0.95, scaleX: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          />

          <section className="team-grid">
            {members.map((member, index) => (
              <motion.article
                className="team-card"
                key={member.name}
                initial={{ opacity: 0, y: 50, rotateX: -8 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: 0.9,
                  delay: 0.4 + index * 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="team-card-head">
                  <div className="team-avatar-shell" aria-hidden="true">
                    <div className="team-avatar-ring">
                      <span className="team-avatar-letter">{member.name.charAt(0)}</span>
                    </div>
                    <div className="team-avatar-badge">
                      {member.id === 'kartikeya' ? <Code2 size={18} /> : <Crown size={18} />}
                    </div>
                  </div>
                  <div className="team-card-top">
                    <p className="team-card-index">{String(index + 1).padStart(2, '0')}</p>
                    <p className="team-card-focus">{member.focus}</p>
                    <h3>{member.name}</h3>
                    <div className="team-role-pills">
                      {member.roles.map((role, roleIndex) => (
                        <span className={roleIndex === 0 ? 'team-role-pill is-primary' : 'team-role-pill'} key={role}>
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="team-divider">
                  <span />
                </div>
                <div className="team-bio-stack">
                  <p>{member.bio1}</p>
                  <p>{member.bio2}</p>
                </div>
                <div className="team-expertise-label">Expertise</div>
                <div className="team-tags">
                  {member.expertise.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </motion.article>
            ))}
          </section>

          <motion.section
            className="team-footer-strip"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            <Users size={20} />
            <p>
              Two minds. One mission – building the future of <span>AI hiring.</span>
            </p>
          </motion.section>
          <Footer />
        </motion.main>
      )}
    </>
  )
}
