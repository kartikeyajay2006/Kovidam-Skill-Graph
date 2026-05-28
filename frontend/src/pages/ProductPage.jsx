import React from 'react';
import {
  Atom,
  ShieldCheck,
  Users,
  Sparkles,
  Play,
  BarChart3,
  Star,
  LockKeyhole,
  Building2,
  FileText,
  Shield,
  CheckCircle2,
  ArrowRight,
  Gauge,
} from 'lucide-react';
import Footer from '../components/Footer';
import './ProductPage.css';

import cyberGlobe from '../assets/cyber_tech_globe.png';
import avatarMan1 from '../assets/avatar_man1.png';
import avatarWoman1 from '../assets/avatar_woman1.png';
import avatarMan2 from '../assets/avatar_man2.png';

const sideSignals = {
  left: [
    {
      title: 'Semantic Shortlisting',
      description: 'Matches skills, intent, and role context beyond keywords.',
      icon: Atom,
      theme: 'purple',
    },
    {
      title: 'Decision Confidence Engine',
      description: 'Detects stronger signals and reduces hiring risk.',
      icon: Gauge,
      theme: 'cyan',
    },
  ],
  right: [
    {
      title: 'Explainable Scoring',
      description: 'Transparent, criterion-wise scoring you can trust.',
      icon: ShieldCheck,
      theme: 'blue',
    },
    {
      title: 'Real Impact for Teams',
      description: 'Faster decisions, better hires, stronger confidence.',
      icon: Users,
      theme: 'orange',
    },
  ],
};

const scoreBreakdown = [
  { label: 'Github', score: 91 },
  { label: 'Experience', score: 86 },
  { label: 'Project Evidence', score: 82 },
  { label: 'Skills Match', score: 88 },
  { label: 'Platform Strength', score: 79 },
  { label: 'Profile Completeness', score: 84 },
];

const trustCards = [
  {
    title: 'Enterprise Security',
    description: 'SOC 2 Type II aligned controls and encrypted data handling.',
    icon: LockKeyhole,
    theme: 'blue',
  },
  {
    title: 'Tenant Isolation',
    description: 'Secure multi-tenant architecture designed for enterprise boundaries.',
    icon: Building2,
    theme: 'purple',
  },
  {
    title: 'Audit Logs',
    description: 'Every scoring and shortlist action is tracked for transparency.',
    icon: FileText,
    theme: 'pink',
  },
  {
    title: 'Scalable & Reliable',
    description: 'Built to scale with reliable performance and uptime.',
    icon: Shield,
    theme: 'teal',
  },
];

function ScoreRow({ label, score }) {
  return (
    <div className="product-score-row">
      <span className="product-score-label">{label}</span>
      <div className="product-score-track">
        <div className="product-score-fill" style={{ width: `${score}%` }} />
      </div>
      <span className="product-score-value">{score}%</span>
    </div>
  );
}

