import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  UserPlus, 
  LayoutDashboard, 
  UploadCloud, 
  Sliders, 
  Cpu, 
  FileSpreadsheet 
} from 'lucide-react'
import './HowToUse.css'

// Import step images
import stepSignup from '../assets/howto/step_signup.png'
import stepDashboard from '../assets/howto/step_dashboard.png'
import stepUpload from '../assets/howto/step_upload.png'
import stepConfigure from '../assets/howto/step_configure.png'
import stepEvaluating from '../assets/howto/step_evaluating.png'
import stepResults from '../assets/howto/step_results.png'

const STEPS = [
  {
    image: stepSignup,
    badge: 'Step 01',
    title: 'Create Your Account',
    desc: 'Sign up as a new user or log in. Fill in your company details and start your hiring journey in seconds.',
    indicator: 'Sign Up',
    icon: UserPlus
  },
  {
    image: stepDashboard,
    badge: 'Step 02',
    title: 'Your Hiring Dashboard',
    desc: 'See your analytics at a glance — candidates analyzed, shortlists completed, and quick actions to get started.',
    indicator: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    image: stepUpload,
    badge: 'Step 03',
    title: 'Upload Resumes',
    desc: 'Drag and drop or browse to upload resumes. Add or remove files before continuing to the next step.',
    indicator: 'Upload Resumes',
    icon: UploadCloud
  },
  {
    image: stepConfigure,
    badge: 'Step 04',
    title: 'Define Role & Skills',
    desc: 'Fill in the job description, required skills, experience level, and let AI know exactly what you\'re looking for.',
    indicator: 'Configure Role',
    icon: Sliders
  },
  {
    image: stepEvaluating,
    badge: 'Step 05',
    title: 'AI Evaluates Candidates',
    desc: 'Kovidam\'s AI analyzes every resume against your criteria — skills, experience, and behavioral fit scores.',
    indicator: 'AI Evaluation',
    icon: Cpu
  },
  {
    image: stepResults,
    badge: 'Step 06',
    title: 'Results & Export',
    desc: 'View ranked candidates with match scores. Export results to Google Sheets or use semantic search to dig deeper.',
    indicator: 'View Results',
    icon: FileSpreadsheet
  }
]

