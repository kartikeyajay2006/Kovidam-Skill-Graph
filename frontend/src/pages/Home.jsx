import { useEffect, useRef, useState } from 'react'
import { useMotionValue, useScroll, useTransform, motion, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { auth, authReady } from '../firebase'
import { isAdminEmail } from '../utils/admin'
import logoCroppedTight from '../assets/logo-cropped-tight.png'
import HeroLeft from '../components/HeroLeft'
import HeroRight from '../components/HeroRight'
import HowToUse from '../components/HowToUse'

import WhyKovidam from '../components/WhyKovidam'
import Footer from '../components/Footer'
import '../components/HomeSections.css'

export default function Home() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    let active = true
    authReady.then(() => {
      if (!active) return
      if (auth.currentUser) {
        setRedirecting(true)
        setTimeout(() => {
          if (active) {
            navigate(isAdminEmail(auth.currentUser.email) ? '/dashboard/admin' : '/dashboard', { replace: true })
          }
        }, 800)
      } else {
        setCheckingAuth(false)
      }
    })
    return () => {
      active = false
    }
  }, [navigate])

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const containerRef = useRef(null)
  
  const { scrollY } = useScroll()
  const [vh, setVh] = useState(800)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVh(window.innerHeight)
      const handleResize = () => setVh(window.innerHeight)
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Animation values derived from absolute scroll position
  // Master sequence container: 1000vh
  // 0 to 150vh: Hero section
  // 150vh to 350vh: HowToUse card deck
  // 350vh to 450vh: Transition to Why Kovidam
  // 450vh to 900vh: Why Kovidam horizontal scroll
  
  // Hero text & neural system fade out
  const heroOpacity = useTransform(scrollY, [vh * 0.2, vh * 1.2], [1, 0])
  const heroY = useTransform(scrollY, [0, vh * 1.2], ["0px", "-60px"])
  const heroBlur = useTransform(scrollY, [vh * 0.2, vh * 1.2], ["blur(0px)", "blur(10px)"])
  const neuralLinesOpacity = useTransform(scrollY, [0, vh * 0.8], [1, 0])
  const logoOpacity = useTransform(scrollY, [vh * 0.3, vh * 0.8], [1, 0])
  
  // HowToUse section fades in then out
  const howtoOpacity = useTransform(scrollY, [vh * 0.8, vh * 1.5, vh * 3.5, vh * 4.2], [0, 1, 1, 0])
  const howtoScale = useTransform(scrollY, [vh * 0.8, vh * 1.5, vh * 3.5, vh * 4.2], [1.05, 1, 1, 0.92])
  const howtoBlur = useTransform(scrollY, [vh * 0.8, vh * 1.5, vh * 3.5, vh * 4.2], ["blur(15px)", "blur(0px)", "blur(0px)", "blur(15px)"])

  // Scroll indicator disappears
  const indicatorOpacity = useTransform(scrollY, [0, vh * 0.5], [1, 0])

  // Crossfade between Phase 1+2 (Hero/HowToUse) and Phase 3 (Why Kovidam)  
  const phase2Opacity = useTransform(scrollY, [vh * 3.8, vh * 4.5], [0, 1])
  const phase2Scale = useTransform(scrollY, [vh * 3.8, vh * 4.5], [1.1, 1])
  const phase2Blur = useTransform(scrollY, [vh * 3.8, vh * 4.5], ["blur(20px)", "blur(0px)"])
  const phase2Y = useTransform(scrollY, [vh * 3.8, vh * 4.5], ["100px", "0px"])
  
  // Phase 2 Horizontal Scroll
  const whyKovidamX = useTransform(scrollY, [vh * 4.5, vh * 9.0], ["0vw", "-180vw"])

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX / window.innerWidth - 0.5)
      mouseY.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  // Custom pointer events based on visibility
  const [heroActive, setHeroActive] = useState(true)
  const [howtoActive, setHowtoActive] = useState(false)
  const [whyActive, setWhyActive] = useState(false)
  
  useMotionValueEvent(heroOpacity, "change", (latest) => {
    setHeroActive(latest > 0.1)
  })
  
  useMotionValueEvent(howtoOpacity, "change", (latest) => {
    setHowtoActive(latest > 0.3)
  })
  
  useMotionValueEvent(phase2Opacity, "change", (latest) => {
    setWhyActive(latest > 0.1)
  })

  return (
    <div className="home-scroll-container">
      <AnimatePresence>
        {checkingAuth && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              width: '100vw',
              backgroundColor: '#0b0f19',
              color: '#f8fafc',
              fontFamily: "'Outfit', sans-serif",
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 99999,
              overflow: 'hidden'
            }}
          >
            {/* Animated Glow Background */}
            <motion.div 
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.15, 0.25, 0.15]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0) 70%)',
                filter: 'blur(50px)',
                zIndex: 1
              }} 
            />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ marginBottom: '2rem', position: 'relative' }}
              >
                {/* Rotating outer ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: -10,
                    right: -10,
                    bottom: -10,
                    borderRadius: '50%',
                    border: '2px solid transparent',
                    borderTopColor: '#6366f1',
                    borderBottomColor: '#a78bfa',
                    opacity: 0.8
                  }}
                />
                <img 
                  src={logoCroppedTight} 
                  alt="Logo" 
                  style={{ 
                    width: '64px', 
                    height: '64px', 
                    display: 'block',
                    filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))'
                  }} 
                />
              </motion.div>

              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                style={{ 
                  margin: 0, 
                  fontSize: '1.5rem', 
                  fontWeight: 700, 
                  letterSpacing: '1px',
                  background: 'linear-gradient(to right, #f8fafc, #cbd5e1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}
              >
                KOVI<span style={{ color: '#818cf8' }}>दम्</span>
              </motion.h2>

              <motion.p
                key={redirecting ? 'redirecting' : 'checking'}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                style={{ 
                  margin: '0.75rem 0 0 0', 
                  fontSize: '0.95rem', 
                  color: redirecting ? '#a78bfa' : '#94a3b8',
                  fontWeight: redirecting ? 600 : 400,
                  letterSpacing: '0.5px'
                }}
              >
                {redirecting ? 'Welcome back! Opening your workspace...' : 'Connecting to security gateway...'}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* MASTER 1000vh Cinematic Scroll Sequence Container */}
      <div 
        ref={containerRef} 
        className="cinematic-scroll-sequence" 
        style={{ height: '1000vh', position: 'relative' }}
      >
        <div className="sticky-viewport" style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          
          {/* Layer 1: Hero (Neural System + Text) — Fades out first */}
          <motion.main 
            className="hero-container" 
            style={{ 
              height: '100%', 
              opacity: heroOpacity,
              filter: heroBlur,
              pointerEvents: heroActive ? 'auto' : 'none'
            }}
          >
            <HeroLeft 
              heroOpacity={heroOpacity} 
              heroY={heroY}
              heroBlur={heroBlur}
            />
            
            <HeroRight 
              mouseX={mouseX} 
              mouseY={mouseY} 
              logoOpacity={logoOpacity}
              neuralLinesOpacity={neuralLinesOpacity}
            />
          </motion.main>
          
          <motion.div 
            style={{ opacity: indicatorOpacity, position: 'absolute', bottom: '40px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 20 }}
          >
            <div className="scroll-indicator" style={{ position: 'relative', bottom: 'auto' }}>
              <span>As you scroll, explore more</span>
              <ChevronDown className="scroll-arrow" />
            </div>
          </motion.div>

          {/* Layer 2: How to Use Kovidam — Fades in after hero, fades out before WhyKovidam */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: howtoOpacity,
              scale: howtoScale,
              filter: howtoBlur,
              pointerEvents: howtoActive && !whyActive ? 'auto' : 'none',
              zIndex: 25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <HowToUse scrollY={scrollY} vh={vh} />
          </motion.div>

          {/* Layer 3: Why Kovidam — Fades in last */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: phase2Opacity,
              scale: phase2Scale,
              filter: phase2Blur,
              y: phase2Y,
              pointerEvents: whyActive ? 'auto' : 'none',
              zIndex: 30
            }}
          >
            <WhyKovidam x={whyKovidamX} />
          </motion.div>

        </div>
      </div>

      {/* 4. Footer Section */}
      <Footer />
    </div>
  )
}
