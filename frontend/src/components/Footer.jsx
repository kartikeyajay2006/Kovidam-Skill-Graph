import React from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import logoCroppedTight from '../assets/logo-cropped-tight.png';
import './Footer.css';

export default function Footer() {
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
            <a href="#" className="social-icon" style={{ fontWeight: 'bold', fontFamily: 'sans-serif' }}>𝕏</a>
            <a href="#" className="social-icon" style={{ fontWeight: 'bold', fontFamily: 'sans-serif' }}>in</a>
            <a href="#" className="social-icon" style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>gh</a>
            <a href="#" className="social-icon"><Mail size={18} /></a>
          </div>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-col-title">Platform</h4>
          <a href="#" className="footer-link">Skill Graph AI</a>
          <a href="#" className="footer-link">GitHub Analysis</a>
          <a href="#" className="footer-link">Bias-Free Screening</a>
          <a href="#" className="footer-link">Pricing</a>
        </div>
        
        <div className="footer-links-col">
          <h4 className="footer-col-title">Company</h4>
          <a href="#" className="footer-link">About Us</a>
          <a href="#" className="footer-link">Careers</a>
          <a href="#" className="footer-link">Blog</a>
          <a href="#" className="footer-link">Contact</a>
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

    </footer>
  );
}
