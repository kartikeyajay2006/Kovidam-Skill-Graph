import { useEffect, useRef, useState } from 'react'
import { useMotionValue, useScroll, useTransform, motion, useMotionValueEvent } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { isAdminEmail } from '../utils/admin'
import HeroLeft from '../components/HeroLeft'
import HeroRight from '../components/HeroRight'

import WhyKovidam from '../components/WhyKovidam'
import Footer from '../components/Footer'
import '../components/HomeSections.css'

export default function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate(isAdminEmail(user.email) ? '/dashboard/admin' : '/dashboard', { replace: true })
      }
    })
    return () => unsub()
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
  // 0 to 300vh: Hero -> Video morph
  // 300vh to 450vh: Lens Pull transition to Why Kovidam
  // 450vh to 900vh: Why Kovidam horizontal scroll
  
  // Hero text fades out, drifts up, and blurs
  const heroOpacity = useTransform(scrollY, [vh * 0.2, vh * 1.5], [1, 0])
  const heroY = useTransform(scrollY, [0, vh * 1.5], ["0px", "-60px"])
  const heroBlur = useTransform(scrollY, [vh * 0.2, vh * 1.5], ["blur(0px)", "blur(10px)"])
  
  // Video text fades in, drifts up, and un-blurs
  const videoHeaderOpacity = useTransform(scrollY, [vh * 1.2, vh * 2.5], [0, 1])
  const videoHeaderY = useTransform(scrollY, [vh * 1.2, vh * 2.5], ["60px", "0px"])
  const videoHeaderBlur = useTransform(scrollY, [vh * 1.2, vh * 2.5], ["blur(10px)", "blur(0px)"])

  // Scroll indicator disappears
  const indicatorOpacity = useTransform(scrollY, [0, vh * 0.5], [1, 0])
  
  // Right side morphing
  const morphWidth = useTransform(scrollY, [vh * 0.5, vh * 2.5], ["240px", "800px"])
  const morphHeight = useTransform(scrollY, [vh * 0.5, vh * 2.5], ["240px", "450px"])
  const morphBorderRadius = useTransform(scrollY, [vh * 0.5, vh * 2.5], ["120px", "20px"])
  
  const logoOpacity = useTransform(scrollY, [vh * 0.5, vh * 1.2], [1, 0])
  const videoContentOpacity = useTransform(scrollY, [vh * 1.8, vh * 2.5], [0, 1])
  const neuralLinesOpacity = useTransform(scrollY, [0, vh * 1.0], [1, 0])

  // Crossfade between Phase 1 (Hero/Video) and Phase 2 (Why Kovidam)
  // Upgraded to a cinematic "lens pull" transition
  const phase1Opacity = useTransform(scrollY, [vh * 3.5, vh * 4.5], [1, 0])
  const phase1Scale = useTransform(scrollY, [vh * 3.5, vh * 4.5], [1, 0.8])
  const phase1Blur = useTransform(scrollY, [vh * 3.5, vh * 4.5], ["blur(0px)", "blur(20px)"])
  
  const phase2Opacity = useTransform(scrollY, [vh * 3.5, vh * 4.5], [0, 1])
  const phase2Scale = useTransform(scrollY, [vh * 3.5, vh * 4.5], [1.1, 1])
  const phase2Blur = useTransform(scrollY, [vh * 3.5, vh * 4.5], ["blur(20px)", "blur(0px)"])
  const phase2Y = useTransform(scrollY, [vh * 3.5, vh * 4.5], ["100px", "0px"])
  
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

  // Custom pointer events based on opacity
  const [phase1Active, setPhase1Active] = useState(true)
  useMotionValueEvent(phase1Opacity, "change", (latest) => {
    setPhase1Active(latest > 0.1)
  })

  return (
    <div className="home-scroll-container">
      
      {/* MASTER 1000vh Cinematic Scroll Sequence Container */}
      <div 
        ref={containerRef} 
        className="cinematic-scroll-sequence" 
        style={{ height: '1000vh', position: 'relative' }}
      >
        <div className="sticky-viewport" style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          
          {/* Phase 1: Hero & Video */}
          <motion.main 
            className="hero-container" 
            style={{ 
              height: '100%', 
              opacity: phase1Opacity,
              scale: phase1Scale,
              filter: phase1Blur,
              pointerEvents: phase1Active ? 'auto' : 'none'
            }}
          >
            <HeroLeft 
              heroOpacity={heroOpacity} 
              heroY={heroY}
              heroBlur={heroBlur}
              videoHeaderOpacity={videoHeaderOpacity}
              videoHeaderY={videoHeaderY}
              videoHeaderBlur={videoHeaderBlur}
            />
            
            <HeroRight 
              mouseX={mouseX} 
              mouseY={mouseY} 
              morphWidth={morphWidth}
              morphHeight={morphHeight}
              morphBorderRadius={morphBorderRadius}
              logoOpacity={logoOpacity}
              videoContentOpacity={videoContentOpacity}
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

          {/* Phase 2: Why Kovidam */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: phase2Opacity,
              scale: phase2Scale,
              filter: phase2Blur,
              y: phase2Y,
              pointerEvents: phase1Active ? 'none' : 'auto',
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
