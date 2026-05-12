import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BarChart3,
  CheckCircle2,
  Layers3,
  Rocket,
  Lock,
  Activity,
  Zap,
  Timer,
  Scale,
  Wallet,
  Users,
  Newspaper,
  FileText,
  Fingerprint,
} from 'lucide-react'
import './PublicInfoPage.css'

const pageExperience = {
  '/platform/skill-graph-ai': {
    badge: 'Core Intelligence Engine',
    chips: ['Semantic inference graph', 'Role-aware reasoning', 'Deterministic scoring layers'],
    kpis: [
      { title: 'Context Recall', body: 'Understands aliases, adjacent tooling, and project implication chains.', icon: Activity },
      { title: 'Precision Lift', body: 'Reduces keyword misses by evaluating signal relevance, not string match.', icon: BarChart3 },
      { title: 'Decision Trust', body: 'Provides explainable scoring traces for every shortlisted candidate.', icon: ShieldCheck },
    ],
    pillars: [
      { title: 'Graph-Based Reasoning', body: 'Connects skills, projects, stacks, and experience into a structured fit model.', icon: Layers3 },
      { title: 'High-Fidelity Ranking', body: 'Ranks by role fit confidence while preserving transparent rationale.', icon: Rocket },
      { title: 'Repeatable Outcomes', body: 'Minimizes recruiter-to-recruiter scoring variance across hiring cycles.', icon: Lock },
    ],
    highlightsKicker: 'Why This Product Wins',
    highlights: ['Understands engineering context, not just keywords', 'Shortlists are explainable to hiring managers', 'Built for production-scale hiring workflows'],
  },
  '/platform/github-analysis': {
    badge: 'Developer Signal Intelligence',
    chips: ['Repository quality profiling', 'Contribution depth analysis', 'Engineering evidence scoring'],
    kpis: [
      { title: 'Proof Depth', body: 'Analyzes practical engineering artifacts beyond resume claims.', icon: Activity },
      { title: 'Code Impact', body: 'Measures contribution relevance against the target role profile.', icon: Activity },
      { title: 'Interview Confidence', body: 'Gives recruiters objective technical talking points.', icon: Timer },
    ],
    pillars: [
      { title: 'Repository Context', body: 'Prioritizes meaningful repositories aligned with job expectations.', icon: Layers3 },
      { title: 'Signal Normalization', body: 'Balances noisy GitHub footprints into consistent candidate signals.', icon: Scale },
      { title: 'Actionable Insight', body: 'Turns activity data into hiring-ready evaluation context.', icon: Zap },
    ],
    highlightsKicker: 'What Recruiters Get',
    highlights: ['Less dependence on self-reported resume bullets', 'Role-specific technical evidence surfaced faster', 'Clearer shortlisting for engineering teams'],
  },
  '/platform/bias-free-screening': {
    badge: 'Fairness by Design',
    chips: ['Structured policy scoring', 'Explainable ranking rationale', 'Evidence-first evaluation'],
    kpis: [
      { title: 'Consistency', body: 'Policy-based scoring avoids unpredictable reviewer drift.', icon: Scale },
      { title: 'Transparency', body: 'Each rank includes rationale and evidence mapping.', icon: FileText },
      { title: 'Governance', body: 'Teams can review and tune controls as hiring needs evolve.', icon: ShieldCheck },
    ],
    pillars: [
      { title: 'Policy Enforcement', body: 'Scoring follows declared hiring standards and thresholds.', icon: Lock },
      { title: 'Bias Reduction', body: 'Minimizes subjective filtering by anchoring on signal evidence.', icon: Layers3 },
      { title: 'Audit Readiness', body: 'Evaluation logic remains reviewable for internal accountability.', icon: Fingerprint },
    ],
    highlightsKicker: 'Operational Benefits',
    highlights: ['Fairer screening with measurable standards', 'Higher trust in shortlist outcomes', 'Governance-friendly decision workflows'],
  },
  '/platform/pricing': {
    badge: 'Commercial Options',
    chips: ['Startup friendly', 'Scale with hiring volume', 'Enterprise governance add-ons'],
    kpis: [
      { title: 'Cost Control', body: 'Choose plans based on hiring volume, not bloated bundles.', icon: Wallet },
      { title: 'Scale Path', body: 'Move from startup plan to enterprise controls without migration pain.', icon: Rocket },
      { title: 'ROI Clarity', body: 'Tie spend to shortlist quality and recruiter throughput metrics.', icon: BarChart3 },
    ],
    pillars: [
      { title: 'Transparent Packaging', body: 'Clear capability tiers aligned to hiring maturity.', icon: FileText },
      { title: 'Growth Ready', body: 'Add advanced workflows as your hiring team scales.', icon: Users },
      { title: 'Enterprise Add-ons', body: 'Unlock deeper compliance and governance controls when needed.', icon: ShieldCheck },
    ],
    highlightsKicker: 'Designed for Real Teams',
    highlights: ['No unnecessary complexity for early-stage teams', 'Predictable upgrades for scale-ups', 'Security and trust controls for enterprise procurement'],
  },
  '/company/careers': {
    badge: 'Build With Us',
    chips: ['Ownership culture', 'High autonomy', 'Real product impact'],
    kpis: [
      { title: 'Builder DNA', body: 'We hire people who execute deeply and think in systems.', icon: Rocket },
      { title: 'Learning Velocity', body: 'Fast feedback loops across product, design, and engineering.', icon: Zap },
      { title: 'Mission Fit', body: 'Every role contributes to fair and high-signal technical hiring.', icon: Users },
    ],
    pillars: [
      { title: 'Product Ownership', body: 'End-to-end responsibility from idea to production impact.', icon: Layers3 },
      { title: 'Execution Quality', body: 'Speed with rigor across architecture and product detail.', icon: Timer },
      { title: 'Team Trust', body: 'Direct communication and accountability as default behavior.', icon: ShieldCheck },
    ],
    highlightsKicker: 'Why People Join',
    highlights: ['Work on a hard and meaningful hiring problem', 'Build infrastructure used in real hiring decisions', 'Grow with a high-ownership team'],
  },
  '/company/blog': {
    badge: 'Inside the Product',
    chips: ['Engineering deep dives', 'Hiring intelligence playbooks', 'Release and roadmap notes'],
    kpis: [
      { title: 'Practical Content', body: 'Write-ups focused on implementation, not vague thought leadership.', icon: Newspaper },
      { title: 'Operator Value', body: 'Guides for recruiters and hiring managers scaling pipelines.', icon: Users },
      { title: 'Technical Detail', body: 'Architecture, reliability, and quality improvements explained clearly.', icon: BarChart3 },
    ],
    pillars: [
      { title: 'Product Updates', body: 'Track what shipped and why decisions were made.', icon: Sparkles },
      { title: 'Engineering Notes', body: 'Learn from real constraints and production trade-offs.', icon: Layers3 },
      { title: 'Hiring Intelligence', body: 'Use practical frameworks to improve screening quality.', icon: Activity },
    ],
    highlightsKicker: 'What You Can Expect',
    highlights: ['Actionable playbooks over generic content', 'Transparent product evolution', 'Decision frameworks for better hiring'],
  },
  '/legal/privacy-policy': {
    badge: 'Data Governance',
    chips: ['Purpose-limited collection', 'Tenant-scoped access', 'Retention-aware handling'],
    kpis: [
      { title: 'Data Minimization', body: 'Collect only what is necessary for product operation.', icon: ShieldCheck },
      { title: 'Access Boundaries', body: 'Tenant-aware controls protect cross-company separation.', icon: Lock },
      { title: 'Operational Discipline', body: 'Clear policies for handling, storage, and retention.', icon: FileText },
    ],
    pillars: [
      { title: 'Privacy by Default', body: 'Core workflows are designed to reduce unnecessary exposure.', icon: Fingerprint },
      { title: 'Controlled Access', body: 'Authenticated and policy-scoped interactions only.', icon: Scale },
      { title: 'Trust Framework', body: 'Documented principles for customer confidence and compliance.', icon: Layers3 },
    ],
    highlightsKicker: 'Privacy Commitments',
    highlights: ['Data handling aligned to hiring use cases', 'Access scoped to authorized tenant context', 'Operational transparency for enterprise review'],
  },
  '/legal/terms-of-service': {
    badge: 'Service Governance',
    chips: ['Customer obligations', 'Acceptable usage', 'Security responsibilities'],
    kpis: [
      { title: 'Usage Clarity', body: 'Defines how the platform should be used in production contexts.', icon: FileText },
      { title: 'Shared Responsibility', body: 'Outlines account, access, and policy duties for operators.', icon: Users },
      { title: 'Operational Predictability', body: 'Creates clear expectations across customer teams.', icon: BarChart3 },
    ],
    pillars: [
      { title: 'Policy Alignment', body: 'Usage terms reflect enterprise procurement expectations.', icon: Scale },
      { title: 'Access Discipline', body: 'Account security remains a fundamental customer obligation.', icon: Lock },
      { title: 'Platform Integrity', body: 'Terms protect service quality and operational trust.', icon: ShieldCheck },
    ],
    highlightsKicker: 'Terms Intent',
    highlights: ['Clear standards for customer usage', 'Predictable governance for internal teams', 'Reliable foundation for enterprise rollout'],
  },
  '/legal/security': {
    badge: 'Security Program',
    chips: ['JWT authentication', 'Tenant membership checks', 'Append-only audit trail'],
    kpis: [
      { title: 'Access Security', body: 'Token validation and tenant-scoped access control on protected endpoints.', icon: ShieldCheck },
      { title: 'Isolation Control', body: 'Data boundaries enforce company-level separation.', icon: Lock },
      { title: 'Forensic Visibility', body: 'Audit events provide traceability for critical actions.', icon: Fingerprint },
    ],
    pillars: [
      { title: 'Identity Enforcement', body: 'Authentication and membership checks gate protected workflows.', icon: Users },
      { title: 'Boundary Protection', body: 'Tenant-aware query discipline minimizes cross-tenant risk.', icon: Layers3 },
      { title: 'Incident Readiness', body: 'Action logs support review and response operations.', icon: Activity },
    ],
    highlightsKicker: 'Current Security Posture',
    highlights: ['Verified token checks on protected routes', 'Tenant isolation built into access path', 'Traceable events for operational forensics'],
  },
}

