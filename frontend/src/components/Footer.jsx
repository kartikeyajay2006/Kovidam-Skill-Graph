import React, { useState } from 'react';
import { Mail, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logoCroppedTight from '../assets/logo-cropped-tight.png';
import './Footer.css';

export default function Footer() {
  const [isCareersOpen, setIsCareersOpen] = useState(false);
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
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
              <button className="btn-premium btn-secondary">Book a Demo</button>
              <button className="btn-premium btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Start Hiring Now
                <ArrowRight className="inline-icon" size={18} />
              </button>
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
          <a href="#" className="footer-link">Privacy Policy</a>
          <a href="#" className="footer-link">Terms of Service</a>
          <a href="#" className="footer-link">Security</a>
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
      </AnimatePresence>
    </footer>
  );
}