function SignalCard({ title, description, icon: Icon, theme }) {
  return (
    <article className={`signal-card signal-theme-${theme}`}>
      <div className="signal-icon">
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

export default function ProductPage() {
  const fitScore = 86;

  return (
    <main className="product-page">
      <div className="product-bg product-bg-left" />
      <div className="product-bg product-bg-right" />
      <div className="product-starfield" aria-hidden="true" />

      <header className="product-hero">
        <p className="product-kicker">
          <Sparkles size={14} />
          AI-Powered Hiring Infrastructure
        </p>
        <h1>
          AI Hiring Infrastructure
          <br />
          That <span>Teams Trust</span>
        </h1>
        <p>
          Kovidam combines semantic understanding, transparent scoring, and confidence-driven evaluation to help
          engineering teams hire faster with quality.
        </p>
        <div className="product-hero-actions">
          <button type="button" className="cta-primary">
            Book a Demo
            <span className="btn-arrow-circle">
              <ArrowRight size={14} />
            </span>
          </button>
          <button type="button" className="cta-secondary">
            <Play size={16} fill="currentColor" />
            See How It Works
          </button>
        </div>
      </header>

      <section className="product-cosmos" aria-label="Product signal map">
        {/* SVG Network Lines connecting signals and avatars */}
        <svg className="cosmos-network-svg" viewBox="0 0 1000 500" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="cyanGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="blueGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="orangeGrad" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.15" />
            </linearGradient>
            
            <filter id="svgGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Paths connecting signals to center avatars */}
          <path d="M 180,140 Q 280,140 350,250" stroke="url(#purpleGrad)" strokeWidth="1.8" filter="url(#svgGlow)" />
          <path d="M 180,360 Q 280,360 350,250" stroke="url(#cyanGrad)" strokeWidth="1.8" filter="url(#svgGlow)" />
          <path d="M 820,140 Q 720,140 650,250" stroke="url(#blueGrad)" strokeWidth="1.8" filter="url(#svgGlow)" />
          <path d="M 820,360 Q 720,360 650,250" stroke="url(#orangeGrad)" strokeWidth="1.8" filter="url(#svgGlow)" />
          
          {/* Dotted lines linking avatars to the top main avatar */}
          <path d="M 350,250 Q 420,170 500,90" stroke="rgba(129, 140, 248, 0.45)" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M 500,90 Q 580,170 650,250" stroke="rgba(129, 140, 248, 0.45)" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Animated signal dots traveling along paths */}
          <circle r="4" fill="#c084fc" filter="url(#svgGlow)">
            <animateMotion dur="4.2s" repeatCount="indefinite" path="M 180,140 Q 280,140 350,250" />
          </circle>
          <circle r="4" fill="#22d3ee" filter="url(#svgGlow)">
            <animateMotion dur="3.5s" repeatCount="indefinite" path="M 180,360 Q 280,360 350,250" />
          </circle>
          <circle r="4" fill="#60a5fa" filter="url(#svgGlow)">
            <animateMotion dur="4.5s" repeatCount="indefinite" path="M 820,140 Q 720,140 650,250" />
          </circle>
          <circle r="4" fill="#f59e0b" filter="url(#svgGlow)">
            <animateMotion dur="3.8s" repeatCount="indefinite" path="M 820,360 Q 720,360 650,250" />
          </circle>
        </svg>

        <div className="product-signals product-signals-left">
          {sideSignals.left.map((item) => (
            <SignalCard key={item.title} {...item} />
          ))}
        </div>

        <div className="cosmos-center">
          <div className="cosmos-orbits" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          
          {/* Detailed Holographic Globe */}
          <div className="cosmos-globe">
            <img src={cyberGlobe} alt="Tech Globe" />
          </div>
          
          {/* Floating avatar profiles around globe */}
          <div className="cosmos-avatar avatar-top">
            <img src={avatarMan1} alt="Top Candidate Profile" />
          </div>
          <div className="cosmos-avatar avatar-left">
            <img src={avatarWoman1} alt="Left Candidate Profile" />
          </div>
          <div className="cosmos-avatar avatar-right">
            <img src={avatarMan2} alt="Right Candidate Profile" />
          </div>

          {/* Translucent Glassmorphic Fit Card */}
          <div className="cosmos-fit-card">
            <div className="cosmos-fit-head">
              <strong>{fitScore}</strong>
              <span>/100</span>
            </div>
            <p className="status-match">Strong Match</p>
            <div className="cosmos-graph">
              <svg viewBox="0 0 200 60" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
                <defs>
                  <linearGradient id="graphGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(99, 102, 241, 0.45)" />
                    <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,55 Q 25,42 50,38 T 100,45 T 150,22 T 200,12 L 200,60 L 0,60 Z"
                  fill="url(#graphGrad)"
                />
                <path
                  d="M 0,55 Q 25,42 50,38 T 100,45 T 150,22 T 200,12"
                  fill="none"
                  stroke="#a78bfa"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 5px rgba(167, 139, 250, 0.85))' }}
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="product-signals product-signals-right">
          {sideSignals.right.map((item) => (
            <SignalCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      {/* Main Glassmorphic Candidate & Scoring Panel */}
      <section className="product-panel" aria-label="Candidate and scoring panel">
        <article className="panel-block panel-candidate">
          <div className="panel-user">
            <div className="panel-user-avatar">
              <img src={avatarMan1} alt="Aarav R." className="panel-user-avatar-img" />
              <span className="avatar-status-badge" />
            </div>
            <div>
              <h3>
                Aarav R. <CheckCircle2 size={18} className="verified-badge-icon" />
              </h3>
              <p>Backend Engineer</p>
            </div>
          </div>
          <div className="panel-skills">
            {['Python', 'Django', 'PostgreSQL', 'AWS', 'Docker', 'System Design'].map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
            <span className="skill-more">+1</span>
          </div>
        </article>

        <article className="panel-block panel-breakdown">
          <p className="panel-title">
            <BarChart3 size={14} />
            Score Breakdown
          </p>
          <div className="product-score-list">
            {scoreBreakdown.map((item) => (
              <ScoreRow key={item.label} label={item.label} score={item.score} />
            ))}
          </div>
        </article>

        <article className="panel-block panel-fit">
          <p className="panel-title">
            <Star size={14} />
            Overall Fit Score
          </p>
          
          <div className="fit-ring-container">
            <svg viewBox="0 0 100 100" className="fit-ring-svg">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="rgba(129, 140, 248, 0.12)"
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="url(#panelFitGrad)"
                strokeWidth="7"
                fill="none"
                strokeDasharray="263.89"
                strokeDashoffset={263.89 - (263.89 * fitScore) / 100}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ filter: 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.7))' }}
              />
              <defs>
                <linearGradient id="panelFitGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="50%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <div className="fit-ring-inner-text">
              <strong>{fitScore}</strong>
              <span>/100</span>
              <small>Strong Match</small>
            </div>
          </div>
        </article>
      </section>

      {/* Trust & Security row linked via horizontal dotted line */}
      <section className="product-trust-row" aria-label="Trust and compliance">
        {trustCards.map((item) => {
          const Icon = item.icon;
          return (
            <article className={`product-trust-card trust-theme-${item.theme}`} key={item.title}>
              <div className="product-trust-icon">
                <Icon size={22} />
              </div>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
            </article>
          );
        })}
      </section>

      <Footer />
    </main>
  );
}
