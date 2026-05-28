import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, CheckCircle2, ArrowRight, Video, Mic, MessageSquare, 
  Subtitles, PhoneOff, Mail, Users, LineChart, Calendar, Settings, 
  Briefcase, GraduationCap, Bell, ChevronRight, Zap, Brain, Target, 
  BarChart3, Star, Sparkles, Award, TrendingUp, UserCheck
} from 'lucide-react'
import candidateFace from '../assets/candidate_interview_face.png'
import Footer from '../components/Footer'
import './FeaturesPage.css'

export default function FeaturesPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(0)
  const containerRef = useRef(null)

  // Sub-metrics/tabs interactions
  const [activeLifecycleTab, setActiveLifecycleTab] = useState('Overview')
  const [resumeHoveredScore, setResumeHoveredScore] = useState(86)
  
  // Custom waveform animation state
  const [micActive, setMicActive] = useState(true)
  const [cameraActive, setCameraActive] = useState(true)

  // Scroll tracking to update the sidebar dot indicator
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return
      const scrollPosition = containerRef.current.scrollTop
      const sectionHeight = window.innerHeight
      const index = Math.round(scrollPosition / sectionHeight)
      setActiveSection(index)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  const scrollToSection = (index) => {
    if (!containerRef.current) return
    const sectionHeight = window.innerHeight
    containerRef.current.scrollTo({
      top: index * sectionHeight,
      behavior: 'smooth'
    })
    setActiveSection(index)
  }

  // Animation variants for beautiful reveal
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  return (
    <div className="features-page-wrapper">
      {/* Premium Side Scroll-Indicator dots */}
      <div className="vertical-scroll-dots">
        {[0, 1, 2, 3].map((idx) => (
          <button
            key={idx}
            className={`scroll-dot-btn ${activeSection === idx ? 'active' : ''}`}
            onClick={() => scrollToSection(idx)}
            aria-label={`Go to section ${idx + 1}`}
          >
            <span className="dot-label">
              {idx === 0 && 'Skill Graph'}
              {idx === 1 && 'AI Interview'}
              {idx === 2 && 'Lifecycle Hub'}
              {idx === 3 && 'Why Kovidam'}
            </span>
            <span className="dot-circle"></span>
          </button>
        ))}
      </div>

      <div ref={containerRef} className="features-snap-container">
        
        {/* ==================== PAGE 1: KOVIDAM SKILL GRAPH ==================== */}
        <section className="features-section" id="section-skill-graph">
          <div className="glowing-orb bg-indigo"></div>
          <div className="glowing-orb bg-purple" style={{ top: '60%', left: '70%' }}></div>
          
          <div className="section-content-container">
            {/* Top Introductory Header block (orbital layout theme) */}
            <div className="features-intro-block">
              <motion.div 
                className="category-pill-glowing"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Sparkles size={14} className="sparkle-icon-spin" />
                POWERFUL AI SOLUTIONS
              </motion.div>
              <motion.h1 
                className="features-main-title"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Intelligent Tools. <span>Stronger Teams.</span>
              </motion.h1>
              <motion.p 
                className="features-main-subtitle"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                Explore our AI-powered platforms built to transform hiring, interviews, and workforce management.
              </motion.p>

              {/* Glowing Orbital Interactive Graphic */}
              <div className="orbit-interactive-graphic">
                <svg className="orbit-svg" viewBox="0 0 800 120">
                  {/* Outer Orbit Path */}
                  <ellipse cx="400" cy="60" rx="350" ry="40" className="svg-orbit-line" />
                  {/* Glowing Animated Pulse */}
                  <ellipse cx="400" cy="60" rx="350" ry="40" className="svg-orbit-pulse" />
                </svg>
                
                <div className="orbit-nodes-container">
                  <motion.div 
                    className="orbit-node node-1 active"
                    whileHover={{ scale: 1.1 }}
                    onClick={() => scrollToSection(0)}
                  >
                    <div className="node-icon-wrapper">
                      <FileText size={20} />
                    </div>
                    <span className="node-label">ATS Scoring</span>
                  </motion.div>

                  <motion.div 
                    className="orbit-node node-2"
                    whileHover={{ scale: 1.1 }}
                    onClick={() => scrollToSection(1)}
                  >
                    <div className="node-icon-wrapper">
                      <Video size={20} />
                    </div>
                    <span className="node-label">AI Interview</span>
                  </motion.div>

                  <motion.div 
                    className="orbit-node node-3"
                    whileHover={{ scale: 1.1 }}
                    onClick={() => scrollToSection(2)}
                  >
                    <div className="node-icon-wrapper">
                      <Users size={20} />
                    </div>
                    <span className="node-label">Employee Lifecycle</span>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Split Grid for 01: Skill Graph */}
            <div className="features-grid-split">
              {/* Left Column: Information */}
              <motion.div 
                className="info-column"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
              >
                <motion.div className="header-index-group" variants={fadeInUp}>
                  <div className="number-box index-01">01</div>
                  <span className="category-tag">KOVIDAM SKILL GRAPH</span>
                </motion.div>
                
                <motion.h2 className="section-heading" variants={fadeInUp}>
                  AI Resume Scoring
                </motion.h2>
                
                <motion.p className="section-desc" variants={fadeInUp}>
                  Smart resume analysis to identify top-tier talent with unmatched accuracy. We parse, map, and evaluate skills against real job descriptions instantly.
                </motion.p>
                
                <motion.ul className="benefits-checklist" variants={staggerContainer}>
                  {[
                    'AI-Powered ATS Score',
                    'Job Description Matching',
                    'Skill Gap Analysis',
                    'Resume Improvement Suggestions',
                    'Keyword & Format Analysis',
                    'Candidate Ranking'
                  ].map((benefit, i) => (
                    <motion.li key={i} className="benefit-item" variants={fadeInUp}>
                      <span className="check-bullet bg-indigo">
                        <CheckCircle2 size={16} />
                      </span>
                      <span>{benefit}</span>
                    </motion.li>
                  ))}
                </motion.ul>

                <motion.div className="actions-row" variants={fadeInUp}>
                  <motion.button 
                    className="btn-premium btn-primary btn-icon-right"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/signup')}
                  >
                    Access Now <ArrowRight size={18} className="arrow-icon-shift" />
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* Right Column: High Fidelity Dashboard Visualization */}
              <motion.div 
                className="visual-column"
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.8, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                <div className="glass-dashboard-wrapper resume-scoring-dashboard">
                  <div className="dashboard-header-bar">
                    <div className="window-dots">
                      <span className="dot red"></span>
                      <span className="dot yellow"></span>
                      <span className="dot green"></span>
                    </div>
                    <span className="window-title">Kovidam Skill Graph — Candidate Evaluation</span>
                  </div>

                  <div className="dashboard-body">
                    {/* Top Row: Radial Gauge and Match Summary */}
                    <div className="body-grid-top">
                      {/* ATS Score Radial Circle */}
                      <div className="glass-subcard radial-score-card" onMouseEnter={() => setResumeHoveredScore(94)} onMouseLeave={() => setResumeHoveredScore(86)}>
                        <h4 className="card-label">ATS Match Score</h4>
                        
                        <div className="radial-progress-wrapper">
                          <svg className="radial-svg" viewBox="0 0 120 120">
                            {/* Inner background track */}
                            <circle cx="60" cy="60" r="48" className="track-circle" />
                            {/* Glowing dynamic fill circle */}
                            <circle 
                              cx="60" 
                              cy="60" 
                              r="48" 
                              className="fill-circle fill-indigo" 
                              style={{ 
                                strokeDasharray: 301.6,
                                strokeDashoffset: 301.6 - (301.6 * resumeHoveredScore) / 100 
                              }}
                            />
                          </svg>
                          <div className="score-number-display">
                            <span className="big-number">{resumeHoveredScore}</span>
                            <span className="small-label">Out of 100</span>
                          </div>
                        </div>

                        <div className="match-tag-status">
                          <span className="status-dot pulsing-green"></span>
                          <span className="status-text text-green">Great Match</span>
                        </div>
                      </div>

                      {/* Match Summary Progress Bars */}
                      <div className="glass-subcard progress-metrics-card">
                        <h4 className="card-label">Match Summary</h4>
                        <div className="summary-bars-container">
                          {[
                            { label: 'Skills Match', value: 90 },
                            { label: 'Experience Match', value: 80 },
                            { label: 'Keywords Match', value: 85 },
                            { label: 'Format Score', value: 75 }
                          ].map((metric, idx) => (
                            <div key={idx} className="progress-bar-row">
                              <div className="progress-bar-info">
                                <span className="bar-title">{metric.label}</span>
                                <span className="bar-val">{metric.value}%</span>
                              </div>
                              <div className="progress-bar-track">
                                <motion.div 
                                  className="progress-bar-fill bg-gradient-purple"
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${metric.value}%` }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 1, delay: 0.2 }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Skills (Right block) */}
                      <div className="glass-subcard top-skills-card">
                        <h4 className="card-label">Top Skills</h4>
                        <div className="skills-dot-list">
                          {[
                            { name: 'Python', dots: 5 },
                            { name: 'Machine Learning', dots: 4 },
                            { name: 'SQL', dots: 4 },
                            { name: 'Data Analysis', dots: 4 },
                            { name: 'TensorFlow', dots: 4 }
                          ].map((skill, index) => (
                            <div key={index} className="skill-dot-row">
                              <span className="skill-name">{skill.name}</span>
                              <div className="skill-dots-indicator">
                                {[1, 2, 3, 4, 5].map((dot) => (
                                  <span 
                                    key={dot} 
                                    className={`skill-indicator-circle ${dot <= skill.dots ? 'active-green' : ''}`}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Improvement Suggestions & Candidate Ranking */}
                    <div className="body-grid-bottom">
                      <div className="glass-subcard bottom-card suggestions-subcard">
                        <h4 className="card-label flex-align-center text-purple">
                          <TrendingUp size={16} style={{ marginRight: '8px' }} /> Improvement Suggestions
                        </h4>
                        <ul className="dashboard-check-list">
                          <li>
                            <span className="mini-bullet check-purple"><CheckCircle2 size={12} /></span>
                            <span>Add more keywords related to your target role</span>
                          </li>
                          <li>
                            <span className="mini-bullet check-purple"><CheckCircle2 size={12} /></span>
                            <span>Quantify your achievements with solid numbers</span>
                          </li>
                          <li>
                            <span className="mini-bullet check-purple"><CheckCircle2 size={12} /></span>
                            <span>Include more relevant technical toolkits</span>
                          </li>
                        </ul>
                      </div>

                      <div className="glass-subcard bottom-card ranking-subcard">
                        <h4 className="card-label flex-align-center text-indigo">
                          <Award size={16} style={{ marginRight: '8px' }} /> Candidate Ranking
                        </h4>
                        <div className="ranking-candidates-list">
                          {[
                            { name: 'John Doe', score: 86, pos: 1, color: 'first' },
                            { name: 'Sarah Smith', score: 76, pos: 2, color: 'second' },
                            { name: 'Mike Johnson', score: 68, pos: 3, color: 'third' }
                          ].map((cand, index) => (
                            <div key={index} className="rank-item-row">
                              <div className="rank-left-avatar">
                                <span className={`rank-badge ${cand.color}`}>{cand.pos}</span>
                                <span className="cand-name-txt">{cand.name}</span>
                              </div>
                              <div className="rank-bar-wrap">
                                <span className="score-percentage">{cand.score}%</span>
                                <div className="mini-progress-track">
                                  <div className="mini-progress-fill" style={{ width: `${cand.score}%` }}></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ==================== PAGE 2: KOVIDAM AI INTERVIEW ==================== */}
        <section className="features-section" id="section-ai-interview">
          <div className="glowing-orb bg-violet" style={{ top: '20%', left: '80%' }}></div>
          <div className="glowing-orb bg-indigo" style={{ top: '80%', left: '10%' }}></div>
          
          <div className="section-content-container">
            <div className="features-grid-split">
              {/* Left Column: Information */}
              <motion.div 
                className="info-column"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
              >
                <motion.div className="header-index-group" variants={fadeInUp}>
                  <div className="number-box index-02">02</div>
                  <span className="category-tag text-cyan">KOVIDAM AI INTERVIEW</span>
                </motion.div>
                
                <motion.h2 className="section-heading" variants={fadeInUp}>
                  AI Interview Platform
                </motion.h2>
                
                <motion.p className="section-desc" variants={fadeInUp}>
                  Conduct smart, automated audio-visual interviews powered by AI. Evaluate communication, confidence, technical competency, and cognitive skills with zero human bias.
                </motion.p>
                
                <motion.ul className="benefits-checklist" variants={staggerContainer}>
                  {[
                    'AI Mock Interviews',
                    'Technical & Behavioral Assessments',
                    'Instant AI Feedback & Scoring',
                    'Automated Candidate Reports',
                    'Communication & Confidence Analysis',
                    'Scalable Interview Process'
                  ].map((benefit, i) => (
                    <motion.li key={i} className="benefit-item" variants={fadeInUp}>
                      <span className="check-bullet bg-cyan">
                        <CheckCircle2 size={16} />
                      </span>
                      <span>{benefit}</span>
                    </motion.li>
                  ))}
                </motion.ul>

                <motion.div className="actions-row flex-row gap-md" variants={fadeInUp}>
                  <motion.button 
                    className="btn-premium btn-primary btn-cyan btn-icon-right"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/signup')}
                  >
                    Access Now <ArrowRight size={18} className="arrow-icon-shift" />
                  </motion.button>
                  <motion.button 
                    className="btn-premium btn-secondary btn-icon-left"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/contact')}
                  >
                    <Mail size={16} style={{ marginRight: '8px' }} /> Contact Us
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* Right Column: AI Interview Studio Mockup */}
              <motion.div 
                className="visual-column"
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.8, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                <div className="glass-dashboard-wrapper interview-studio-dashboard">
                  <div className="dashboard-header-bar">
                    <div className="window-dots">
                      <span className="dot red"></span>
                      <span className="dot yellow"></span>
                      <span className="dot green"></span>
                    </div>
                    <span className="window-title">Kovidam Live AI Interview Studio</span>
                  </div>

                  <div className="dashboard-body flex-col gap-sm">
                    {/* Live Stream Panel Grid */}
                    <div className="interview-main-row">
                      {/* Video Stream */}
                      <div className="glass-subcard video-stream-card">
                        <div className="video-stream-container">
                          <img 
                            src={candidateFace} 
                            alt="Live Candidate Stream" 
                            className={`live-candidate-video ${cameraActive ? '' : 'video-disabled'}`}
                          />
                          
                          {/* Top-Right LIVE Pill */}
                          <div className="live-badge-overlay">
                            <span className="live-dot-blink"></span>
                            Live
                          </div>

                          {/* Top-Left Candidate Tag */}
                          <div className="candidate-name-overlay">
                            Deepika Sharma (Software Dev Candidate)
                          </div>

                          {/* Camera disabled cover */}
                          {!cameraActive && (
                            <div className="camera-off-overlay">
                              <span>Camera Feed Paused</span>
                            </div>
                          )}

                          {/* Control Bar Overlay */}
                          <div className="video-control-bar">
                            <button 
                              className={`control-circle-btn ${cameraActive ? '' : 'muted'}`} 
                              onClick={() => setCameraActive(!cameraActive)}
                              title={cameraActive ? 'Pause Video' : 'Resume Video'}
                            >
                              <Video size={16} />
                            </button>
                            <button 
                              className={`control-circle-btn ${micActive ? '' : 'muted'}`} 
                              onClick={() => setMicActive(!micActive)}
                              title={micActive ? 'Mute Mic' : 'Unmute Mic'}
                            >
                              <Mic size={16} />
                            </button>
                            <button className="control-circle-btn"><MessageSquare size={16} /></button>
                            <button className="control-circle-btn"><Subtitles size={16} /></button>
                            <button className="control-circle-btn red-hangup" onClick={() => alert('Demo Call Ending Mockup')}><PhoneOff size={16} /></button>
                          </div>
                        </div>
                      </div>

                      {/* AI Interviewer console / Question Card */}
                      <div className="glass-subcard ai-interviewer-card">
                        <div className="question-console-header">
                          <span className="question-index-tag">Question 4/6</span>
                          <span className="ai-badge-glowing">AI EVALUATOR</span>
                        </div>
                        
                        <div className="interviewer-question-body">
                          <p className="question-text">
                            "Explain the difference between SQL JOIN and UNION, and in what scenarios you would choose one over the other."
                          </p>
                        </div>

                        {/* Pulsing Audio Waveform Indicator */}
                        <div className="audio-listening-indicator-row">
                          <div className="listening-label">
                            <span className={`listening-dot ${micActive ? 'pulsing' : ''}`}></span>
                            {micActive ? 'Listening...' : 'Microphone Muted'}
                          </div>
                          
                          {micActive && (
                            <div className="audio-waveform-bars">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((bar) => {
                                // Add varying animation delay
                                const randomDelay = Math.random() * 0.8;
                                const randomHeight = 10 + Math.random() * 25;
                                return (
                                  <div 
                                    key={bar} 
                                    className="waveform-bar"
                                    style={{ 
                                      height: `${randomHeight}px`,
                                      animationDelay: `${randomDelay}s` 
                                    }}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Competencies Metrics Row */}
                    <div className="interview-metrics-row">
                      {[
                        { label: 'Communication', score: 85, color: 'cyan', icon: MessageSquare },
                        { label: 'Confidence', score: 78, color: 'purple', icon: UserCheck },
                        { label: 'Technical Skills', score: 88, color: 'indigo', icon: Award },
                        { label: 'Problem Solving', score: 82, color: 'emerald', icon: Brain }
                      ].map((item, idx) => {
                        const Icon = item.icon
                        return (
                          <div key={idx} className="glass-subcard competency-gauge-card">
                            <div className="gauge-icon-text">
                              <div className={`gauge-icon-wrap ${item.color}`}>
                                <Icon size={16} />
                              </div>
                              <span className="gauge-name">{item.label}</span>
                            </div>
                            <div className="gauge-percentage-row">
                              <span className="gauge-pct-num">{item.score}%</span>
                              <div className="gauge-visual-strip">
                                <div className={`gauge-strip-fill ${item.color}`} style={{ width: `${item.score}%` }}></div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ==================== PAGE 3: EMPLOYEE LIFECYCLE PLATFORM ==================== */}
        <section className="features-section" id="section-lifecycle">
          <div className="glowing-orb bg-orange" style={{ top: '30%', left: '20%' }}></div>
          <div className="glowing-orb bg-red" style={{ top: '70%', left: '80%' }}></div>
          
          <div className="section-content-container">
            <div className="features-grid-split">
              {/* Left Column: Information */}
              <motion.div 
                className="info-column"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
              >
                <motion.div className="header-index-group" variants={fadeInUp}>
                  <div className="number-box index-03">03</div>
                  <span className="category-tag text-orange">EMPLOYEE LIFECYCLE PLATFORM</span>
                  <div className="coming-soon-tag-capsule">Coming Soon</div>
                </motion.div>
                
                <motion.h2 className="section-heading" variants={fadeInUp}>
                  Full Employee Management System
                </motion.h2>
                
                <motion.p className="section-desc" variants={fadeInUp}>
                  A complete digital hub to manage your employees from day-one onboarding, to continuous feedback, metrics analysis, performance tracking, and strategic growth.
                </motion.p>
                
                <motion.ul className="benefits-checklist" variants={staggerContainer}>
                  {[
                    'Smart Employee Onboarding Tracks',
                    'Real-time Performance & Goal Tracking',
                    'Workforce & Team Management Analytics',
                    'Employee Skill Insights & Matrix Mapping',
                    'Custom Workflow Automation & Notifications',
                    'Advanced Workforce Predictive Analytics'
                  ].map((benefit, i) => (
                    <motion.li key={i} className="benefit-item" variants={fadeInUp}>
                      <span className="check-bullet bg-orange">
                        <CheckCircle2 size={16} />
                      </span>
                      <span>{benefit}</span>
                    </motion.li>
                  ))}
                </motion.ul>

                <motion.div className="actions-row flex-row gap-md" variants={fadeInUp}>
                  <motion.button 
                    className="btn-premium btn-primary btn-orange btn-icon-right disabled-like"
                    style={{ opacity: 0.7 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => alert('Full Employee Management is coming soon to Kovidam!')}
                  >
                    Coming Soon <ArrowRight size={18} className="arrow-icon-shift" />
                  </motion.button>
                  <motion.button 
                    className="btn-premium btn-secondary btn-icon-left"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => alert('You have been subscribed to employee lifecycle platform notifications!')}
                  >
                    <Bell size={16} style={{ marginRight: '8px' }} /> Notify Me
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* Right Column: Mini Dashboard UI Representation */}
              <motion.div 
                className="visual-column"
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.8, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                <div className="glass-dashboard-wrapper employee-lifecycle-dashboard">
                  <div className="dashboard-header-bar">
                    <div className="window-dots">
                      <span className="dot red"></span>
                      <span className="dot yellow"></span>
                      <span className="dot green"></span>
                    </div>
                    <span className="window-title">Kovidam Lifecycle Hub — Corporate Overview</span>
                  </div>

                  <div className="dashboard-body flex-row no-padding" style={{ minHeight: '360px' }}>
                    {/* Dashboard Mini Sidebar */}
                    <div className="dashboard-mini-sidebar">
                      {[
                        { name: 'Overview', icon: LineChart },
                        { name: 'Employees', icon: Users },
                        { name: 'Onboarding', icon: Calendar },
                        { name: 'Performance', icon: Briefcase },
                        { name: 'Analytics', icon: GraduationCap },
                        { name: 'Settings', icon: Settings }
                      ].map((tab, tIdx) => {
                        const Icon = tab.icon
                        return (
                          <div 
                            key={tIdx} 
                            className={`mini-sidebar-item ${activeLifecycleTab === tab.name ? 'active' : ''}`}
                            onClick={() => setActiveLifecycleTab(tab.name)}
                          >
                            <Icon size={16} />
                            <span className="sidebar-tab-txt">{tab.name}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Dashboard Tab Content Workspace */}
                    <div className="dashboard-workspace-main flex-col gap-sm">
                      <div className="workspace-header">
                        <h3>Overview Console</h3>
                        <span className="live-system-tag">Enterprise Cloud</span>
                      </div>

                      {activeLifecycleTab === 'Overview' ? (
                        <>
                          {/* Grid Stats Row (4 stats cards) */}
                          <div className="grid-stats-row">
                            {[
                              { label: 'Total Employees', value: '256', change: '+12% vs last month', up: true },
                              { label: 'Onboarding', value: '18', change: 'In Progress', up: null },
                              { label: 'Performance', value: '78%', change: 'Average Score', up: null },
                              { label: 'Attrition Rate', value: '6.2%', change: '-2.1% vs last month', up: true }
                            ].map((stat, sIdx) => (
                              <div key={sIdx} className="lifecycle-stat-subcard">
                                <span className="stat-lbl">{stat.label}</span>
                                <span className="stat-number-val">{stat.value}</span>
                                <span className={`stat-change-tag ${stat.up === true ? 'positive-tag' : stat.up === false ? 'negative-tag' : 'neutral-tag'}`}>
                                  {stat.change}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Split layout for Chart and Top Skills */}
                          <div className="workspace-data-split">
                            {/* Performance Curve SVG Graph */}
                            <div className="glass-inner-container performance-chart-wrapper">
                              <h4 className="card-label">Performance Overview</h4>
                              <div className="performance-chart-svg-container">
                                <svg className="performance-svg-chart" viewBox="0 0 300 120">
                                  <defs>
                                    <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#c2410c" stopOpacity="0.25" />
                                      <stop offset="100%" stopColor="#c2410c" stopOpacity="0.0" />
                                    </linearGradient>
                                  </defs>
                                  {/* Grid Lines */}
                                  <line x1="0" y1="20" x2="300" y2="20" className="chart-grid-line" />
                                  <line x1="0" y1="60" x2="300" y2="60" className="chart-grid-line" />
                                  <line x1="0" y1="100" x2="300" y2="100" className="chart-grid-line" />
                                  
                                  {/* Area Gradient */}
                                  <path 
                                    d="M 10 90 Q 60 70 110 80 T 210 40 T 290 20 L 290 120 L 10 120 Z" 
                                    fill="url(#chartGlow)"
                                  />
                                  
                                  {/* Glowing Line */}
                                  <motion.path 
                                    d="M 10 90 Q 60 70 110 80 T 210 40 T 290 20" 
                                    fill="none" 
                                    stroke="#ea580c" 
                                    strokeWidth="3"
                                    className="performance-line-draw"
                                    initial={{ pathLength: 0 }}
                                    whileInView={{ pathLength: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                  />

                                  {/* Data node circles */}
                                  <circle cx="10" cy="90" r="4" className="chart-node-circle orange" />
                                  <circle cx="110" cy="80" r="4" className="chart-node-circle orange" />
                                  <circle cx="210" cy="40" r="4" className="chart-node-circle orange" />
                                  <circle cx="290" cy="20" r="4" className="chart-node-circle orange" />
                                </svg>
                                <div className="chart-months-labels-row">
                                  <span>Jan</span>
                                  <span>Feb</span>
                                  <span>Mar</span>
                                  <span>Apr</span>
                                  <span>May</span>
                                  <span>Jun</span>
                                </div>
                              </div>
                            </div>

                            {/* Top Skills Horizontal Bars */}
                            <div className="glass-inner-container skills-bar-card-wrapper">
                              <h4 className="card-label">Top Core Skills</h4>
                              <div className="lifecycle-skills-progress-list">
                                {[
                                  { name: 'Leadership', pct: 90 },
                                  { name: 'Communication', pct: 85 },
                                  { name: 'Problem Solving', pct: 75 },
                                  { name: 'Teamwork', pct: 70 }
                                ].map((sk, skIdx) => (
                                  <div key={skIdx} className="skills-bar-row">
                                    <div className="skills-bar-label-group">
                                      <span className="sk-name-lbl">{sk.name}</span>
                                      <span className="sk-pct-lbl">{sk.pct}%</span>
                                    </div>
                                    <div className="sk-progress-track">
                                      <motion.div 
                                        className="sk-progress-fill bg-orange"
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${sk.pct}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1 }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="tab-placeholder-screen">
                          <Sparkles size={24} className="sparkle-icon-rotate text-orange" />
                          <h4>Module Interface Mockup</h4>
                          <p>The "{activeLifecycleTab}" module details are coming soon. Real data dashboards will render when connected to your enterprise database.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ==================== PAGE 4: WHY CHOOSE KOVIDAM & FOOTER ==================== */}
        <section className="features-section final-snapping-section" id="section-why-choose">
          <div className="section-content-container scrollable-y-mobile">
            {/* Why Choose Kovidam Block */}
            <div className="why-choose-features-container">
              <motion.div 
                className="why-choose-header"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="why-choose-main-title">Why Choose Kovidam?</h2>
                <div className="glowing-bar-under"></div>
              </motion.div>

              <div className="why-choose-cards-grid">
                {[
                  {
                    icon: Zap,
                    title: 'Faster Hiring',
                    desc: 'Drastically reduce screening time and place the right, top-tier talent in active projects faster.',
                    color: 'indigo'
                  },
                  {
                    icon: Brain,
                    title: 'AI-Powered Insights',
                    desc: 'Make smarter, objective hiring decisions utilizing comprehensive data-driven talent intelligence.',
                    color: 'violet'
                  },
                  {
                    icon: Target,
                    title: 'Better Accuracy',
                    desc: 'Improve candidates screening accuracy using highly specialized scoring models and interactive live audio evaluation.',
                    color: 'cyan'
                  },
                  {
                    icon: BarChart3,
                    title: 'Scalable Platform',
                    desc: 'Built specifically to scale, effortlessly supporting expanding organizations and team development pipelines.',
                    color: 'orange'
                  }
                ].map((card, cIdx) => {
                  const Icon = card.icon
                  return (
                    <motion.div 
                      key={cIdx}
                      className="why-choose-card-glass"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: cIdx * 0.1 }}
                      whileHover={{ y: -6, boxShadow: '0 15px 40px rgba(0,0,0,0.6)' }}
                    >
                      <div className={`why-card-icon-container ${card.color}`}>
                        <Icon size={24} />
                      </div>
                      <h3 className="why-card-title">{card.title}</h3>
                      <p className="why-card-desc">{card.desc}</p>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Embedded Footer */}
            <div className="embedded-footer-container">
              <Footer />
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