export default function HowToUse({ scrollY: propScrollY, vh: propVh }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [exitingIndex, setExitingIndex] = useState(null)

  // Fallback to local hooks if props are not provided
  const { scrollY: localScrollY } = useScroll()
  const actualScrollY = propScrollY || localScrollY

  const [localVh, setLocalVh] = useState(800)
  useEffect(() => {
    if (!propVh && typeof window !== 'undefined') {
      setLocalVh(window.innerHeight)
      const handleResize = () => setLocalVh(window.innerHeight)
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [propVh])
  const actualVh = propVh || localVh

  // Calculate scroll thresholds for step transitions
  const startScroll = actualVh * 1.2
  const endScroll = actualVh * 3.6
  const totalRange = endScroll - startScroll
  const stepSize = totalRange / STEPS.length

  // Synchronize active step index with scroll position
  useMotionValueEvent(actualScrollY, "change", (latest) => {
    if (latest >= startScroll && latest <= endScroll) {
      const relativeScroll = latest - startScroll
      const index = Math.min(Math.floor(relativeScroll / stepSize), STEPS.length - 1)
      
      if (index !== activeIndex) {
        setDirection(index > activeIndex ? 1 : -1)
        setExitingIndex(activeIndex)
        setActiveIndex(index)
        setTimeout(() => setExitingIndex(null), 700)
      }
    } else if (latest < startScroll && activeIndex !== 0) {
      setDirection(-1)
      setExitingIndex(activeIndex)
      setActiveIndex(0)
      setTimeout(() => setExitingIndex(null), 700)
    } else if (latest > endScroll && activeIndex !== STEPS.length - 1) {
      setDirection(1)
      setExitingIndex(activeIndex)
      setActiveIndex(STEPS.length - 1)
      setTimeout(() => setExitingIndex(null), 700)
    }
  })

  // Action to scroll window to target step
  const goToStep = useCallback((index) => {
    if (index === activeIndex) return
    const targetDir = index > activeIndex ? 1 : -1
    setDirection(targetDir)
    setExitingIndex(activeIndex)
    setActiveIndex(index)

    // Calculate scroll position corresponding to the middle of this step's range
    const targetScroll = startScroll + (index * stepSize) + (stepSize / 2)
    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    })

    setTimeout(() => setExitingIndex(null), 700)
  }, [activeIndex, startScroll, stepSize])

  const goNext = useCallback(() => {
    const nextIndex = (activeIndex + 1) % STEPS.length
    goToStep(nextIndex)
  }, [activeIndex, goToStep])

  const goPrev = useCallback(() => {
    const prevIndex = (activeIndex - 1 + STEPS.length) % STEPS.length
    goToStep(prevIndex)
  }, [activeIndex, goToStep])

  const getCardClass = (index) => {
    if (index === exitingIndex) {
      return direction === 1 ? 'exit-left' : 'exit-right'
    }

    // Calculate position relative to active card
    let offset = index - activeIndex
    if (offset < 0) offset += STEPS.length

    if (offset === 0) return 'stack-0 active'
    if (offset === 1) return 'stack-1'
    if (offset === 2) return 'stack-2'
    return 'stack-hidden'
  }

  return (
    <section className="howto-section">
      {/* Decorative glows */}
      <div className="howto-glow-1" />
      <div className="howto-glow-2" />

      {/* ── Left Panel ── */}
      <div className="howto-left">
        <motion.div
          className="howto-eyebrow"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
        >
          <span className="howto-eyebrow-dot" />
          Interactive Walkthrough
        </motion.div>

        <motion.h2
          className="howto-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          viewport={{ once: true }}
        >
          How to Use<br/>
          <span className="howto-title-gradient">Kovidam</span>
        </motion.h2>

        <motion.p
          className="howto-subtitle"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          Scroll down to see Kovidam in action step-by-step, or click the icons below to jump to a specific module.
        </motion.p>

        {/* Step indicators */}
        <motion.div
          className="howto-step-indicators"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          {STEPS.map((step, i) => {
            const IconComponent = step.icon;
            return (
              <React.Fragment key={i}>
                <button
                  className={`howto-step-indicator ${i === activeIndex ? 'active' : ''}`}
                  onClick={() => goToStep(i)}
                >
                  <span className="howto-step-icon-wrapper">
                    <IconComponent size={16} className="howto-step-icon" />
                  </span>
                  <span className="howto-step-label">{step.indicator}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`howto-step-connector ${i < activeIndex ? 'active' : ''}`} />
                )}
              </React.Fragment>
            )
          })}
        </motion.div>

        {/* Navigation buttons */}
        <motion.div
          className="howto-nav-buttons"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <button className="howto-nav-btn" onClick={goPrev} aria-label="Previous step">
            <ChevronLeft size={18} />
          </button>
          <span className="howto-counter">
            <span className="howto-counter-current">{String(activeIndex + 1).padStart(2, '0')}</span>
            <span>/</span>
            <span>{String(STEPS.length).padStart(2, '0')}</span>
          </span>
          <button className="howto-nav-btn howto-nav-btn-next" onClick={goNext} aria-label="Next step">
            <ChevronRight size={18} />
          </button>
        </motion.div>
      </div>

      {/* ── Right Card Deck ── */}
      <div className="howto-right">
        <div className="howto-deck-container">
          {STEPS.map((step, index) => {
            const isSelected = index === activeIndex;
            return (
              <div
                key={index}
                className={`howto-card ${getCardClass(index)}`}
                onClick={goNext}
              >
                <div className="howto-card-inner">
                  <div className="howto-card-image-wrapper">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="howto-card-image"
                      loading="lazy"
                    />
                  </div>
                  <div className="howto-card-content">
                    <div className="howto-card-header-row">
                      <span className="howto-card-step-badge">
                        <span className="howto-card-step-badge-line" />
                        {step.badge}
                      </span>
                      {isSelected && (
                        <span className="howto-active-glow-dot" />
                      )}
                    </div>
                    <h3 className="howto-card-title">{step.title}</h3>
                    <p className="howto-card-desc">{step.desc}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Progress dots */}
          <div className="howto-progress-bar">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`howto-progress-dot ${i === activeIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  goToStep(i)
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
