import React from 'react';
import {
  Atom,
  ShieldCheck,
  BrainCircuit,
  Users,
  Sparkles,
  Play,
  MapPin,
  BriefcaseBusiness,
  BarChart3,
  Star,
  LockKeyhole,
  Building2,
  FileText,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import './ProductPage.css';

const sideSignals = {
  left: [
    {
      title: 'Semantic Shortlisting',
      description: 'Matches skills, intent, and role context beyond keywords.',
      icon: Atom,
    },
    {
      title: 'Decision Confidence Engine',
      description: 'Detects stronger signals and reduces hiring risk.',
      icon: BrainCircuit,
    },
  ],
  right: [
    {
      title: 'Explainable Scoring',
      description: 'Transparent, criterion-wise scoring you can trust.',
      icon: ShieldCheck,
    },
    {
      title: 'Real Impact for Teams',
      description: 'Faster decisions, better hires, stronger confidence.',
      icon: Users,
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
  },
  {
    title: 'Tenant Isolation',
    description: 'Secure multi-tenant architecture designed for enterprise boundaries.',
    icon: Building2,
  },
  {
    title: 'Audit Logs',
    description: 'Every scoring and shortlist action is tracked for transparency.',
    icon: FileText,
  },
  {
    title: 'Scalable & Reliable',
    description: 'Built to scale with reliable performance and uptime.',
    icon: Shield,
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

function SignalCard({ title, description, icon: Icon }) {
  return (
    <article className="signal-card">
      <div className="signal-icon">
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="signal-line" />
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
          </button>
          <button type="button" className="cta-secondary">
            <Play size={16} />
            See How It Works
          </button>
        </div>
      </header>

      <section className="product-cosmos" aria-label="Product signal map">
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
          <div className="cosmos-globe" />
          <div className="cosmos-avatar avatar-top">KR</div>
          <div className="cosmos-avatar avatar-left">VP</div>
          <div className="cosmos-avatar avatar-right">AR</div>

          <div className="cosmos-fit-card">
            <div className="cosmos-fit-head">
              <strong>{fitScore}</strong>
              <span>/100</span>
            </div>
            <p>Strong Match</p>
            <div className="cosmos-graph">
              <span />
            </div>
          </div>
        </div>

        <div className="product-signals product-signals-right">
          {sideSignals.right.map((item) => (
            <SignalCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="product-panel" aria-label="Candidate and scoring panel">
        <article className="panel-block panel-candidate">
          <div className="panel-user">
            <div className="panel-user-avatar">AR</div>
            <div>
              <h3>
                Aarav R. <CheckCircle2 size={16} />
              </h3>
              <p>Backend Engineer</p>
            </div>
          </div>
          <div className="panel-meta">
            <span>
              <MapPin size={13} />
              Bengaluru, India
            </span>
            <span>
              <BriefcaseBusiness size={13} />
              3.8 Yrs Exp
            </span>
          </div>
          <div className="panel-skills">
            {['Python', 'Django', 'PostgreSQL', 'AWS', 'Docker', 'System Design'].map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
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
          <div className="fit-ring">
            <div className="fit-ring-inner">
              <strong>{fitScore}</strong>
              <span>/100</span>
              <small>Strong Match</small>
            </div>
          </div>
        </article>
      </section>

      <section className="product-trust-row" aria-label="Trust and compliance">
        {trustCards.map((item) => {
          const Icon = item.icon;
          return (
            <article className="product-trust-card" key={item.title}>
              <div className="product-trust-icon">
                <Icon size={20} />
              </div>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
