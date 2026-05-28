import React, { useState } from 'react';
import { Mail, ArrowRight, X, Shield, Eye, Lock, RefreshCcw, UserCheck, Clock, Cpu, User, Ban, ShieldAlert, AlertTriangle, HardDrive, ShieldCheck, Activity, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logoCroppedTight from '../assets/logo-cropped-tight.png';
import './Footer.css';

const PLATFORM_CONTENT = {
  skillGraph: {
    title: 'Skill Graph AI',
    paragraphs: [
      'Kovidam transforms resumes and candidate inputs into structured, role-aware skill signals so recruiters can compare applicants on evidence rather than formatting style or keyword stuffing.',
      'The scoring layer maps technical strengths, project relevance, and contextual experience into a consistent evaluation surface, helping teams shortlist faster with less reviewer variance.'
    ],
    bullets: [
      'Structured extraction of skill and project signals from candidate data',
      'Role-fit scoring designed for repeatable and transparent hiring decisions',
      'Recruiter notes and shortlist outputs that preserve decision context'
    ]
  },
  github: {
    title: 'GitHub Analysis',
    paragraphs: [
      'Public repository activity is analyzed for engineering-quality indicators such as contribution consistency, practical project depth, and technical engagement across codebases.',
      'Instead of reducing GitHub to vanity metrics, Kovidam prioritizes meaningful contribution signals that support real hiring conversations and technical review.'
    ],
    bullets: [
      'Repository-level contribution and activity signal extraction',
      'Contextual interpretation for technical screening workflows',
      'Integration with overall shortlist scoring and candidate comparison'
    ]
  },
  biasFree: {
    title: 'Bias-Free Screening',
    paragraphs: [
      'Kovidam applies threshold- and weight-driven evaluation logic so candidate assessment remains objective, configurable, and defensible across job and internship workflows.',
      'Every shortlist output is designed to be auditable, enabling hiring teams to explain why a candidate was prioritized based on measurable technical evidence.'
    ],
    bullets: [
      'Configurable minimum thresholds for key hiring signals',
      'Weighted scoring tuned for different recruitment scenarios',
      'Explainable results that improve fairness and reviewer trust'
    ]
  },
  pricing: {
    title: 'Transparent Pricing',
    paragraphs: [
      'Pricing is designed around real hiring volume and operational complexity, making adoption practical for both fast-moving startups and structured enterprise teams.',
      'Organizations can scale from focused shortlist use cases to broader recruiting workflows without paying for unnecessary layers before they are needed.'
    ],
    bullets: [
      'Volume-aligned plans for monthly hiring demand',
      'Clear upgrade paths as teams and workflows expand',
      'Commercial flexibility for growth-stage and enterprise operations'
    ]
  }
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.25, delay: 0.1 }
  }
};

const drawerVariants = {
  hidden: { 
    x: '100%', 
    rotateY: 20, 
    opacity: 0,
    scale: 0.95
  },
  visible: { 
    x: 0, 
    rotateY: 0, 
    opacity: 1,
    scale: 1,
    transition: { 
      type: 'spring', 
      damping: 24, 
      stiffness: 180,
      staggerChildren: 0.08,
      delayChildren: 0.12
    } 
  },
  exit: { 
    x: '100%', 
    rotateY: 15, 
    opacity: 0,
    scale: 0.95,
    transition: { 
      type: 'spring', 
      damping: 30, 
      stiffness: 220 
    } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: 30, y: 10 },
  visible: { 
    opacity: 1, 
    x: 0, 
    y: 0, 
    transition: { 
      type: 'spring', 
      damping: 20, 
      stiffness: 150 
    } 
  }
};

