import React, { useEffect, useState } from 'react'
import './AboutTeam.css'

const members = [
  {
    name: 'Varun Patil',
    roles: ['Chief Operating Officer (COO)', 'Co-Founder', 'Data Developer'],
    bio1: 'Varun specializes in building robust and scalable backend systems using Java. He focuses on clean architecture, efficient code, and reliable APIs.',
    bio2: 'Driven by problem-solving and performance optimization, he delivers stable, secure, and maintainable solutions aligned with both client and business goals.',
    expertise: ['Java', 'Data Analysis', 'Backend Architecture', 'API Development', 'System Design'],
  },
  {
    name: 'Kartikeya Yadav',
    roles: ['Chief Data Officer (CDO)', 'Co-Founder'],
    bio1: 'Kartikeya is an AI enthusiast with strong expertise in intelligent chatbots and automation-driven systems. He works with Python, SQL, and Generative AI to build data-driven and conversational solutions.',
    bio2: 'His technical stack includes Ruby, AWS, and MongoDB, enabling scalable AI-backed applications with real-world impact.',
    expertise: ['GenAI', 'Python', 'Ruby', 'Database Management', 'AWS', 'Backend Development', 'Data Analysis'],
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
      <div className="about-bg about-bg-left" />
      <div className="about-bg about-bg-right" />

      <section className="about-hero-card team-hero">
        <p className="about-kicker">Kovidam Team</p>
        <h1>
          Meet Our <span>Team</span>
        </h1>
        <p className="about-intro">The people designing trusted AI hiring infrastructure for modern companies.</p>
      </section>

      <section className="team-grid">
        {members.map((member) => (
          <article className="team-card" key={member.name}>
            <h3>{member.name}</h3>
            <div className="team-roles">
              {member.roles.map((role) => (
                <p key={role}>{role}</p>
              ))}
            </div>
            <p>{member.bio1}</p>
            <p>{member.bio2}</p>
            <div className="team-expertise-label">Expertise</div>
            <div className="team-tags">
              {member.expertise.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
