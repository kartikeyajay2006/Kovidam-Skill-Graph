import React from 'react'
import { Link } from 'react-router-dom'
import { Globe, Handshake, ShieldCheck, ArrowRight } from 'lucide-react'
import './AboutTeam.css'

const pillars = [
  {
    icon: Globe,
    title: 'Our Vision',
    description: 'Redefine engineering hiring through trustworthy AI that prioritizes real skill over noise.',
  },
  {
    icon: Handshake,
    title: 'Our Mission',
    description: 'Help companies discover exceptional talent faster, fairly, and with measurable confidence.',
  },
  {
    icon: ShieldCheck,
    title: 'Our Values',
    description: 'Excellence, integrity, transparency, and a deep commitment to candidate fairness.',
  },
]

export default function AboutPage() {
  return (
    <main className="about-team-page">
      <div className="about-bg about-bg-left" />
      <div className="about-bg about-bg-right" />

      <section className="about-hero-card">
        <p className="about-kicker">Who We Are</p>
        <h1>
          About <span>Us</span>
        </h1>
        <p className="about-intro">
          Kovidam is building AI-powered hiring infrastructure for modern engineering teams. We combine semantic candidate
          intelligence, explainable scoring, and enterprise-grade trust controls so companies can hire faster without
          compromising quality.
        </p>
        <p className="about-intro second">
          Our platform reduces screening bias, improves shortlist precision, and gives recruiters and hiring managers
          clarity they can act on.
        </p>
      </section>

      <section className="about-pillars-grid">
        {pillars.map((pillar) => {
          const Icon = pillar.icon
          return (
            <article className="about-pillar-card" key={pillar.title}>
              <div className="about-pillar-icon">
                <Icon size={22} />
              </div>
              <h3>{pillar.title}</h3>
              <p>{pillar.description}</p>
            </article>
          )
        })}
      </section>

      <section className="about-team-cta">
        <h2>Meet Our Team</h2>
        <p>See the builders behind Kovidam and the expertise shaping our product and platform.</p>
        <Link to="/company/team" className="about-team-btn">
          Meet Our Team
          <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  )
}
