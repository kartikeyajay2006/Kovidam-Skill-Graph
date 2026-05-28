import React, { useState } from 'react';
import { Mail, ArrowRight, X, Shield, Eye, Lock, RefreshCcw, UserCheck, Clock, Cpu, User, Ban, ShieldAlert, AlertTriangle, HardDrive, ShieldCheck, Activity, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logoCroppedTight from '../assets/logo-cropped-tight.png';
import './Footer.css';

export default function Footer() {
  const navigate = useNavigate();
  const [isCareersOpen, setIsCareersOpen] = useState(false);
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
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
          <button onClick={() => setIsPlatformOpen(true)} className="footer-link-btn">Skill Graph AI</button>
          <button onClick={() => setIsPlatformOpen(true)} className="footer-link-btn">GitHub Analysis</button>
          <button onClick={() => setIsPlatformOpen(true)} className="footer-link-btn">Bias-Free Screening</button>
          <button onClick={() => setIsPlatformOpen(true)} className="footer-link-btn">Pricing</button>
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
          <div className="modal-overlay" onClick={() => setIsCareersOpen(false)}>
            <motion.div 
              className="careers-modal glass-panel"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setIsCareersOpen(false)}>
                <X size={24} />
              </button>
              <div className="modal-content">
                <span className="modal-tag">Hiring Now</span>
                <h2 className="modal-title">Join the <span className="gradient-text">Kovidam Team</span></h2>
                <p className="modal-subtitle">We're always looking for passionate people to help us revolutionize hiring with AI.</p>
                
                <div className="openings-list">
                  <div className="opening-card">
                    <h4>AI Research Engineer</h4>
                    <p>Bengaluru (Remote Friendly)</p>
                  </div>
                  <div className="opening-card">
                    <h4>Full Stack Developer</h4>
                    <p>Bengaluru / Remote</p>
                  </div>
                  <div className="opening-card">
                    <h4>Product Designer</h4>
                    <p>Remote</p>
                  </div>
                </div>

                <div className="modal-footer">
                  <p>Don't see a role for you? Send your resume to</p>
                  <a href="mailto:kovidam26@gmail.com" className="email-link">kovidam26@gmail.com</a>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isPlatformOpen && (
          <div className="modal-overlay" onClick={() => setIsPlatformOpen(false)}>
            <motion.div 
              className="careers-modal glass-panel"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setIsPlatformOpen(false)}>
                <X size={24} />
              </button>
              <div className="modal-content">
                <span className="modal-tag">Platform Features</span>
                <h2 className="modal-title">Our <span className="gradient-text">AI Ecosystem</span></h2>
                <p className="modal-subtitle">Explore the powerful modules that make Kovidam the leader in intelligent engineering recruitment.</p>
                
                <div className="openings-list">
                  <div className="opening-card">
                    <div>
                      <h4>Skill Graph AI</h4>
                      <p>Deep conceptual mapping of engineering expertise.</p>
                    </div>
                  </div>
                  <div className="opening-card">
                    <div>
                      <h4>GitHub Analysis</h4>
                      <p>Automated code quality and contribution signal extraction.</p>
                    </div>
                  </div>
                  <div className="opening-card">
                    <div>
                      <h4>Bias-Free Screening</h4>
                      <p>Objective evaluation based on technical proof, not pedigree.</p>
                    </div>
                  </div>
                  <div className="opening-card">
                    <div>
                      <h4>Transparent Pricing</h4>
                      <p>Flexible plans for startups and enterprises alike.</p>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <p>Want a personalized deep dive?</p>
                  <Link to="/contact" onClick={() => setIsPlatformOpen(false)} className="email-link">Request a Technical Demo</Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isPrivacyOpen && (
          <div className="modal-overlay" onClick={() => setIsPrivacyOpen(false)}>
            <motion.div 
              className="careers-modal glass-panel"
              style={{ maxWidth: '800px' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setIsPrivacyOpen(false)}>
                <X size={24} />
              </button>
              <div className="modal-content">
                <span className="modal-tag">Privacy Policy</span>
                <h2 className="modal-title">Privacy <span className="gradient-text">Policy</span></h2>
                <div className="legal-scroll-area">
                  <section className="legal-modal-section">
                    <p>At Kovidam, we value your privacy and are committed to protecting your personal information.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Eye size={20} /> Information We Collect</h3>
                    <ul>
                      <li>Name, email address, and account details</li>
                      <li>Uploaded resumes and candidate information</li>
                      <li>Interview recordings and responses</li>
                      <li>Usage analytics and platform activity</li>
                    </ul>
                  </section>
                  <section className="legal-modal-section">
                    <h3><RefreshCcw size={20} /> How We Use Information</h3>
                    <ul>
                      <li>To improve our AI hiring tools</li>
                      <li>To provide ATS scoring and interview analysis</li>
                      <li>To enhance platform security and performance</li>
                      <li>To communicate important updates</li>
                    </ul>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Lock size={20} /> Data Protection</h3>
                    <p>All user data is securely stored and encrypted. We implement industry-standard security measures to protect sensitive information.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Shield size={20} /> Third-Party Services</h3>
                    <p>We may use trusted third-party services for hosting, analytics, and communication. These services are required to maintain strict confidentiality.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><UserCheck size={20} /> User Rights</h3>
                    <p>Users may request access, correction, or deletion of their personal data at any time.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Clock size={20} /> Data Retention</h3>
                    <p>We retain data only as long as necessary to provide our services and comply with legal obligations.</p>
                  </section>
                </div>
                <div className="modal-footer">
                  <p>Contact us at</p>
                  <a href="mailto:kovidam26@gmail.com" className="email-link">kovidam26@gmail.com</a>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isTermsOpen && (
          <div className="modal-overlay" onClick={() => setIsTermsOpen(false)}>
            <motion.div 
              className="careers-modal glass-panel"
              style={{ maxWidth: '800px' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setIsTermsOpen(false)}>
                <X size={24} />
              </button>
              <div className="modal-content">
                <span className="modal-tag">Terms of Service</span>
                <h2 className="modal-title">Terms of <span className="gradient-text">Service</span></h2>
                <div className="legal-scroll-area">
                  <section className="legal-modal-section">
                    <p>By using our platform, you agree to the following terms and conditions.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Cpu size={20} /> Use of Service</h3>
                    <p>Our platform provides AI-powered ATS scoring, interview assistance, and employee management tools.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><User size={20} /> User Responsibilities</h3>
                    <ul>
                      <li>Provide accurate information</li>
                      <li>Maintain account security</li>
                      <li>Use the platform lawfully</li>
                      <li>Respect intellectual property rights</li>
                    </ul>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Ban size={20} /> Prohibited Activities</h3>
                    <ul>
                      <li>Uploading harmful or illegal content</li>
                      <li>Attempting unauthorized access</li>
                      <li>Misusing AI-generated evaluations</li>
                      <li>Disrupting platform operations</li>
                    </ul>
                  </section>
                  <section className="legal-modal-section">
                    <h3><ShieldAlert size={20} /> AI Disclaimer</h3>
                    <p>AI-generated scores, recommendations, and interview evaluations are intended to assist hiring processes and should not be considered final hiring decisions.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Lock size={20} /> Accounts</h3>
                    <p>Users are responsible for maintaining the confidentiality of their account credentials.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><AlertTriangle size={20} /> Limitation of Liability</h3>
                    <p>We are not responsible for hiring decisions, data loss caused by external factors, or misuse of the platform.</p>
                  </section>
                </div>
                <div className="modal-footer">
                  <p>Questions? Contact us at</p>
                  <a href="mailto:kovidam26@gmail.com" className="email-link">kovidam26@gmail.com</a>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isSecurityOpen && (
          <div className="modal-overlay" onClick={() => setIsSecurityOpen(false)}>
            <motion.div 
              className="careers-modal glass-panel"
              style={{ maxWidth: '800px' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-modal" onClick={() => setIsSecurityOpen(false)}>
                <X size={24} />
              </button>
              <div className="modal-content">
                <span className="modal-tag">Security</span>
                <h2 className="modal-title">Security <span className="gradient-text">Infrastructure</span></h2>
                <div className="legal-scroll-area">
                  <section className="legal-modal-section">
                    <p>We take security seriously and continuously work to protect user and candidate data.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><HardDrive size={20} /> Infrastructure Security</h3>
                    <p>Our systems are hosted on secure cloud infrastructure with continuous monitoring and protection measures.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Lock size={20} /> Data Encryption</h3>
                    <p>Sensitive information is encrypted during transmission and storage using industry-standard protocols.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><ShieldCheck size={20} /> Access Control</h3>
                    <p>Access to data is restricted to authorized personnel only via secure authentication methods.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Activity size={20} /> Monitoring</h3>
                    <p>We continuously monitor our systems for vulnerabilities, suspicious activity, and potential threats.</p>
                  </section>
                  <section className="legal-modal-section">
                    <h3><Search size={20} /> Responsible Disclosure</h3>
                    <p>If you discover a security vulnerability, please report it responsibly to security@kovidam.com</p>
                  </section>
                </div>
                <div className="modal-footer">
                  <p>Our Commitment</p>
                  <a href="mailto:security@kovidam.com" className="email-link">security@kovidam.com</a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}