export default function PublicInfoPage({ title, subtitle, sections = [], ctaLabel = 'Book a Demo', ctaPath = '/contact' }) {
  const location = useLocation()
  const dynamicPageTag = location.pathname.startsWith('/legal')
    ? 'Enterprise Trust Center'
    : location.pathname.startsWith('/company')
      ? 'Company Narrative'
      : 'Platform Intelligence'

  const defaults = {
    badge: dynamicPageTag,
    chips: ['Security-first architecture', 'Explainable decisioning', 'Startup speed, enterprise control'],
    kpis: [
      { title: 'Signal Accuracy', body: 'Role-context candidate scoring with deterministic evidence layers.', icon: Activity },
      { title: 'Hiring Velocity', body: 'Shortlist cycles compressed without reducing quality standards.', icon: Timer },
      { title: 'Operational Clarity', body: 'Clean workflows that make recruiter and manager decisions faster.', icon: Zap },
    ],
    pillars: [
      { title: 'Signal-Rich Evaluation', body: 'Prioritize technical evidence over resume noise with role-aware semantic intelligence.', icon: Layers3 },
      { title: 'Faster Hiring Velocity', body: 'Accelerate shortlisting without compromising quality, fairness, or confidence.', icon: Rocket },
      { title: 'Trust and Governance', body: 'Operate with authenticated workflows, tenant isolation, and auditable decision trails.', icon: Lock },
    ],
    highlightsKicker: 'Why Teams Choose Kovidam',
    highlights: [
      'Technical signal over resume noise',
      'Transparent scoring, not black-box ranking',
      'Built for recruiter velocity and manager confidence',
    ],
  }

  const page = pageExperience[location.pathname] || defaults

  return (
    <main className="public-info-page">
      <div className="public-orb public-orb-left" />
      <div className="public-orb public-orb-right" />

      <section className="public-info-hero">
        <div className="hero-header">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>{page.badge}</span>
          </div>
          <h1>
            {title}
            <span className="hero-accent">.</span>
          </h1>
          <p>{subtitle}</p>
        </div>

        <div className="hero-proof-strip">
          {page.chips.map((chip) => (
            <span key={chip}><ShieldCheck size={14} /> {chip}</span>
          ))}
        </div>

        <div className="hero-kpi-grid">
          {page.kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <article key={kpi.title}>
                <Icon size={16} />
                <h3>{kpi.title}</h3>
                <p>{kpi.body}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="value-pillars">
        {page.pillars.map((pillar) => {
          const Icon = pillar.icon
          return (
            <article className="pillar" key={pillar.title}>
              <div className="pillar-icon"><Icon size={18} /></div>
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </article>
          )
        })}
      </section>

      <section className="public-info-highlights">
        <div className="highlight-kicker">{page.highlightsKicker}</div>
        <div className="highlight-items">
          {page.highlights.map((line) => (
            <p key={line}><CheckCircle2 size={15} /> {line}</p>
          ))}
        </div>
      </section>

      <section className="public-info-timeline">
        {sections.map((section, idx) => (
          <article className="public-info-card" key={section.heading}>
            <div className="section-index">0{idx + 1}</div>
            <div className="section-content">
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph, pidx) => (
                <p key={`${section.heading}-${pidx}`}>{paragraph}</p>
              ))}
              {section.points?.length ? (
                <ul>
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="public-info-cta">
        <div>
          <h3>See Kovidam on your real hiring pipeline</h3>
          <p>We will map your role requirements, scoring policy, and workflow goals into a live product walkthrough.</p>
        </div>
        <div className="cta-actions">
          <Link to="/signup" className="public-info-cta-btn cta-ghost">
            Start Free Workspace
          </Link>
          <Link to={ctaPath} className="public-info-cta-btn cta-solid">
            {ctaLabel}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  )
}
