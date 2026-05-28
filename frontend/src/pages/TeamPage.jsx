import React, { useEffect, useState } from 'react'
import { Code2, Crown, Users } from 'lucide-react'
import Footer from '../components/Footer'
import './AboutTeam.css'

const members = [
  {
    id: 'kartikeya',
    name: 'Kartikeya Yadav',
    focus: 'AI and Platform Engineering',
    roles: ['Chief Technology Officer (CTO)', 'Co-Founder'],
    bio1: 'Kartikeya is an AI enthusiast with strong expertise in intelligent chatbots and automation-driven systems. He works with Python, SQL, and Generative AI to build data-driven and conversational solutions.',
    bio2: 'His technical stack includes Ruby, AWS, and MongoDB, enabling scalable AI-backed applications with real-world impact.',
    expertise: ['GenAI', 'Python', 'Ruby', 'Database Management', 'AWS', 'Backend Development', 'Data Analysis'],
  },
  {
    id: 'varun',
    name: 'Varun Patil',
    focus: 'Operations and Delivery',
    roles: ['Chief Operating Officer (COO)', 'Co-Founder'],
    bio1: 'Varun specializes in building robust and scalable backend systems using Java. He focuses on clean architecture, efficient code, and reliable APIs.',
    bio2: 'Driven by problem-solving and performance optimization, he delivers stable, secure, and maintainable solutions aligned with both client and business goals.',
    expertise: ['Java', 'Data Analysis', 'Backend Architecture', 'API Development', 'System Design'],
  },
]

export default function TeamPage() {
  const [showIntro, setShowIntro] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 1300)
    return () => window.clearTimeout(timer)
  }, [])

  if (showIntro) {
    return (
      <main className="team-intro-screen" aria-label="Kovidam Team Intro">
        <div className="team-intro-glow" />
        <p>Kovidam Team</p>
      </main>
    )
  }

  return (
    <main className="about-team-page team-page team-page-enter">
      <div className="team-bg team-bg-left" />
      <div className="team-bg team-bg-right" />

      <section className="about-hero-card team-hero">
        <p className="about-kicker">Kovidam Team</p>
        <h1>
          Meet Our <span>Team</span>
        </h1>
        <p className="about-intro">The people designing trusted AI hiring infrastructure for modern companies.</p>
      </section>
      <div className="team-hero-arc" />

      <section className="team-grid">
        {members.map((member, index) => (
          <article className="team-card" key={member.name}>
            <div className="team-card-head">
              <div className="team-avatar-shell" aria-hidden="true">
                <div className="team-avatar-ring">
                  <span className="team-avatar-letter">{member.id === 'kartikeya' ? 'K' : 'V'}</span>
                </div>
                <div className="team-avatar-badge">
                  {member.id === 'kartikeya' ? <Code2 size={18} /> : <Crown size={18} />}
                </div>
              </div>
              <div className="team-card-top">
                <p className="team-card-index">{String(index + 1).padStart(2, '0')}</p>
                <p className="team-card-focus">{member.focus}</p>
                <h3>{member.name}</h3>
                <div className="team-role-pills">
                  {member.roles.map((role, roleIndex) => (
                    <span className={roleIndex === 0 ? 'team-role-pill is-primary' : 'team-role-pill'} key={role}>
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="team-divider">
              <span />
            </div>
            <div className="team-bio-stack">
              <p>{member.bio1}</p>
              <p>{member.bio2}</p>
            </div>
            <div className="team-expertise-label">Expertise</div>
            <div className="team-tags">
              {member.expertise.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="team-footer-strip">
        <Users size={20} />
        <p>
          Two minds. One mission - building the future of <span>AI hiring.</span>
        </p>
      </section>
      <Footer />
    </main>
  )
}