export default function Footer() {
  const [isCareersOpen, setIsCareersOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  return (
    <footer className="premium-footer-wrapper">
      
      {/* 1. The Ultimate CTA Banner */}
      <div className="footer-cta-container">
        <div className="cta-glass-banner">
          <div className="cta-glow-bg"></div>
          <div className="cta-content">
            <h2 className="cta-title">
              Ready to hire <span className="gradient-text">smarter?</span>
            </h2>
            <p className="cta-desc">
              Join the top engineering teams that trust Kovidam to hire exceptional talent faster, fairer, and with absolute certainty.
            </p>
            <div className="cta-actions">
              <Link 
                to="/contact"
                className="btn-premium btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                Book a Demo
              </Link>
              <Link 
                to="/signup"
                className="btn-premium btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
              >
                Start Hiring Now
                <ArrowRight className="inline-icon" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Footer Links Grid */}
      <div className="footer-content-grid">
        <div className="footer-brand-col">
          <div className="footer-logo">
            <img src={logoCroppedTight} alt="Kovidam Logo" className="footer-brand-image" />
            <span className="footer-brand-text">KOVI<span className="sanskrit">दम्</span></span>
          </div>
          <p className="footer-brand-desc">
            The world's first AI-powered Skill Graph for unbiased, hyper-accurate engineering recruitment.
          </p>
          <div className="footer-social-links">
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon" style={{ fontWeight: 'bold', fontFamily: 'sans-serif' }}>in</a>
            <Link to="/contact" className="social-icon"><Mail size={18} /></Link>
          </div>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-col-title">Platform</h4>
          <button onClick={() => setActivePlatform('skillGraph')} className="footer-link-btn">Skill Graph AI</button>
          <button onClick={() => setActivePlatform('github')} className="footer-link-btn">GitHub Analysis</button>
          <button onClick={() => setActivePlatform('biasFree')} className="footer-link-btn">Bias-Free Screening</button>
          <button onClick={() => setActivePlatform('pricing')} className="footer-link-btn">Pricing</button>
        </div>
        
        <div className="footer-links-col">
          <h4 className="footer-col-title">Company</h4>
          <Link to="/about" className="footer-link">About Us</Link>
          <button onClick={() => setIsCareersOpen(true)} className="footer-link-btn">Careers</button>
          <Link to="/contact" className="footer-link">Contact</Link>
        </div>
        
        <div className="footer-links-col">
          <h4 className="footer-col-title">Legal</h4>
          <button onClick={() => setIsPrivacyOpen(true)} className="footer-link-btn">Privacy Policy</button>
          <button onClick={() => setIsTermsOpen(true)} className="footer-link-btn">Terms of Service</button>
          <button onClick={() => setIsSecurityOpen(true)} className="footer-link-btn">Security</button>
        </div>
      </div>

      {/* 3. Footer Bottom */}
      <div className="footer-bottom-bar">
        <p className="footer-copyright">© {new Date().getFullYear()} Kovidam Inc. All rights reserved.</p>
        <div className="footer-bottom-links">
          <span className="status-indicator">
            <span className="status-dot"></span> All systems operational
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isCareersOpen && (
          <motion.div 
            className="modal-overlay" 
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setIsCareersOpen(false)}
          >
            <motion.div 
              className="careers-modal glass-panel"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setIsCareersOpen(false)}>
                <X size={24} />
              </button>
              <div className="modal-content">
                <motion.span variants={itemVariants} className="modal-tag">Hiring Now</motion.span>
                <motion.h2 variants={itemVariants} className="modal-title">Join the <span className="gradient-text">Kovidam Team</span></motion.h2>
                <motion.p variants={itemVariants} className="modal-subtitle">Build trusted AI hiring infrastructure used by modern teams to make faster and fairer engineering decisions.</motion.p>
                
                <motion.div variants={itemVariants} className="openings-list">
                  <motion.div variants={itemVariants} className="opening-card">
                    <h4>AI/ML Engineer</h4>
                    <p>LLM extraction, scoring logic, and evaluation workflows</p>
                  </motion.div>
                  <motion.div variants={itemVariants} className="opening-card">
                    <h4>Full Stack Engineer</h4>
                    <p>React + API + data layer for recruiter-grade product experiences</p>
                  </motion.div>
                  <motion.div variants={itemVariants} className="opening-card">
                    <h4>Product Design</h4>
                    <p>Decision-focused UX for high-trust hiring workflows</p>
                  </motion.div>
                </motion.div>

                <motion.div variants={itemVariants} className="modal-footer">
                  <p>Don&apos;t see your exact role? Share your profile at</p>
                  <a href="mailto:kovidam26@gmail.com" className="email-link">kovidam26@gmail.com</a>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activePlatform && (
          <motion.div 
            className="modal-overlay" 
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setActivePlatform(null)}
          >
            <motion.div 
              className="careers-modal glass-panel"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setActivePlatform(null)}>
                <X size={24} />
              </button>
              <div className="modal-content">
                <motion.span variants={itemVariants} className="modal-tag">Platform Features</motion.span>
                <motion.h2 variants={itemVariants} className="modal-title">{PLATFORM_CONTENT[activePlatform].title}</motion.h2>
                <motion.p variants={itemVariants} className="modal-subtitle">Built around your current product stack: shortlist automation, semantic search, GitHub intelligence, and explainable candidate scoring.</motion.p>
                
                <motion.div variants={itemVariants} className="platform-sections-scroll">
                  <section className="platform-section-card">
                    {PLATFORM_CONTENT[activePlatform].paragraphs.map((paragraph) => (
                      <motion.p variants={itemVariants} key={paragraph}>{paragraph}</motion.p>
                    ))}
                    <ul>
                      {PLATFORM_CONTENT[activePlatform].bullets.map((item) => (
                        <motion.li variants={itemVariants} key={item}>{item}</motion.li>
                      ))}
                    </ul>
                  </section>
                </motion.div>

                <motion.div variants={itemVariants} className="modal-footer">
                  <p>Want a personalized deep dive?</p>
                  <Link to="/contact" onClick={() => setActivePlatform(null)} className="email-link">Request a Technical Demo</Link>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isPrivacyOpen && (
          <motion.div 
            className="modal-overlay" 
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setIsPrivacyOpen(false)}
          >
            <motion.div 
              className="careers-modal glass-panel"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setIsPrivacyOpen(false)}>
                <X size={24} />
              </button>
              <div className="modal-content">
                <motion.span variants={itemVariants} className="modal-tag">Privacy Policy</motion.span>
                <motion.h2 variants={itemVariants} className="modal-title">Privacy <span className="gradient-text">Policy</span></motion.h2>
                <motion.div variants={itemVariants} className="legal-scroll-area">
                  <section className="legal-modal-section">
                    <p>Kovidam processes data to deliver hiring workflows responsibly, securely, and with clear operational purpose.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Eye size={20} /> Information We Collect</h3>
                    <ul>
                      <li>Account identity details, contact information, and workspace metadata</li>
                      <li>Hiring inputs such as job descriptions, resumes, and GitHub profile references</li>
                      <li>System outputs including shortlist results, skill-match scores, and recruiter notes</li>
                      <li>Service telemetry required for reliability, abuse prevention, and diagnostics</li>
                    </ul>
                  </section>
                  <section className="legal-modal-section">
                    <h3><RefreshCcw size={20} /> How We Use Information</h3>
                    <ul>
                      <li>Operate shortlist generation, semantic search, and role-fit assessment workflows</li>
                      <li>Improve product quality, model-assisted outputs, and hiring decision transparency</li>
                      <li>Maintain platform security, fraud detection, and operational stability</li>
                      <li>Communicate support responses, policy updates, and critical service notices</li>
                    </ul>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Lock size={20} /> Data Protection</h3>
                    <p>We apply encryption in transit, controlled storage access, and least-privilege principles for handling candidate and customer data.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Shield size={20} /> Third-Party Services</h3>
                    <p>Selected infrastructure and communication providers may process data on our behalf under contractual confidentiality and security obligations.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><UserCheck size={20} /> User Rights</h3>
                    <p>Authorized account owners may request access, correction, or deletion of eligible personal data, subject to legal and security requirements.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Clock size={20} /> Data Retention</h3>
                    <p>Data is retained only for business, compliance, and incident-response needs, then removed or anonymized according to policy controls.</p>
                  </section>
                </motion.div>
                <motion.div variants={itemVariants} className="modal-footer">
                  <p>Contact us at</p>
                  <a href="mailto:kovidam26@gmail.com" className="email-link">kovidam26@gmail.com</a>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isTermsOpen && (
          <motion.div 
            className="modal-overlay" 
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setIsTermsOpen(false)}
          >
            <motion.div 
              className="careers-modal glass-panel"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setIsTermsOpen(false)}>
                <X size={24} />
              </button>
              <div className="modal-content">
                <motion.span variants={itemVariants} className="modal-tag">Terms of Service</motion.span>
                <motion.h2 variants={itemVariants} className="modal-title">Terms of <span className="gradient-text">Service</span></motion.h2>
                <motion.div variants={itemVariants} className="legal-scroll-area">
                  <section className="legal-modal-section">
                    <p>By accessing Kovidam, organizations and authorized users agree to these service terms and acceptable-use obligations.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Cpu size={20} /> Use of Service</h3>
                    <p>Kovidam supports resume intelligence, GitHub signal analysis, semantic candidate search, and shortlist decision support for hiring teams.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><User size={20} /> User Responsibilities</h3>
                    <ul>
                      <li>Provide accurate and lawful recruiting data in your workspace</li>
                      <li>Maintain account credential security and permission hygiene</li>
                      <li>Comply with employment, privacy, and anti-discrimination laws</li>
                      <li>Respect third-party intellectual property and licensing rights</li>
                    </ul>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Ban size={20} /> Prohibited Activities</h3>
                    <ul>
                      <li>Uploading malicious, deceptive, or unlawful content</li>
                      <li>Attempting unauthorized access to systems, models, or tenant data</li>
                      <li>Reverse engineering or abusing automated scoring outputs</li>
                      <li>Interfering with service availability, integrity, or security controls</li>
                    </ul>
                  </section>
                  <section className="legal-modal-section">
                    <h3><ShieldAlert size={20} /> AI Disclaimer</h3>
                    <p>AI-generated recommendations are assistive signals only and must be reviewed by human decision-makers before final hiring actions.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Lock size={20} /> Accounts</h3>
                    <p>Workspace admins are responsible for user access lifecycle management, role assignment, and prompt incident reporting for suspected compromise.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><AlertTriangle size={20} /> Limitation of Liability</h3>
                    <p>Except where prohibited by law, Kovidam is not liable for independent hiring decisions or damages resulting from misuse, outage events, or third-party failures.</p>
                  </section>
                </motion.div>
                <motion.div variants={itemVariants} className="modal-footer">
                  <p>Questions? Contact us at</p>
                  <a href="mailto:kovidam26@gmail.com" className="email-link">kovidam26@gmail.com</a>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isSecurityOpen && (
          <motion.div 
            className="modal-overlay" 
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setIsSecurityOpen(false)}
          >
            <motion.div 
              className="careers-modal glass-panel"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setIsSecurityOpen(false)}>
                <X size={24} />
              </button>
              <div className="modal-content">
                <motion.span variants={itemVariants} className="modal-tag">Security</motion.span>
                <motion.h2 variants={itemVariants} className="modal-title">Security <span className="gradient-text">Infrastructure</span></motion.h2>
                <motion.div variants={itemVariants} className="legal-scroll-area">
                  <section className="legal-modal-section">
                    <p>Security at Kovidam is designed as a continuous, lifecycle-based practice spanning infrastructure, application architecture, operational governance, and incident readiness. We continuously improve controls to protect recruiter workspaces, candidate intelligence, and decision-support outputs.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><HardDrive size={20} /> Infrastructure Security</h3>
                    <p>Production workloads run on managed cloud environments with hardened configuration baselines, network-level safeguards, and strict separation between critical services. Access to infrastructure components is restricted and reviewed to minimize exposure and reduce operational risk.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Lock size={20} /> Data Encryption</h3>
                    <p>Data is protected in transit and at rest using modern encryption standards and secure transport protocols. Sensitive hiring records and processing artifacts are handled with confidentiality controls intended to protect against unauthorized disclosure or tampering.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><ShieldCheck size={20} /> Access Control</h3>
                    <p>Access is governed by authentication, authorization, and role-based permissioning aligned to least-privilege principles. Administrative access is limited to authorized personnel with accountability controls that support secure operations and traceability.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Activity size={20} /> Monitoring</h3>
                    <p>Security and operations monitoring support anomaly detection, performance integrity checks, vulnerability response, and incident triage. We prioritize findings by risk impact and remediate according to severity to preserve platform reliability and trust.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><AlertTriangle size={20} /> Incident Response</h3>
                    <p>Kovidam maintains a structured incident response workflow for identification, containment, investigation, and recovery. Where applicable, affected stakeholders are informed in a timely manner with clear updates on impact, mitigation, and next steps.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Search size={20} /> Responsible Disclosure</h3>
                    <p>If you identify a potential vulnerability, report it responsibly through our support channel for coordinated validation and remediation. We value good-faith security research and work collaboratively to resolve verified issues safely.</p>
                  </section>
                </motion.div>
                <motion.div variants={itemVariants} className="modal-footer">
                  <p>Security response contact</p>
                  <a href="mailto:kovidam26@gmail.com" className="email-link">kovidam26@gmail.com</a>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}
